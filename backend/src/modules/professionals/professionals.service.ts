import { HttpStatus, Injectable } from "@nestjs/common";
import { categories as catalogCategories } from "@homecare/catalog";
import type {
  AccountStatusResult,
  createProfessionalSchema,
  listProfessionalsQuerySchema,
  Paged,
  Professional,
  ProfessionalSummary,
  setAccountStatusSchema,
  setVerificationSchema,
  updateProfessionalSchema,
} from "@homecare/contracts";
import type { z } from "zod";
import { AppException, notFound } from "../../common/app-exception.js";
import { Clock } from "../../common/clock.js";
import { isUniqueViolation, lockProfessional } from "../../common/db.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { AlertsService } from "../alerts/alerts.service.js";
import { AuditService, type AuditActor } from "../audit/audit.service.js";
import { isoDate } from "../requests/request-dto.js";
import { assertSettingsKeepAssignments } from "./assignment-protection.js";
import { DocumentStorage } from "./document-storage.js";
import { professionalInclude, type ProfessionalWithRelations } from "./eligibility.js";

const categoryIds = new Set<string>(catalogCategories.map((c) => c.id));

export const toProfessionalSummary = (p: ProfessionalWithRelations): ProfessionalSummary => ({
  id: p.id,
  fullName: p.fullName,
  phone: p.phone,
  verificationStatus: p.verificationStatus,
  accountStatus: p.accountStatus,
  availabilityStatus: p.availabilityStatus,
  categories: p.categories.map((c) => c.category).sort(),
  pincodes: p.areas.map((a) => a.pincode).sort(),
  createdAt: p.createdAt.toISOString(),
});

function validateCategories(list: string[] | undefined) {
  const bad = list?.filter((c) => !categoryIds.has(c));
  if (bad?.length) throw new AppException("validation_failed", `Unknown service category: ${bad.join(", ")}`, HttpStatus.UNPROCESSABLE_ENTITY, { fields: { categories: "Choose categories from the catalogue" } });
}

const unique = <T>(xs: T[], key: (x: T) => string) => [...new Map(xs.map((x) => [key(x), x])).values()];

/**
 * Professional records. New professionals always start unverified (pending) — verification is a separate,
 * permissioned action — and only verified + active + available professionals are ever eligible for work.
 */
@Injectable()
export class ProfessionalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly storage: DocumentStorage,
    private readonly clock: Clock,
    private readonly alerts: AlertsService,
  ) {}

  async list(q: z.output<typeof listProfessionalsQuerySchema>): Promise<Paged<ProfessionalSummary>> {
    const digits = q.q?.replace(/\D/g, "");
    const where: Prisma.ProfessionalWhereInput = {
      ...(q.q && { OR: [{ fullName: { contains: q.q, mode: "insensitive" } }, ...(digits && digits.length >= 3 ? [{ phone: { contains: digits } }] : [])] }),
      ...(q.category && { categories: { some: { category: q.category } } }),
      ...(q.pincode && { areas: { some: { pincode: q.pincode } } }),
      ...(q.verificationStatus && { verificationStatus: q.verificationStatus }),
      ...(q.accountStatus && { accountStatus: q.accountStatus }),
    };
    const [total, rows] = await Promise.all([
      this.prisma.professional.count({ where }),
      this.prisma.professional.findMany({ where, include: professionalInclude, orderBy: { createdAt: "desc" }, skip: (q.page - 1) * q.pageSize, take: q.pageSize }),
    ]);
    return { total, page: q.page, pageSize: q.pageSize, items: rows.map(toProfessionalSummary) };
  }

  async get(id: string): Promise<Professional> {
    const p = await this.prisma.professional.findUnique({
      where: { id },
      include: {
        ...professionalInclude,
        _count: { select: { documents: true } },
        assignments: { where: { status: "active" }, orderBy: [{ scheduledDate: "asc" }, { slot: "asc" }], include: { request: { select: { id: true, serviceSlug: true, status: true } } } },
      },
    });
    if (!p) throw notFound("Professional");
    return {
      ...toProfessionalSummary(p),
      availability: p.availability.map((a) => ({ weekday: a.weekday, slot: a.slot })).sort((a, b) => a.weekday - b.weekday || a.slot.localeCompare(b.slot)),
      notes: p.notes,
      verifiedAt: p.verifiedAt?.toISOString() ?? null,
      upcoming: p.assignments.map((a) => ({ requestId: a.request.id, service: a.request.serviceSlug, date: isoDate(a.scheduledDate), slot: a.slot, status: a.request.status })),
      documents: { configured: this.storage.configured, count: p._count.documents },
      appLinked: !!p.userId,
      openAlerts: await this.alerts.openForProfessional(p.id),
      updatedAt: p.updatedAt.toISOString(),
    };
  }

  async create(actor: AuditActor, input: z.output<typeof createProfessionalSchema>): Promise<Professional> {
    validateCategories(input.categories);
    try {
      const id = await this.prisma.$transaction(async (tx) => {
        const p = await tx.professional.create({
          data: {
            fullName: input.fullName,
            phone: input.phone,
            notes: input.notes ?? null,
            availabilityStatus: input.availabilityStatus,
            verificationStatus: "pending", // never auto-verified
            categories: { create: unique(input.categories, (c) => c).map((category) => ({ category })) },
            areas: { create: unique(input.pincodes, (p) => p).map((pincode) => ({ pincode })) },
            availability: { create: unique(input.availability, (a) => `${a.weekday}:${a.slot}`) },
          },
        });
        await this.audit.record(tx, actor, "professional.created", { type: "professional", id: p.id }, { categories: input.categories, pincodeCount: input.pincodes.length });
        return p.id;
      });
      return this.get(id);
    } catch (err) {
      if (isUniqueViolation(err)) throw new AppException("conflict", "A professional with this phone number already exists.", HttpStatus.CONFLICT);
      throw err;
    }
  }

  async update(actor: AuditActor, id: string, input: z.output<typeof updateProfessionalSchema>): Promise<Professional> {
    validateCategories(input.categories);
    await this.prisma.$transaction(async (tx) => {
      await lockProfessional(tx, id);
      const before = await tx.professional.findUnique({ where: { id } });
      if (!before) throw notFound("Professional");
      await assertSettingsKeepAssignments(tx, id, input);
      await tx.professional.update({
        where: { id },
        data: {
          ...(input.fullName !== undefined && { fullName: input.fullName }),
          ...(input.notes !== undefined && { notes: input.notes }),
          ...(input.availabilityStatus !== undefined && { availabilityStatus: input.availabilityStatus }),
        },
      });
      if (input.categories) {
        await tx.professionalCategory.deleteMany({ where: { professionalId: id } });
        await tx.professionalCategory.createMany({ data: unique(input.categories, (c) => c).map((category) => ({ professionalId: id, category })) });
      }
      if (input.pincodes) {
        await tx.professionalServiceArea.deleteMany({ where: { professionalId: id } });
        await tx.professionalServiceArea.createMany({ data: unique(input.pincodes, (p) => p).map((pincode) => ({ professionalId: id, pincode })) });
      }
      if (input.availability) {
        await tx.professionalAvailability.deleteMany({ where: { professionalId: id } });
        await tx.professionalAvailability.createMany({ data: unique(input.availability, (a) => `${a.weekday}:${a.slot}`).map((a) => ({ professionalId: id, ...a })) });
      }
      await this.audit.record(tx, actor, "professional.updated", { type: "professional", id }, { fields: Object.keys(input) });
    });
    return this.get(id);
  }

  async setVerification(actor: AuditActor, id: string, input: z.output<typeof setVerificationSchema>): Promise<Professional> {
    await this.prisma.$transaction(async (tx) => {
      await lockProfessional(tx, id);
      const before = await tx.professional.findUnique({ where: { id } });
      if (!before) throw notFound("Professional");
      if (before.verificationStatus === input.status) throw new AppException("conflict", `Already ${input.status}.`, HttpStatus.CONFLICT);
      const verified = input.status === "verified";
      await tx.professional.update({
        where: { id },
        data: { verificationStatus: input.status, verifiedAt: verified ? this.clock.now() : null, verifiedById: verified ? actor.staffId : null },
      });
      await this.audit.record(tx, actor, verified ? "professional.verified" : "professional.rejected", { type: "professional", id }, { from: before.verificationStatus, note: input.note });
    });
    return this.get(id);
  }

  /**
   * Suspend / deactivate / reactivate. Existing bookings are never cancelled or moved automatically:
   * each active booking gets an open operations alert that staff must resolve by reassigning or
   * cancelling (or by reactivating the professional). Confirm/start are blocked meanwhile.
   */
  async setAccountStatus(actor: AuditActor, id: string, input: z.output<typeof setAccountStatusSchema>): Promise<AccountStatusResult> {
    const { activeAssignments, affectedBookings } = await this.prisma.$transaction(async (tx) => {
      await lockProfessional(tx, id);
      const before = await tx.professional.findUnique({ where: { id } });
      if (!before) throw notFound("Professional");
      if (before.accountStatus === input.status) throw new AppException("conflict", `Already ${input.status}.`, HttpStatus.CONFLICT);
      await tx.professional.update({ where: { id }, data: { accountStatus: input.status } });
      const action = input.status === "suspended" ? "professional.suspended" : input.status === "active" ? "professional.activated" : "professional.deactivated";
      await this.audit.record(tx, actor, action, { type: "professional", id }, { from: before.accountStatus, reason: input.reason });
      const activeAssignments = await tx.assignment.count({ where: { professionalId: id, status: "active" } });
      if (input.status === "active") {
        await this.alerts.resolveForProfessional(tx, id, actor.staffId!);
        return { activeAssignments, affectedBookings: [] };
      }
      const affectedBookings = await this.alerts.flagProfessionalBookings(tx, id, input.status);
      if (affectedBookings.length) {
        await this.audit.record(tx, actor, "bookings.flagged", { type: "professional", id }, { count: affectedBookings.length, requestIds: affectedBookings.map((a) => a.requestId) });
      }
      return { activeAssignments, affectedBookings };
    });
    return { ...(await this.get(id)), activeAssignments, affectedBookings };
  }
}

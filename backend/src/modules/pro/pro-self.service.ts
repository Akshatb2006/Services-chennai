import { HttpStatus, Injectable } from "@nestjs/common";
import { categories as catalogCategories } from "@homecare/catalog";
import type { MyProfessionalProfile, ProMe, registerProfessionalSchema, updateMyProfessionalSchema } from "@homecare/contracts";
import type { z } from "zod";
import { AppException } from "../../common/app-exception.js";
import { isUniqueViolation, lockProfessional } from "../../common/db.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { AuditService } from "../audit/audit.service.js";
import { assertSettingsKeepAssignments } from "../professionals/assignment-protection.js";
import { DocumentStorage } from "../professionals/document-storage.js";
import { professionalInclude, type ProfessionalWithRelations } from "../professionals/eligibility.js";

const categoryIds = new Set<string>(catalogCategories.map((c) => c.id));
const unique = <T>(xs: T[], key: (x: T) => string) => [...new Map(xs.map((x) => [key(x), x])).values()];

export const toMyProfile = (p: ProfessionalWithRelations): MyProfessionalProfile => ({
  id: p.id,
  fullName: p.fullName,
  verificationStatus: p.verificationStatus,
  accountStatus: p.accountStatus,
  availabilityStatus: p.availabilityStatus,
  categories: p.categories.map((c) => c.category).sort(),
  pincodes: p.areas.map((a) => a.pincode).sort(),
  availability: p.availability.map((a) => ({ weekday: a.weekday, slot: a.slot })).sort((a, b) => a.weekday - b.weekday || a.slot.localeCompare(b.slot)),
  verifiedAt: p.verifiedAt?.toISOString() ?? null,
  createdAt: p.createdAt.toISOString(),
});

function validateCategories(list: string[] | undefined) {
  const bad = list?.filter((c) => !categoryIds.has(c));
  if (bad?.length) throw new AppException("validation_failed", "Choose categories from the list.", HttpStatus.UNPROCESSABLE_ENTITY, { fields: { categories: "Choose categories from the list" } });
}

/**
 * A professional managing their own record. They can never change verification or account status
 * (those fields aren't accepted here), and changes that would break an active assignment are refused.
 */
@Injectable()
export class ProSelfService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly storage: DocumentStorage,
  ) {}

  async me(userId: string): Promise<ProMe> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { professional: { include: { ...professionalInclude, _count: { select: { documents: true } } } } },
    });
    return {
      phone: user.phone,
      professional: user.professional ? toMyProfile(user.professional) : null,
      documents: { storageConfigured: this.storage.configured, count: user.professional?._count.documents ?? 0 },
    };
  }

  async register(userId: string, phone: string, input: z.output<typeof registerProfessionalSchema>): Promise<ProMe> {
    validateCategories(input.categories);
    try {
      await this.prisma.$transaction(async (tx) => {
        const existing = await tx.professional.findFirst({ where: { OR: [{ userId }, { phone }] } });
        if (existing) throw new AppException("conflict", "You're already registered.", HttpStatus.CONFLICT);
        const p = await tx.professional.create({
          data: {
            userId,
            phone,
            fullName: input.fullName,
            verificationStatus: "pending", // only staff can verify
            categories: { create: unique(input.categories, (c) => c).map((category) => ({ category })) },
            areas: { create: unique(input.pincodes, (x) => x).map((pincode) => ({ pincode })) },
            availability: { create: unique(input.availability, (a) => `${a.weekday}:${a.slot}`) },
          },
        });
        await this.audit.record(tx, { professionalId: p.id }, "professional.registered", { type: "professional", id: p.id }, { via: "pro_app", categories: input.categories });
      });
    } catch (err) {
      if (isUniqueViolation(err)) throw new AppException("conflict", "You're already registered.", HttpStatus.CONFLICT);
      throw err;
    }
    return this.me(userId);
  }

  async update(userId: string, professionalId: string, input: z.output<typeof updateMyProfessionalSchema>): Promise<ProMe> {
    validateCategories(input.categories);
    await this.prisma.$transaction(async (tx) => {
      await lockProfessional(tx, professionalId);
      await assertSettingsKeepAssignments(tx, professionalId, input);
      await tx.professional.update({
        where: { id: professionalId },
        data: {
          ...(input.fullName !== undefined && { fullName: input.fullName }),
          ...(input.availabilityStatus !== undefined && { availabilityStatus: input.availabilityStatus }),
        },
      });
      if (input.categories) {
        await tx.professionalCategory.deleteMany({ where: { professionalId } });
        await tx.professionalCategory.createMany({ data: unique(input.categories, (c) => c).map((category) => ({ professionalId, category })) });
      }
      if (input.pincodes) {
        await tx.professionalServiceArea.deleteMany({ where: { professionalId } });
        await tx.professionalServiceArea.createMany({ data: unique(input.pincodes, (x) => x).map((pincode) => ({ professionalId, pincode })) });
      }
      if (input.availability) {
        await tx.professionalAvailability.deleteMany({ where: { professionalId } });
        await tx.professionalAvailability.createMany({ data: unique(input.availability, (a) => `${a.weekday}:${a.slot}`).map((a) => ({ professionalId, ...a })) });
      }
      await this.audit.record(tx, { professionalId }, "professional.self_updated", { type: "professional", id: professionalId }, { fields: Object.keys(input) });
    });
    return this.me(userId);
  }
}

import { HttpStatus, Injectable } from "@nestjs/common";
import { rolePermissions, type createStaffSchema, type StaffProfile, type updateStaffSchema } from "@homecare/contracts";
import type { z } from "zod";
import { AppException, notFound } from "../../common/app-exception.js";
import { isUniqueViolation } from "../../common/db.js";
import type { StaffMember, User } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { AuditService, type AuditActor } from "../audit/audit.service.js";

export const toStaffProfile = (s: StaffMember & { user: Pick<User, "phone"> }): StaffProfile => ({
  id: s.id,
  fullName: s.fullName,
  phone: s.user.phone,
  role: s.role,
  status: s.status,
  permissions: [...rolePermissions[s.role]],
  createdAt: s.createdAt.toISOString(),
});

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async get(id: string): Promise<StaffProfile> {
    const s = await this.prisma.staffMember.findUnique({ where: { id }, include: { user: { select: { phone: true } } } });
    if (!s) throw notFound("Staff member");
    return toStaffProfile(s);
  }

  async list(): Promise<StaffProfile[]> {
    const rows = await this.prisma.staffMember.findMany({ orderBy: [{ status: "asc" }, { fullName: "asc" }], include: { user: { select: { phone: true } } } });
    return rows.map(toStaffProfile);
  }

  async create(actor: AuditActor, input: z.output<typeof createStaffSchema>): Promise<StaffProfile> {
    try {
      const staff = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.upsert({ where: { phone: input.phone }, update: {}, create: { phone: input.phone, role: "staff" } });
        const s = await tx.staffMember.create({ data: { userId: user.id, fullName: input.fullName, role: input.role, createdById: actor.staffId }, include: { user: { select: { phone: true } } } });
        await this.audit.record(tx, actor, "staff.created", { type: "staff", id: s.id }, { role: s.role });
        return s;
      });
      return toStaffProfile(staff);
    } catch (err) {
      if (isUniqueViolation(err)) throw new AppException("conflict", "That number already has staff access.", HttpStatus.CONFLICT);
      throw err;
    }
  }

  async update(actor: AuditActor, id: string, input: z.output<typeof updateStaffSchema>): Promise<StaffProfile> {
    if (id === actor.staffId && (input.role || input.status)) {
      throw new AppException("forbidden", "You can't change your own role or status.", HttpStatus.FORBIDDEN);
    }
    const staff = await this.prisma.$transaction(async (tx) => {
      const before = await tx.staffMember.findUnique({ where: { id } });
      if (!before) throw notFound("Staff member");
      const s = await tx.staffMember.update({ where: { id }, data: input, include: { user: { select: { phone: true } } } });
      // Disabling access ends their sessions immediately.
      if (input.status === "disabled") await tx.session.updateMany({ where: { userId: s.userId, audience: "staff", revokedAt: null }, data: { revokedAt: new Date(), revokedReason: "staff_disabled" } });
      await this.audit.record(tx, actor, "staff.updated", { type: "staff", id }, { from: { role: before.role, status: before.status }, to: { role: s.role, status: s.status } });
      return s;
    });
    return toStaffProfile(staff);
  }
}

import { Injectable } from "@nestjs/common";
import type { AuditEntry, auditQuerySchema, Paged } from "@homecare/contracts";
import type { z } from "zod";
import type { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma/prisma.service.js";

/** Who did it: a staff member (dashboard) or a professional (Pro app). */
export type AuditActor = { staffId?: string; professionalId?: string; ipHash?: string };

/** Keys that must never be written to the audit log. */
const FORBIDDEN_KEYS = /otp|code|token|secret|password|authorization/i;

function sanitise(metadata: Record<string, unknown>): Prisma.InputJsonValue {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(metadata)) if (!FORBIDDEN_KEYS.test(k) && v !== undefined) out[k] = v;
  return out as Prisma.InputJsonValue;
}

/**
 * Append-only audit trail. Written inside the same transaction as the action it records.
 * There is no update/delete API, and a database trigger rejects UPDATE/DELETE on audit_logs.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  record(
    tx: Prisma.TransactionClient | PrismaService,
    actor: AuditActor | null,
    action: string,
    resource: { type: string; id: string },
    metadata: Record<string, unknown> = {},
  ) {
    return tx.auditLog.create({
      data: { actorStaffId: actor?.staffId, actorProfessionalId: actor?.professionalId, ipHash: actor?.ipHash, action, resourceType: resource.type, resourceId: resource.id, metadata: sanitise(metadata) },
    });
  }

  async list(query: z.output<typeof auditQuerySchema>): Promise<Paged<AuditEntry>> {
    const where: Prisma.AuditLogWhereInput = {
      ...(query.resourceType && { resourceType: query.resourceType }),
      ...(query.resourceId && { resourceId: query.resourceId }),
      ...(query.action && { action: { startsWith: query.action } }),
    };
    const [total, rows] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { actor: { select: { id: true, fullName: true, role: true } }, actorProfessional: { select: { fullName: true } } },
      }),
    ]);
    return {
      total,
      page: query.page,
      pageSize: query.pageSize,
      items: rows.map((r) => ({
        id: r.id,
        action: r.action,
        resourceType: r.resourceType,
        resourceId: r.resourceId,
        actor: r.actor ? { staffId: r.actor.id, name: r.actor.fullName, role: r.actor.role } : null,
        ...(r.actorProfessional && { professionalName: r.actorProfessional.fullName }),
        metadata: r.metadata as Record<string, unknown>,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }
}

import { Injectable } from "@nestjs/common";
import { services as catalogServices } from "@homecare/catalog";
import { requestStatuses, type Overview, type overviewQuerySchema, type RequestStatus } from "@homecare/contracts";
import type { z } from "zod";
import type { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { AlertsService } from "../alerts/alerts.service.js";

/** Dashboard numbers, computed live from the database (nothing cached or estimated). */
@Injectable()
export class OverviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alerts: AlertsService,
  ) {}

  async get(q: z.output<typeof overviewQuerySchema>): Promise<Overview> {
    const where: Prisma.ServiceRequestWhereInput = {
      ...(q.category && { serviceSlug: { in: catalogServices.filter((s) => s.category === q.category).map((s) => s.slug) } }),
      ...((q.from || q.to) && {
        createdAt: {
          ...(q.from && { gte: new Date(`${q.from}T00:00:00+05:30`) }),
          ...(q.to && { lt: new Date(new Date(`${q.to}T00:00:00+05:30`).getTime() + 86_400_000) }),
        },
      }),
    };
    const [grouped, oldestPending, verified, pendingVerification, activeAndAvailable, events] = await Promise.all([
      this.prisma.serviceRequest.groupBy({ by: ["status"], where, _count: { _all: true } }),
      this.prisma.serviceRequest.findFirst({ where: { ...where, status: "pending" }, orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
      this.prisma.professional.count({ where: { verificationStatus: "verified" } }),
      this.prisma.professional.count({ where: { verificationStatus: "pending" } }),
      this.prisma.professional.count({ where: { verificationStatus: "verified", accountStatus: "active", availabilityStatus: "available" } }),
      this.prisma.requestEvent.findMany({
        where: { request: where },
        orderBy: { createdAt: "desc" },
        take: 15,
        include: { request: { select: { serviceSlug: true, customer: { select: { fullName: true } } } }, actorStaff: { select: { fullName: true } }, actorProfessional: { select: { fullName: true } } },
      }),
    ]);
    const counts = Object.fromEntries(requestStatuses.map((s) => [s, 0])) as Record<RequestStatus, number>;
    for (const g of grouped) counts[g.status] = g._count._all;
    return {
      range: { from: q.from ?? null, to: q.to ?? null, category: q.category ?? null },
      counts,
      total: Object.values(counts).reduce((a, b) => a + b, 0),
      oldestPendingAt: oldestPending?.createdAt.toISOString() ?? null,
      professionals: { verified, pendingVerification, activeAndAvailable },
      openAlerts: await this.alerts.countOpen(),
      recentActivity: events.map((e) => ({
        id: e.id,
        requestId: e.requestId,
        service: e.request.serviceSlug,
        customerName: e.request.customer.fullName,
        fromStatus: e.fromStatus,
        toStatus: e.toStatus,
        actor: e.actor,
        actorName: e.actorStaff?.fullName ?? e.actorProfessional?.fullName ?? null,
        createdAt: e.createdAt.toISOString(),
      })),
    };
  }
}

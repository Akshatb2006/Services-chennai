import { Injectable } from "@nestjs/common";
import type { OperationsAlert } from "@homecare/contracts";
import { Clock } from "../../common/clock.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { isoDate } from "../requests/request-dto.js";

type Tx = Prisma.TransactionClient | PrismaService;

export const alertInclude = {
  professional: { select: { id: true, fullName: true } },
  assignment: { select: { scheduledDate: true, slot: true } },
  request: { select: { serviceSlug: true } },
  resolvedBy: { select: { fullName: true } },
} satisfies Prisma.OperationsAlertInclude;

type AlertRow = Prisma.OperationsAlertGetPayload<{ include: typeof alertInclude }>;

export const toAlertDto = (a: AlertRow): OperationsAlert => ({
  id: a.id,
  kind: a.kind as OperationsAlert["kind"],
  status: a.status,
  message: a.message,
  requestId: a.requestId,
  assignmentId: a.assignmentId,
  service: a.request.serviceSlug,
  date: isoDate(a.assignment.scheduledDate),
  slot: a.assignment.slot,
  professional: a.professional,
  resolution: (a.resolution as OperationsAlert["resolution"]) ?? null,
  resolvedBy: a.resolvedBy?.fullName ?? null,
  resolvedAt: a.resolvedAt?.toISOString() ?? null,
  createdAt: a.createdAt.toISOString(),
});

/**
 * Operations work items. Raised when a professional with active bookings becomes unable to work;
 * resolved only by an explicit action (reassign, cancel, reactivate). Bookings are never cancelled
 * or reassigned automatically.
 */
@Injectable()
export class AlertsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: Clock,
  ) {}

  /** Flags every active booking of a professional. Returns the open alerts (existing ones are kept, not duplicated). */
  async flagProfessionalBookings(tx: Tx, professionalId: string, reason: "suspended" | "inactive") {
    const active = await tx.assignment.findMany({ where: { professionalId, status: "active" }, select: { id: true, requestId: true } });
    if (active.length) {
      await tx.operationsAlert.createMany({
        data: active.map((a) => ({
          kind: "professional_unavailable",
          professionalId,
          requestId: a.requestId,
          assignmentId: a.id,
          message: `Assigned professional is ${reason === "suspended" ? "suspended" : "deactivated"}. Reassign or cancel this booking.`,
        })),
        skipDuplicates: true, // one open alert per assignment (partial unique index)
      });
    }
    const rows = await tx.operationsAlert.findMany({ where: { professionalId, status: "open" }, include: alertInclude, orderBy: { createdAt: "asc" } });
    return rows.map(toAlertDto);
  }

  async resolveForAssignment(tx: Tx, assignmentId: string, resolution: "reassigned" | "cancelled", staffId: string | null) {
    await tx.operationsAlert.updateMany({ where: { assignmentId, status: "open" }, data: { status: "resolved", resolution, resolvedById: staffId, resolvedAt: this.clock.now() } });
  }

  async resolveForProfessional(tx: Tx, professionalId: string, staffId: string) {
    await tx.operationsAlert.updateMany({
      where: { professionalId, status: "open" },
      data: { status: "resolved", resolution: "professional_reactivated", resolvedById: staffId, resolvedAt: this.clock.now() },
    });
  }

  async list(status: "open" | "resolved"): Promise<OperationsAlert[]> {
    const rows = await this.prisma.operationsAlert.findMany({ where: { status }, include: alertInclude, orderBy: { createdAt: status === "open" ? "asc" : "desc" }, take: 200 });
    return rows.map(toAlertDto);
  }

  async forRequest(requestId: string) {
    return (await this.prisma.operationsAlert.findMany({ where: { requestId }, include: alertInclude, orderBy: { createdAt: "asc" } })).map(toAlertDto);
  }

  async openForProfessional(professionalId: string) {
    return (await this.prisma.operationsAlert.findMany({ where: { professionalId, status: "open" }, include: alertInclude, orderBy: { createdAt: "asc" } })).map(toAlertDto);
  }

  countOpen() {
    return this.prisma.operationsAlert.count({ where: { status: "open" } });
  }
}

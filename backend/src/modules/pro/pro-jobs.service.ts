import { HttpStatus, Injectable } from "@nestjs/common";
import { todayInIndia, type ProJob, type ProJobAction, type ProJobScope, type ProJobState, type RequestAddressSnapshot } from "@homecare/contracts";
import { AppException, notFound } from "../../common/app-exception.js";
import { Clock } from "../../common/clock.js";
import { conflict, lockRequest } from "../../common/db.js";
import type { Assignment, Prisma, Professional, ServiceRequest } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { AuditService } from "../audit/audit.service.js";
import { isoDate } from "../requests/request-dto.js";
import { RequestWorkflow } from "../requests/request-workflow.js";

type JobRow = Assignment & { request: ServiceRequest & { customer: { fullName: string | null; user: { phone: string } } } };

const jobInclude = { request: { include: { customer: { select: { fullName: true, user: { select: { phone: true } } } } } } } satisfies Prisma.AssignmentInclude;

const scopeWhere: Record<ProJobScope, Prisma.AssignmentWhereInput> = {
  upcoming: { status: "active" },
  completed: { status: "completed" },
  cancelled: { status: { in: ["cancelled", "replaced"] } },
  all: {},
};

/**
 * Jobs for the signed-in professional. Every query is scoped to their own assignments, so another
 * professional's job is indistinguishable from a missing one (404). Status changes go through the same
 * RequestWorkflow as staff actions; a professional can only start (confirmed → in_progress, on or after
 * the appointment date) and complete (in_progress → completed) their own active assignment.
 * Assigning, confirming, rescheduling and cancelling remain staff-only.
 */
@Injectable()
export class ProJobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflow: RequestWorkflow,
    private readonly audit: AuditService,
    private readonly clock: Clock,
  ) {}

  private state(a: JobRow): ProJobState {
    if (a.status === "replaced") return "reassigned";
    if (a.status === "cancelled") return "cancelled";
    if (a.status === "completed") return "completed";
    return a.request.status === "in_progress" ? "in_progress" : a.request.status === "confirmed" ? "confirmed" : "awaiting_confirmation";
  }

  private startBlock(a: JobRow, pro: Professional): string | null {
    if (a.status !== "active") return "This job isn't assigned to you any more.";
    if (pro.verificationStatus !== "verified") return "Your account isn't verified.";
    if (pro.accountStatus !== "active") return "Your account isn't active. Contact Homecare.";
    if (a.request.status === "assigned") return "Waiting for Homecare to confirm the appointment with the customer.";
    if (a.request.status !== "confirmed") return null;
    if (isoDate(a.scheduledDate) > todayInIndia(this.clock.now())) return "You can start on the appointment date.";
    return null;
  }

  private toDto(a: JobRow, pro: Professional): ProJob {
    const state = this.state(a);
    // Customer details only while the job is theirs AND their account is active: a suspended or
    // deactivated professional keeps the job summary but loses the address, notes and contact.
    const mine = (a.status === "active" || a.status === "completed") && pro.accountStatus === "active";
    const actions: ProJobAction[] = [];
    if (a.status === "active" && pro.accountStatus === "active" && !a.acknowledgedAt && (a.request.status === "assigned" || a.request.status === "confirmed")) actions.push("acknowledge");
    if (a.request.status === "confirmed" && !this.startBlock(a, pro)) actions.push("start");
    if (a.status === "active" && a.request.status === "in_progress" && pro.verificationStatus === "verified" && pro.accountStatus === "active") actions.push("complete");
    const showPhone = mine && a.status === "active" && (a.request.status === "confirmed" || a.request.status === "in_progress");
    return {
      id: a.id,
      requestId: a.requestId,
      service: a.request.serviceSlug,
      state,
      date: isoDate(a.scheduledDate),
      slot: a.slot,
      assignedAt: a.createdAt.toISOString(),
      acknowledgedAt: a.acknowledgedAt?.toISOString() ?? null,
      details: mine ? a.request.details : null,
      address: mine ? (a.request.addressSnapshot as RequestAddressSnapshot) : null,
      preferredDate: isoDate(a.request.preferredDate),
      preferredTime: a.request.preferredTime,
      customer: mine ? { firstName: (a.request.customer.fullName ?? "Customer").split(/\s+/)[0], phone: showPhone ? a.request.customer.user.phone : null } : null,
      actions,
      startBlockedReason: a.request.status === "confirmed" || a.request.status === "assigned" ? this.startBlock(a, pro) : null,
    };
  }

  async list(pro: Professional, scope: ProJobScope): Promise<ProJob[]> {
    const rows = await this.prisma.assignment.findMany({
      where: { professionalId: pro.id, ...scopeWhere[scope] },
      include: jobInclude,
      orderBy: scope === "upcoming" ? [{ scheduledDate: "asc" }, { slot: "asc" }] : [{ scheduledDate: "desc" }, { createdAt: "desc" }],
      take: 100,
    });
    return rows.map((r) => this.toDto(r, pro));
  }

  /** Own job or 404. */
  private async owned(db: Prisma.TransactionClient | PrismaService, pro: Professional, id: string): Promise<JobRow> {
    const a = await db.assignment.findFirst({ where: { id, professionalId: pro.id }, include: jobInclude });
    if (!a) throw notFound("Job");
    return a;
  }

  async get(pro: Professional, id: string): Promise<ProJob> {
    return this.toDto(await this.owned(this.prisma, pro, id), pro);
  }

  async acknowledge(pro: Professional, id: string): Promise<ProJob> {
    await this.prisma.$transaction(async (tx) => {
      const a = await this.owned(tx, pro, id);
      if (a.status !== "active") throw conflict("invalid_transition", "This job isn't assigned to you any more.");
      if (pro.accountStatus !== "active") throw new AppException("forbidden", "Your account isn't active. Contact Homecare.", HttpStatus.FORBIDDEN);
      if (a.acknowledgedAt || (a.request.status !== "assigned" && a.request.status !== "confirmed")) return;
      await tx.assignment.update({ where: { id }, data: { acknowledgedAt: this.clock.now() } });
      await this.audit.record(tx, { professionalId: pro.id }, "assignment.acknowledged", { type: "request", id: a.requestId }, { assignmentId: id });
    });
    return this.get(pro, id);
  }

  async start(pro: Professional, userId: string, id: string, note?: string): Promise<ProJob> {
    await this.prisma.$transaction(async (tx) => {
      const found = await this.owned(tx, pro, id);
      await lockRequest(tx, found.requestId);
      const a = await this.owned(tx, pro, id); // re-read under the lock
      const block = this.startBlock(a, pro);
      if (a.request.status !== "confirmed" || block) {
        throw new AppException(a.request.status === "confirmed" ? "forbidden" : "invalid_transition", block ?? "This job can't be started now.", a.request.status === "confirmed" ? HttpStatus.FORBIDDEN : HttpStatus.CONFLICT);
      }
      await this.workflow.transition(tx, a.request, "in_progress", { kind: "professional", professionalId: pro.id, userId }, { note: note || "Started by the professional" });
      await this.audit.record(tx, { professionalId: pro.id }, "request.started", { type: "request", id: a.requestId }, { assignmentId: id, via: "pro_app" });
    });
    return this.get(pro, id);
  }

  async complete(pro: Professional, userId: string, id: string, note?: string): Promise<ProJob> {
    await this.prisma.$transaction(async (tx) => {
      const found = await this.owned(tx, pro, id);
      await lockRequest(tx, found.requestId);
      const a = await this.owned(tx, pro, id);
      if (a.status !== "active") throw conflict("invalid_transition", "This job isn't assigned to you any more.");
      if (pro.verificationStatus !== "verified" || pro.accountStatus !== "active") {
        throw new AppException("forbidden", "Your account can't update jobs right now. Contact Homecare.", HttpStatus.FORBIDDEN);
      }
      if (a.request.status !== "in_progress") throw conflict("invalid_transition", "Start the job before marking it complete.");
      await this.workflow.transition(tx, a.request, "completed", { kind: "professional", professionalId: pro.id, userId }, { note: note || "Completed by the professional", notify: { type: "service_completed" } });
      await tx.assignment.update({ where: { id }, data: { status: "completed", endedAt: this.clock.now() } });
      await this.audit.record(tx, { professionalId: pro.id }, "request.completed", { type: "request", id: a.requestId }, { assignmentId: id, via: "pro_app" });
    });
    return this.get(pro, id);
  }
}

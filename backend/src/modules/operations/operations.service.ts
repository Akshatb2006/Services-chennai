import { HttpStatus, Injectable } from "@nestjs/common";
import { getService, services as catalogServices } from "@homecare/catalog";
import {
  hasPermission,
  todayInIndia,
  type adminRequestListQuerySchema,
  type AdminRequestDetail,
  type AdminRequestListItem,
  type assignSchema,
  type EligibilityResult,
  type eligibilityQuerySchema,
  type Paged,
  type reassignSchema,
  type RequestAddressSnapshot,
  type rescheduleSchema,
  type TimeSlot,
} from "@homecare/contracts";
import type { z } from "zod";
import { AppException, notFound } from "../../common/app-exception.js";
import { Clock } from "../../common/clock.js";
import { conflict, isUniqueViolation, lockProfessional, lockRequest } from "../../common/db.js";
import type { Prisma, ServiceRequest } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { AlertsService } from "../alerts/alerts.service.js";
import { AuditService } from "../audit/audit.service.js";
import { NotificationsService, toDeliveryDto, toNotificationDto } from "../notifications/notifications.service.js";
import { ineligibilityReasons, professionalInclude } from "../professionals/eligibility.js";
import { toProfessionalSummary } from "../professionals/professionals.service.js";
import { isoDate, requestWithAppointment, toEventDto, toRequestDto } from "../requests/request-dto.js";
import { actionPermission, actionsFor, RequestWorkflow, type WorkflowActor } from "../requests/request-workflow.js";
import type { StaffContext } from "../staff/staff.decorators.js";

type Tx = Prisma.TransactionClient;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const categoryOf = (slug: string) => getService(slug)?.category ?? "other";
const slotFromPreference = (pref: string): TimeSlot | null => (pref === "flexible" ? null : (pref as TimeSlot));

/**
 * Operations on service requests (staff only). Each state-changing method runs in one transaction that:
 *   locks the request row → validates the transition → checks eligibility under a professional row lock →
 *   writes assignment + status event + customer notification + audit entry.
 * Partial unique indexes on `assignments` are the final guard against double booking.
 */
@Injectable()
export class OperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflow: RequestWorkflow,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly clock: Clock,
    private readonly alerts: AlertsService,
  ) {}

  /** Confirming or starting needs the assigned professional to still be able to work. */
  private async ensureAssignedProfessionalCanWork(tx: Tx, professionalId: string) {
    const pro = await tx.professional.findUniqueOrThrow({ where: { id: professionalId } });
    if (pro.accountStatus !== "active" || pro.verificationStatus !== "verified") {
      throw conflict("not_eligible", `${pro.fullName} is ${pro.accountStatus !== "active" ? pro.accountStatus : `not verified (${pro.verificationStatus})`}. Reassign this booking first.`);
    }
  }

  private actor(staff: StaffContext): WorkflowActor {
    return { kind: "staff", staffId: staff.staffId, userId: staff.userId };
  }

  // ─── Read ──────────────────────────────────────────────────────────────────

  async list(q: z.output<typeof adminRequestListQuerySchema>): Promise<Paged<AdminRequestListItem>> {
    const where: Prisma.ServiceRequestWhereInput = {};
    if (q.status) where.status = q.status;
    if (q.service) where.serviceSlug = q.service;
    else if (q.category) where.serviceSlug = { in: catalogServices.filter((s) => s.category === q.category).map((s) => s.slug) };
    const field = q.dateField === "preferred" ? "preferredDate" : "createdAt";
    if (q.from || q.to) {
      where[field] = {
        ...(q.from && { gte: new Date(`${q.from}T00:00:00${field === "createdAt" ? "+05:30" : "Z"}`) }),
        ...(q.to && { lt: new Date(new Date(`${q.to}T00:00:00${field === "createdAt" ? "+05:30" : "Z"}`).getTime() + 86_400_000) }),
      };
    }
    if (q.q) {
      const term = q.q.replace(/^#/, "").trim();
      if (UUID.test(term)) where.id = term;
      else if (/^[0-9a-f]{4,12}$/i.test(term) && !/^\d+$/.test(term)) {
        // Short reference shown in the dashboard: the first characters of the request id.
        const ids = await this.prisma.$queryRaw<{ id: string }[]>`SELECT id FROM service_requests WHERE id::text LIKE ${term.toLowerCase() + "%"} LIMIT 100`;
        where.id = { in: ids.map((r) => r.id) };
      } else {
        const digits = term.replace(/\D/g, "");
        where.customer = {
          OR: [{ fullName: { contains: term, mode: "insensitive" } }, ...(digits.length >= 4 ? [{ user: { phone: { contains: digits } } }] : [])],
        };
      }
    }
    const [total, rows] = await Promise.all([
      this.prisma.serviceRequest.count({ where }),
      this.prisma.serviceRequest.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: {
          customer: { include: { user: { select: { phone: true } } } },
          assignments: { where: { status: { in: ["active", "completed"] } }, orderBy: { createdAt: "desc" }, take: 1, include: { professional: { select: { id: true, fullName: true } } } },
        },
      }),
    ]);
    return {
      total,
      page: q.page,
      pageSize: q.pageSize,
      items: rows.map((r) => ({
        ...toRequestDto(r),
        customer: { id: r.customer.id, fullName: r.customer.fullName, phone: r.customer.user.phone },
        professional: r.status !== "cancelled" && r.assignments[0] ? { id: r.assignments[0].professional.id, fullName: r.assignments[0].professional.fullName } : null,
      })),
    };
  }

  async detail(staff: StaffContext, id: string): Promise<AdminRequestDetail> {
    const r = await this.prisma.serviceRequest.findUnique({
      where: { id },
      include: {
        ...requestWithAppointment,
        customer: { include: { user: { select: { phone: true } }, _count: { select: { requests: true } } } },
        events: { orderBy: { createdAt: "asc" }, include: { actorStaff: { select: { fullName: true } }, actorProfessional: { select: { fullName: true } } } },
      },
    });
    if (!r) throw notFound("Request");
    const [assignments, notifications, alerts] = await Promise.all([
      this.prisma.assignment.findMany({
        where: { requestId: id },
        orderBy: { createdAt: "asc" },
        include: { professional: { select: { id: true, fullName: true, phone: true } }, assignedBy: { select: { fullName: true } } },
      }),
      this.prisma.notification.findMany({ where: { requestId: id, audience: "customer" }, orderBy: { createdAt: "asc" }, include: { deliveries: { orderBy: { channel: "asc" } } } }),
      this.alerts.forRequest(id),
    ]);

    // "Request reviewed": first time each staff member opens a request that's awaiting review.
    if (r.status === "pending") {
      const seen = await this.prisma.auditLog.findFirst({ where: { action: "request.reviewed", resourceId: id, actorStaffId: staff.staffId }, select: { id: true } });
      if (!seen) await this.audit.record(this.prisma, staff, "request.reviewed", { type: "request", id });
    }

    return {
      request: toRequestDto(r),
      customer: {
        id: r.customer.id,
        fullName: r.customer.fullName,
        phone: r.customer.user.phone,
        email: r.customer.email,
        createdAt: r.customer.createdAt.toISOString(),
        requestCount: r.customer._count.requests,
      },
      events: r.events.map((e) => ({ ...toEventDto(e), actorName: e.actorStaff?.fullName ?? e.actorProfessional?.fullName ?? null })),
      assignments: assignments.map((a) => ({
        id: a.id,
        professional: a.professional,
        acknowledgedAt: a.acknowledgedAt?.toISOString() ?? null,
        date: isoDate(a.scheduledDate),
        slot: a.slot,
        status: a.status,
        assignedBy: a.assignedBy.fullName,
        endReason: a.endReason,
        createdAt: a.createdAt.toISOString(),
        endedAt: a.endedAt?.toISOString() ?? null,
      })),
      notifications: notifications.map((n) => ({ ...toNotificationDto(n), deliveries: n.deliveries.map(toDeliveryDto) })),
      allowedActions: actionsFor(r.status).filter((a) => hasPermission(staff.role, actionPermission[a])),
      alerts,
    };
  }

  async eligibility(id: string, q: z.output<typeof eligibilityQuerySchema>): Promise<EligibilityResult> {
    const r = await this.prisma.serviceRequest.findUnique({ where: { id } });
    if (!r) throw notFound("Request");
    const pincode = (r.addressSnapshot as RequestAddressSnapshot).pincode;
    const category = q.category ?? categoryOf(r.serviceSlug);
    const date = q.date ?? isoDate(r.preferredDate);
    const slot = q.slot ?? slotFromPreference(r.preferredTime) ?? "morning";
    const pros = await this.prisma.professional.findMany({
      where: q.includeIneligible ? { OR: [{ categories: { some: { category } } }, { areas: { some: { pincode } } }] } : { categories: { some: { category } } },
      include: professionalInclude,
      orderBy: { fullName: "asc" },
      take: 200,
    });
    const candidates = await Promise.all(
      pros.map(async (p) => {
        const reasons = await ineligibilityReasons(this.prisma, p, { category, pincode, date, slot, ignoreRequestId: id });
        return { professional: toProfessionalSummary(p), eligible: reasons.length === 0, reasons };
      }),
    );
    return {
      date,
      slot,
      category,
      pincode,
      candidates: candidates.filter((c) => q.includeIneligible || c.eligible).sort((a, b) => Number(b.eligible) - Number(a.eligible) || a.reasons.length - b.reasons.length),
    };
  }

  // ─── Write ─────────────────────────────────────────────────────────────────

  private async locked(tx: Tx, id: string): Promise<ServiceRequest> {
    await lockRequest(tx, id);
    const r = await tx.serviceRequest.findUnique({ where: { id } });
    if (!r) throw notFound("Request");
    return r;
  }

  /** Loads + locks the professional and fails with the specific reasons if they can't take this slot. */
  private async ensureEligible(tx: Tx, request: ServiceRequest, professionalId: string, date: string, slot: TimeSlot) {
    if (date < todayInIndia(this.clock.now())) throw new AppException("validation_failed", "Choose today or a later date.", HttpStatus.UNPROCESSABLE_ENTITY, { fields: { date: "Choose today or a later date" } });
    await lockProfessional(tx, professionalId);
    const pro = await tx.professional.findUnique({ where: { id: professionalId }, include: professionalInclude });
    if (!pro) throw notFound("Professional");
    const reasons = await ineligibilityReasons(tx, pro, {
      category: categoryOf(request.serviceSlug),
      pincode: (request.addressSnapshot as RequestAddressSnapshot).pincode,
      date,
      slot,
      ignoreRequestId: request.id,
    });
    if (reasons.length) {
      throw new AppException(reasons.includes("schedule_conflict") && reasons.length === 1 ? "assignment_conflict" : "not_eligible", `${pro.fullName} can't take this request: ${reasons.join(", ")}.`, HttpStatus.CONFLICT, {
        fields: Object.fromEntries(reasons.map((r) => [r, r])),
      });
    }
    return pro;
  }

  private async run<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    try {
      return await this.prisma.$transaction(fn, { timeout: 15_000 });
    } catch (err) {
      if (isUniqueViolation(err)) throw conflict("assignment_conflict", "That professional or request was just booked by someone else. Refresh and try again.");
      throw err;
    }
  }

  async assign(staff: StaffContext, id: string, input: z.output<typeof assignSchema>) {
    await this.run(async (tx) => {
      const request = await this.locked(tx, id);
      if (request.status !== "pending") throw conflict("invalid_transition", "Only requests under review can be assigned. Use reassign instead.");
      const pro = await this.ensureEligible(tx, request, input.professionalId, input.date, input.slot);
      await tx.assignment.create({
        data: { requestId: id, professionalId: pro.id, scheduledDate: new Date(`${input.date}T00:00:00Z`), slot: input.slot, assignedById: staff.staffId, note: input.note },
      });
      await this.workflow.transition(tx, request, "assigned", this.actor(staff), {
        note: `Assigned to ${pro.fullName} for ${input.date} (${input.slot})${input.note ? ` · ${input.note}` : ""}`,
        notify: { type: "request_assigned", date: input.date, slot: input.slot },
      });
      await this.workflow.notifyProfessional(tx, pro.id, "job_assigned", request, { date: input.date, slot: input.slot });
      await this.audit.record(tx, staff, "professional.assigned", { type: "request", id }, { professionalId: pro.id, date: input.date, slot: input.slot });
    });
    return this.detail(staff, id);
  }

  async reassign(staff: StaffContext, id: string, input: z.output<typeof reassignSchema>) {
    await this.run(async (tx) => {
      const request = await this.locked(tx, id);
      this.workflow.assertAllowed(request.status, "assigned");
      if (request.status === "pending") throw conflict("invalid_transition", "This request has no professional yet. Use assign.");
      const current = await tx.assignment.findFirst({ where: { requestId: id, status: "active" } });
      if (!current) throw conflict("invalid_transition", "This request has no active assignment.");
      if (current.professionalId === input.professionalId && isoDate(current.scheduledDate) === input.date && current.slot === input.slot) {
        throw conflict("conflict", "That's the current assignment.");
      }
      await tx.assignment.update({ where: { id: current.id }, data: { status: "replaced", endedAt: this.clock.now(), endReason: input.reason } });
      await this.alerts.resolveForAssignment(tx, current.id, "reassigned", staff.staffId);
      const pro = await this.ensureEligible(tx, request, input.professionalId, input.date, input.slot);
      await tx.assignment.create({
        data: { requestId: id, professionalId: pro.id, scheduledDate: new Date(`${input.date}T00:00:00Z`), slot: input.slot, assignedById: staff.staffId, note: input.note },
      });
      // A confirmed appointment goes back to "assigned": the customer must re-confirm the new arrangement.
      await this.workflow.transition(tx, request, "assigned", this.actor(staff), {
        note: `Reassigned to ${pro.fullName} for ${input.date} (${input.slot}) · ${input.reason}`,
        notify: { type: "request_assigned", date: input.date, slot: input.slot },
      });
      if (current.professionalId !== pro.id) {
        await this.workflow.notifyProfessional(tx, current.professionalId, "job_cancelled", request, { date: isoDate(current.scheduledDate), slot: current.slot, reason: "Reassigned by Homecare" });
        await this.workflow.notifyProfessional(tx, pro.id, "job_assigned", request, { date: input.date, slot: input.slot });
      } else {
        await this.workflow.notifyProfessional(tx, pro.id, "job_rescheduled", request, { date: input.date, slot: input.slot });
      }
      await this.audit.record(tx, staff, "professional.reassigned", { type: "request", id }, {
        fromProfessionalId: current.professionalId,
        toProfessionalId: pro.id,
        date: input.date,
        slot: input.slot,
        reason: input.reason,
      });
    });
    return this.detail(staff, id);
  }

  async confirm(staff: StaffContext, id: string, note?: string) {
    await this.run(async (tx) => {
      const request = await this.locked(tx, id);
      this.workflow.assertAllowed(request.status, "confirmed");
      const a = await tx.assignment.findFirst({ where: { requestId: id, status: "active" } });
      if (!a) throw conflict("invalid_transition", "Assign a professional before confirming.");
      await this.ensureAssignedProfessionalCanWork(tx, a.professionalId);
      const date = isoDate(a.scheduledDate);
      await this.workflow.transition(tx, request, "confirmed", this.actor(staff), {
        note: note || "Appointment confirmed with the customer",
        notify: { type: "appointment_confirmed", date, slot: a.slot },
      });
      await this.workflow.notifyProfessional(tx, a.professionalId, "job_confirmed", request, { date, slot: a.slot });
      await this.audit.record(tx, staff, "appointment.confirmed", { type: "request", id }, { assignmentId: a.id, date, slot: a.slot });
    });
    return this.detail(staff, id);
  }

  async reschedule(staff: StaffContext, id: string, input: z.output<typeof rescheduleSchema>) {
    await this.run(async (tx) => {
      const request = await this.locked(tx, id);
      if (request.status !== "assigned" && request.status !== "confirmed") throw conflict("invalid_transition", "Only assigned or confirmed appointments can be rescheduled.");
      const a = await tx.assignment.findFirst({ where: { requestId: id, status: "active" } });
      if (!a) throw conflict("invalid_transition", "This request has no active assignment.");
      await this.ensureEligible(tx, request, a.professionalId, input.date, input.slot);
      await tx.assignment.update({ where: { id: a.id }, data: { scheduledDate: new Date(`${input.date}T00:00:00Z`), slot: input.slot } });
      // Same-status history entry so the timeline shows the change.
      await this.workflow.event(tx, request, request.status, request.status, this.actor(staff), `Rescheduled to ${input.date} (${input.slot}) · ${input.reason}`);
      await tx.serviceRequest.update({ where: { id }, data: { updatedAt: this.clock.now() } });
      const customer = await tx.customer.findUniqueOrThrow({ where: { id: request.customerId }, select: { userId: true } });
      await this.notifications.notify(tx, {
        userId: customer.userId,
        type: "appointment_rescheduled",
        requestId: id,
        context: { serviceName: getService(request.serviceSlug)?.name ?? "service", date: input.date, slot: input.slot },
      });
      await this.workflow.notifyProfessional(tx, a.professionalId, "job_rescheduled", request, { date: input.date, slot: input.slot });
      await this.audit.record(tx, staff, "appointment.rescheduled", { type: "request", id }, { from: { date: isoDate(a.scheduledDate), slot: a.slot }, to: { date: input.date, slot: input.slot }, reason: input.reason });
    });
    return this.detail(staff, id);
  }

  async start(staff: StaffContext, id: string, note?: string) {
    await this.run(async (tx) => {
      const request = await this.locked(tx, id);
      const a = await tx.assignment.findFirst({ where: { requestId: id, status: "active" } });
      if (a) await this.ensureAssignedProfessionalCanWork(tx, a.professionalId);
      await this.workflow.transition(tx, request, "in_progress", this.actor(staff), { note: note || "Service started" });
      await this.audit.record(tx, staff, "request.started", { type: "request", id });
    });
    return this.detail(staff, id);
  }

  async complete(staff: StaffContext, id: string, note?: string) {
    await this.run(async (tx) => {
      const request = await this.locked(tx, id);
      await this.workflow.transition(tx, request, "completed", this.actor(staff), { note: note || "Service completed", notify: { type: "service_completed" } });
      const a = await tx.assignment.findFirst({ where: { requestId: id, status: "active" } });
      await tx.assignment.updateMany({ where: { requestId: id, status: "active" }, data: { status: "completed", endedAt: this.clock.now() } });
      if (a) await this.workflow.notifyProfessional(tx, a.professionalId, "job_completed", request, { date: isoDate(a.scheduledDate), slot: a.slot });
      await this.audit.record(tx, staff, "request.completed", { type: "request", id });
    });
    return this.detail(staff, id);
  }

  async cancel(staff: StaffContext, id: string, reason: string) {
    await this.run(async (tx) => {
      const request = await this.locked(tx, id);
      const active = await tx.assignment.findFirst({ where: { requestId: id, status: "active" }, select: { professionalId: true } });
      await this.workflow.cancel(tx, request, this.actor(staff), reason);
      await this.audit.record(tx, staff, "request.cancelled", { type: "request", id }, { fromStatus: request.status, reason, releasedProfessionalId: active?.professionalId });
    });
    return this.detail(staff, id);
  }
}

import { Injectable } from "@nestjs/common";
import { getService } from "@homecare/catalog";
import type { NotificationType, Permission, ProNotificationType, RequestAction, RequestStatus, TimeSlot } from "@homecare/contracts";
import { Clock } from "../../common/clock.js";
import { conflict } from "../../common/db.js";
import type { Prisma, ServiceRequest } from "../../generated/prisma/client.js";
import { AlertsService } from "../alerts/alerts.service.js";
import { NotificationsService } from "../notifications/notifications.service.js";

/**
 * THE request state machine. Every status change — by a customer or by staff — goes through `transition`,
 * which validates the move, applies it with a compare-and-set update, and appends an immutable event.
 *
 *   pending ──assign──▶ assigned ──confirm──▶ confirmed ──start──▶ in_progress ──complete──▶ completed
 *      │                 │  ▲ reassign            │  │ reassign (back to assigned: re-confirm)
 *      └──── cancel ─────┴──┴──────── cancel ─────┘
 */
export const allowedTransitions: Record<RequestStatus, readonly RequestStatus[]> = {
  pending: ["assigned", "cancelled"],
  assigned: ["assigned", "confirmed", "cancelled"],
  confirmed: ["assigned", "in_progress", "cancelled"],
  in_progress: ["completed"],
  completed: [],
  cancelled: [],
};

/** Staff actions available per status (intersected with the caller's permissions). */
const actionsByStatus: Record<RequestStatus, readonly RequestAction[]> = {
  pending: ["assign", "cancel"],
  assigned: ["reassign", "confirm", "reschedule", "cancel"],
  confirmed: ["reassign", "reschedule", "start", "cancel"],
  in_progress: ["complete"],
  completed: [],
  cancelled: [],
};

export const actionPermission: Record<RequestAction, Permission> = {
  assign: "requests.assign",
  reassign: "requests.assign",
  reschedule: "requests.assign",
  confirm: "requests.confirm",
  start: "requests.progress",
  complete: "requests.progress",
  cancel: "requests.cancel",
};

export const actionsFor = (status: RequestStatus) => actionsByStatus[status];

export type WorkflowActor =
  | { kind: "customer"; userId: string }
  | { kind: "staff"; staffId: string; userId: string }
  | { kind: "professional"; professionalId: string; userId: string };

type Tx = Prisma.TransactionClient;

@Injectable()
export class RequestWorkflow {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly clock: Clock,
    private readonly alerts: AlertsService,
  ) {}

  /** Throws invalid_transition unless `from → to` is allowed. */
  assertAllowed(from: RequestStatus, to: RequestStatus) {
    if (!allowedTransitions[from].includes(to)) {
      throw conflict("invalid_transition", `A ${from.replace("_", " ")} request can't move to ${to.replace("_", " ")}.`);
    }
  }

  /**
   * Moves a request to `to` and records the event (+ optional customer notification).
   * The update is conditional on the status we validated, so a concurrent change makes this fail
   * instead of silently overwriting it. Same-status moves (reassign, reschedule) still write an event.
   */
  async transition(
    tx: Tx,
    request: ServiceRequest,
    to: RequestStatus,
    actor: WorkflowActor,
    opts: { note?: string | null; cancelReason?: string | null; notify?: { type: NotificationType; date?: string; slot?: TimeSlot } } = {},
  ) {
    this.assertAllowed(request.status, to);
    const { count } = await tx.serviceRequest.updateMany({
      where: { id: request.id, status: request.status },
      data: { status: to, ...(to === "cancelled" && { cancelReason: opts.cancelReason || null }) },
    });
    if (count === 0) throw conflict("conflict", "This request was changed by someone else. Refresh and try again.");

    await this.event(tx, request, request.status, to, actor, opts.note ?? null);

    if (opts.notify) {
      const customer = await tx.customer.findUniqueOrThrow({ where: { id: request.customerId }, select: { userId: true } });
      await this.notifications.notify(tx, {
        userId: customer.userId,
        type: opts.notify.type,
        requestId: request.id,
        context: { serviceName: getService(request.serviceSlug)?.name ?? "service", date: opts.notify.date, slot: opts.notify.slot, reason: opts.cancelReason },
      });
    }
  }

  event(tx: Tx, request: ServiceRequest, from: RequestStatus | null, to: RequestStatus, actor: WorkflowActor, note: string | null) {
    return tx.requestEvent.create({
      data: {
        requestId: request.id,
        fromStatus: from,
        toStatus: to,
        actor: actor.kind,
        actorUserId: actor.userId,
        actorStaffId: actor.kind === "staff" ? actor.staffId : null,
        actorProfessionalId: actor.kind === "professional" ? actor.professionalId : null,
        note,
        createdAt: this.clock.now(),
      },
    });
  }

  /** Cancels (customer or staff), releases any active assignment and tells the professional. */
  async cancel(tx: Tx, request: ServiceRequest, actor: WorkflowActor, reason: string | null) {
    await this.transition(tx, request, "cancelled", actor, {
      note: reason || (actor.kind === "customer" ? "Cancelled by customer" : "Cancelled by Homecare"),
      cancelReason: reason,
      notify: { type: "request_cancelled" },
    });
    const active = await tx.assignment.findFirst({ where: { requestId: request.id, status: "active" } });
    if (!active) return;
    await tx.assignment.update({ where: { id: active.id }, data: { status: "cancelled", endedAt: this.clock.now(), endReason: reason || "Request cancelled" } });
    await this.alerts.resolveForAssignment(tx, active.id, "cancelled", actor.kind === "staff" ? actor.staffId : null);
    await this.notifyProfessional(tx, active.professionalId, "job_cancelled", request, { date: active.scheduledDate.toISOString().slice(0, 10), slot: active.slot, reason: actor.kind === "customer" ? "The customer cancelled" : reason });
  }

  /** Professional-app notification (only if the professional has signed in to the Pro app). Returns it, or null. */
  async notifyProfessional(tx: Tx, professionalId: string, type: ProNotificationType, request: ServiceRequest, ctx: { date?: string; slot?: TimeSlot; reason?: string | null }) {
    const pro = await tx.professional.findUnique({ where: { id: professionalId }, select: { userId: true } });
    if (!pro?.userId) return null;
    return this.notifications.notify(tx, {
      userId: pro.userId,
      audience: "professional",
      type,
      requestId: request.id,
      context: { serviceName: getService(request.serviceSlug)?.name ?? "service", date: ctx.date, slot: ctx.slot, reason: ctx.reason },
    });
  }
}

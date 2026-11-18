import { Injectable, Logger } from "@nestjs/common";
import { timeSlotLabels, type AppNotification, type NotificationDelivery, type NotificationType, type ProNotificationType, type TimeSlot } from "@homecare/contracts";
import type { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { PushSender } from "./push-sender.js";
import { SmsSender } from "./sms-sender.js";

type Tx = Prisma.TransactionClient | PrismaService;
type Context = { serviceName: string; date?: string; slot?: TimeSlot; reason?: string | null };

const day = (iso: string) => new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
const when = (c: Context) => (c.date && c.slot ? `${day(c.date)}, ${timeSlotLabels[c.slot].toLowerCase()}` : "");

/** Customer-facing (and, below, professional-facing) copy. Never claims more than the status means. */
const templates: Record<NotificationType | ProNotificationType, (c: Context) => { title: string; body: string }> = {
  request_received: (c) => ({
    title: "Request received",
    body: `We've received your ${c.serviceName} request and will review it. It isn't confirmed yet; we'll update you here.`,
  }),
  request_assigned: (c) => ({
    title: "Professional assigned",
    body: `A professional has been assigned to your ${c.serviceName} request for ${when(c)}. We'll confirm the appointment with you shortly.`,
  }),
  appointment_confirmed: (c) => ({ title: "Appointment confirmed", body: `Your ${c.serviceName} appointment is confirmed for ${when(c)}.` }),
  appointment_rescheduled: (c) => ({ title: "Appointment rescheduled", body: `Your ${c.serviceName} appointment has moved to ${when(c)}.` }),
  request_cancelled: (c) => ({
    title: "Request cancelled",
    body: `Your ${c.serviceName} request was cancelled.${c.reason ? ` Reason: ${c.reason}` : ""}`,
  }),
  service_completed: (c) => ({ title: "Service completed", body: `Your ${c.serviceName} service has been marked complete. Thank you for choosing Homecare.` }),

  // Homecare Pro (professional app)
  job_assigned: (c) => ({ title: "New job assigned", body: `${c.serviceName}, ${when(c)}. Homecare will confirm with the customer; wait for confirmation before you travel.` }),
  job_confirmed: (c) => ({ title: "Job confirmed", body: `${c.serviceName}, ${when(c)} is confirmed with the customer.` }),
  job_rescheduled: (c) => ({ title: "Job rescheduled", body: `${c.serviceName} has moved to ${when(c)}.` }),
  job_cancelled: (c) => ({ title: "Job no longer assigned", body: `${c.serviceName}, ${when(c)} is no longer assigned to you.${c.reason ? ` Reason: ${c.reason}` : ""}` }),
  job_reminder: (c) => ({ title: "Job tomorrow", body: `Reminder: ${c.serviceName}, ${when(c)}. Check the address and details in the app.` }),
  job_completed: (c) => ({ title: "Job completed", body: `${c.serviceName}, ${when(c)} was marked complete.` }),
};

export const toNotificationDto = (n: { id: string; type: string; title: string; body: string; requestId: string | null; readAt: Date | null; createdAt: Date }): AppNotification => ({
  id: n.id,
  type: n.type,
  title: n.title,
  body: n.body,
  requestId: n.requestId,
  readAt: n.readAt?.toISOString() ?? null,
  createdAt: n.createdAt.toISOString(),
});

export const toDeliveryDto = (d: { channel: NotificationDelivery["channel"]; status: NotificationDelivery["status"]; detail: string | null; updatedAt: Date }): NotificationDelivery => ({
  channel: d.channel,
  status: d.status,
  detail: d.detail,
  updatedAt: d.updatedAt.toISOString(),
});

/**
 * Customer notifications. Each notification is stored (the in-app copy, status "available") and gets a
 * delivery row per channel. Push/SMS rows are "queued" only when a provider is configured, otherwise
 * "skipped" — a database row is never reported as a delivered message.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushSender,
    private readonly sms: SmsSender,
  ) {}

  async notify(tx: Tx, input: { userId: string; type: NotificationType | ProNotificationType; requestId?: string; context: Context; audience?: "customer" | "professional" }) {
    const { title, body } = templates[input.type](input.context);
    return tx.notification.create({
      data: {
        userId: input.userId,
        audience: input.audience ?? "customer",
        type: input.type,
        title,
        body,
        requestId: input.requestId,
        deliveries: {
          create: [
            { channel: "in_app", status: "available" },
            this.push.configured ? { channel: "push", status: "queued", provider: this.push.name } : { channel: "push", status: "skipped", detail: "No push provider configured" },
            this.sms.supportsTransactional
              ? { channel: "sms", status: "queued", provider: this.sms.name }
              : { channel: "sms", status: "skipped", detail: "Transactional SMS not configured" },
          ],
        },
      },
    });
  }

  /** Sends queued push deliveries (call after the transaction commits). No-op until a provider exists. */
  async dispatch(notificationId: string) {
    if (!this.push.configured) return;
    const n = await this.prisma.notification.findUnique({ where: { id: notificationId }, include: { deliveries: { where: { channel: "push", status: "queued" } } } });
    if (!n?.deliveries.length) return;
    try {
      await this.push.send(n.userId, { title: n.title, body: n.body, ...(n.requestId && { data: { requestId: n.requestId } }) });
      await this.prisma.notificationDelivery.update({ where: { id: n.deliveries[0].id }, data: { status: "sent", attempts: { increment: 1 } } });
    } catch (err) {
      this.logger.warn({ err, notificationId }, "Push delivery failed");
      await this.prisma.notificationDelivery.update({ where: { id: n.deliveries[0].id }, data: { status: "failed", attempts: { increment: 1 }, detail: "Provider rejected the message" } });
    }
  }

  /** Each app sees only its own notifications, even when one person is both a customer and a professional. */
  async list(userId: string, audience: "customer" | "professional" = "customer", limit = 50): Promise<AppNotification[]> {
    const rows = await this.prisma.notification.findMany({ where: { userId, audience }, orderBy: { createdAt: "desc" }, take: limit });
    return rows.map(toNotificationDto);
  }

  async markRead(userId: string, id: string, audience: "customer" | "professional" = "customer"): Promise<boolean> {
    const { count } = await this.prisma.notification.updateMany({ where: { id, userId, audience, readAt: null }, data: { readAt: new Date() } });
    return count > 0;
  }
}

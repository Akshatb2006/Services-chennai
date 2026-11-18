import { Injectable, Logger } from "@nestjs/common";
import { addDays, todayInIndia, type TimeSlot } from "@homecare/contracts";
import { randomUUID } from "node:crypto";
import { Clock } from "../../common/clock.js";
import type { ScheduledJob } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { AuditService } from "../audit/audit.service.js";
import { isoDate } from "../requests/request-dto.js";
import { RequestWorkflow } from "../requests/request-workflow.js";
import { JobQueue, LostClaimError } from "./job-queue.js";

export const REMINDER_KIND = "job_reminder";
/** Day-before reminders go out at 09:00 India time (03:30 UTC) on the previous day. */
const REMINDER_HOUR_UTC = "03:30:00Z";

export const reminderKey = (assignmentId: string, date: string) => `${REMINDER_KIND}:${assignmentId}:${date}`;
const dateFromKey = (key: string) => key.split(":")[2];

export type RunResult = { enqueued: number; claimed: number; sent: number; skipped: number; retried: number; failed: number };

/**
 * Day-before job reminders for professionals.
 *  - enqueue: one row per (assignment, appointment date) — a reschedule creates a new key, so the
 *    new date gets its own reminder and the old one is skipped.
 *  - process: re-validates against current data inside the same transaction that creates the
 *    notification and marks the row sent, so a reminder is never sent for a cancelled, reassigned,
 *    rescheduled or unconfirmed job, and never twice.
 */
@Injectable()
export class ReminderJobs {
  private readonly logger = new Logger(ReminderJobs.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: JobQueue,
    private readonly workflow: RequestWorkflow,
    private readonly audit: AuditService,
    private readonly clock: Clock,
  ) {}

  /** Idempotent sweep: makes sure every confirmed, active, future appointment has its reminder row. */
  async enqueue(): Promise<number> {
    const now = this.clock.now();
    const today = todayInIndia(now);
    const candidates = await this.prisma.assignment.findMany({
      where: { status: "active", scheduledDate: { gt: new Date(`${today}T00:00:00Z`) }, request: { status: "confirmed" } },
      select: { id: true, scheduledDate: true },
    });
    if (!candidates.length) return 0;
    const { count } = await this.prisma.scheduledJob.createMany({
      data: candidates.map((a) => {
        const date = isoDate(a.scheduledDate);
        const due = new Date(`${addDays(date, -1)}T${REMINDER_HOUR_UTC}`);
        return { kind: REMINDER_KIND, dedupeKey: reminderKey(a.id, date), assignmentId: a.id, runAt: due < now ? now : due };
      }),
      skipDuplicates: true,
    });
    return count;
  }

  /** Why this reminder must not be sent now, or null if it should. */
  private async skipReason(job: ScheduledJob, a: { requestId: string; status: string; scheduledDate: Date; request: { status: string }; professional: { userId: string | null } } | null) {
    if (!a) return "Assignment not found";
    if (a.status !== "active") return `Assignment is ${a.status === "replaced" ? "reassigned" : a.status}`;
    if (a.request.status !== "confirmed") return `Request is ${a.request.status.replace("_", " ")}`;
    const date = dateFromKey(job.dedupeKey);
    if (isoDate(a.scheduledDate) !== date) return "Appointment was rescheduled";
    if (todayInIndia(this.clock.now()) >= date) return "Too late for a day-before reminder";
    if (!a.professional.userId) return "Professional has no Pro app account";
    // Never remind twice, even if a reminder for this job was created outside this queue
    // (e.g. by the pre-queue timer this replaced).
    const existing = await this.prisma.notification.findFirst({
      where: { userId: a.professional.userId, audience: "professional", type: "job_reminder", requestId: a.requestId, createdAt: { gte: new Date(`${addDays(date, -2)}T00:00:00Z`) } },
      select: { id: true },
    });
    if (existing) return "Already reminded";
    return null;
  }

  private async process(job: ScheduledJob, workerId: string): Promise<"sent" | "skipped"> {
    return this.prisma.$transaction(async (tx) => {
      const a = job.assignmentId
        ? await tx.assignment.findUnique({ where: { id: job.assignmentId }, include: { request: true, professional: { select: { userId: true } } } })
        : null;
      const reason = await this.skipReason(job, a);
      if (reason || !a) {
        await this.queue.markSkipped(tx, job, workerId, reason ?? "Assignment not found");
        await this.audit.record(tx, null, "reminder.skipped", { type: "request", id: a?.requestId ?? "unknown" }, { jobId: job.id, reason });
        return "skipped" as const;
      }
      const notification = await this.workflow.notifyProfessional(tx, a.professionalId, "job_reminder", a.request, { date: isoDate(a.scheduledDate), slot: a.slot as TimeSlot });
      await this.queue.markSent(tx, job, workerId, notification!.id);
      return "sent" as const;
    });
  }

  /** One scheduler pass: enqueue, claim due reminders, process each. Safe to run concurrently. */
  async run(workerId = `worker-${randomUUID().slice(0, 8)}`, limit = 25): Promise<RunResult> {
    const result: RunResult = { enqueued: await this.enqueue(), claimed: 0, sent: 0, skipped: 0, retried: 0, failed: 0 };
    const jobs = await this.queue.claim(workerId, REMINDER_KIND, limit);
    result.claimed = jobs.length;
    for (const job of jobs) {
      try {
        result[await this.process(job, workerId)]++;
      } catch (err) {
        if (err instanceof LostClaimError) continue; // another worker owns it now
        const outcome = await this.queue.markFailedAttempt(job, workerId, err);
        if (outcome === "failed") {
          result.failed++;
          await this.audit.record(this.prisma, null, "reminder.failed", { type: "scheduled_job", id: job.id }, { attempts: job.attempts, error: err instanceof Error ? err.message.slice(0, 200) : "unknown" });
          this.logger.error({ jobId: job.id, attempts: job.attempts }, "Reminder failed permanently");
        } else if (outcome === "pending") {
          result.retried++;
          this.logger.warn({ jobId: job.id, attempts: job.attempts }, "Reminder attempt failed; will retry");
        }
      }
    }
    return result;
  }
}

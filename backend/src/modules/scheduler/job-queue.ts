import { Injectable } from "@nestjs/common";
import { Clock } from "../../common/clock.js";
import type { Prisma, ScheduledJob } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma/prisma.service.js";

/** How long a claimed job stays locked to its worker before another worker may recover it. */
export const LOCK_SECONDS = 300;

/** Retry delay after the n-th failed attempt: 1 min, 2, 4, 8 … capped at 1 h. */
export const backoffSeconds = (attempt: number) => Math.min(60 * 2 ** Math.max(0, attempt - 1), 3600);

/** Thrown when a worker's claim was taken over (its lock expired). The transaction rolls back. */
export class LostClaimError extends Error {
  constructor(id: string) {
    super(`Lost claim on scheduled job ${id}`);
  }
}

/**
 * PostgreSQL-backed job queue. No extra infrastructure: due rows are claimed atomically with
 * `FOR UPDATE SKIP LOCKED`, so concurrent workers (any number of API instances) never get the same
 * row. A crashed worker's rows become claimable again once `locked_until` passes. Every state change
 * is fenced on (status = processing, locked_by = worker), so a worker that lost its claim can't
 * overwrite another worker's result.
 */
@Injectable()
export class JobQueue {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: Clock,
  ) {}

  async claim(workerId: string, kind: string, limit = 25): Promise<ScheduledJob[]> {
    const now = this.clock.now();
    const lockedUntil = new Date(now.getTime() + LOCK_SECONDS * 1000);
    const claimed = await this.prisma.$queryRaw<{ id: string }[]>`
      UPDATE scheduled_jobs
         SET status = 'processing', locked_by = ${workerId}, locked_until = ${lockedUntil}, attempts = attempts + 1, updated_at = ${now}
       WHERE id IN (
         SELECT id FROM scheduled_jobs
          WHERE kind = ${kind}
            AND ((status = 'pending' AND run_at <= ${now}) OR (status = 'processing' AND locked_until < ${now}))
          ORDER BY run_at
          LIMIT ${limit}
          FOR UPDATE SKIP LOCKED)
      RETURNING id`;
    if (!claimed.length) return [];
    return this.prisma.scheduledJob.findMany({ where: { id: { in: claimed.map((c) => c.id) } }, orderBy: { runAt: "asc" } });
  }

  private async finish(tx: Prisma.TransactionClient | PrismaService, job: ScheduledJob, workerId: string, data: Prisma.ScheduledJobUpdateManyMutationInput) {
    const { count } = await tx.scheduledJob.updateMany({
      where: { id: job.id, status: "processing", lockedBy: workerId },
      data: { ...data, lockedBy: null, lockedUntil: null },
    });
    if (count === 0) throw new LostClaimError(job.id);
  }

  markSent(tx: Prisma.TransactionClient, job: ScheduledJob, workerId: string, notificationId: string) {
    return this.finish(tx, job, workerId, { status: "sent", notificationId, outcome: "Notification created", lastError: null });
  }

  markSkipped(tx: Prisma.TransactionClient, job: ScheduledJob, workerId: string, reason: string) {
    return this.finish(tx, job, workerId, { status: "skipped", outcome: reason.slice(0, 200) });
  }

  /** Transient failure: back off and retry, or give up after maxAttempts. Returns the new status. */
  async markFailedAttempt(job: ScheduledJob, workerId: string, error: unknown): Promise<"pending" | "failed" | "lost"> {
    const message = (error instanceof Error ? error.message : String(error)).slice(0, 500);
    const giveUp = job.attempts >= job.maxAttempts;
    try {
      await this.finish(this.prisma, job, workerId, giveUp
        ? { status: "failed", lastError: message, outcome: `Gave up after ${job.attempts} attempts` }
        : { status: "pending", lastError: message, runAt: new Date(this.clock.now().getTime() + backoffSeconds(job.attempts) * 1000) });
      return giveUp ? "failed" : "pending";
    } catch (err) {
      if (err instanceof LostClaimError) return "lost";
      throw err;
    }
  }
}

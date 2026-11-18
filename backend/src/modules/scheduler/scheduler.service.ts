import { Inject, Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from "@nestjs/common";
import { hostname } from "node:os";
import { randomUUID } from "node:crypto";
import { ENV, type Env } from "../../config/env.js";
import { ReminderJobs } from "./reminder-jobs.js";

/**
 * Runs scheduler passes on an interval in every API instance. Correctness doesn't depend on there
 * being one instance: rows are claimed atomically in PostgreSQL. Disable with SCHEDULER_ENABLED=false
 * (e.g. to run it only on a dedicated worker).
 */
@Injectable()
export class SchedulerService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(SchedulerService.name);
  private readonly workerId = `${hostname().slice(0, 40)}-${process.pid}-${randomUUID().slice(0, 8)}`;
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly reminders: ReminderJobs,
    @Inject(ENV) private readonly env: Env,
  ) {}

  onApplicationBootstrap() {
    if (!this.env.SCHEDULER_ENABLED) return;
    this.timer = setInterval(() => void this.tick(), this.env.SCHEDULER_INTERVAL_SECONDS * 1000);
    this.timer.unref();
    void this.tick(); // recover anything due/abandoned right after (re)start
  }

  onApplicationShutdown() {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick() {
    if (this.running) return; // never overlap passes within one process
    this.running = true;
    try {
      const r = await this.reminders.run(this.workerId);
      if (r.claimed || r.enqueued) this.logger.log({ ...r }, "Scheduler pass");
    } catch (err) {
      this.logger.error({ err }, "Scheduler pass failed");
    } finally {
      this.running = false;
    }
  }
}

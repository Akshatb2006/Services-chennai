import { Module } from "@nestjs/common";
import { JobQueue } from "./job-queue.js";
import { ReminderJobs } from "./reminder-jobs.js";
import { SchedulerService } from "./scheduler.service.js";

@Module({ providers: [JobQueue, ReminderJobs, SchedulerService], exports: [ReminderJobs, JobQueue] })
export class SchedulerModule {}

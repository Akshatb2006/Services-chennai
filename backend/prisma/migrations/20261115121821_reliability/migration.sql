-- CreateEnum
CREATE TYPE "ScheduledJobStatus" AS ENUM ('pending', 'processing', 'sent', 'skipped', 'failed');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('open', 'resolved');

-- CreateTable
CREATE TABLE "scheduled_jobs" (
    "id" UUID NOT NULL,
    "kind" VARCHAR(40) NOT NULL,
    "dedupe_key" VARCHAR(160) NOT NULL,
    "assignment_id" UUID,
    "run_at" TIMESTAMPTZ(3) NOT NULL,
    "status" "ScheduledJobStatus" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "locked_by" VARCHAR(80),
    "locked_until" TIMESTAMPTZ(3),
    "last_error" VARCHAR(500),
    "outcome" VARCHAR(200),
    "notification_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "scheduled_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operations_alerts" (
    "id" UUID NOT NULL,
    "kind" VARCHAR(60) NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'open',
    "professional_id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "assignment_id" UUID NOT NULL,
    "message" VARCHAR(300) NOT NULL,
    "resolution" VARCHAR(60),
    "resolved_by_id" UUID,
    "resolved_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operations_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scheduled_jobs_dedupe_key_key" ON "scheduled_jobs"("dedupe_key");

-- CreateIndex
CREATE INDEX "scheduled_jobs_status_run_at_idx" ON "scheduled_jobs"("status", "run_at");

-- CreateIndex
CREATE INDEX "scheduled_jobs_assignment_id_idx" ON "scheduled_jobs"("assignment_id");

-- CreateIndex
CREATE INDEX "operations_alerts_status_created_at_idx" ON "operations_alerts"("status", "created_at");

-- CreateIndex
CREATE INDEX "operations_alerts_request_id_idx" ON "operations_alerts"("request_id");

-- AddForeignKey
ALTER TABLE "scheduled_jobs" ADD CONSTRAINT "scheduled_jobs_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations_alerts" ADD CONSTRAINT "operations_alerts_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations_alerts" ADD CONSTRAINT "operations_alerts_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "service_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations_alerts" ADD CONSTRAINT "operations_alerts_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations_alerts" ADD CONSTRAINT "operations_alerts_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "staff_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- One open alert per assignment (re-suspending doesn't duplicate work items).
CREATE UNIQUE INDEX "operations_alerts_one_open_per_assignment" ON "operations_alerts" ("assignment_id") WHERE "status" = 'open';
ALTER TABLE "scheduled_jobs" ADD CONSTRAINT "scheduled_jobs_attempts_range" CHECK ("attempts" >= 0 AND "max_attempts" > 0);
ALTER TABLE "scheduled_jobs" ADD CONSTRAINT "scheduled_jobs_lock_consistent" CHECK (("status" = 'processing') = ("locked_until" IS NOT NULL));

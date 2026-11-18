-- CreateEnum
CREATE TYPE "AuthAudience" AS ENUM ('customer', 'staff');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('super_admin', 'operations_admin', 'operations_staff', 'support_staff');

-- CreateEnum
CREATE TYPE "StaffStatus" AS ENUM ('active', 'disabled');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('pending', 'verified', 'rejected');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('active', 'suspended', 'inactive');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('available', 'unavailable');

-- CreateEnum
CREATE TYPE "TimeSlot" AS ENUM ('morning', 'afternoon', 'evening');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('active', 'replaced', 'cancelled', 'completed');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('in_app', 'push', 'sms');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('available', 'queued', 'sent', 'failed', 'skipped');

-- DropIndex
DROP INDEX "otp_challenges_phone_created_at_idx";

-- AlterTable
ALTER TABLE "otp_challenges" ADD COLUMN     "purpose" "AuthAudience" NOT NULL DEFAULT 'customer';

-- AlterTable
ALTER TABLE "request_events" ADD COLUMN     "actor_staff_id" UUID;

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "audience" "AuthAudience" NOT NULL DEFAULT 'customer';

-- CreateTable
CREATE TABLE "staff_members" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "full_name" VARCHAR(80) NOT NULL,
    "role" "StaffRole" NOT NULL,
    "status" "StaffStatus" NOT NULL DEFAULT 'active',
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "staff_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professionals" (
    "id" UUID NOT NULL,
    "full_name" VARCHAR(80) NOT NULL,
    "phone" VARCHAR(16) NOT NULL,
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'pending',
    "verified_at" TIMESTAMPTZ(3),
    "verified_by_id" UUID,
    "account_status" "AccountStatus" NOT NULL DEFAULT 'active',
    "availability_status" "AvailabilityStatus" NOT NULL DEFAULT 'available',
    "notes" VARCHAR(500),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "professionals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professional_categories" (
    "professional_id" UUID NOT NULL,
    "category" VARCHAR(40) NOT NULL,

    CONSTRAINT "professional_categories_pkey" PRIMARY KEY ("professional_id","category")
);

-- CreateTable
CREATE TABLE "professional_service_areas" (
    "professional_id" UUID NOT NULL,
    "pincode" CHAR(6) NOT NULL,

    CONSTRAINT "professional_service_areas_pkey" PRIMARY KEY ("professional_id","pincode")
);

-- CreateTable
CREATE TABLE "professional_availability" (
    "professional_id" UUID NOT NULL,
    "weekday" SMALLINT NOT NULL,
    "slot" "TimeSlot" NOT NULL,

    CONSTRAINT "professional_availability_pkey" PRIMARY KEY ("professional_id","weekday","slot")
);

-- CreateTable
CREATE TABLE "professional_documents" (
    "id" UUID NOT NULL,
    "professional_id" UUID NOT NULL,
    "kind" VARCHAR(40) NOT NULL,
    "storage_key" VARCHAR(255) NOT NULL,
    "uploaded_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "professional_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignments" (
    "id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "professional_id" UUID NOT NULL,
    "scheduled_date" DATE NOT NULL,
    "slot" "TimeSlot" NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'active',
    "assigned_by_id" UUID NOT NULL,
    "note" VARCHAR(300),
    "end_reason" VARCHAR(300),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ(3),

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_staff_id" UUID,
    "action" VARCHAR(60) NOT NULL,
    "resource_type" VARCHAR(40) NOT NULL,
    "resource_id" VARCHAR(64) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ip_hash" VARCHAR(64),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_settings" (
    "slug" VARCHAR(64) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updated_by_id" UUID,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "service_settings_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "notification_deliveries" (
    "id" UUID NOT NULL,
    "notification_id" UUID NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "status" "DeliveryStatus" NOT NULL,
    "provider" VARCHAR(40),
    "detail" VARCHAR(300),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staff_members_user_id_key" ON "staff_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "professionals_phone_key" ON "professionals"("phone");

-- CreateIndex
CREATE INDEX "professionals_verification_status_account_status_idx" ON "professionals"("verification_status", "account_status");

-- CreateIndex
CREATE INDEX "professional_categories_category_idx" ON "professional_categories"("category");

-- CreateIndex
CREATE INDEX "professional_service_areas_pincode_idx" ON "professional_service_areas"("pincode");

-- CreateIndex
CREATE INDEX "professional_documents_professional_id_idx" ON "professional_documents"("professional_id");

-- CreateIndex
CREATE INDEX "assignments_request_id_created_at_idx" ON "assignments"("request_id", "created_at");

-- CreateIndex
CREATE INDEX "assignments_professional_id_scheduled_date_idx" ON "assignments"("professional_id", "scheduled_date");

-- CreateIndex
CREATE INDEX "audit_logs_resource_type_resource_id_created_at_idx" ON "audit_logs"("resource_type", "resource_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE UNIQUE INDEX "notification_deliveries_notification_id_channel_key" ON "notification_deliveries"("notification_id", "channel");

-- CreateIndex
CREATE INDEX "notifications_request_id_idx" ON "notifications"("request_id");

-- CreateIndex
CREATE INDEX "otp_challenges_phone_purpose_created_at_idx" ON "otp_challenges"("phone", "purpose", "created_at" DESC);

-- CreateIndex
CREATE INDEX "request_events_created_at_idx" ON "request_events"("created_at" DESC);

-- CreateIndex
CREATE INDEX "service_requests_service_slug_created_at_idx" ON "service_requests"("service_slug", "created_at");

-- CreateIndex
CREATE INDEX "service_requests_preferred_date_idx" ON "service_requests"("preferred_date");

-- AddForeignKey
ALTER TABLE "request_events" ADD CONSTRAINT "request_events_actor_staff_id_fkey" FOREIGN KEY ("actor_staff_id") REFERENCES "staff_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_members" ADD CONSTRAINT "staff_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_categories" ADD CONSTRAINT "professional_categories_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_service_areas" ADD CONSTRAINT "professional_service_areas_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_availability" ADD CONSTRAINT "professional_availability_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_documents" ADD CONSTRAINT "professional_documents_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "service_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "staff_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_staff_id_fkey" FOREIGN KEY ("actor_staff_id") REFERENCES "staff_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Constraints Prisma's schema language can't express ─────────────────────

-- One active assignment per request, and a professional can't be double-booked for a date + slot.
-- These make concurrent assignment attempts safe even if two transactions race.
CREATE UNIQUE INDEX "assignments_one_active_per_request" ON "assignments" ("request_id") WHERE "status" = 'active';
CREATE UNIQUE INDEX "assignments_no_double_booking" ON "assignments" ("professional_id", "scheduled_date", "slot") WHERE "status" = 'active';

ALTER TABLE "professionals" ADD CONSTRAINT "professionals_phone_e164_in" CHECK ("phone" ~ '^\+91[6-9][0-9]{9}$');
ALTER TABLE "professional_service_areas" ADD CONSTRAINT "professional_service_areas_pincode_format" CHECK ("pincode" ~ '^[1-9][0-9]{5}$');
ALTER TABLE "professional_availability" ADD CONSTRAINT "professional_availability_weekday_range" CHECK ("weekday" BETWEEN 0 AND 6);
ALTER TABLE "professionals" ADD CONSTRAINT "professionals_verified_at_matches" CHECK (("verification_status" = 'verified') = ("verified_at" IS NOT NULL));
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_ended_when_inactive" CHECK (("status" = 'active') = ("ended_at" IS NULL));

-- Append-only history: audit logs and request status events can't be edited or deleted row by row.
CREATE FUNCTION "forbid_mutation"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME USING ERRCODE = 'restrict_violation';
END;
$$;
CREATE TRIGGER "audit_logs_append_only" BEFORE UPDATE OR DELETE ON "audit_logs" FOR EACH ROW EXECUTE FUNCTION "forbid_mutation"();
CREATE TRIGGER "request_events_append_only" BEFORE UPDATE OR DELETE ON "request_events" FOR EACH ROW EXECUTE FUNCTION "forbid_mutation"();

-- Existing notifications (created before delivery tracking) were stored in-app only.
INSERT INTO "notification_deliveries" ("id", "notification_id", "channel", "status", "detail", "attempts", "created_at", "updated_at")
SELECT gen_random_uuid(), "id", 'in_app', 'available', NULL, 0, "created_at", "created_at" FROM "notifications";

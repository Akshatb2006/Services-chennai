-- CreateEnum
CREATE TYPE "NotificationAudience" AS ENUM ('customer', 'professional');

-- AlterEnum
ALTER TYPE "AuthAudience" ADD VALUE 'professional';

-- AlterEnum
ALTER TYPE "EventActor" ADD VALUE 'professional';

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'professional';

-- DropIndex
DROP INDEX "notifications_user_id_created_at_idx";

-- AlterTable
ALTER TABLE "assignments" ADD COLUMN     "acknowledged_at" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "actor_professional_id" UUID;

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "audience" "NotificationAudience" NOT NULL DEFAULT 'customer';

-- AlterTable
ALTER TABLE "professionals" ADD COLUMN     "user_id" UUID;

-- AlterTable
ALTER TABLE "request_events" ADD COLUMN     "actor_professional_id" UUID;

-- CreateIndex
CREATE INDEX "notifications_user_id_audience_created_at_idx" ON "notifications"("user_id", "audience", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "professionals_user_id_key" ON "professionals"("user_id");

-- AddForeignKey
ALTER TABLE "request_events" ADD CONSTRAINT "request_events_actor_professional_id_fkey" FOREIGN KEY ("actor_professional_id") REFERENCES "professionals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professionals" ADD CONSTRAINT "professionals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_professional_id_fkey" FOREIGN KEY ("actor_professional_id") REFERENCES "professionals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


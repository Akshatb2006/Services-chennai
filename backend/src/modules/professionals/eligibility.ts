import type { IneligibilityReason, TimeSlot } from "@homecare/contracts";
import type { Prisma } from "../../generated/prisma/client.js";
import type { PrismaService } from "../../prisma/prisma.service.js";

export const professionalInclude = {
  categories: true,
  areas: true,
  availability: true,
} satisfies Prisma.ProfessionalInclude;

export type ProfessionalWithRelations = Prisma.ProfessionalGetPayload<{ include: typeof professionalInclude }>;

/** Calendar weekday (0 = Sunday) of a yyyy-mm-dd date. */
export const weekdayOf = (isoDate: string) => new Date(`${isoDate}T00:00:00Z`).getUTCDay();

/**
 * Rules a professional must meet to take a request at a date + slot. Pure except for the conflict
 * lookup, so the same check backs the eligibility list and the assignment transaction.
 */
export async function ineligibilityReasons(
  db: Prisma.TransactionClient | PrismaService,
  pro: ProfessionalWithRelations,
  need: { category: string; pincode: string; date: string; slot: TimeSlot; ignoreRequestId?: string },
): Promise<IneligibilityReason[]> {
  const reasons: IneligibilityReason[] = [];
  if (pro.verificationStatus !== "verified") reasons.push("not_verified");
  if (pro.accountStatus !== "active") reasons.push("not_active");
  if (pro.availabilityStatus !== "available") reasons.push("unavailable");
  if (!pro.categories.some((c) => c.category === need.category)) reasons.push("category_mismatch");
  if (!pro.areas.some((a) => a.pincode === need.pincode)) reasons.push("area_mismatch");
  const weekday = weekdayOf(need.date);
  if (!pro.availability.some((a) => a.weekday === weekday && a.slot === need.slot)) reasons.push("not_working_that_slot");
  const clash = await db.assignment.findFirst({
    where: {
      professionalId: pro.id,
      status: "active",
      scheduledDate: new Date(`${need.date}T00:00:00Z`),
      slot: need.slot,
      ...(need.ignoreRequestId && { requestId: { not: need.ignoreRequestId } }),
    },
    select: { id: true },
  });
  if (clash) reasons.push("schedule_conflict");
  return reasons;
}

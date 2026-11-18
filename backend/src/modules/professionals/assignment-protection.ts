import { HttpStatus } from "@nestjs/common";
import { getService } from "@homecare/catalog";
import type { AvailabilityStatus, RequestAddressSnapshot, TimeSlot } from "@homecare/contracts";
import { AppException } from "../../common/app-exception.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { isoDate } from "../requests/request-dto.js";
import { professionalInclude, weekdayOf } from "./eligibility.js";

export type ProposedSettings = {
  categories?: string[];
  pincodes?: string[];
  availability?: { weekday: number; slot: TimeSlot }[];
  availabilityStatus?: AvailabilityStatus;
};

/**
 * Confirmed and assigned appointments are protected: a change to categories, pincodes, weekly
 * availability or availability status that would make a professional ineligible for one of their
 * active assignments is refused (staff must reassign those jobs first). Used by both the admin and
 * the Pro app, so neither can silently invalidate an appointment.
 */
export async function assertSettingsKeepAssignments(tx: Prisma.TransactionClient, professionalId: string, proposed: ProposedSettings) {
  const pro = await tx.professional.findUniqueOrThrow({ where: { id: professionalId }, include: professionalInclude });
  const categories = proposed.categories ?? pro.categories.map((c) => c.category);
  const pincodes = proposed.pincodes ?? pro.areas.map((a) => a.pincode);
  const availability = proposed.availability ?? pro.availability.map((a) => ({ weekday: a.weekday, slot: a.slot }));
  const status = proposed.availabilityStatus ?? pro.availabilityStatus;

  const active = await tx.assignment.findMany({
    where: { professionalId, status: "active" },
    include: { request: { select: { serviceSlug: true, addressSnapshot: true } } },
    orderBy: [{ scheduledDate: "asc" }],
  });
  const broken = active.filter((a) => {
    const date = isoDate(a.scheduledDate);
    const pincode = (a.request.addressSnapshot as RequestAddressSnapshot).pincode;
    return (
      status === "unavailable" ||
      !categories.includes(getService(a.request.serviceSlug)?.category ?? "other") ||
      !pincodes.includes(pincode) ||
      !availability.some((x) => x.weekday === weekdayOf(date) && x.slot === a.slot)
    );
  });
  if (broken.length) {
    throw new AppException(
      "affects_assignments",
      `This change would affect ${broken.length} upcoming job${broken.length === 1 ? "" : "s"}. Those jobs need to be reassigned by Homecare operations first.`,
      HttpStatus.CONFLICT,
      { fields: Object.fromEntries(broken.map((a) => [a.id, `${getService(a.request.serviceSlug)?.name ?? "Job"} · ${isoDate(a.scheduledDate)} ${a.slot}`])) },
    );
  }
}

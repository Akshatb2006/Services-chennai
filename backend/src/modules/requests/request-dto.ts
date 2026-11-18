import { canCustomerCancel, type RequestAddressSnapshot, type RequestEvent, type ServiceRequest as ServiceRequestDto } from "@homecare/contracts";
import type { Assignment, Prisma, RequestEvent as EventRow, ServiceRequest } from "../../generated/prisma/client.js";

/** Include this when loading requests so the DTO can show the appointment. */
export const requestWithAppointment = {
  assignments: {
    where: { status: { in: ["active", "completed"] } },
    orderBy: { createdAt: "desc" },
    take: 1,
    include: { professional: { select: { fullName: true } } },
  },
} satisfies Prisma.ServiceRequestInclude;

type RequestRow = ServiceRequest & { assignments?: (Assignment & { professional: { fullName: string } })[] };

export const isoDate = (d: Date) => d.toISOString().slice(0, 10);

export const toRequestDto = (r: RequestRow): ServiceRequestDto => {
  const a = r.status === "cancelled" ? undefined : r.assignments?.[0];
  return {
    id: r.id,
    service: r.serviceSlug,
    status: r.status,
    details: r.details,
    preferredDate: isoDate(r.preferredDate),
    preferredTime: r.preferredTime,
    address: r.addressSnapshot as RequestAddressSnapshot,
    addressId: r.addressId,
    canCancel: canCustomerCancel(r.status),
    cancelReason: r.cancelReason,
    appointment: a
      ? {
          date: isoDate(a.scheduledDate),
          slot: a.slot,
          professionalFirstName: a.professional.fullName.split(/\s+/)[0],
          confirmed: r.status === "confirmed" || r.status === "in_progress" || r.status === "completed",
        }
      : null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
};

export const toEventDto = (e: EventRow): RequestEvent => ({
  id: e.id,
  fromStatus: e.fromStatus,
  toStatus: e.toStatus,
  actor: e.actor,
  note: e.note,
  createdAt: e.createdAt.toISOString(),
});

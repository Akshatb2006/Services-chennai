import { getService, categories } from "@homecare/catalog";
import { timeSlotLabels, type RequestStatus, type TimeSlot } from "@homecare/contracts";

export const serviceName = (slug: string) => getService(slug)?.name ?? slug;
export const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? id;
export const shortRef = (id: string) => `#${id.slice(0, 8).toUpperCase()}`;
export const formatPhone = (e164: string) => `${e164.slice(0, 3)} ${e164.slice(3, 8)} ${e164.slice(8)}`;

const dayFmt = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
export const formatDay = (iso: string) => dayFmt.format(new Date(`${iso}T00:00:00Z`));
export const formatSlot = (slot: string) => timeSlotLabels[slot as TimeSlot] ?? (slot === "flexible" ? "Flexible" : slot);

const dtFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
export const formatDateTime = (iso: string) => dtFmt.format(new Date(iso));

export function timeAgo(iso: string, now = Date.now()) {
  const s = Math.round((now - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}

/** Ops-facing status names (the customer app words "pending" as "Under review" too). */
export const statusLabels: Record<RequestStatus, string> = {
  pending: "Under review",
  assigned: "Assigned",
  confirmed: "Confirmed",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const actionLabels: Record<string, string> = {
  "request.reviewed": "Opened for review",
  "professional.assigned": "Professional assigned",
  "professional.reassigned": "Professional reassigned",
  "appointment.confirmed": "Appointment confirmed",
  "appointment.rescheduled": "Appointment rescheduled",
  "request.started": "Service started",
  "request.completed": "Service completed",
  "request.cancelled": "Request cancelled",
  "professional.created": "Professional registered",
  "professional.updated": "Professional updated",
  "professional.verified": "Professional verified",
  "professional.rejected": "Verification rejected",
  "professional.suspended": "Professional suspended",
  "professional.activated": "Professional reactivated",
  "professional.deactivated": "Professional deactivated",
  "service.enabled": "Service resumed",
  "service.disabled": "Service paused",
  "staff.created": "Staff added",
  "staff.updated": "Staff updated",
  "staff.signed_in": "Signed in",
  "staff.bootstrapped": "Staff created (CLI)",
  "professional.registered": "Registered in Pro app",
  "professional.self_updated": "Professional updated own profile",
  "assignment.acknowledged": "Assignment acknowledged",
  "bookings.flagged": "Bookings flagged for reassignment",
  "reminder.skipped": "Reminder skipped",
  "reminder.failed": "Reminder failed",
};

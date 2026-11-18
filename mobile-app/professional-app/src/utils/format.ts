import { categories, getService } from "@homecare/catalog";
import { timeSlotLabels, todayInIndia, type PreferredTime, type TimeSlot } from "@homecare/contracts";

export const serviceName = (slug: string) => getService(slug)?.name ?? "Service";
export const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? id;
export const slotLabel = (s: TimeSlot | PreferredTime) => (s === "flexible" ? "Flexible" : timeSlotLabels[s]);

const dayFmt = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
export const formatDay = (iso: string) => dayFmt.format(new Date(`${iso}T00:00:00Z`));
export const isToday = (iso: string, now = new Date()) => iso === todayInIndia(now);

/** "Today", "Tomorrow" or "Mon, 16 Nov" */
export function relativeDay(iso: string, now = new Date()) {
  const today = todayInIndia(now);
  if (iso === today) return "Today";
  const t = new Date(`${today}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + 1);
  if (iso === t.toISOString().slice(0, 10)) return "Tomorrow";
  return formatDay(iso);
}

const dtFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
export const formatDateTime = (iso: string) => dtFmt.format(new Date(iso));

export const formatPhone = (e164: string) => `${e164.slice(0, 3)} ${e164.slice(3, 8)} ${e164.slice(8)}`;

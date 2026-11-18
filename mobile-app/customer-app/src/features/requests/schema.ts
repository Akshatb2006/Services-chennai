import { isServiceSlug } from "@homecare/catalog";
import { addDays, createRequestSchema, preferredTimes as times, todayInIndia, type PreferredTime } from "@homecare/contracts";
import { z } from "zod";

export const preferredTimeLabels: Record<PreferredTime, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  flexible: "Flexible",
};
export const preferredTimes = times.map((value) => ({ value, label: preferredTimeLabels[value] }));

/** Request form = the API contract, plus a client-side catalogue check on the service. */
export const newRequestSchema = createRequestSchema.extend({
  service: z.string().refine(isServiceSlug, "Choose a service"),
  addressId: z.string().min(1, "Choose an address").pipe(z.uuid("Choose an address")),
});
export type NewRequestFormInput = z.input<typeof newRequestSchema>;
export type NewRequestForm = z.output<typeof newRequestSchema>;

/** The next `count` selectable dates (India time), labelled for chips. */
export function upcomingDates(count = 14, now = new Date()) {
  const today = todayInIndia(now);
  const weekday = new Intl.DateTimeFormat("en-IN", { weekday: "short", timeZone: "UTC" });
  const dayMonth = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
  return Array.from({ length: count }, (_, i) => {
    const value = addDays(today, i);
    const d = new Date(`${value}T00:00:00Z`);
    return { value, label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : `${weekday.format(d)} ${dayMonth.format(d)}` };
  });
}

export const formatPreferredDate = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

import { requestStatuses, canCustomerCancel, type ServiceRequest } from "@/types/request";

/**
 * TEST FIXTURES ONLY — never imported by app code.
 * One request per status so every state's UI can be rendered and checked.
 */
export const requestFixtures: ServiceRequest[] = requestStatuses.map((status, i) => ({
  id: `00000000-0000-4000-8000-00000000000${i}`,
  service: "deep-cleaning",
  status,
  details: "Fixture request for tests",
  preferredDate: `2026-01-0${i + 1}`,
  preferredTime: "morning",
  address: { label: "home", line1: "1 Test Street", line2: null, landmark: null, city: "Chennai", state: "Tamil Nadu", pincode: "600001" },
  addressId: null,
  canCancel: canCustomerCancel(status),
  cancelReason: null,
  appointment: status === "assigned" || status === "confirmed" || status === "in_progress" || status === "completed" ? { date: `2026-01-1${i}`, slot: "morning", professionalFirstName: "Pro", confirmed: status !== "assigned" } : null,
  createdAt: `2026-01-0${i + 1}T09:00:00.000Z`,
  updatedAt: `2026-01-0${i + 1}T09:00:00.000Z`,
}));

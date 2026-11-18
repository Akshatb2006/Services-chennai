import type { RequestStatus } from "@/types/request";
import { colors } from "@/theme";

type StatusStyle = { label: string; description: string; background: string; foreground: string };

/**
 * Visual + copy definition for every request state. "pending" is deliberately worded as
 * "under review": a new request is never presented as a confirmed booking.
 */
export const requestStatusStyles: Record<RequestStatus, StatusStyle> = {
  pending: { label: "Under review", description: "We've received your request and are reviewing it. It isn't confirmed yet.", background: colors.stone, foreground: colors.text },
  assigned: { label: "Professional assigned", description: "We've assigned a professional and will confirm the appointment with you shortly.", background: colors.ink, foreground: colors.textInverse },
  confirmed: { label: "Confirmed", description: "Your appointment is confirmed.", background: colors.citrus, foreground: colors.textOnAccent },
  in_progress: { label: "In progress", description: "The work is underway.", background: colors.ink, foreground: colors.citrus },
  completed: { label: "Completed", description: "This request is complete.", background: "#E3EFE6", foreground: colors.success },
  cancelled: { label: "Cancelled", description: "This request was cancelled.", background: "#F6E3E0", foreground: colors.error },
};

export const isActiveStatus = (s: RequestStatus) => s !== "completed" && s !== "cancelled";

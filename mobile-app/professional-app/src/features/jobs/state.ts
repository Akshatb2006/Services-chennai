import type { ProJobState } from "@homecare/contracts";
import { colors } from "@/theme";

/** Strong, glanceable job states. "Awaiting confirmation" never reads as a confirmed booking. */
export const jobStateStyles: Record<ProJobState, { label: string; background: string; foreground: string; hint: string }> = {
  awaiting_confirmation: { label: "Awaiting confirmation", background: colors.stone, foreground: colors.text, hint: "Homecare is confirming with the customer. Don't travel yet." },
  confirmed: { label: "Confirmed", background: colors.citrus, foreground: colors.textOnAccent, hint: "Confirmed with the customer." },
  in_progress: { label: "In progress", background: colors.ink, foreground: colors.citrus, hint: "You've started this job." },
  completed: { label: "Completed", background: "#E3EFE6", foreground: colors.success, hint: "Marked complete." },
  cancelled: { label: "Cancelled", background: "#F6E3E0", foreground: colors.error, hint: "This job was cancelled." },
  reassigned: { label: "Reassigned", background: colors.stone, foreground: colors.textSecondary, hint: "This job was moved to another professional." },
};

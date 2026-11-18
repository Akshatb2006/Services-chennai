import type { AccountStatus, RequestStatus, VerificationStatus } from "@homecare/contracts";
import { statusLabels } from "@/lib/format";
import { Badge } from "./ui";

const requestTone: Record<RequestStatus, "stone" | "citrus" | "ink" | "success" | "error" | "outline"> = {
  pending: "outline",
  assigned: "stone",
  confirmed: "citrus",
  in_progress: "ink",
  completed: "success",
  cancelled: "error",
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  return <Badge tone={requestTone[status]}>{statusLabels[status]}</Badge>;
}

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  return <Badge tone={status === "verified" ? "success" : status === "rejected" ? "error" : "outline"}>{status === "verified" ? "Verified" : status === "rejected" ? "Rejected" : "Pending verification"}</Badge>;
}

export function AccountBadge({ status }: { status: AccountStatus }) {
  return <Badge tone={status === "active" ? "stone" : status === "suspended" ? "error" : "outline"}>{status[0].toUpperCase() + status.slice(1)}</Badge>;
}

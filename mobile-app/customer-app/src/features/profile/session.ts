import { useQuery } from "@tanstack/react-query";
import { customersApi } from "@/services/api/customers";
import { queryKeys } from "@/services/api/query-client";
import { useSession as useSessionStore } from "@/store/session";
import type { CustomerProfile } from "@/types/customer";

/** Current session + profile. The profile is fetched only when signed in. */
export function useSession(): { isSignedIn: boolean; isRestoring: boolean; customer: CustomerProfile | null } {
  const status = useSessionStore((s) => s.status);
  const isSignedIn = status === "signedIn";
  const { data } = useQuery({ queryKey: queryKeys.customer, queryFn: ({ signal }) => customersApi.me(signal), enabled: isSignedIn });
  return { isSignedIn, isRestoring: status === "restoring", customer: isSignedIn ? (data ?? null) : null };
}

import { useQuery } from "@tanstack/react-query";
import { notificationsApi } from "@/services/api/notifications";
import { queryKeys } from "@/services/api/query-client";
import { useSession } from "@/store/session";

export function useNotifications() {
  const signedIn = useSession((s) => s.status === "signedIn");
  return useQuery({ queryKey: queryKeys.notifications, queryFn: ({ signal }) => notificationsApi.list(signal), enabled: signedIn });
}

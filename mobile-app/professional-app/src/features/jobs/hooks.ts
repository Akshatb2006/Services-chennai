import type { ProJob, ProJobScope } from "@homecare/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { proApi } from "@/services/api/pro";
import { queryKeys } from "@/services/api/query-client";
import { useSession } from "@/store/session";
import { useMe } from "@/features/session/hooks";

/** Jobs come only from the API, scoped by the server to this professional. */
export function useJobs(scope: ProJobScope) {
  const signedIn = useSession((s) => s.status === "signedIn");
  const registered = !!useMe().data?.professional;
  return useQuery({ queryKey: queryKeys.jobs(scope), queryFn: ({ signal }) => proApi.jobs(scope, signal), enabled: signedIn && registered });
}

export function useJob(id: string) {
  const signedIn = useSession((s) => s.status === "signedIn");
  return useQuery({ queryKey: queryKeys.job(id), queryFn: ({ signal }) => proApi.job(id, signal), enabled: signedIn && !!id });
}

/** acknowledge / start / complete — each authorised by the API (ownership, status, date, account state). */
export function useJobAction(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (action: "acknowledge" | "start" | "complete") =>
      action === "acknowledge" ? proApi.acknowledge(id) : action === "start" ? proApi.start(id) : proApi.complete(id),
    onSuccess: (job: ProJob) => {
      client.setQueryData(queryKeys.job(id), job);
      void client.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}

export function useNotifications() {
  const signedIn = useSession((s) => s.status === "signedIn");
  return useQuery({ queryKey: queryKeys.notifications, queryFn: ({ signal }) => proApi.notifications(signal), enabled: signedIn });
}

export function useEarnings() {
  const signedIn = useSession((s) => s.status === "signedIn");
  return useQuery({ queryKey: queryKeys.earnings, queryFn: ({ signal }) => proApi.earnings(signal), enabled: signedIn });
}

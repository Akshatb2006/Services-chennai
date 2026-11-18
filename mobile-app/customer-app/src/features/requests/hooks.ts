import type { CreateRequestInput } from "@homecare/contracts";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/services/api/query-client";
import { requestsApi } from "@/services/api/requests";
import { useSession } from "@/store/session";

/** My requests, newest first, paginated. Never fetched (or faked) when signed out. */
export function useRequests() {
  const signedIn = useSession((s) => s.status === "signedIn");
  const query = useInfiniteQuery({
    queryKey: queryKeys.requests,
    queryFn: ({ pageParam, signal }) => requestsApi.list({ cursor: pageParam, limit: 20 }, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: signedIn,
  });
  return { ...query, items: query.data?.pages.flatMap((p) => p.items) ?? [] };
}

export function useRequest(id: string) {
  const signedIn = useSession((s) => s.status === "signedIn");
  return useQuery({ queryKey: queryKeys.request(id), queryFn: ({ signal }) => requestsApi.get(id, signal), enabled: signedIn && !!id });
}

export function useRequestHistory(id: string) {
  const signedIn = useSession((s) => s.status === "signedIn");
  return useQuery({ queryKey: queryKeys.requestHistory(id), queryFn: ({ signal }) => requestsApi.history(id, signal), enabled: signedIn && !!id });
}

export function useCreateRequest() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRequestInput) => requestsApi.create(input),
    onSuccess: (request) => {
      client.setQueryData(queryKeys.request(request.id), request);
      return Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.requests }),
        client.invalidateQueries({ queryKey: queryKeys.notifications }),
      ]);
    },
  });
}

export function useCancelRequest(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (reason?: string) => requestsApi.cancel(id, reason),
    onSuccess: (request) => {
      client.setQueryData(queryKeys.request(id), request);
      return Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.requests }),
        client.invalidateQueries({ queryKey: queryKeys.requestHistory(id) }),
        client.invalidateQueries({ queryKey: queryKeys.notifications }),
      ]);
    },
  });
}

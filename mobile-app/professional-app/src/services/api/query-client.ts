import { QueryClient } from "@tanstack/react-query";
import { ApiError, ApiNotConfiguredError } from "./client";

/** Retry only transient failures (network, 5xx). Never retry 4xx or a missing backend. */
export function shouldRetry(count: number, error: unknown) {
  if (error instanceof ApiNotConfiguredError) return false;
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return count < 2;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30 * 1000, retry: shouldRetry },
    mutations: { retry: false },
  },
});

export const queryKeys = {
  me: ["me"] as const,
  jobs: (scope: string) => ["jobs", scope] as const,
  job: (id: string) => ["job", id] as const,
  notifications: ["notifications"] as const,
  earnings: ["earnings"] as const,
  documents: ["documents"] as const,
};

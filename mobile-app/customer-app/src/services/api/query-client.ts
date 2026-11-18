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
    queries: { staleTime: 60 * 1000, retry: shouldRetry },
    mutations: { retry: false },
  },
});

export const queryKeys = {
  services: ["services"] as const,
  customer: ["customer"] as const,
  addresses: ["addresses"] as const,
  requests: ["requests"] as const,
  request: (id: string) => ["requests", "detail", id] as const,
  requestHistory: (id: string) => ["requests", "history", id] as const,
  notifications: ["notifications"] as const,
};

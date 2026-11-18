import type { CreateRequestInput, Page, RequestEvent, RequestStatus, ServiceRequest } from "@homecare/contracts";
import { apiRequest } from "./client";

/** Customer request endpoints (all require a signed-in customer). */
export const requestsApi = {
  list: (params: { cursor?: string | null; status?: RequestStatus; limit?: number } = {}, signal?: AbortSignal) => {
    const q = new URLSearchParams();
    if (params.cursor) q.set("cursor", params.cursor);
    if (params.status) q.set("status", params.status);
    if (params.limit) q.set("limit", String(params.limit));
    const qs = q.toString();
    return apiRequest<Page<ServiceRequest>>(`/requests${qs ? `?${qs}` : ""}`, { signal });
  },
  get: (id: string, signal?: AbortSignal) => apiRequest<ServiceRequest>(`/requests/${encodeURIComponent(id)}`, { signal }),
  history: (id: string, signal?: AbortSignal) => apiRequest<RequestEvent[]>(`/requests/${encodeURIComponent(id)}/history`, { signal }),
  create: (input: CreateRequestInput) => apiRequest<ServiceRequest>("/requests", { method: "POST", body: input }),
  cancel: (id: string, reason?: string) => apiRequest<ServiceRequest>(`/requests/${encodeURIComponent(id)}/cancel`, { method: "POST", body: { reason } }),
};

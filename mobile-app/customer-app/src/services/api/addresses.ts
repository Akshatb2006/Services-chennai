import type { Address, CreateAddressInput, UpdateAddressInput } from "@homecare/contracts";
import { apiRequest } from "./client";

export const addressesApi = {
  list: (signal?: AbortSignal) => apiRequest<Address[]>("/addresses", { signal }),
  create: (input: CreateAddressInput) => apiRequest<Address>("/addresses", { method: "POST", body: input }),
  update: (id: string, input: UpdateAddressInput) => apiRequest<Address>(`/addresses/${encodeURIComponent(id)}`, { method: "PATCH", body: input }),
  remove: (id: string) => apiRequest<{ deleted: true }>(`/addresses/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

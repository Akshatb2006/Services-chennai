import type { CustomerProfile, UpdateCustomerInput } from "@homecare/contracts";
import { apiRequest } from "./client";

export const customersApi = {
  me: (signal?: AbortSignal) => apiRequest<CustomerProfile>("/customers/me", { signal }),
  update: (input: UpdateCustomerInput) => apiRequest<CustomerProfile>("/customers/me", { method: "PATCH", body: input }),
};

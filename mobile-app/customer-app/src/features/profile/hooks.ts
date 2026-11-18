import type { UpdateCustomerInput } from "@homecare/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { customersApi } from "@/services/api/customers";
import { queryKeys } from "@/services/api/query-client";

export function useUpdateProfile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCustomerInput) => customersApi.update(input),
    onSuccess: (profile) => client.setQueryData(queryKeys.customer, profile),
  });
}

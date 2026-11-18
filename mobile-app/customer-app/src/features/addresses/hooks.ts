import type { CreateAddressInput, UpdateAddressInput } from "@homecare/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addressesApi } from "@/services/api/addresses";
import { queryKeys } from "@/services/api/query-client";
import { useSession } from "@/store/session";

export function useAddresses() {
  const signedIn = useSession((s) => s.status === "signedIn");
  return useQuery({ queryKey: queryKeys.addresses, queryFn: ({ signal }) => addressesApi.list(signal), enabled: signedIn });
}

function useAddressMutation<T>(fn: (input: T) => Promise<unknown>) {
  const client = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.addresses }) });
}

export const useCreateAddress = () => useAddressMutation((input: CreateAddressInput) => addressesApi.create(input));
export const useUpdateAddress = () => useAddressMutation(({ id, input }: { id: string; input: UpdateAddressInput }) => addressesApi.update(id, input));
export const useDeleteAddress = () => useAddressMutation((id: string) => addressesApi.remove(id));

/** One-line address for lists and confirmations. */
export function formatAddress(a: { line1: string; line2?: string | null; landmark?: string | null; city: string; pincode: string }) {
  return [a.line1, a.line2, a.landmark, `${a.city} ${a.pincode}`].filter(Boolean).join(", ");
}

export const addressLabelNames = { home: "Home", work: "Work", other: "Other" } as const;

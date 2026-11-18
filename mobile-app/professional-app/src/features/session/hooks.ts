import type { RegisterProfessionalInput, SendOtpInput, UpdateMyProfessionalInput, VerifyOtpInput } from "@homecare/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { proApi } from "@/services/api/pro";
import { queryClient, queryKeys } from "@/services/api/query-client";
import { useSession } from "@/store/session";

/** The signed-in professional (null profile until they register). Fetched only when signed in. */
export function useMe() {
  const signedIn = useSession((s) => s.status === "signedIn");
  return useQuery({ queryKey: queryKeys.me, queryFn: ({ signal }) => proApi.me(signal), enabled: signedIn });
}

export const useSendOtp = () => useMutation({ mutationFn: (input: SendOtpInput) => proApi.sendOtp(input) });

export function useVerifyOtp() {
  return useMutation({
    mutationFn: (input: VerifyOtpInput) => proApi.verifyOtp(input),
    onSuccess: async (session) => {
      await useSession.getState().signIn(session);
      queryClient.setQueryData(queryKeys.me, session.me);
    },
  });
}

export const useSignOut = () => useMutation({ mutationFn: () => useSession.getState().signOut() });

export function useRegister() {
  const client = useQueryClient();
  return useMutation({ mutationFn: (input: RegisterProfessionalInput) => proApi.register(input), onSuccess: (me) => client.setQueryData(queryKeys.me, me) });
}

/** Profile/availability changes. The API refuses (409 affects_assignments) anything that would break a booked job. */
export function useUpdateMe() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateMyProfessionalInput) => proApi.update(input),
    onSuccess: (me) => {
      client.setQueryData(queryKeys.me, me);
      void client.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}

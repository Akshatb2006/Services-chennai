import type { SendOtpInput, VerifyOtpInput } from "@homecare/contracts";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "@/services/api/auth";
import { queryClient, queryKeys } from "@/services/api/query-client";
import { useSession } from "@/store/session";

export function useSendOtp() {
  return useMutation({ mutationFn: (input: SendOtpInput) => authApi.sendOtp(input) });
}

/** Verifies the code, stores the session and seeds the profile cache. */
export function useVerifyOtp() {
  return useMutation({
    mutationFn: (input: VerifyOtpInput) => authApi.verifyOtp(input),
    onSuccess: async (session) => {
      await useSession.getState().signIn(session);
      queryClient.setQueryData(queryKeys.customer, session.customer);
    },
  });
}

export function useSignOut() {
  return useMutation({ mutationFn: () => useSession.getState().signOut() });
}

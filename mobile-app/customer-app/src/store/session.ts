import type { AuthTokens } from "@homecare/contracts";
import { create } from "zustand";
import { authApi } from "@/services/api/auth";
import { ApiError } from "@/services/api/client";
import { isApiConfigured } from "@/services/api/config";
import { queryClient } from "@/services/api/query-client";
import { registerSessionBridge } from "@/services/api/session-bridge";
import { clearRefreshToken, getRefreshToken, setRefreshToken } from "@/services/session/session";

/**
 * Auth session (client state only). Server data — the profile, addresses, requests — lives in
 * TanStack Query. The access token stays in memory; the refresh token in SecureStore.
 */
type SessionState = {
  status: "restoring" | "signedOut" | "signedIn";
  accessToken: string | null;
  restore: () => Promise<void>;
  signIn: (tokens: AuthTokens) => Promise<void>;
  signOut: (opts?: { remote?: boolean }) => Promise<void>;
};

let refreshInFlight: Promise<string | null> | null = null;

/** Rotates the refresh token. Concurrent callers share one network call. */
function refreshAccessToken(): Promise<string | null> {
  refreshInFlight ??= (async () => {
    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) return null;
      const tokens = await authApi.refresh(refreshToken);
      await setRefreshToken(tokens.refreshToken); // persist the rotated token before using the new access token
      useSession.setState({ status: "signedIn", accessToken: tokens.accessToken });
      return tokens.accessToken;
    } catch (err) {
      // Only an explicit rejection ends the session; a network blip keeps the stored token for next time.
      if (err instanceof ApiError && (err.status === 401 || err.status === 422)) await useSession.getState().signOut({ remote: false });
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

export const useSession = create<SessionState>((set, get) => ({
  status: "restoring",
  accessToken: null,

  restore: async () => {
    if (!isApiConfigured || !(await getRefreshToken().catch(() => null))) {
      set({ status: "signedOut" });
      return;
    }
    const token = await refreshAccessToken();
    // Offline at launch with a stored session: stay signed out in the UI until the next refresh succeeds.
    if (!token && get().status !== "signedIn") set({ status: "signedOut" });
  },

  signIn: async (tokens) => {
    await setRefreshToken(tokens.refreshToken);
    set({ status: "signedIn", accessToken: tokens.accessToken });
  },

  signOut: async ({ remote = true } = {}) => {
    if (remote && get().accessToken) await authApi.logout().catch(() => {}); // best effort; the server session also expires on its own
    await clearRefreshToken().catch(() => {});
    set({ status: "signedOut", accessToken: null });
    queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== "services" });
  },
}));

registerSessionBridge({
  getAccessToken: async () => useSession.getState().accessToken,
  refreshAccessToken,
});

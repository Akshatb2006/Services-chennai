import * as SecureStore from "expo-secure-store";
import { apiRequest } from "@/services/api/client";
import { queryClient } from "@/services/api/query-client";
import { useSession } from "@/store/session";
import { createFakeProApi, signInDirectly } from "./support/fake-pro-api";

const store = (SecureStore as unknown as { __store: Map<string, string> }).__store;

beforeEach(() => {
  store.clear();
  queryClient.clear();
  useSession.setState({ status: "signedOut", accessToken: null });
});

describe("professional session", () => {
  it("stores only the refresh token, under the Pro app's own key", async () => {
    const api = createFakeProApi();
    await signInDirectly(api);
    expect([...store.entries()]).toEqual([["homecare.pro.session.refresh", api.state.refreshToken]]);
  });

  it("restores the session at launch from the stored refresh token", async () => {
    const api = createFakeProApi();
    await signInDirectly(api);
    useSession.setState({ status: "restoring", accessToken: null });
    await useSession.getState().restore();
    expect(useSession.getState()).toMatchObject({ status: "signedIn", accessToken: api.state.accessToken });
  });

  it("refreshes an expired access token once and retries", async () => {
    const api = createFakeProApi();
    await signInDirectly(api);
    api.state.accessToken = "rotated-elsewhere";
    await Promise.all([apiRequest("/pro/me"), apiRequest("/pro/jobs?scope=upcoming")]);
    expect(api.state.calls.filter((c) => c.path === "/pro/auth/refresh")).toHaveLength(1);
  });

  it("signs out when the refresh token is rejected", async () => {
    const api = createFakeProApi();
    await signInDirectly(api);
    api.state.refreshToken = "revoked";
    api.state.accessToken = "expired";
    await expect(apiRequest("/pro/me")).rejects.toMatchObject({ status: 401 });
    expect(useSession.getState().status).toBe("signedOut");
    expect(store.size).toBe(0);
  });

  it("logs out on the server and clears credentials", async () => {
    const api = createFakeProApi();
    await signInDirectly(api);
    await useSession.getState().signOut();
    expect(api.state.calls.map((c) => c.path)).toContain("/pro/auth/logout");
    expect(store.size).toBe(0);
    expect(useSession.getState().status).toBe("signedOut");
  });
});

describe("timeouts", () => {
  it("fails a request that never answers as a network error instead of hanging", async () => {
    jest.useFakeTimers();
    globalThis.fetch = jest.fn(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => init.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })))),
    ) as unknown as typeof fetch;
    const pending = apiRequest("/pro/me", { auth: false });
    jest.advanceTimersByTime(15_001);
    await expect(pending).rejects.toMatchObject({ code: "network_error" });
    jest.useRealTimers();
  });
});

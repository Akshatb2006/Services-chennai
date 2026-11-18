import * as SecureStore from "expo-secure-store";
import { apiRequest, ApiError } from "@/services/api/client";
import { queryClient } from "@/services/api/query-client";
import { useSession } from "@/store/session";
import { createFakeApi, signInDirectly } from "./support/fake-api";

const store = (SecureStore as unknown as { __store: Map<string, string> }).__store;

beforeEach(async () => {
  store.clear();
  queryClient.clear();
  useSession.setState({ status: "signedOut", accessToken: null });
});

describe("API client", () => {
  it("unwraps { data } and sends the access token", async () => {
    const api = createFakeApi();
    await signInDirectly(api);
    const me = await apiRequest<{ phone: string }>("/customers/me");
    expect(me.phone).toBe("+919840012345");
    expect(api.state.calls[0].auth).toBe(`Bearer ${api.state.accessToken}`);
  });

  it("maps { error } to a typed ApiError with field messages", async () => {
    globalThis.fetch = jest.fn(async () =>
      new Response(JSON.stringify({ error: { code: "validation_failed", message: "Enter a valid pincode", fields: { pincode: "Enter a valid pincode" } } }), { status: 422 }),
    ) as unknown as typeof fetch;
    await expect(apiRequest("/addresses", { method: "POST", body: {}, auth: false })).rejects.toMatchObject({
      status: 422,
      code: "validation_failed",
      fields: { pincode: "Enter a valid pincode" },
    });
  });

  it("reports network failures as a friendly ApiError", async () => {
    globalThis.fetch = jest.fn(async () => {
      throw new TypeError("Network request failed");
    }) as unknown as typeof fetch;
    const err = (await apiRequest("/services", { auth: false }).catch((e: unknown) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("network_error");
  });

  it("refreshes an expired access token once and retries, rotating the stored refresh token", async () => {
    const api = createFakeApi();
    await signInDirectly(api);
    const oldRefresh = api.state.refreshToken;
    api.state.expireAccessToken = true;

    const me = await apiRequest<{ phone: string }>("/customers/me");
    expect(me.phone).toBe("+919840012345");
    expect(api.state.calls.map((c) => c.path)).toEqual(["/customers/me", "/auth/refresh", "/customers/me"]);
    expect(store.get("homecare.session.refresh")).toBe(api.state.refreshToken);
    expect(api.state.refreshToken).not.toBe(oldRefresh);
  });

  it("shares one refresh between concurrent requests", async () => {
    const api = createFakeApi();
    await signInDirectly(api);
    api.state.accessToken = "rotated-elsewhere"; // every current token is now rejected
    await Promise.all([apiRequest("/customers/me"), apiRequest("/addresses"), apiRequest("/requests")]);
    expect(api.state.calls.filter((c) => c.path === "/auth/refresh")).toHaveLength(1);
  });

  it("signs out when the refresh token is rejected", async () => {
    const api = createFakeApi();
    await signInDirectly(api);
    api.state.refreshToken = "revoked";
    api.state.expireAccessToken = true;
    await expect(apiRequest("/customers/me")).rejects.toMatchObject({ status: 401 });
    expect(useSession.getState().status).toBe("signedOut");
    expect(store.has("homecare.session.refresh")).toBe(false);
  });
});

describe("session", () => {
  it("persists only the refresh token, and restores the session from it", async () => {
    const api = createFakeApi();
    await signInDirectly(api);
    expect([...store.values()]).toEqual([api.state.refreshToken]);

    useSession.setState({ status: "restoring", accessToken: null }); // app relaunch
    await useSession.getState().restore();
    expect(useSession.getState().status).toBe("signedIn");
    expect(useSession.getState().accessToken).toBe(api.state.accessToken);
  });

  it("starts signed out without a stored token", async () => {
    createFakeApi();
    useSession.setState({ status: "restoring" });
    await useSession.getState().restore();
    expect(useSession.getState().status).toBe("signedOut");
  });

  it("logs out on the server and clears local credentials", async () => {
    const api = createFakeApi();
    await signInDirectly(api);
    await useSession.getState().signOut();
    expect(api.state.calls.map((c) => c.path)).toContain("/auth/logout");
    expect(useSession.getState()).toMatchObject({ status: "signedOut", accessToken: null });
    expect(store.size).toBe(0);
  });
});

describe("timeouts", () => {
  it("fails a request that never answers as a network error instead of hanging", async () => {
    jest.useFakeTimers();
    globalThis.fetch = jest.fn(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => init.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })))),
    ) as unknown as typeof fetch;
    const pending = apiRequest("/services", { auth: false });
    jest.advanceTimersByTime(15_001);
    await expect(pending).rejects.toMatchObject({ code: "network_error", message: expect.stringMatching(/taking too long/) });
    jest.useRealTimers();
  });
});

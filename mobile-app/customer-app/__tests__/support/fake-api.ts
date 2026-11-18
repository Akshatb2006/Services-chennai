/**
 * In-memory stand-in for the Homecare API, implementing the same contract
 * ({ data } / { error }) for the endpoints the app uses. Test-only.
 */
import type { Address, CustomerProfile, RequestEvent, ServiceRequest } from "@homecare/contracts";
import { categories, services } from "@homecare/catalog";
import { canCustomerCancel } from "@homecare/contracts";
import { useSession } from "@/store/session";

export const VALID_CODE = "123456";

/** Services the fake API reports as paused by operations. */
export const pausedServices = new Set<string>();

type State = {
  customer: CustomerProfile;
  addresses: Address[];
  requests: ServiceRequest[];
  history: Record<string, RequestEvent[]>;
  accessToken: string;
  refreshToken: string;
  tokenSeq: number;
  /** Next protected call returns 401 (simulates an expired access token). */
  expireAccessToken: boolean;
  calls: { method: string; path: string; auth?: string; body?: unknown }[];
};

const ok = (data: unknown, status = 200) => new Response(JSON.stringify({ data }), { status, headers: { "content-type": "application/json" } });
const fail = (status: number, code: string, message: string, fields?: Record<string, string>) =>
  new Response(JSON.stringify({ error: { code, message, ...(fields && { fields }) } }), { status, headers: { "content-type": "application/json" } });

export function createFakeApi(seed: { profileComplete?: boolean; addresses?: Address[] } = {}) {
  const now = "2026-11-15T09:00:00.000Z";
  const s: State = {
    customer: { id: "c1", phone: "+919840012345", fullName: seed.profileComplete ? "Asha" : null, email: null, createdAt: now, profileComplete: !!seed.profileComplete },
    addresses: seed.addresses ?? [],
    requests: [],
    history: {},
    accessToken: "",
    refreshToken: "",
    tokenSeq: 0,
    expireAccessToken: false,
    calls: [],
  };
  const issue = () => {
    s.tokenSeq++;
    s.accessToken = `access-${s.tokenSeq}`;
    s.refreshToken = `refresh-token-value-${s.tokenSeq}-xxxxxxxxxxxxxxxx`;
    return { accessToken: s.accessToken, accessTokenExpiresIn: 900, refreshToken: s.refreshToken, refreshTokenExpiresAt: now };
  };

  const handler = async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = new URL(String(input));
    const method = init.method ?? "GET";
    const path = url.pathname;
    const body = init.body ? JSON.parse(String(init.body)) : undefined;
    const auth = (init.headers as Record<string, string> | undefined)?.Authorization;
    s.calls.push({ method, path, auth, body });

    // Public auth endpoints
    if (path === "/auth/send-otp") return ok({ expiresInSeconds: 300, resendAfterSeconds: 30 });
    if (path === "/services") return ok({ categories, services: services.filter((x) => !pausedServices.has(x.slug)) });
    if (path === "/auth/verify-otp") {
      if (body.code !== VALID_CODE) return fail(400, "otp_invalid", "That code is incorrect or has expired. Check the code or request a new one.");
      return ok({ ...issue(), customer: s.customer });
    }
    if (path === "/auth/refresh") {
      if (body.refreshToken !== s.refreshToken) return fail(401, "session_expired", "Your session has expired. Please sign in again.");
      return ok(issue());
    }

    // Everything else requires the current access token
    if (s.expireAccessToken || auth !== `Bearer ${s.accessToken}` || !s.accessToken) {
      s.expireAccessToken = false;
      return fail(401, "session_expired", "Your session has expired. Please sign in again.");
    }
    if (path === "/auth/logout") {
      s.accessToken = "";
      s.refreshToken = "";
      return ok({ signedOut: true });
    }
    if (path === "/customers/me" && method === "GET") return ok(s.customer);
    if (path === "/customers/me" && method === "PATCH") {
      s.customer = { ...s.customer, ...body, email: body.email || null };
      s.customer.profileComplete = !!s.customer.fullName;
      return ok(s.customer);
    }
    if (path === "/addresses" && method === "GET") return ok(s.addresses);
    if (path === "/addresses" && method === "POST") {
      const a: Address = { id: `00000000-0000-4000-8000-0000000000a${s.addresses.length}`, line2: null, landmark: null, latitude: null, longitude: null, createdAt: now, updatedAt: now, ...body, isDefault: s.addresses.length === 0 };
      s.addresses.push(a);
      return ok(a, 201);
    }
    if (path === "/requests" && method === "POST") {
      const address = s.addresses.find((a) => a.id === body.addressId);
      if (!address) return fail(404, "not_found", "Address not found");
      const r: ServiceRequest = {
        id: `00000000-0000-4000-8000-00000000010${s.requests.length}`,
        service: body.service,
        status: "pending",
        details: body.details,
        preferredDate: body.preferredDate,
        preferredTime: body.preferredTime,
        address: { label: address.label, line1: address.line1, line2: address.line2, landmark: address.landmark, city: address.city, state: address.state, pincode: address.pincode },
        addressId: address.id,
        canCancel: true,
        cancelReason: null,
        appointment: null,
        createdAt: now,
        updatedAt: now,
      };
      s.requests.unshift(r);
      s.history[r.id] = [{ id: `e-${r.id}-0`, fromStatus: null, toStatus: "pending", actor: "customer", note: "Request submitted", createdAt: now }];
      return ok(r, 201);
    }
    if (path === "/requests" && method === "GET") return ok({ items: s.requests, nextCursor: null });
    const m = path.match(/^\/requests\/([\w-]+)(\/history|\/cancel)?$/);
    if (m) {
      const r = s.requests.find((x) => x.id === m[1]);
      if (!r) return fail(404, "not_found", "Request not found");
      if (m[2] === "/history") return ok(s.history[r.id]);
      if (m[2] === "/cancel") {
        if (!canCustomerCancel(r.status)) return fail(409, "request_not_cancellable", "This request can no longer be cancelled in the app.");
        s.history[r.id].push({ id: `e-${r.id}-1`, fromStatus: r.status, toStatus: "cancelled", actor: "customer", note: "Cancelled by customer", createdAt: now });
        Object.assign(r, { status: "cancelled", canCancel: false });
        return ok(r);
      }
      return ok(r);
    }
    if (path === "/notifications") return ok([]);
    return fail(404, "not_found", `No fake route for ${method} ${path}`);
  };

  const fetchMock = jest.fn(handler);
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return { state: s, fetch: fetchMock };
}

export const chennaiAddress: Address = {
  id: "00000000-0000-4000-8000-0000000000aa",
  label: "home",
  line1: "12 Example Street, Flat 3",
  line2: null,
  landmark: null,
  city: "Chennai",
  state: "Tamil Nadu",
  pincode: "600020",
  latitude: null,
  longitude: null,
  isDefault: true,
  createdAt: "2026-11-15T09:00:00.000Z",
  updatedAt: "2026-11-15T09:00:00.000Z",
};

/** Puts the app in a signed-in state against the fake API (as if the customer had verified a code). */
export async function signInDirectly(api: ReturnType<typeof createFakeApi>) {
  const res = await fetch("http://api.test/auth/verify-otp", { method: "POST", body: JSON.stringify({ phone: "+919840012345", code: VALID_CODE }) });
  const { data } = await res.json();
  await useSession.getState().signIn(data);
  api.state.calls.length = 0;
  return data;
}

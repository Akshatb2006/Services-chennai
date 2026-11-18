/** In-memory stand-in for the /pro API (same { data } / { error } contract). Test-only. */
import type { AppNotification, MyProfessionalProfile, ProJob, ProMe } from "@homecare/contracts";
import { todayInIndia } from "@homecare/contracts";
import { useSession } from "@/store/session";

export const VALID_CODE = "123456";
const now = "2026-11-15T09:00:00.000Z";

const ok = (data: unknown, status = 200) => new Response(JSON.stringify({ data }), { status, headers: { "content-type": "application/json" } });
const fail = (status: number, code: string, message: string, fields?: Record<string, string>) =>
  new Response(JSON.stringify({ error: { code, message, ...(fields && { fields }) } }), { status, headers: { "content-type": "application/json" } });

export const profile = (over: Partial<MyProfessionalProfile> = {}): MyProfessionalProfile => ({
  id: "p1",
  fullName: "Lakshmi Devi",
  verificationStatus: "verified",
  accountStatus: "active",
  availabilityStatus: "available",
  categories: ["cleaning"],
  pincodes: ["600020"],
  availability: [1, 2, 3].map((weekday) => ({ weekday, slot: "morning" as const })),
  verifiedAt: now,
  createdAt: now,
  ...over,
});

export const job = (over: Partial<ProJob> = {}): ProJob => ({
  id: "00000000-0000-4000-8000-0000000000j1",
  requestId: "00000000-0000-4000-8000-0000000000r1",
  service: "deep-cleaning",
  state: "confirmed",
  date: todayInIndia(),
  slot: "morning",
  assignedAt: now,
  acknowledgedAt: null,
  details: "2BHK deep clean, kitchen first",
  address: { label: "home", line1: "12 Example Street", line2: null, landmark: null, city: "Chennai", state: "Tamil Nadu", pincode: "600020" },
  preferredDate: todayInIndia(),
  preferredTime: "morning",
  customer: { firstName: "Kavya", phone: "+919840012345" },
  actions: ["acknowledge", "start"],
  startBlockedReason: null,
  ...over,
});

export function createFakeProApi(seed: { professional?: MyProfessionalProfile | null; jobs?: ProJob[]; notifications?: AppNotification[] } = {}) {
  const s = {
    me: { phone: "+919840012345", professional: seed.professional === undefined ? profile() : seed.professional, documents: { storageConfigured: false, count: 0 } } as ProMe,
    jobs: seed.jobs ?? [],
    notifications: seed.notifications ?? [],
    accessToken: "",
    refreshToken: "",
    seq: 0,
    calls: [] as { method: string; path: string; body?: unknown }[],
  };
  const issue = () => {
    s.seq++;
    s.accessToken = `access-${s.seq}`;
    s.refreshToken = `refresh-token-${s.seq}-xxxxxxxxxxxxxxxxxxxxxxxxxx`;
    return { accessToken: s.accessToken, accessTokenExpiresIn: 900, refreshToken: s.refreshToken, refreshTokenExpiresAt: now };
  };

  const handler = async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = new URL(String(input));
    const method = init.method ?? "GET";
    const path = url.pathname;
    const body = init.body ? JSON.parse(String(init.body)) : undefined;
    s.calls.push({ method, path, body });
    if (!path.startsWith("/pro/")) return fail(401, "session_expired", "Wrong audience");

    if (path === "/pro/auth/send-otp") return ok({ expiresInSeconds: 300, resendAfterSeconds: 30 });
    if (path === "/pro/auth/verify-otp") return body.code === VALID_CODE ? ok({ ...issue(), me: s.me }) : fail(400, "otp_invalid", "That code is incorrect or has expired.");
    if (path === "/pro/auth/refresh") return body.refreshToken === s.refreshToken ? ok(issue()) : fail(401, "session_expired", "Your session has expired.");

    const auth = (init.headers as Record<string, string> | undefined)?.Authorization;
    if (!s.accessToken || auth !== `Bearer ${s.accessToken}`) return fail(401, "session_expired", "Your session has expired.");
    if (path === "/pro/auth/logout") {
      s.accessToken = "";
      s.refreshToken = "";
      return ok({ signedOut: true });
    }
    if (path === "/pro/me" && method === "GET") return ok(s.me);
    if (path === "/pro/me" && method === "POST") {
      s.me = { ...s.me, professional: profile({ ...body, verificationStatus: "pending", verifiedAt: null }) };
      return ok(s.me, 201);
    }
    if (path === "/pro/me" && method === "PATCH") {
      const active = s.jobs.filter((j) => ["awaiting_confirmation", "confirmed", "in_progress"].includes(j.state));
      if (body.availabilityStatus === "unavailable" && active.length) {
        return fail(409, "affects_assignments", `This change would affect ${active.length} upcoming job. Those jobs need to be reassigned by Homecare operations first.`, Object.fromEntries(active.map((j) => [j.id, `Deep Cleaning · ${j.date} morning`])));
      }
      s.me = { ...s.me, professional: { ...s.me.professional!, ...body } };
      return ok(s.me);
    }
    if (path === "/pro/me/notifications") return ok(s.notifications);
    if (path === "/pro/me/earnings") return ok({ status: "not_available", message: "Payments and payouts aren't set up in Homecare yet." });
    if (path === "/pro/me/documents") return ok({ storageConfigured: false, documents: [] });
    if (path === "/pro/jobs") {
      const scope = url.searchParams.get("scope");
      const inScope = (j: ProJob) =>
        scope === "all" || (scope === "completed" ? j.state === "completed" : scope === "cancelled" ? j.state === "cancelled" || j.state === "reassigned" : !["completed", "cancelled", "reassigned"].includes(j.state));
      return ok(s.jobs.filter(inScope));
    }
    const m = path.match(/^\/pro\/jobs\/([\w-]+)(\/\w+)?$/);
    if (m) {
      const j = s.jobs.find((x) => x.id === m[1]);
      if (!j) return fail(404, "not_found", "Job not found");
      const action = m[2]?.slice(1);
      if (!action) return ok(j);
      if (!j.actions.includes(action as never)) return fail(409, "invalid_transition", "Not allowed now.");
      if (action === "acknowledge") Object.assign(j, { acknowledgedAt: now, actions: j.actions.filter((a) => a !== "acknowledge") });
      if (action === "start") Object.assign(j, { state: "in_progress", actions: ["complete"] });
      if (action === "complete") Object.assign(j, { state: "completed", actions: [] });
      return ok(j);
    }
    return fail(404, "not_found", `No fake route for ${method} ${path}`);
  };
  globalThis.fetch = jest.fn(handler) as unknown as typeof fetch;
  return { state: s };
}

export async function signInDirectly(api: ReturnType<typeof createFakeProApi>) {
  const res = await fetch("http://api.test/pro/auth/verify-otp", { method: "POST", body: JSON.stringify({ phone: "+919840012345", code: VALID_CODE }) });
  const { data } = await res.json();
  await useSession.getState().signIn(data);
  api.state.calls.length = 0;
}

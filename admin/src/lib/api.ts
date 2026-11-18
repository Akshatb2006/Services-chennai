import type { AdminSession, ApiErrorBody, ApiErrorCode } from "@homecare/contracts";

export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: ApiErrorCode | "network_error",
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Staff session in the browser:
 * - access token in memory only (never localStorage),
 * - refresh token in an httpOnly, SameSite=Strict cookie set by the API (JS can't read it),
 * - refresh calls carry the x-homecare-admin header (CSRF protection on the cookie route).
 */
let accessToken: string | null = null;
let onSessionEnd: (() => void) | null = null;
let refreshing: Promise<AdminSession | null> | null = null;

export const setAccessToken = (t: string | null) => {
  accessToken = t;
};
export const setSessionEndHandler = (fn: () => void) => {
  onSessionEnd = fn;
};

async function parse<T>(res: Response): Promise<T> {
  const json = (await res.json().catch(() => null)) as ({ data: T } & Partial<ApiErrorBody>) | null;
  if (res.ok && json && "data" in json) return json.data;
  const e = json?.error;
  throw new ApiError(e?.message ?? `Request failed (${res.status})`, res.status, e?.code ?? "internal_error", e?.fields);
}

async function send(path: string, init: RequestInit & { json?: unknown }) {
  try {
    return await fetch(`${API_BASE}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        Accept: "application/json",
        "x-homecare-admin": "1",
        ...(init.json !== undefined && { "Content-Type": "application/json" }),
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        ...init.headers,
      },
      body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
    });
  } catch {
    throw new ApiError("Can't reach the Homecare API. Check your connection.", 0, "network_error");
  }
}

/** Uses the refresh cookie to get a new access token. Shared between concurrent callers. */
export function refreshSession(): Promise<AdminSession | null> {
  refreshing ??= (async () => {
    try {
      const res = await send("/admin/auth/refresh", { method: "POST" });
      if (!res.ok) return null;
      const session = await parse<AdminSession>(res);
      accessToken = session.accessToken;
      return session;
    } catch {
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

export async function api<T>(path: string, init: { method?: string; json?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  let res = await send(path, init);
  if (res.status === 401 && accessToken) {
    const session = await refreshSession();
    if (!session) {
      accessToken = null;
      onSessionEnd?.();
      return parse<T>(res);
    }
    res = await send(path, init);
  }
  return parse<T>(res);
}

export const qs = (params: Record<string, string | number | boolean | undefined | null>) => {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  const s = q.toString();
  return s ? `?${s}` : "";
};

export const errorMessage = (e: unknown) => (e instanceof ApiError ? e.message : "Something went wrong.");

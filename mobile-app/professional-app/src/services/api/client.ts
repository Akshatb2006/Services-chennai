import type { ApiErrorBody, ApiErrorCode } from "@homecare/contracts";
import { apiBaseUrl, isApiConfigured } from "./config";
import { sessionBridge } from "./session-bridge";

/** Error returned by the Homecare API ({ error: { code, message, ... } }). */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: ApiErrorCode | "network_error",
    readonly fields?: Record<string, string>,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Thrown instead of pretending a request succeeded when no backend URL is configured. */
export class ApiNotConfiguredError extends Error {
  constructor() {
    super("The Homecare service isn't connected in this build yet.");
    this.name = "ApiNotConfiguredError";
  }
}

type Options = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  /** Attach the access token and refresh it on expiry (default true). */
  auth?: boolean;
};

/** A request that hasn't answered in this time fails as a network error instead of hanging. */
export const REQUEST_TIMEOUT_MS = 15_000;

async function send(path: string, { method = "GET", body, signal }: Options, accessToken: string | null) {
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), REQUEST_TIMEOUT_MS);
  const onAbort = () => timeout.abort();
  signal?.addEventListener("abort", onAbort);
  try {
    return await fetch(`${apiBaseUrl}${path}`, {
      method,
      signal: timeout.signal,
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if ((err as Error)?.name === "AbortError" && signal?.aborted) throw err; // cancelled by the caller (e.g. screen left)
    if (timeout.signal.aborted) throw new ApiError("Homecare is taking too long to respond. Check your connection and try again.", 0, "network_error");
    throw new ApiError("We couldn't reach Homecare. Check your connection and try again.", 0, "network_error");
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

async function parse<T>(res: Response): Promise<T> {
  const json = (await res.json().catch(() => null)) as ({ data: T } & Partial<ApiErrorBody>) | null;
  if (res.ok && json && "data" in json) return json.data;
  const e = json?.error;
  throw new ApiError(
    e?.message ?? `Request failed (${res.status})`,
    res.status,
    e?.code ?? (res.status >= 500 ? "internal_error" : "validation_failed"),
    e?.fields,
    e?.retryAfterSeconds,
  );
}

/**
 * The only place the app talks HTTP. Unwraps { data }, maps { error } to ApiError, and on an
 * expired access token refreshes once (single-flight, see session-bridge) and retries.
 */
export async function apiRequest<T>(path: string, options: Options = {}): Promise<T> {
  if (!isApiConfigured) throw new ApiNotConfiguredError();
  const useAuth = options.auth !== false;

  let token = useAuth ? await sessionBridge.getAccessToken() : null;
  let res = await send(path, options, token);

  if (res.status === 401 && useAuth && token) {
    token = await sessionBridge.refreshAccessToken(); // null → session ended (already signed out)
    if (token) res = await send(path, options, token);
  }
  return parse<T>(res);
}

/** User-facing message for any error thrown by the API layer. */
export function errorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (error instanceof ApiNotConfiguredError) return error.message;
  if (error instanceof ApiError) return error.message;
  return fallback;
}

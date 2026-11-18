import type {
  AppNotification,
  AuthTokens,
  ProEarnings,
  ProJob,
  ProJobScope,
  ProMe,
  ProSession,
  RegisterProfessionalInput,
  SendOtpInput,
  SendOtpResult,
  UpdateMyProfessionalInput,
  VerifyOtpInput,
} from "@homecare/contracts";
import { apiRequest } from "./client";

/** Homecare Pro endpoints (/pro/*). The professional session is separate from customer and staff sessions. */
export const proApi = {
  sendOtp: (input: SendOtpInput) => apiRequest<SendOtpResult>("/pro/auth/send-otp", { method: "POST", body: input, auth: false }),
  verifyOtp: (input: VerifyOtpInput) => apiRequest<ProSession>("/pro/auth/verify-otp", { method: "POST", body: input, auth: false }),
  refresh: (refreshToken: string) => apiRequest<AuthTokens>("/pro/auth/refresh", { method: "POST", body: { refreshToken }, auth: false }),
  logout: () => apiRequest<{ signedOut: true }>("/pro/auth/logout", { method: "POST" }),

  me: (signal?: AbortSignal) => apiRequest<ProMe>("/pro/me", { signal }),
  register: (input: RegisterProfessionalInput) => apiRequest<ProMe>("/pro/me", { method: "POST", body: input }),
  update: (input: UpdateMyProfessionalInput) => apiRequest<ProMe>("/pro/me", { method: "PATCH", body: input }),
  documents: (signal?: AbortSignal) => apiRequest<{ storageConfigured: boolean; documents: { id: string; kind: string; createdAt: string }[] }>("/pro/me/documents", { signal }),
  notifications: (signal?: AbortSignal) => apiRequest<AppNotification[]>("/pro/me/notifications", { signal }),
  earnings: (signal?: AbortSignal) => apiRequest<ProEarnings>("/pro/me/earnings", { signal }),

  jobs: (scope: ProJobScope, signal?: AbortSignal) => apiRequest<ProJob[]>(`/pro/jobs?scope=${scope}`, { signal }),
  job: (id: string, signal?: AbortSignal) => apiRequest<ProJob>(`/pro/jobs/${encodeURIComponent(id)}`, { signal }),
  acknowledge: (id: string) => apiRequest<ProJob>(`/pro/jobs/${encodeURIComponent(id)}/acknowledge`, { method: "POST" }),
  start: (id: string) => apiRequest<ProJob>(`/pro/jobs/${encodeURIComponent(id)}/start`, { method: "POST", body: {} }),
  complete: (id: string, note?: string) => apiRequest<ProJob>(`/pro/jobs/${encodeURIComponent(id)}/complete`, { method: "POST", body: note ? { note } : {} }),
};

import type { AuthSession, AuthTokens, SendOtpInput, SendOtpResult, VerifyOtpInput } from "@homecare/contracts";
import { apiRequest } from "./client";

export const authApi = {
  sendOtp: (input: SendOtpInput) => apiRequest<SendOtpResult>("/auth/send-otp", { method: "POST", body: input, auth: false }),
  verifyOtp: (input: VerifyOtpInput) => apiRequest<AuthSession>("/auth/verify-otp", { method: "POST", body: input, auth: false }),
  refresh: (refreshToken: string) => apiRequest<AuthTokens>("/auth/refresh", { method: "POST", body: { refreshToken }, auth: false }),
  logout: () => apiRequest<{ signedOut: true }>("/auth/logout", { method: "POST" }),
};

import { Body, Controller, Headers, HttpCode, Ip, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags, ApiTooManyRequestsResponse } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { refreshSchema, sendOtpSchema, verifyOtpSchema } from "@homecare/contracts";
import type { z } from "zod";
import { CurrentAuth, Public, type AuthContext } from "../../common/auth-context.js";
import { sha256 } from "../../common/crypto.js";
import { AuthService } from "./auth.service.js";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post("send-otp")
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: "Send a sign-in code by SMS",
    description:
      "Accepts any valid Indian mobile number; the response is the same whether or not an account exists. " +
      "Limits: resend cooldown, hourly cap per number, and per-IP rate limit.",
  })
  @ApiTooManyRequestsResponse({ description: "otp_cooldown or rate_limited (see retryAfterSeconds)" })
  sendOtp(@Body({ schema: sendOtpSchema }) body: z.output<typeof sendOtpSchema>, @Ip() ip: string) {
    return this.auth.sendOtp(body.phone, ip ? sha256(ip) : undefined);
  }

  @Public()
  @Post("verify-otp")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: "Verify the code and sign in", description: "Creates the account on first sign-in. Returns access + refresh tokens and the customer profile." })
  verifyOtp(@Body({ schema: verifyOtpSchema }) body: z.output<typeof verifyOtpSchema>, @Headers("user-agent") userAgent?: string) {
    return this.auth.verifyOtp(body.phone, body.code, { deviceName: body.deviceName, userAgent });
  }

  @Public()
  @Post("refresh")
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: "Rotate the refresh token", description: "Single-use: the old refresh token stops working. Reusing an old token revokes the session." })
  refresh(@Body({ schema: refreshSchema }) body: z.output<typeof refreshSchema>) {
    return this.auth.refresh(body.refreshToken);
  }

  @Post("logout")
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Sign out this device (revokes the session and its refresh token)" })
  async logout(@CurrentAuth() auth: AuthContext) {
    await this.auth.logout(auth.sessionId);
    return { signedOut: true };
  }
}

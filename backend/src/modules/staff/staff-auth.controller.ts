import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Inject, Ip, Post, Req, Res } from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { sendOtpSchema, verifyOtpSchema } from "@homecare/contracts";
import type { Request, Response } from "express";
import type { z } from "zod";
import { AppException } from "../../common/app-exception.js";
import { Public } from "../../common/auth-context.js";
import { sha256 } from "../../common/crypto.js";
import { ENV, type Env } from "../../config/env.js";
import { CurrentStaff, RequirePermission, StaffOnly, type StaffContext } from "./staff.decorators.js";
import { StaffAuthService } from "./staff-auth.service.js";
import { StaffService } from "./staff.service.js";

export const ADMIN_REFRESH_COOKIE = "hc_admin_rt";
const COOKIE_PATH = "/admin/auth";
/** Required on cookie-authenticated calls: forces a CORS preflight, so other sites can't trigger them. */
export const ADMIN_CSRF_HEADER = "x-homecare-admin";

function requireCsrfHeader(req: Request) {
  if (req.headers[ADMIN_CSRF_HEADER] !== "1") throw new AppException("forbidden", "Missing admin request header.", HttpStatus.FORBIDDEN);
}

@ApiTags("Admin · Auth")
@Controller("admin/auth")
export class StaffAuthController {
  constructor(
    private readonly auth: StaffAuthService,
    private readonly staff: StaffService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  private setRefreshCookie(res: Response, token: string, expiresAt: string) {
    res.cookie(ADMIN_REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: this.env.NODE_ENV === "production",
      sameSite: "strict",
      path: COOKIE_PATH,
      expires: new Date(expiresAt),
    });
  }

  @Public()
  @Post("send-otp")
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: "Send a staff sign-in code", description: "Same response for every valid number; only active staff numbers receive an SMS." })
  sendOtp(@Body({ schema: sendOtpSchema }) body: z.output<typeof sendOtpSchema>, @Ip() ip: string) {
    return this.auth.sendOtp(body.phone, ip ? sha256(ip) : undefined);
  }

  @Public()
  @Post("verify-otp")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: "Verify the code and open a staff session", description: "Returns an access token; the refresh token is set as an httpOnly, SameSite=Strict cookie." })
  async verifyOtp(
    @Body({ schema: verifyOtpSchema }) body: z.output<typeof verifyOtpSchema>,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
    @Headers("user-agent") userAgent?: string,
  ) {
    const { refreshToken, refreshTokenExpiresAt, ...session } = await this.auth.verifyOtp(body.phone, body.code, { userAgent, ipHash: ip ? sha256(ip) : undefined });
    this.setRefreshCookie(res, refreshToken, refreshTokenExpiresAt);
    return session;
  }

  @Public()
  @Post("refresh")
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiHeader({ name: ADMIN_CSRF_HEADER, required: true, description: "Must be 1" })
  @ApiOperation({ summary: "Rotate the staff refresh cookie and get a new access token" })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    requireCsrfHeader(req);
    const token = (req.cookies as Record<string, string> | undefined)?.[ADMIN_REFRESH_COOKIE];
    if (!token) throw new AppException("session_expired", "Please sign in.", HttpStatus.UNAUTHORIZED);
    try {
      const { refreshToken, refreshTokenExpiresAt, userId: _u, ...session } = await this.auth.refresh(token);
      this.setRefreshCookie(res, refreshToken, refreshTokenExpiresAt);
      return { accessToken: session.accessToken, accessTokenExpiresIn: session.accessTokenExpiresIn, staff: session.staff };
    } catch (err) {
      res.clearCookie(ADMIN_REFRESH_COOKIE, { path: COOKIE_PATH });
      throw err;
    }
  }

  @StaffOnly()
  @RequirePermission("overview.read")
  @Post("logout")
  @HttpCode(200)
  @ApiOperation({ summary: "Sign out of the dashboard (revokes the session and clears the cookie)" })
  async logout(@CurrentStaff() staff: StaffContext, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(staff.sessionId);
    res.clearCookie(ADMIN_REFRESH_COOKIE, { path: COOKIE_PATH });
    return { signedOut: true };
  }

  @StaffOnly()
  @RequirePermission("overview.read")
  @Get("me")
  @ApiOperation({ summary: "The signed-in staff member and their permissions" })
  me(@CurrentStaff() staff: StaffContext) {
    return this.staff.get(staff.staffId);
  }
}

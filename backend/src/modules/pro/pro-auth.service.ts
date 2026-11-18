import { Injectable } from "@nestjs/common";
import type { AuthTokens, ProSession, SendOtpResult } from "@homecare/contracts";
import { Clock } from "../../common/clock.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { OtpService } from "../auth/otp.service.js";
import { TokensService } from "../auth/tokens.service.js";
import { ProSelfService } from "./pro-self.service.js";

/**
 * Homecare Pro sign-in: phone OTP (professional purpose) → professional-audience session.
 * If operations already registered a professional with this number, the app account is linked to
 * that record (no duplicate). Otherwise the professional registers in the app (pending verification).
 */
@Injectable()
export class ProAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otp: OtpService,
    private readonly tokens: TokensService,
    private readonly self: ProSelfService,
    private readonly clock: Clock,
  ) {}

  sendOtp(phone: string, ipHash?: string): Promise<SendOtpResult> {
    return this.otp.issue(phone, { purpose: "professional", ipHash });
  }

  async verifyOtp(phone: string, code: string, meta: { deviceName?: string; userAgent?: string }): Promise<ProSession> {
    await this.otp.verify(phone, code, "professional");
    const { tokens, userId } = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({ where: { phone }, update: { lastLoginAt: this.clock.now() }, create: { phone, role: "professional", lastLoginAt: this.clock.now() } });
      // Link a professional record created by operations for this phone number.
      await tx.professional.updateMany({ where: { phone, userId: null }, data: { userId: user.id } });
      const tokens = await this.tokens.createSession(tx, "professional", { sub: user.id }, meta);
      return { tokens, userId: user.id };
    });
    return { ...tokens, me: await this.self.me(userId) };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const { userId: _u, ...tokens } = await this.tokens.rotate(refreshToken, "professional", async (userId) => {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
      return user ? { sub: userId } : null;
    });
    return tokens;
  }

  logout(sessionId: string) {
    return this.tokens.revoke(sessionId, "logout");
  }
}

import { Injectable } from "@nestjs/common";
import type { AdminSession, SendOtpResult } from "@homecare/contracts";
import { Clock } from "../../common/clock.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { AuditService } from "../audit/audit.service.js";
import { OTP_INVALID_MESSAGE, OtpService } from "../auth/otp.service.js";
import { TokensService } from "../auth/tokens.service.js";
import { AppException } from "../../common/app-exception.js";
import { HttpStatus } from "@nestjs/common";
import { toStaffProfile } from "./staff.service.js";

/**
 * Staff sign-in: phone OTP (staff purpose) → staff-audience session.
 * Non-staff numbers get the same response, limits and timing, but no SMS is sent and no code can work.
 * There is no password and no bypass; the first super admin is created with `npm run staff:create`.
 */
@Injectable()
export class StaffAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otp: OtpService,
    private readonly tokens: TokensService,
    private readonly audit: AuditService,
    private readonly clock: Clock,
  ) {}

  private activeStaffByPhone(phone: string) {
    return this.prisma.staffMember.findFirst({ where: { status: "active", user: { phone } }, include: { user: { select: { phone: true } } } });
  }

  async sendOtp(phone: string, ipHash?: string): Promise<SendOtpResult> {
    const staff = await this.activeStaffByPhone(phone);
    return this.otp.issue(phone, { purpose: "staff", ipHash, deliver: !!staff });
  }

  async verifyOtp(phone: string, code: string, meta: { userAgent?: string; ipHash?: string }): Promise<AdminSession & { refreshToken: string; refreshTokenExpiresAt: string }> {
    await this.otp.verify(phone, code, "staff");
    const staff = await this.activeStaffByPhone(phone);
    if (!staff) throw new AppException("otp_invalid", OTP_INVALID_MESSAGE, HttpStatus.BAD_REQUEST);
    return this.prisma.$transaction(async (tx) => {
      const tokens = await this.tokens.createSession(tx, "staff", { sub: staff.userId, stf: staff.id }, { userAgent: meta.userAgent, deviceName: "Admin dashboard" });
      await tx.user.update({ where: { id: staff.userId }, data: { lastLoginAt: this.clock.now() } });
      await this.audit.record(tx, { staffId: staff.id, ipHash: meta.ipHash }, "staff.signed_in", { type: "staff", id: staff.id });
      return { ...tokens, staff: toStaffProfile(staff) };
    });
  }

  async refresh(refreshToken: string) {
    let staffId = "";
    const tokens = await this.tokens.rotate(refreshToken, "staff", async (userId) => {
      const staff = await this.prisma.staffMember.findUnique({ where: { userId } });
      if (!staff || staff.status !== "active") return null;
      staffId = staff.id;
      return { sub: userId, stf: staff.id };
    });
    const staff = await this.prisma.staffMember.findUniqueOrThrow({ where: { id: staffId }, include: { user: { select: { phone: true } } } });
    return { ...tokens, staff: toStaffProfile(staff) };
  }

  logout(sessionId: string) {
    return this.tokens.revoke(sessionId, "logout");
  }
}

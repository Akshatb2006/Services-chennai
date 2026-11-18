import { Injectable } from "@nestjs/common";
import type { AuthSession, AuthTokens, SendOtpResult } from "@homecare/contracts";
import { Clock } from "../../common/clock.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { CustomersService } from "../customers/customers.service.js";
import { UsersService } from "../users/users.service.js";
import { OtpService } from "./otp.service.js";
import { TokensService } from "./tokens.service.js";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otp: OtpService,
    private readonly tokens: TokensService,
    private readonly users: UsersService,
    private readonly customers: CustomersService,
    private readonly clock: Clock,
  ) {}

  sendOtp(phone: string, ipHash?: string): Promise<SendOtpResult> {
    return this.otp.issue(phone, { purpose: "customer", ipHash });
  }

  /** Verifies the code, then signs in (creating the account on first sign-in). */
  async verifyOtp(phone: string, code: string, meta: { deviceName?: string; userAgent?: string }): Promise<AuthSession> {
    await this.otp.verify(phone, code, "customer");
    return this.prisma.$transaction(async (tx) => {
      const user = await this.users.findOrCreateCustomer(tx, phone, this.clock.now());
      const tokens = await this.tokens.createSession(tx, "customer", { sub: user.id, role: user.role }, meta);
      return { ...tokens, customer: this.customers.toProfile(user, user.customer) };
    });
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const { userId: _userId, ...tokens } = await this.tokens.rotate(refreshToken, "customer", async (userId) => {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
      return user ? { sub: userId, role: user.role } : null;
    });
    return tokens;
  }

  logout(sessionId: string) {
    return this.tokens.revoke(sessionId, "logout");
  }
}

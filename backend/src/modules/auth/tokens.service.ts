import { HttpStatus, Inject, Injectable, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { AuthTokens } from "@homecare/contracts";
import { randomUUID } from "node:crypto";
import { AppException } from "../../common/app-exception.js";
import { Clock } from "../../common/clock.js";
import { randomToken, sha256 } from "../../common/crypto.js";
import { ENV, type Env } from "../../config/env.js";
import type { Prisma } from "../../generated/prisma/client.js";
import type { AuthAudience, UserRole } from "../../generated/prisma/enums.js";
import { PrismaService } from "../../prisma/prisma.service.js";

export const JWT_ISSUER = "homecare-api";
/** Separate audiences: a customer token is rejected by admin routes and vice versa. */
export const JWT_AUDIENCE: Record<AuthAudience, string> = { customer: "homecare-apps", staff: "homecare-admin", professional: "homecare-pro" };

export type AccessClaims = { sub: string; sid: string; role?: UserRole; stf?: string };

const sessionExpired = () => new AppException("session_expired", "Your session has expired. Please sign in again.", HttpStatus.UNAUTHORIZED);

/**
 * Sessions and tokens for both audiences.
 * - Access token: short-lived JWT (HS256), audience-scoped.
 * - Refresh token: 256-bit opaque random value stored only as SHA-256, single-use, rotated on every
 *   refresh. Presenting an already-rotated token revokes the whole session (it was copied).
 */
@Injectable()
export class TokensService {
  private readonly logger = new Logger(TokensService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly clock: Clock,
    @Inject(ENV) private readonly env: Env,
  ) {}

  private ttl(audience: AuthAudience) {
    return audience === "staff"
      ? { access: this.env.ADMIN_ACCESS_TOKEN_TTL_SECONDS, refreshMs: this.env.ADMIN_SESSION_TTL_HOURS * 3_600_000 }
      : { access: this.env.ACCESS_TOKEN_TTL_SECONDS, refreshMs: this.env.REFRESH_TOKEN_TTL_DAYS * 86_400_000 };
  }

  private sign(audience: AuthAudience, claims: AccessClaims) {
    return this.jwt.signAsync(claims, { expiresIn: this.ttl(audience).access, audience: JWT_AUDIENCE[audience] });
  }

  async createSession(
    tx: Prisma.TransactionClient,
    audience: AuthAudience,
    claims: Omit<AccessClaims, "sid">,
    meta: { deviceName?: string; userAgent?: string },
  ): Promise<AuthTokens> {
    const now = this.clock.now();
    const refreshToken = randomToken(32);
    const expiresAt = new Date(now.getTime() + this.ttl(audience).refreshMs);
    const session = await tx.session.create({
      data: {
        id: randomUUID(),
        userId: claims.sub,
        audience,
        refreshTokenHash: sha256(refreshToken),
        deviceName: meta.deviceName?.slice(0, 80),
        userAgent: meta.userAgent?.slice(0, 255),
        expiresAt,
        createdAt: now,
        lastUsedAt: now,
      },
    });
    return {
      accessToken: await this.sign(audience, { ...claims, sid: session.id }),
      accessTokenExpiresIn: this.ttl(audience).access,
      refreshToken,
      refreshTokenExpiresAt: expiresAt.toISOString(),
    };
  }

  /** Rotates a refresh token. `claimsFor` rebuilds the access-token claims (e.g. current role). */
  async rotate(
    refreshToken: string,
    audience: AuthAudience,
    claimsFor: (userId: string) => Promise<Omit<AccessClaims, "sid"> | null>,
  ): Promise<AuthTokens & { userId: string }> {
    const now = this.clock.now();
    const hash = sha256(refreshToken);
    const session = await this.prisma.session.findUnique({ where: { refreshTokenHash: hash } });

    if (!session) {
      const replayed = await this.prisma.session.findFirst({ where: { previousRefreshHash: hash, revokedAt: null } });
      if (replayed) {
        await this.revoke(replayed.id, "refresh_token_reuse");
        this.logger.warn({ sessionId: replayed.id }, "Refresh token reuse detected; session revoked");
      }
      throw sessionExpired();
    }
    if (session.audience !== audience || session.revokedAt || session.expiresAt <= now) throw sessionExpired();

    const claims = await claimsFor(session.userId);
    if (!claims) {
      await this.revoke(session.id, "account_disabled");
      throw sessionExpired();
    }

    const next = randomToken(32);
    // App sessions (customer, professional) slide; staff sessions keep their absolute expiry (re-authenticate daily).
    const expiresAt = audience !== "staff" ? new Date(now.getTime() + this.ttl(audience).refreshMs) : session.expiresAt;
    const { count } = await this.prisma.session.updateMany({
      where: { id: session.id, refreshTokenHash: hash, revokedAt: null },
      data: { refreshTokenHash: sha256(next), previousRefreshHash: hash, lastUsedAt: now, expiresAt },
    });
    if (count === 0) throw sessionExpired();

    return {
      userId: session.userId,
      accessToken: await this.sign(audience, { ...claims, sid: session.id }),
      accessTokenExpiresIn: this.ttl(audience).access,
      refreshToken: next,
      refreshTokenExpiresAt: expiresAt.toISOString(),
    };
  }

  async revoke(sessionId: string, reason: string) {
    await this.prisma.session.updateMany({ where: { id: sessionId, revokedAt: null }, data: { revokedAt: this.clock.now(), revokedReason: reason } });
  }

  /** Verifies an access token for the given audience and that its session is still active. */
  async authenticate(token: string, audience: AuthAudience = "customer"): Promise<AccessClaims> {
    let claims: AccessClaims;
    try {
      claims = await this.jwt.verifyAsync<AccessClaims>(token, { audience: JWT_AUDIENCE[audience] });
    } catch {
      throw sessionExpired();
    }
    const session = await this.prisma.session.findUnique({ where: { id: claims.sid }, select: { userId: true, audience: true, revokedAt: true, expiresAt: true } });
    if (!session || session.userId !== claims.sub || session.audience !== audience || session.revokedAt || session.expiresAt <= this.clock.now()) {
      throw sessionExpired();
    }
    return claims;
  }
}

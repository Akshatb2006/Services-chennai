import { HttpStatus, Inject, Injectable, Logger } from "@nestjs/common";
import { maskPhone, OTP_LENGTH, type SendOtpResult } from "@homecare/contracts";
import { AppException } from "../../common/app-exception.js";
import { Clock } from "../../common/clock.js";
import { hmac, randomDigits, safeEqualHex } from "../../common/crypto.js";
import { ENV, type Env } from "../../config/env.js";
import type { Prisma } from "../../generated/prisma/client.js";
import type { AuthAudience } from "../../generated/prisma/enums.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { SmsNotConfiguredError, SmsSender } from "../notifications/sms-sender.js";

/** Same message for wrong, expired, used-up and unknown codes, so responses reveal nothing. */
export const OTP_INVALID_MESSAGE = "That code is incorrect or has expired. Check the code or request a new one.";

/**
 * One-time passwords.
 * - CSPRNG 6-digit codes, stored only as HMAC-SHA256(pepper, phone:code)
 * - one live challenge per phone (a new code invalidates the previous one)
 * - expiry, resend cooldown, hourly send cap and per-code attempt cap
 * - per-phone advisory lock so concurrent requests can't race the limits
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sms: SmsSender,
    private readonly clock: Clock,
    @Inject(ENV) private readonly env: Env,
  ) {}

  private hash(purpose: AuthAudience, phone: string, code: string) {
    // Purpose is part of the MAC, so a customer code can never open a staff session.
    return hmac(this.env.OTP_PEPPER, `${purpose}:${phone}:${code}`);
  }

  private lock(tx: Prisma.TransactionClient, purpose: AuthAudience, phone: string) {
    return tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`otp:${purpose}:${phone}`}, 0))`;
  }

  /**
   * Issues a code. With `deliver: false` the challenge (and its limits) is recorded but no SMS is sent —
   * used for staff sign-in attempts on numbers that aren't staff, so responses and timing of limits
   * look identical either way.
   */
  async issue(phone: string, opts: { purpose: AuthAudience; ipHash?: string; deliver?: boolean }): Promise<SendOtpResult> {
    const { purpose, ipHash, deliver = true } = opts;
    const now = this.clock.now();
    const code = randomDigits(OTP_LENGTH);

    const challengeId = await this.prisma.$transaction(async (tx) => {
      await this.lock(tx, purpose, phone);

      const latest = await tx.otpChallenge.findFirst({ where: { phone, purpose }, orderBy: { createdAt: "desc" } });
      if (latest) {
        const waited = (now.getTime() - latest.createdAt.getTime()) / 1000;
        if (waited < this.env.OTP_RESEND_COOLDOWN_SECONDS) {
          const retryAfterSeconds = Math.ceil(this.env.OTP_RESEND_COOLDOWN_SECONDS - waited);
          throw new AppException("otp_cooldown", `Please wait ${retryAfterSeconds}s before requesting another code.`, HttpStatus.TOO_MANY_REQUESTS, {
            retryAfterSeconds,
          });
        }
      }

      const windowStart = new Date(now.getTime() - 3600_000);
      const recent = await tx.otpChallenge.findMany({ where: { phone, purpose, createdAt: { gte: windowStart } }, orderBy: { createdAt: "asc" }, select: { createdAt: true } });
      if (recent.length >= this.env.OTP_MAX_SENDS_PER_HOUR) {
        const retryAfterSeconds = Math.max(1, Math.ceil((recent[0].createdAt.getTime() + 3600_000 - now.getTime()) / 1000));
        throw new AppException("rate_limited", "Too many codes requested for this number. Please try again later.", HttpStatus.TOO_MANY_REQUESTS, {
          retryAfterSeconds,
        });
      }

      // Only the newest code is valid.
      await tx.otpChallenge.updateMany({ where: { phone, purpose, consumedAt: null }, data: { consumedAt: now } });
      const challenge = await tx.otpChallenge.create({
        data: {
          phone,
          purpose,
          codeHash: this.hash(purpose, phone, code),
          expiresAt: new Date(now.getTime() + this.env.OTP_TTL_SECONDS * 1000),
          ipHash,
          createdAt: now,
        },
      });
      return challenge.id;
    });

    if (!deliver) return { expiresInSeconds: this.env.OTP_TTL_SECONDS, resendAfterSeconds: this.env.OTP_RESEND_COOLDOWN_SECONDS };
    try {
      await this.sms.sendOtp(phone, code, Math.round(this.env.OTP_TTL_SECONDS / 60));
    } catch (err) {
      // Don't leave a usable challenge behind if the code never left the building.
      await this.prisma.otpChallenge.delete({ where: { id: challengeId } }).catch(() => {});
      if (err instanceof SmsNotConfiguredError) {
        this.logger.error("OTP requested but no SMS provider is configured");
      } else {
        this.logger.error({ err, phone: maskPhone(phone) }, "SMS provider rejected OTP");
      }
      throw new AppException("service_unavailable", "We couldn't send a code right now. Please try again shortly.", HttpStatus.SERVICE_UNAVAILABLE);
    }

    return { expiresInSeconds: this.env.OTP_TTL_SECONDS, resendAfterSeconds: this.env.OTP_RESEND_COOLDOWN_SECONDS };
  }

  /** Throws otp_invalid unless `code` matches the live challenge. Consumes it on success. */
  async verify(phone: string, code: string, purpose: AuthAudience): Promise<void> {
    const now = this.clock.now();
    const ok = await this.prisma.$transaction(async (tx) => {
      await this.lock(tx, purpose, phone);
      const challenge = await tx.otpChallenge.findFirst({
        where: { phone, purpose, consumedAt: null, expiresAt: { gt: now } },
        orderBy: { createdAt: "desc" },
      });
      if (!challenge) return false;

      const attempts = challenge.attempts + 1;
      const match = safeEqualHex(this.hash(purpose, phone, code), challenge.codeHash);
      const exhausted = attempts >= this.env.OTP_MAX_ATTEMPTS;
      await tx.otpChallenge.update({
        where: { id: challenge.id },
        data: { attempts, ...((match || exhausted) && { consumedAt: now }) },
      });
      return match;
    });
    if (!ok) throw new AppException("otp_invalid", OTP_INVALID_MESSAGE, HttpStatus.BAD_REQUEST);
  }
}

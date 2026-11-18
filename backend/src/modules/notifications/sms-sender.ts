import { Logger } from "@nestjs/common";
import { maskPhone } from "@homecare/contracts";

/**
 * SMS delivery boundary. Auth depends only on this interface.
 *
 * To connect a real provider (e.g. an Indian DLT-registered SMS gateway):
 *   1. implement `SmsSender` in a new file (HTTP call to the provider, no logging of the code),
 *   2. add its name to OTP_PROVIDER in src/config/env.ts,
 *   3. register it in `smsSenderFactory` below.
 * Indian SMS also needs a DLT-registered sender ID and an approved OTP template; see backend/README.md.
 */
export abstract class SmsSender {
  abstract readonly name: string;
  /** Delivers a one-time code. Must throw if delivery is not accepted by the provider. */
  abstract sendOtp(phoneE164: string, code: string, ttlMinutes: number): Promise<void>;
  /**
   * Transactional SMS for request updates. A real provider needs separate DLT-approved templates,
   * so this is off until one is integrated (deliveries are recorded as "skipped").
   */
  readonly supportsTransactional: boolean = false;
}

/** DEVELOPMENT ONLY: prints the code to the server console. Rejected in production by env validation. */
export class ConsoleSmsSender extends SmsSender {
  readonly name = "console";
  private readonly logger = new Logger("DevOtp");

  async sendOtp(phoneE164: string, code: string, ttlMinutes: number) {
    // Plain console output (not the structured request log) so codes never reach log shipping.
    process.stdout.write(`\n[DEV OTP] ${maskPhone(phoneE164)} → ${code} (valid ${ttlMinutes} min; development provider, not sent by SMS)\n\n`);
    this.logger.debug(`Development OTP issued for ${maskPhone(phoneE164)}`);
  }
}

/** No provider configured: sign-in is unavailable rather than silently pretending to send. */
export class UnconfiguredSmsSender extends SmsSender {
  readonly name = "none";
  async sendOtp(): Promise<void> {
    throw new SmsNotConfiguredError();
  }
}

export class SmsNotConfiguredError extends Error {
  constructor() {
    super("No SMS provider is configured (OTP_PROVIDER=none)");
  }
}

export function smsSenderFactory(provider: "console" | "none"): SmsSender {
  return provider === "console" ? new ConsoleSmsSender() : new UnconfiguredSmsSender();
}

import { Injectable } from "@nestjs/common";

/** Time source. Injected so tests can move time forward (OTP expiry, cooldowns, token TTLs). */
@Injectable()
export class Clock {
  now(): Date {
    return new Date();
  }
}

import type { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { configureApp } from "../src/bootstrap.js";
import { Clock } from "../src/common/clock.js";
import { SmsSender } from "../src/modules/notifications/sms-sender.js";
import { PrismaService } from "../src/prisma/prisma.service.js";

/** Captures codes instead of sending SMS. `failNext` simulates a provider outage. */
export class FakeSms extends SmsSender {
  readonly name = "fake";
  readonly sent: { phone: string; code: string }[] = [];
  failNext = false;
  async sendOtp(phone: string, code: string) {
    if (this.failNext) {
      this.failNext = false;
      throw new Error("provider down");
    }
    this.sent.push({ phone, code });
  }
  lastCode(phone: string) {
    return [...this.sent].reverse().find((s) => s.phone === phone)?.code;
  }
}

/** Real time plus an adjustable offset. */
export class FakeClock extends Clock {
  offsetMs = 0;
  now() {
    return new Date(Date.now() + this.offsetMs);
  }
  advance(seconds: number) {
    this.offsetMs += seconds * 1000;
  }
}

export type TestContext = Awaited<ReturnType<typeof createTestApp>>;

let ipCounter = 1;
/** A fresh client IP so per-IP rate limits don't leak between tests. */
export const nextIp = () => `10.0.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;

export async function createTestApp() {
  const sms = new FakeSms();
  const clock = new FakeClock();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(SmsSender)
    .useValue(sms)
    .overrideProvider(Clock)
    .useValue(clock)
    .compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({ logger: false });
  configureApp(app);
  await app.init();
  const prisma = app.get(PrismaService);
  const http = () => request(app.getHttpServer());

  return {
    app,
    sms,
    clock,
    prisma,
    http,
    async reset() {
      clock.offsetMs = 0;
      sms.sent.length = 0;
      await prisma.$executeRawUnsafe(
        'TRUNCATE "audit_logs", "assignments", "request_events", "service_requests", "addresses", "notification_deliveries", "notifications", "sessions", "customers", "staff_members", "professional_documents", "professional_availability", "professional_service_areas", "professional_categories", "professionals", "service_settings", "users", "otp_challenges" CASCADE',
      );
    },
    /** Full OTP sign-in. Returns tokens and an authorised request helper. */
    async signIn(phone = "+919840012345", opts: { fullName?: string } = {}) {
      const ip = nextIp();
      await http().post("/auth/send-otp").set("x-forwarded-for", ip).send({ phone }).expect(200);
      const res = await http().post("/auth/verify-otp").set("x-forwarded-for", ip).send({ phone, code: sms.lastCode(phone) }).expect(200);
      const tokens = res.body.data as { accessToken: string; refreshToken: string; customer: { id: string } };
      const auth = `Bearer ${tokens.accessToken}`;
      if (opts.fullName) await http().patch("/customers/me").set("authorization", auth).send({ fullName: opts.fullName }).expect(200);
      return { ...tokens, auth, ip };
    },
  };
}

export const chennaiAddress = {
  label: "home",
  line1: "12 Example Street, Flat 3",
  landmark: "Near the park",
  city: "Chennai",
  state: "Tamil Nadu",
  pincode: "600020",
} as const;

import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { LoggerModule } from "nestjs-pino";
import { randomUUID } from "node:crypto";
import { ClockModule } from "./common/clock.module.js";
import { EnvelopeInterceptor } from "./common/envelope.interceptor.js";
import { HttpExceptionFilter } from "./common/http-exception.filter.js";
import { createValidationPipe } from "./common/validation.js";
import { AppConfigModule } from "./config/config.module.js";
import { ENV, validateEnv, type Env } from "./config/env.js";
import { AccessTokenGuard } from "./modules/auth/access-token.guard.js";
import { AddressesModule } from "./modules/addresses/addresses.module.js";
import { AlertsModule } from "./modules/alerts/alerts.module.js";
import { AuditModule } from "./modules/audit/audit.module.js";
import { OperationsModule } from "./modules/operations/operations.module.js";
import { ProfessionalsModule } from "./modules/professionals/professionals.module.js";
import { ProModule } from "./modules/pro/pro.module.js";
import { SchedulerModule } from "./modules/scheduler/scheduler.module.js";
import { StaffModule } from "./modules/staff/staff.module.js";
import { AuthModule } from "./modules/auth/auth.module.js";
import { CustomersModule } from "./modules/customers/customers.module.js";
import { HealthController } from "./modules/health/health.controller.js";
import { NotificationsModule } from "./modules/notifications/notifications.module.js";
import { RequestsModule } from "./modules/requests/requests.module.js";
import { ServicesModule } from "./modules/services/services.module.js";
import { UsersModule } from "./modules/users/users.module.js";
import { PrismaModule } from "./prisma/prisma.module.js";

const bootEnv = validateEnv(process.env);

@Module({
  imports: [
    AppConfigModule,
    ClockModule,
    LoggerModule.forRoot({
      pinoHttp: {
        level: bootEnv.LOG_LEVEL,
        genReqId: (req, res) => {
          const incoming = req.headers["x-request-id"];
          const id = typeof incoming === "string" && /^[\w-]{8,64}$/.test(incoming) ? incoming : randomUUID();
          res.setHeader("x-request-id", id);
          return id;
        },
        // Never log credentials or one-time codes. Bodies are not logged at all.
        redact: { paths: ["req.headers.authorization", "req.headers.cookie", 'res.headers["set-cookie"]'], censor: "[redacted]" },
        serializers: {
          // Path only: query strings can carry PII (e.g. admin searches by customer name or phone).
          req: (req: { id: string; method: string; url: string }) => ({ id: req.id, method: req.method, url: req.url.split("?")[0] }),
          res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
        },
        autoLogging: { ignore: (req) => req.url === "/health" },
        ...(bootEnv.NODE_ENV === "development" && { transport: { target: "pino-pretty", options: { singleLine: true } } }),
      },
    }),
    ThrottlerModule.forRootAsync({
      inject: [ENV],
      useFactory: (env: Env) => ({ throttlers: [{ name: "default", ttl: 60_000, limit: env.RATE_LIMIT_PER_MINUTE }] }),
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    CustomersModule,
    AddressesModule,
    ServicesModule,
    RequestsModule,
    NotificationsModule,
    AuditModule,
    AlertsModule,
    StaffModule,
    ProfessionalsModule,
    OperationsModule,
    ProModule,
    SchedulerModule,
  ],
  controllers: [HealthController],
  providers: [
    // Order matters: throttle first, then authenticate.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useExisting: AccessTokenGuard },
    { provide: APP_PIPE, useFactory: createValidationPipe },
    { provide: APP_INTERCEPTOR, useClass: EnvelopeInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}

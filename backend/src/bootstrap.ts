import type { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import type { NestExpressApplication } from "@nestjs/platform-express";
import cookieParser from "cookie-parser";
import { Logger } from "nestjs-pino";
import { AppModule } from "./app.module.js";
import { corsOrigins, ENV, type Env } from "./config/env.js";

/** Shared HTTP setup for the server and the integration tests. */
export function configureApp(app: NestExpressApplication) {
  const env = app.get<Env>(ENV);
  app.disable("x-powered-by");
  if (env.TRUST_PROXY > 0) app.set("trust proxy", env.TRUST_PROXY);
  app.useBodyParser("json", { limit: "32kb" });
  // Every response carries personal data or session material: never cache, never sniff, never frame.
  app.use((_req: unknown, res: { setHeader: (k: string, v: string) => void }, next: () => void) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Cross-Origin-Resource-Policy", "same-site");
    next();
  });
  app.use(cookieParser());
  const origins = corsOrigins(env.CORS_ORIGINS);
  // credentials: the admin dashboard's refresh token is an httpOnly cookie.
  app.enableCors({ origin: origins.length ? origins : false, credentials: true, allowedHeaders: ["content-type", "authorization", "x-homecare-admin", "x-request-id"] });
  app.enableShutdownHooks();
  return env;
}

export function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle("Homecare API")
    .setDescription(
      "Customer API for Homecare (Chennai). Successful responses are `{ data }`; errors are `{ error: { code, message, fields?, retryAfterSeconds?, requestId? } }`.",
    )
    .setVersion("0.1.0")
    .addBearerAuth()
    .addBearerAuth({ type: "http", scheme: "bearer", description: "Staff access token from /admin/auth/verify-otp" }, "staff")
    .addBearerAuth({ type: "http", scheme: "bearer", description: "Professional access token from /pro/auth/verify-otp" }, "professional")
    .build();
  SwaggerModule.setup("docs", app, () => SwaggerModule.createDocument(app, config));
}

export async function createApp() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  const env = configureApp(app);
  if (env.SWAGGER_ENABLED ?? env.NODE_ENV !== "production") setupSwagger(app);
  return { app, env };
}

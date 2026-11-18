import { Controller, Get, HttpStatus } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { AppException } from "../../common/app-exception.js";
import { Public } from "../../common/auth-context.js";
import { PrismaService } from "../../prisma/prisma.service.js";

const READINESS_TIMEOUT_MS = 3_000;

@ApiTags("Health")
@Public()
@SkipThrottle()
@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Liveness: the process is up and serving HTTP. Doesn't touch the database, so a database outage
   *  doesn't make an orchestrator restart every API instance. */
  @Get("live")
  @ApiOperation({ summary: "Liveness (process only, no dependencies)" })
  live() {
    return { status: "ok" };
  }

  /** Readiness: the instance can serve requests (database reachable). Route traffic only when 200. */
  @Get()
  @ApiOperation({ summary: "Readiness: process + database connectivity" })
  async check() {
    try {
      // Bounded: an unresponsive database must fail readiness quickly, not hang the probe.
      await Promise.race([
        this.prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), READINESS_TIMEOUT_MS).unref()),
      ]);
    } catch {
      throw new AppException("service_unavailable", "Database unavailable", HttpStatus.SERVICE_UNAVAILABLE);
    }
    return { status: "ok", database: "ok" };
  }
}

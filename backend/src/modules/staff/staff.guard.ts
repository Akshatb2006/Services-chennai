import { CanActivate, ExecutionContext, HttpStatus, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { hasPermission, type Permission } from "@homecare/contracts";
import type { Request } from "express";
import { AppException } from "../../common/app-exception.js";
import { sha256 } from "../../common/crypto.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { TokensService } from "../auth/tokens.service.js";
import type { StaffContext } from "./staff.decorators.js";

/**
 * Staff authorisation, enforced server-side on every admin route:
 *  1. a valid staff-audience access token on an active staff session,
 *  2. an active staff member (role re-read from the database each request, so changes apply instantly),
 *  3. the role grants the route's permission. Routes without a declared permission are denied.
 */
@Injectable()
export class StaffGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokensService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { staff?: StaffContext }>();
    const permission = this.reflector.getAllAndOverride<Permission | "authenticated" | undefined>("staffPermission", [context.getHandler(), context.getClass()]);
    if (!permission) throw new AppException("forbidden", "You don't have access to this.", HttpStatus.FORBIDDEN);

    const [scheme, token] = (req.headers.authorization ?? "").split(" ");
    if (scheme !== "Bearer" || !token) throw new AppException("unauthorized", "Sign in to continue.", HttpStatus.UNAUTHORIZED);
    const claims = await this.tokens.authenticate(token, "staff");

    const staff = claims.stf ? await this.prisma.staffMember.findUnique({ where: { id: claims.stf } }) : null;
    if (!staff || staff.userId !== claims.sub || staff.status !== "active") {
      throw new AppException("session_expired", "Your staff access has ended. Please sign in again.", HttpStatus.UNAUTHORIZED);
    }
    if (permission !== "authenticated" && !hasPermission(staff.role, permission)) {
      throw new AppException("forbidden", "Your role doesn't allow this action.", HttpStatus.FORBIDDEN);
    }

    req.staff = { staffId: staff.id, userId: staff.userId, sessionId: claims.sid, role: staff.role, fullName: staff.fullName, ipHash: req.ip ? sha256(req.ip) : undefined };
    return true;
  }
}

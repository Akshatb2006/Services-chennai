import { CanActivate, ExecutionContext, HttpStatus, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { AppException } from "../../common/app-exception.js";
import { IS_PUBLIC, ROLES, type AuthContext } from "../../common/auth-context.js";
import type { UserRole } from "../../generated/prisma/enums.js";
import { TokensService } from "./tokens.service.js";

/** Global guard: every route needs a valid access token on an active session unless marked @Public(). */
@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokensService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;

    const req = context.switchToHttp().getRequest<Request & { auth?: AuthContext }>();
    const [scheme, token] = (req.headers.authorization ?? "").split(" ");
    if (scheme !== "Bearer" || !token) throw new AppException("unauthorized", "Sign in to continue.", HttpStatus.UNAUTHORIZED);

    const claims = await this.tokens.authenticate(token, "customer");
    req.auth = { userId: claims.sub, sessionId: claims.sid, role: claims.role ?? "customer" };

    const roles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES, targets);
    if (roles && !roles.includes(claims.role ?? "customer")) throw new AppException("forbidden", "You don't have access to this.", HttpStatus.FORBIDDEN);
    return true;
  }
}

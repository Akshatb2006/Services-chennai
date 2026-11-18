import { applyDecorators, CanActivate, createParamDecorator, ExecutionContext, HttpStatus, Injectable, SetMetadata, UseGuards } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ApiBearerAuth, ApiUnauthorizedResponse } from "@nestjs/swagger";
import type { Request } from "express";
import { AppException } from "../../common/app-exception.js";
import { IS_PUBLIC } from "../../common/auth-context.js";
import type { Professional } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { TokensService } from "../auth/tokens.service.js";

export type ProContext = { userId: string; sessionId: string; phone: string; professional: Professional | null };
const NEEDS_PROFILE = "proNeedsProfile";

/**
 * Pro-app authorisation: a valid professional-audience token on an active professional session.
 * The professional record is re-read on every request, so verification/suspension changes made by
 * staff apply immediately. Customer and staff tokens are rejected (different JWT audience).
 */
@Injectable()
export class ProGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokensService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { pro?: ProContext }>();
    const [scheme, token] = (req.headers.authorization ?? "").split(" ");
    if (scheme !== "Bearer" || !token) throw new AppException("unauthorized", "Sign in to continue.", HttpStatus.UNAUTHORIZED);
    const claims = await this.tokens.authenticate(token, "professional");
    const user = await this.prisma.user.findUnique({ where: { id: claims.sub }, include: { professional: true } });
    if (!user) throw new AppException("session_expired", "Please sign in again.", HttpStatus.UNAUTHORIZED);
    if (this.reflector.getAllAndOverride<boolean>(NEEDS_PROFILE, [context.getHandler(), context.getClass()]) && !user.professional) {
      throw new AppException("profile_required", "Complete your professional profile first.", HttpStatus.CONFLICT);
    }
    req.pro = { userId: user.id, sessionId: claims.sid, phone: user.phone, professional: user.professional };
    return true;
  }
}

/** Professional-app route: skips the customer guard and requires a professional session. */
export const ProOnly = () =>
  applyDecorators(SetMetadata(IS_PUBLIC, true), UseGuards(ProGuard), ApiBearerAuth("professional"), ApiUnauthorizedResponse({ description: "No or expired professional session" }));

/** The route needs a registered professional profile (409 profile_required otherwise). */
export const NeedsProfile = () => SetMetadata(NEEDS_PROFILE, true);

export const CurrentPro = createParamDecorator((_: unknown, ctx: ExecutionContext): ProContext => ctx.switchToHttp().getRequest<{ pro: ProContext }>().pro);

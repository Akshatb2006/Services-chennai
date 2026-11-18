import { createParamDecorator, ExecutionContext, SetMetadata } from "@nestjs/common";
import type { UserRole } from "../generated/prisma/enums.js";

export type AuthContext = { userId: string; sessionId: string; role: UserRole };

/** Marks a route as not requiring an access token. */
export const IS_PUBLIC = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const ROLES = "roles";
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES, roles);

/** The authenticated caller (set by AccessTokenGuard). */
export const CurrentAuth = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthContext => {
  return ctx.switchToHttp().getRequest<{ auth: AuthContext }>().auth;
});

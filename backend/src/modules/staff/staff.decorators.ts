import { applyDecorators, createParamDecorator, ExecutionContext, SetMetadata, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiForbiddenResponse, ApiUnauthorizedResponse } from "@nestjs/swagger";
import type { Permission, StaffRole } from "@homecare/contracts";
import { IS_PUBLIC } from "../../common/auth-context.js";
import { StaffGuard } from "./staff.guard.js";

export const STAFF_PERMISSION = "staffPermission";

export type StaffContext = { staffId: string; userId: string; sessionId: string; role: StaffRole; fullName: string; ipHash?: string };

/**
 * Marks a controller as staff-only: bypasses the customer token guard and requires a staff session
 * instead. Every handler must also declare @RequirePermission — the guard denies by default.
 */
export const StaffOnly = () =>
  applyDecorators(
    SetMetadata(IS_PUBLIC, true), // not a customer route
    UseGuards(StaffGuard),
    ApiBearerAuth("staff"),
    ApiUnauthorizedResponse({ description: "No or expired staff session" }),
    ApiForbiddenResponse({ description: "Role lacks the required permission" }),
  );

export const RequirePermission = (permission: Permission) => SetMetadata(STAFF_PERMISSION, permission);

export const CurrentStaff = createParamDecorator((_: unknown, ctx: ExecutionContext): StaffContext => {
  return ctx.switchToHttp().getRequest<{ staff: StaffContext }>().staff;
});

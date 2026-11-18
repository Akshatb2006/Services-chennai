import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { createStaffSchema, updateStaffSchema } from "@homecare/contracts";
import { z } from "zod";
import { CurrentStaff, RequirePermission, StaffOnly, type StaffContext } from "./staff.decorators.js";
import { StaffService } from "./staff.service.js";

@ApiTags("Admin · Staff")
@StaffOnly()
@Controller("admin/staff")
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  @Get()
  @RequirePermission("staff.manage")
  @ApiOperation({ summary: "List staff members" })
  list() {
    return this.staff.list();
  }

  @Post()
  @RequirePermission("staff.manage")
  @ApiOperation({ summary: "Give a phone number dashboard access with a role" })
  create(@CurrentStaff() actor: StaffContext, @Body({ schema: createStaffSchema }) body: z.output<typeof createStaffSchema>) {
    return this.staff.create(actor, body);
  }

  @Patch(":id")
  @RequirePermission("staff.manage")
  @ApiOperation({ summary: "Change a staff member's role, name or status (disabling ends their sessions)" })
  update(@CurrentStaff() actor: StaffContext, @Param("id", { schema: z.uuid() }) id: string, @Body({ schema: updateStaffSchema }) body: z.output<typeof updateStaffSchema>) {
    return this.staff.update(actor, id, body);
  }
}

import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { createProfessionalSchema, listProfessionalsQuerySchema, setAccountStatusSchema, setVerificationSchema, updateProfessionalSchema } from "@homecare/contracts";
import { z } from "zod";
import { CurrentStaff, RequirePermission, StaffOnly, type StaffContext } from "../staff/staff.decorators.js";
import { ProfessionalsService } from "./professionals.service.js";

@ApiTags("Admin · Professionals")
@StaffOnly()
@Controller("admin/professionals")
export class ProfessionalsController {
  constructor(private readonly professionals: ProfessionalsService) {}

  @Get()
  @RequirePermission("professionals.read")
  @ApiOperation({ summary: "Search and filter professionals" })
  list(@Query({ schema: listProfessionalsQuerySchema }) query: z.output<typeof listProfessionalsQuerySchema>) {
    return this.professionals.list(query);
  }

  @Get(":id")
  @RequirePermission("professionals.read")
  @ApiOperation({ summary: "Professional with availability and upcoming assignments" })
  get(@Param("id", { schema: z.uuid() }) id: string) {
    return this.professionals.get(id);
  }

  @Post()
  @RequirePermission("professionals.write")
  @ApiOperation({ summary: "Register a professional", description: "Always created as verification = pending." })
  create(@CurrentStaff() staff: StaffContext, @Body({ schema: createProfessionalSchema }) body: z.output<typeof createProfessionalSchema>) {
    return this.professionals.create(staff, body);
  }

  @Patch(":id")
  @RequirePermission("professionals.write")
  @ApiOperation({ summary: "Edit name, categories, serviceable pincodes, weekly availability or availability status" })
  update(@CurrentStaff() staff: StaffContext, @Param("id", { schema: z.uuid() }) id: string, @Body({ schema: updateProfessionalSchema }) body: z.output<typeof updateProfessionalSchema>) {
    return this.professionals.update(staff, id, body);
  }

  @Post(":id/verification")
  @RequirePermission("professionals.verify")
  @ApiOperation({ summary: "Verify or reject a professional" })
  verify(@CurrentStaff() staff: StaffContext, @Param("id", { schema: z.uuid() }) id: string, @Body({ schema: setVerificationSchema }) body: z.output<typeof setVerificationSchema>) {
    return this.professionals.setVerification(staff, id, body);
  }

  @Post(":id/account-status")
  @RequirePermission("professionals.status")
  @ApiOperation({ summary: "Suspend, deactivate or reactivate a professional", description: "Returns activeAssignments so operations can reassign them." })
  status(@CurrentStaff() staff: StaffContext, @Param("id", { schema: z.uuid() }) id: string, @Body({ schema: setAccountStatusSchema }) body: z.output<typeof setAccountStatusSchema>) {
    return this.professionals.setAccountStatus(staff, id, body);
  }
}

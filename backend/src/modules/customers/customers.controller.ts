import { Body, Controller, Get, Patch } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { updateCustomerSchema } from "@homecare/contracts";
import type { z } from "zod";
import { CurrentAuth, type AuthContext } from "../../common/auth-context.js";
import { CustomersService } from "./customers.service.js";

@ApiTags("Customers")
@ApiBearerAuth()
@Controller("customers")
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get("me")
  @ApiOperation({ summary: "My profile, including profileComplete" })
  me(@CurrentAuth() auth: AuthContext) {
    return this.customers.getProfile(auth.userId);
  }

  @Patch("me")
  @ApiOperation({
    summary: "Create or update my profile (name, email)",
    description: "The profile record exists from first sign-in; setting fullName completes it. The phone number can't be changed here.",
  })
  update(@CurrentAuth() auth: AuthContext, @Body({ schema: updateCustomerSchema }) body: z.output<typeof updateCustomerSchema>) {
    return this.customers.updateProfile(auth.userId, body);
  }
}

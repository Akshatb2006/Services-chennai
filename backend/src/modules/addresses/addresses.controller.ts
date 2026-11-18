import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { createAddressSchema, updateAddressSchema } from "@homecare/contracts";
import { z } from "zod";
import { CurrentAuth, type AuthContext } from "../../common/auth-context.js";
import { AddressesService } from "./addresses.service.js";

@ApiTags("Addresses")
@ApiBearerAuth()
@Controller("addresses")
export class AddressesController {
  constructor(private readonly addresses: AddressesService) {}

  @Get()
  @ApiOperation({ summary: "My saved addresses (default first)" })
  list(@CurrentAuth() auth: AuthContext) {
    return this.addresses.list(auth.userId);
  }

  @Post()
  @ApiOperation({ summary: "Add an address", description: "Chennai, Tamil Nadu only for now. The first address becomes the default." })
  create(@CurrentAuth() auth: AuthContext, @Body({ schema: createAddressSchema }) body: z.output<typeof createAddressSchema>) {
    return this.addresses.create(auth.userId, body);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Edit an address or make it the default (isDefault: true)" })
  update(
    @CurrentAuth() auth: AuthContext,
    @Param("id", { schema: z.uuid() }) id: string,
    @Body({ schema: updateAddressSchema }) body: z.output<typeof updateAddressSchema>,
  ) {
    return this.addresses.update(auth.userId, id, body);
  }

  @Delete(":id")
  @HttpCode(200)
  @ApiOperation({ summary: "Delete an address", description: "Past requests keep their copy of the address." })
  async remove(@CurrentAuth() auth: AuthContext, @Param("id", { schema: z.uuid() }) id: string) {
    await this.addresses.remove(auth.userId, id);
    return { deleted: true };
  }
}

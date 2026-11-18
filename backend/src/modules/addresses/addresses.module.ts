import { Module } from "@nestjs/common";
import { CustomersModule } from "../customers/customers.module.js";
import { AddressesController } from "./addresses.controller.js";
import { AddressesService } from "./addresses.service.js";

@Module({ imports: [CustomersModule], controllers: [AddressesController], providers: [AddressesService], exports: [AddressesService] })
export class AddressesModule {}

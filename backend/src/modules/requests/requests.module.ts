import { Global, Module } from "@nestjs/common";
import { AddressesModule } from "../addresses/addresses.module.js";
import { CustomersModule } from "../customers/customers.module.js";
import { NotificationsModule } from "../notifications/notifications.module.js";
import { RequestWorkflow } from "./request-workflow.js";
import { RequestsController } from "./requests.controller.js";
import { RequestsService } from "./requests.service.js";

@Global()
@Module({
  imports: [CustomersModule, AddressesModule, NotificationsModule],
  controllers: [RequestsController],
  providers: [RequestsService, RequestWorkflow],
  exports: [RequestWorkflow],
})
export class RequestsModule {}

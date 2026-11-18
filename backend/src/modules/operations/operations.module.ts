import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module.js";
import { AdminCustomersController, AdminRequestsController, AdminServicesController, AlertsController, AuditController, OverviewController } from "./operations.controller.js";
import { CustomersAdminService } from "./customers-admin.service.js";
import { OperationsService } from "./operations.service.js";
import { OverviewService } from "./overview.service.js";

/** Admin operations: overview, request management & assignment, customers, services, audit. */
@Module({
  imports: [NotificationsModule],
  controllers: [OverviewController, AdminRequestsController, AdminCustomersController, AdminServicesController, AuditController, AlertsController],
  providers: [OperationsService, OverviewService, CustomersAdminService],
})
export class OperationsModule {}

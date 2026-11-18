import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { NotificationsModule } from "../notifications/notifications.module.js";
import { DocumentStorage, UnconfiguredDocumentStorage } from "../professionals/document-storage.js";
import { ProAuthController, ProJobsController, ProMeController } from "./pro.controller.js";
import { ProGuard } from "./pro.guard.js";
import { ProAuthService } from "./pro-auth.service.js";
import { ProJobsService } from "./pro-jobs.service.js";
import { ProSelfService } from "./pro-self.service.js";

/** Homecare Pro (professional app) API. Reuses professional records, eligibility, the request workflow, notifications and audit. */
@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [ProAuthController, ProMeController, ProJobsController],
  providers: [ProGuard, ProAuthService, ProSelfService, ProJobsService, { provide: DocumentStorage, useClass: UnconfiguredDocumentStorage }],
})
export class ProModule {}

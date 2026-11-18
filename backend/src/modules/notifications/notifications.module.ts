import { Module } from "@nestjs/common";
import { ENV, type Env } from "../../config/env.js";
import { NotificationsController } from "./notifications.controller.js";
import { NotificationsService } from "./notifications.service.js";
import { PushSender, UnconfiguredPushSender } from "./push-sender.js";
import { SmsSender, smsSenderFactory } from "./sms-sender.js";

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    { provide: SmsSender, inject: [ENV], useFactory: (env: Env) => smsSenderFactory(env.OTP_PROVIDER) },
    { provide: PushSender, useClass: UnconfiguredPushSender },
  ],
  exports: [NotificationsService, SmsSender],
})
export class NotificationsModule {}

import { Global, Module } from "@nestjs/common";
import { ServiceSettingsService } from "./service-settings.service.js";
import { ServicesController } from "./services.controller.js";

@Global()
@Module({ controllers: [ServicesController], providers: [ServiceSettingsService], exports: [ServiceSettingsService] })
export class ServicesModule {}

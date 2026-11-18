import { Controller, Get, Param } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { categories, getService } from "@homecare/catalog";
import { notFound } from "../../common/app-exception.js";
import { Public } from "../../common/auth-context.js";
import { ServiceSettingsService } from "./service-settings.service.js";

/** The service catalogue from @homecare/catalog (same source as the website and app), minus services operations has paused. */
@ApiTags("Services")
@Public()
@Controller("services")
export class ServicesController {
  constructor(private readonly settings: ServiceSettingsService) {}

  @Get()
  @ApiOperation({ summary: "Bookable services with categories (paused services are omitted)" })
  async list() {
    return { categories, services: await this.settings.enabledServices() };
  }

  @Get(":slug")
  @ApiOperation({ summary: "One bookable service by slug" })
  async get(@Param("slug") slug: string) {
    const service = getService(slug);
    if (!service || !(await this.settings.isEnabled(slug))) throw notFound("Service");
    return service;
  }
}

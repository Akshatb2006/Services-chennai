import { Controller, Get, HttpCode, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { z } from "zod";
import { CurrentAuth, type AuthContext } from "../../common/auth-context.js";
import { NotificationsService } from "./notifications.service.js";

@ApiTags("Notifications")
@ApiBearerAuth()
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: "List my in-app notifications (newest first)" })
  list(@CurrentAuth() auth: AuthContext) {
    return this.notifications.list(auth.userId, "customer");
  }

  @Post(":id/read")
  @HttpCode(200)
  @ApiOperation({ summary: "Mark a notification as read" })
  async read(@CurrentAuth() auth: AuthContext, @Param("id", { schema: z.uuid() }) id: string) {
    return { updated: await this.notifications.markRead(auth.userId, id) };
  }
}

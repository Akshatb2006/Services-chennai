import { Body, Controller, Get, HttpCode, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { cancelRequestSchema, createRequestSchema, listRequestsQuerySchema } from "@homecare/contracts";
import { z } from "zod";
import { CurrentAuth, type AuthContext } from "../../common/auth-context.js";
import { RequestsService } from "./requests.service.js";

@ApiTags("Requests")
@ApiBearerAuth()
@Controller("requests")
export class RequestsController {
  constructor(private readonly requests: RequestsService) {}

  @Post()
  @ApiOperation({
    summary: "Send a service request",
    description: "Creates the request in status `pending` (received, under review). This is not a confirmed booking. Requires a complete profile and an address you own.",
  })
  create(@CurrentAuth() auth: AuthContext, @Body({ schema: createRequestSchema }) body: z.output<typeof createRequestSchema>) {
    return this.requests.create(auth.userId, body);
  }

  @Get()
  @ApiOperation({ summary: "My requests, newest first (cursor pagination)" })
  list(@CurrentAuth() auth: AuthContext, @Query({ schema: listRequestsQuerySchema }) query: z.output<typeof listRequestsQuerySchema>) {
    return this.requests.list(auth.userId, query);
  }

  @Get(":id")
  @ApiOperation({ summary: "One of my requests" })
  get(@CurrentAuth() auth: AuthContext, @Param("id", { schema: z.uuid() }) id: string) {
    return this.requests.get(auth.userId, id);
  }

  @Get(":id/history")
  @ApiOperation({ summary: "Status history of one of my requests (oldest first)" })
  history(@CurrentAuth() auth: AuthContext, @Param("id", { schema: z.uuid() }) id: string) {
    return this.requests.history(auth.userId, id);
  }

  @Post(":id/cancel")
  @HttpCode(200)
  @ApiOperation({ summary: "Cancel one of my requests", description: "Allowed until the work starts (pending, assigned, confirmed); 409 request_not_cancellable otherwise." })
  cancel(
    @CurrentAuth() auth: AuthContext,
    @Param("id", { schema: z.uuid() }) id: string,
    @Body({ schema: cancelRequestSchema }) body: z.output<typeof cancelRequestSchema>,
  ) {
    return this.requests.cancel(auth.userId, id, body.reason);
  }
}

import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Ip, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { jobNoteSchema, proJobsQuerySchema, refreshSchema, registerProfessionalSchema, sendOtpSchema, updateMyProfessionalSchema, verifyOtpSchema, type ProEarnings } from "@homecare/contracts";
import { z } from "zod";
import { AppException } from "../../common/app-exception.js";
import { Public } from "../../common/auth-context.js";
import { sha256 } from "../../common/crypto.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import { CurrentPro, NeedsProfile, ProOnly, type ProContext } from "./pro.guard.js";
import { ProAuthService } from "./pro-auth.service.js";
import { ProJobsService } from "./pro-jobs.service.js";
import { ProSelfService } from "./pro-self.service.js";

@ApiTags("Pro · Auth")
@Controller("pro/auth")
export class ProAuthController {
  constructor(private readonly auth: ProAuthService) {}

  @Public()
  @Post("send-otp")
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: "Send a Homecare Pro sign-in code" })
  sendOtp(@Body({ schema: sendOtpSchema }) body: z.output<typeof sendOtpSchema>, @Ip() ip: string) {
    return this.auth.sendOtp(body.phone, ip ? sha256(ip) : undefined);
  }

  @Public()
  @Post("verify-otp")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: "Verify the code and sign in to the Pro app", description: "Links an existing professional record with this phone number, if operations created one." })
  verifyOtp(@Body({ schema: verifyOtpSchema }) body: z.output<typeof verifyOtpSchema>, @Headers("user-agent") userAgent?: string) {
    return this.auth.verifyOtp(body.phone, body.code, { deviceName: body.deviceName, userAgent });
  }

  @Public()
  @Post("refresh")
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: "Rotate the Pro refresh token (single use)" })
  refresh(@Body({ schema: refreshSchema }) body: z.output<typeof refreshSchema>) {
    return this.auth.refresh(body.refreshToken);
  }

  @ProOnly()
  @Post("logout")
  @HttpCode(200)
  @ApiOperation({ summary: "Sign out of the Pro app on this device" })
  async logout(@CurrentPro() pro: ProContext) {
    await this.auth.logout(pro.sessionId);
    return { signedOut: true };
  }
}

@ApiTags("Pro · Me")
@ProOnly()
@Controller("pro/me")
export class ProMeController {
  constructor(
    private readonly self: ProSelfService,
    private readonly notifications: NotificationsService,
  ) {}

  @Get()
  @ApiOperation({ summary: "My account: phone, professional profile (null until registered), verification state" })
  me(@CurrentPro() pro: ProContext) {
    return this.self.me(pro.userId);
  }

  @Post()
  @ApiOperation({ summary: "Register as a professional", description: "Creates the profile with verification = pending. Only Homecare staff can verify." })
  register(@CurrentPro() pro: ProContext, @Body({ schema: registerProfessionalSchema }) body: z.output<typeof registerProfessionalSchema>) {
    return this.self.register(pro.userId, pro.phone, body);
  }

  @Patch()
  @NeedsProfile()
  @ApiOperation({
    summary: "Update my name, categories, pincodes, weekly availability or availability status",
    description: "Refused with 409 affects_assignments if the change would break an assigned or confirmed job. Verification and account status can't be changed here.",
  })
  update(@CurrentPro() pro: ProContext, @Body({ schema: updateMyProfessionalSchema }) body: z.output<typeof updateMyProfessionalSchema>) {
    return this.self.update(pro.userId, pro.professional!.id, body);
  }

  @Get("documents")
  @NeedsProfile()
  @ApiOperation({ summary: "My verification documents (storage not configured yet)" })
  async documents(@CurrentPro() pro: ProContext) {
    const me = await this.self.me(pro.userId);
    return { storageConfigured: me.documents.storageConfigured, documents: [] as { id: string; kind: string; createdAt: string }[] };
  }

  @Post("documents")
  @NeedsProfile()
  @ApiOperation({ summary: "Upload a verification document", description: "503 until secure document storage is connected." })
  upload() {
    throw new AppException("service_unavailable", "Document upload isn't available yet. Homecare will collect your documents during verification.", HttpStatus.SERVICE_UNAVAILABLE);
  }

  @Get("notifications")
  @ApiOperation({ summary: "My Pro-app notifications (newest first)" })
  list(@CurrentPro() pro: ProContext) {
    return this.notifications.list(pro.userId, "professional");
  }

  @Post("notifications/:id/read")
  @HttpCode(200)
  @ApiOperation({ summary: "Mark a notification as read" })
  async read(@CurrentPro() pro: ProContext, @Param("id", { schema: z.uuid() }) id: string) {
    return { updated: await this.notifications.markRead(pro.userId, id, "professional") };
  }

  @Get("earnings")
  @NeedsProfile()
  @ApiOperation({ summary: "Earnings", description: "Payments and payouts aren't implemented yet; returns status not_available (no figures are estimated)." })
  earnings(): ProEarnings {
    return { status: "not_available", message: "Payments and payouts aren't set up in Homecare yet. Your earnings will appear here once they are." };
  }
}

@ApiTags("Pro · Jobs")
@ProOnly()
@NeedsProfile()
@Controller("pro/jobs")
export class ProJobsController {
  constructor(private readonly jobs: ProJobsService) {}

  @Get()
  @ApiOperation({ summary: "My jobs by scope (upcoming, completed, cancelled, all)" })
  list(@CurrentPro() pro: ProContext, @Query({ schema: proJobsQuerySchema }) q: z.output<typeof proJobsQuerySchema>) {
    return this.jobs.list(pro.professional!, q.scope);
  }

  @Get(":id")
  @ApiOperation({ summary: "One of my jobs (404 for anyone else's)" })
  get(@CurrentPro() pro: ProContext, @Param("id", { schema: z.uuid() }) id: string) {
    return this.jobs.get(pro.professional!, id);
  }

  @Post(":id/acknowledge")
  @HttpCode(200)
  @ApiOperation({ summary: "Acknowledge an assigned job (informational, no status change)" })
  acknowledge(@CurrentPro() pro: ProContext, @Param("id", { schema: z.uuid() }) id: string) {
    return this.jobs.acknowledge(pro.professional!, id);
  }

  @Post(":id/start")
  @HttpCode(200)
  @ApiOperation({ summary: "Start the job (confirmed → in progress), on or after the appointment date" })
  start(@CurrentPro() pro: ProContext, @Param("id", { schema: z.uuid() }) id: string, @Body({ schema: jobNoteSchema }) body: z.output<typeof jobNoteSchema>) {
    return this.jobs.start(pro.professional!, pro.userId, id, body.note);
  }

  @Post(":id/complete")
  @HttpCode(200)
  @ApiOperation({ summary: "Mark the job completed (in progress → completed)" })
  complete(@CurrentPro() pro: ProContext, @Param("id", { schema: z.uuid() }) id: string, @Body({ schema: jobNoteSchema }) body: z.output<typeof jobNoteSchema>) {
    return this.jobs.complete(pro.professional!, pro.userId, id, body.note);
  }
}

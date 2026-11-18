import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { services } from "@homecare/catalog";
import {
  adminCustomerListQuerySchema,
  alertsQuerySchema,
  adminRequestListQuerySchema,
  assignSchema,
  auditQuerySchema,
  eligibilityQuerySchema,
  overviewQuerySchema,
  reassignSchema,
  rescheduleSchema,
  staffCancelSchema,
  transitionNoteSchema,
  updateServiceSettingSchema,
  type AdminServiceRow,
} from "@homecare/contracts";
import { z } from "zod";
import { notFound } from "../../common/app-exception.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { AlertsService } from "../alerts/alerts.service.js";
import { AuditService } from "../audit/audit.service.js";
import { CurrentStaff, RequirePermission, StaffOnly, type StaffContext } from "../staff/staff.decorators.js";
import { CustomersAdminService } from "./customers-admin.service.js";
import { OperationsService } from "./operations.service.js";
import { OverviewService } from "./overview.service.js";

const id = z.uuid();

@ApiTags("Admin · Overview")
@StaffOnly()
@Controller("admin/overview")
export class OverviewController {
  constructor(private readonly overview: OverviewService) {}

  @Get()
  @RequirePermission("overview.read")
  @ApiOperation({ summary: "Live request counts by status, professional counts and recent activity" })
  get(@Query({ schema: overviewQuerySchema }) q: z.output<typeof overviewQuerySchema>) {
    return this.overview.get(q);
  }
}

@ApiTags("Admin · Requests")
@StaffOnly()
@Controller("admin/requests")
export class AdminRequestsController {
  constructor(private readonly ops: OperationsService) {}

  @Get()
  @RequirePermission("requests.read")
  @ApiOperation({ summary: "Search and filter requests (by reference, customer name/phone, service, category, status, dates)" })
  list(@Query({ schema: adminRequestListQuerySchema }) q: z.output<typeof adminRequestListQuerySchema>) {
    return this.ops.list(q);
  }

  @Get(":id")
  @RequirePermission("requests.read")
  @ApiOperation({ summary: "Request with customer, history, assignments, notifications and the actions you may take" })
  detail(@CurrentStaff() staff: StaffContext, @Param("id", { schema: id }) rid: string) {
    return this.ops.detail(staff, rid);
  }

  @Get(":id/eligible-professionals")
  @RequirePermission("requests.read")
  @ApiOperation({ summary: "Professionals who can take this request at a date + slot (with reasons for those who can't)" })
  eligible(@Param("id", { schema: id }) rid: string, @Query({ schema: eligibilityQuerySchema }) q: z.output<typeof eligibilityQuerySchema>) {
    return this.ops.eligibility(rid, q);
  }

  @Post(":id/assign")
  @HttpCode(200)
  @RequirePermission("requests.assign")
  @ApiOperation({ summary: "Assign an eligible professional (under review → assigned). Does not confirm the appointment." })
  assign(@CurrentStaff() staff: StaffContext, @Param("id", { schema: id }) rid: string, @Body({ schema: assignSchema }) body: z.output<typeof assignSchema>) {
    return this.ops.assign(staff, rid, body);
  }

  @Post(":id/reassign")
  @HttpCode(200)
  @RequirePermission("requests.assign")
  @ApiOperation({ summary: "Replace the assigned professional and/or slot (→ assigned; needs re-confirmation)" })
  reassign(@CurrentStaff() staff: StaffContext, @Param("id", { schema: id }) rid: string, @Body({ schema: reassignSchema }) body: z.output<typeof reassignSchema>) {
    return this.ops.reassign(staff, rid, body);
  }

  @Post(":id/confirm")
  @HttpCode(200)
  @RequirePermission("requests.confirm")
  @ApiOperation({ summary: "Confirm the appointment with the customer (assigned → confirmed)" })
  confirm(@CurrentStaff() staff: StaffContext, @Param("id", { schema: id }) rid: string, @Body({ schema: transitionNoteSchema }) body: z.output<typeof transitionNoteSchema>) {
    return this.ops.confirm(staff, rid, body.note);
  }

  @Post(":id/reschedule")
  @HttpCode(200)
  @RequirePermission("requests.assign")
  @ApiOperation({ summary: "Move the appointment to another date/slot (same professional, re-checked for conflicts)" })
  reschedule(@CurrentStaff() staff: StaffContext, @Param("id", { schema: id }) rid: string, @Body({ schema: rescheduleSchema }) body: z.output<typeof rescheduleSchema>) {
    return this.ops.reschedule(staff, rid, body);
  }

  @Post(":id/start")
  @HttpCode(200)
  @RequirePermission("requests.progress")
  @ApiOperation({ summary: "Mark the service as started (confirmed → in progress)" })
  start(@CurrentStaff() staff: StaffContext, @Param("id", { schema: id }) rid: string, @Body({ schema: transitionNoteSchema }) body: z.output<typeof transitionNoteSchema>) {
    return this.ops.start(staff, rid, body.note);
  }

  @Post(":id/complete")
  @HttpCode(200)
  @RequirePermission("requests.progress")
  @ApiOperation({ summary: "Mark the service as completed (in progress → completed)" })
  complete(@CurrentStaff() staff: StaffContext, @Param("id", { schema: id }) rid: string, @Body({ schema: transitionNoteSchema }) body: z.output<typeof transitionNoteSchema>) {
    return this.ops.complete(staff, rid, body.note);
  }

  @Post(":id/cancel")
  @HttpCode(200)
  @RequirePermission("requests.cancel")
  @ApiOperation({ summary: "Cancel on the customer's behalf (before work starts). Releases the professional." })
  cancel(@CurrentStaff() staff: StaffContext, @Param("id", { schema: id }) rid: string, @Body({ schema: staffCancelSchema }) body: z.output<typeof staffCancelSchema>) {
    return this.ops.cancel(staff, rid, body.reason);
  }
}

@ApiTags("Admin · Alerts")
@StaffOnly()
@Controller("admin/alerts")
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Get()
  @RequirePermission("requests.read")
  @ApiOperation({ summary: "Bookings that need operations action (e.g. professional suspended). Resolved by reassigning, cancelling or reactivating." })
  list(@Query({ schema: alertsQuerySchema }) q: z.output<typeof alertsQuerySchema>) {
    return this.alerts.list(q.status);
  }
}

@ApiTags("Admin · Customers")
@StaffOnly()
@Controller("admin/customers")
export class AdminCustomersController {
  constructor(private readonly customers: CustomersAdminService) {}

  @Get()
  @RequirePermission("customers.read")
  @ApiOperation({ summary: "Search customers by name, email or phone" })
  list(@Query({ schema: adminCustomerListQuerySchema }) q: z.output<typeof adminCustomerListQuerySchema>) {
    return this.customers.list(q);
  }

  @Get(":id")
  @RequirePermission("customers.read")
  @ApiOperation({ summary: "Customer profile, saved addresses and request history" })
  get(@Param("id", { schema: id }) cid: string) {
    return this.customers.get(cid);
  }
}

@ApiTags("Admin · Services")
@StaffOnly()
@Controller("admin/services")
export class AdminServicesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @RequirePermission("services.read")
  @ApiOperation({ summary: "Catalogue services with their operational on/off state" })
  async list(): Promise<AdminServiceRow[]> {
    const settings = await this.prisma.serviceSetting.findMany();
    const staff = await this.prisma.staffMember.findMany({ where: { id: { in: settings.map((s) => s.updatedById).filter((x): x is string => !!x) } }, select: { id: true, fullName: true } });
    return services.map((s) => {
      const row = settings.find((x) => x.slug === s.slug);
      return { slug: s.slug, name: s.name, category: s.category, enabled: row?.enabled ?? true, updatedAt: row?.updatedAt.toISOString() ?? null, updatedBy: staff.find((x) => x.id === row?.updatedById)?.fullName ?? null };
    });
  }

  @Patch(":slug")
  @RequirePermission("services.write")
  @ApiOperation({ summary: "Pause or resume new requests for a service (catalogue ids and copy are unchanged)" })
  async update(@CurrentStaff() staff: StaffContext, @Param("slug") slug: string, @Body({ schema: updateServiceSettingSchema }) body: z.output<typeof updateServiceSettingSchema>) {
    if (!services.some((s) => s.slug === slug)) throw notFound("Service");
    await this.prisma.$transaction(async (tx) => {
      await tx.serviceSetting.upsert({ where: { slug }, update: { enabled: body.enabled, updatedById: staff.staffId }, create: { slug, enabled: body.enabled, updatedById: staff.staffId } });
      await this.audit.record(tx, staff, body.enabled ? "service.enabled" : "service.disabled", { type: "service", id: slug }, { reason: body.reason });
    });
    return (await this.list()).find((s) => s.slug === slug)!;
  }
}

@ApiTags("Admin · Audit")
@StaffOnly()
@Controller("admin/audit")
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @RequirePermission("audit.read")
  @ApiOperation({ summary: "Audit trail (read-only; entries can't be edited or deleted)" })
  list(@Query({ schema: auditQuerySchema }) q: z.output<typeof auditQuerySchema>) {
    return this.audit.list(q);
  }
}

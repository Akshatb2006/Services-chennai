import { HttpStatus, Injectable } from "@nestjs/common";
import { getService, isServiceSlug } from "@homecare/catalog";
import {
  type createRequestSchema,
  type listRequestsQuerySchema,
  type Page,
  type RequestAddressSnapshot,
  type RequestEvent,
  type ServiceRequest as ServiceRequestDto,
} from "@homecare/contracts";
import type { z } from "zod";
import { AppException, notFound } from "../../common/app-exception.js";
import { Clock } from "../../common/clock.js";
import { lockRequest } from "../../common/db.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { AddressesService } from "../addresses/addresses.service.js";
import { CustomersService } from "../customers/customers.service.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import { ServiceSettingsService } from "../services/service-settings.service.js";
import { requestWithAppointment, toEventDto, toRequestDto } from "./request-dto.js";
import { RequestWorkflow } from "./request-workflow.js";

export { toRequestDto } from "./request-dto.js";

/**
 * Customer service requests.
 * BUSINESS RULE: a new request is "pending" (received, under review). It is not a booking;
 * staff assign a professional and confirm separately (admin operations). Customers can cancel
 * until the work starts (pending/assigned/confirmed).
 */
@Injectable()
export class RequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customers: CustomersService,
    private readonly addresses: AddressesService,
    private readonly notifications: NotificationsService,
    private readonly settings: ServiceSettingsService,
    private readonly workflow: RequestWorkflow,
    private readonly clock: Clock,
  ) {}

  async create(userId: string, input: z.output<typeof createRequestSchema>): Promise<ServiceRequestDto> {
    if (!isServiceSlug(input.service)) {
      throw new AppException("invalid_service", "That service isn't available.", HttpStatus.UNPROCESSABLE_ENTITY, { fields: { service: "Choose a service from the list" } });
    }
    if (!(await this.settings.isEnabled(input.service))) {
      throw new AppException("invalid_service", "This service isn't taking new requests right now.", HttpStatus.UNPROCESSABLE_ENTITY, {
        fields: { service: "This service is paused. Choose another or try again later." },
      });
    }
    const customer = await this.customers.forUser(userId);
    if (!customer.fullName) {
      throw new AppException("profile_incomplete", "Add your name to your profile before sending a request.", HttpStatus.CONFLICT);
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const address = await this.addresses.getOwned(customer.id, input.addressId, tx);
      const snapshot: RequestAddressSnapshot = {
        label: address.label,
        line1: address.line1,
        line2: address.line2,
        landmark: address.landmark,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
      };
      const request = await tx.serviceRequest.create({
        data: {
          customerId: customer.id,
          serviceSlug: input.service,
          status: "pending",
          details: input.details,
          preferredDate: new Date(`${input.preferredDate}T00:00:00Z`),
          preferredTime: input.preferredTime,
          addressId: address.id,
          addressSnapshot: snapshot,
          createdAt: this.clock.now(),
        },
      });
      await this.workflow.event(tx, request, null, "pending", { kind: "customer", userId }, "Request submitted");
      await this.notifications.notify(tx, { userId, type: "request_received", requestId: request.id, context: { serviceName: getService(input.service)!.name } });
      return request;
    });
    return toRequestDto(created);
  }

  async list(userId: string, query: z.output<typeof listRequestsQuerySchema>): Promise<Page<ServiceRequestDto>> {
    const customer = await this.customers.forUser(userId);
    const rows = await this.prisma.serviceRequest.findMany({
      where: { customerId: customer.id, ...(query.status && { status: query.status }) },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: query.limit + 1,
      include: requestWithAppointment,
      ...(query.cursor && { cursor: { id: query.cursor }, skip: 1 }),
    });
    const items = rows.slice(0, query.limit).map(toRequestDto);
    return { items, nextCursor: rows.length > query.limit ? items[items.length - 1].id : null };
  }

  /** Owned request or 404 (never reveals other customers' requests). */
  private async owned(userId: string, id: string, tx: Prisma.TransactionClient | PrismaService = this.prisma) {
    const customer = await this.customers.forUser(userId);
    const request = await tx.serviceRequest.findFirst({ where: { id, customerId: customer.id }, include: requestWithAppointment });
    if (!request) throw notFound("Request");
    return request;
  }

  async get(userId: string, id: string): Promise<ServiceRequestDto> {
    return toRequestDto(await this.owned(userId, id));
  }

  async history(userId: string, id: string): Promise<RequestEvent[]> {
    const request = await this.owned(userId, id);
    const events = await this.prisma.requestEvent.findMany({ where: { requestId: request.id }, orderBy: { createdAt: "asc" } });
    return events.map(toEventDto);
  }

  async cancel(userId: string, id: string, reason?: string): Promise<ServiceRequestDto> {
    return this.prisma.$transaction(async (tx) => {
      const found = await this.owned(userId, id, tx);
      await lockRequest(tx, found.id);
      const request = (await tx.serviceRequest.findUnique({ where: { id: found.id } }))!;
      if (request.status === "cancelled") throw new AppException("request_not_cancellable", "This request is already cancelled.", HttpStatus.CONFLICT);
      if (request.status === "in_progress" || request.status === "completed") {
        throw new AppException("request_not_cancellable", "This request can no longer be cancelled in the app. Please contact support.", HttpStatus.CONFLICT);
      }
      await this.workflow.cancel(tx, request, { kind: "customer", userId }, reason || null);
      return toRequestDto((await tx.serviceRequest.findUnique({ where: { id: request.id }, include: requestWithAppointment }))!);
    });
  }
}

import { Injectable } from "@nestjs/common";
import type { AdminCustomerDetail, AdminCustomerListItem, adminCustomerListQuerySchema, Paged } from "@homecare/contracts";
import type { z } from "zod";
import { notFound } from "../../common/app-exception.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { toAddressDto } from "../addresses/addresses.service.js";
import { requestWithAppointment, toRequestDto } from "../requests/request-dto.js";

/** Read-only customer views for staff. */
@Injectable()
export class CustomersAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: z.output<typeof adminCustomerListQuerySchema>): Promise<Paged<AdminCustomerListItem>> {
    const digits = q.q?.replace(/\D/g, "") ?? "";
    const where: Prisma.CustomerWhereInput = q.q
      ? { OR: [{ fullName: { contains: q.q, mode: "insensitive" } }, { email: { contains: q.q, mode: "insensitive" } }, ...(digits.length >= 4 ? [{ user: { phone: { contains: digits } } }] : [])] }
      : {};
    const [total, rows] = await Promise.all([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: { user: { select: { phone: true } }, _count: { select: { requests: true, addresses: true } } },
      }),
    ]);
    return { total, page: q.page, pageSize: q.pageSize, items: rows.map((c) => this.toItem(c)) };
  }

  private toItem(c: Prisma.CustomerGetPayload<{ include: { user: { select: { phone: true } }; _count: { select: { requests: true; addresses: true } } } }>): AdminCustomerListItem {
    return {
      id: c.id,
      fullName: c.fullName,
      phone: c.user.phone,
      email: c.email,
      createdAt: c.createdAt.toISOString(),
      requestCount: c._count.requests,
      addressCount: c._count.addresses,
    };
  }

  async get(id: string): Promise<AdminCustomerDetail> {
    const c = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        user: { select: { phone: true } },
        _count: { select: { requests: true, addresses: true } },
        addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] },
        requests: { orderBy: { createdAt: "desc" }, take: 50, include: requestWithAppointment },
      },
    });
    if (!c) throw notFound("Customer");
    return { ...this.toItem(c), addresses: c.addresses.map(toAddressDto), requests: c.requests.map(toRequestDto) };
  }
}

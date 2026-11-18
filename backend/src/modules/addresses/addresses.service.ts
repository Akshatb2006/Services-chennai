import { Injectable } from "@nestjs/common";
import type { Address as AddressDto, createAddressSchema, updateAddressSchema } from "@homecare/contracts";
import type { z } from "zod";
import { notFound } from "../../common/app-exception.js";
import type { Address, Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { CustomersService } from "../customers/customers.service.js";

export const toAddressDto = (a: Address): AddressDto => ({
  id: a.id,
  label: a.label,
  line1: a.line1,
  line2: a.line2,
  landmark: a.landmark,
  city: a.city,
  state: a.state,
  pincode: a.pincode,
  latitude: a.latitude,
  longitude: a.longitude,
  isDefault: a.isDefault,
  createdAt: a.createdAt.toISOString(),
  updatedAt: a.updatedAt.toISOString(),
});

/**
 * Saved addresses. Every query is scoped by customerId, so another customer's address id
 * behaves exactly like a missing one (404) and its existence is never revealed.
 */
@Injectable()
export class AddressesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customers: CustomersService,
  ) {}

  async list(userId: string): Promise<AddressDto[]> {
    const { id } = await this.customers.forUser(userId);
    const rows = await this.prisma.address.findMany({ where: { customerId: id }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] });
    return rows.map(toAddressDto);
  }

  /** Owned address or 404. Used by service requests too. */
  async getOwned(customerId: string, id: string, tx: Prisma.TransactionClient | PrismaService = this.prisma) {
    const address = await tx.address.findFirst({ where: { id, customerId } });
    if (!address) throw notFound("Address");
    return address;
  }

  async create(userId: string, input: z.output<typeof createAddressSchema>): Promise<AddressDto> {
    const { id: customerId } = await this.customers.forUser(userId);
    const { isDefault, ...data } = input;
    const created = await this.prisma.$transaction(async (tx) => {
      const count = await tx.address.count({ where: { customerId } });
      const makeDefault = isDefault === true || count === 0; // first address is the default
      if (makeDefault) await tx.address.updateMany({ where: { customerId, isDefault: true }, data: { isDefault: false } });
      return tx.address.create({ data: { ...data, customerId, isDefault: makeDefault } });
    });
    return toAddressDto(created);
  }

  async update(userId: string, id: string, input: z.output<typeof updateAddressSchema>): Promise<AddressDto> {
    const { id: customerId } = await this.customers.forUser(userId);
    const { isDefault, ...data } = input;
    const updated = await this.prisma.$transaction(async (tx) => {
      const existing = await this.getOwned(customerId, id, tx);
      if (isDefault === true && !existing.isDefault) {
        await tx.address.updateMany({ where: { customerId, isDefault: true }, data: { isDefault: false } });
      }
      // Unsetting the only default is ignored: a customer with addresses always has one default.
      return tx.address.update({ where: { id }, data: { ...data, ...(isDefault === true && { isDefault: true }) } });
    });
    return toAddressDto(updated);
  }

  async remove(userId: string, id: string): Promise<void> {
    const { id: customerId } = await this.customers.forUser(userId);
    await this.prisma.$transaction(async (tx) => {
      const existing = await this.getOwned(customerId, id, tx);
      await tx.address.delete({ where: { id } });
      if (existing.isDefault) {
        const next = await tx.address.findFirst({ where: { customerId }, orderBy: { createdAt: "desc" } });
        if (next) await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    });
  }
}

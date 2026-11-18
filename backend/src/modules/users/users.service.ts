import { Injectable } from "@nestjs/common";
import type { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma/prisma.service.js";

/** Accounts. A verified phone number is the identity; first sign-in creates the account and its customer profile. */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findOrCreateCustomer(tx: Prisma.TransactionClient, phone: string, now: Date) {
    const user = await tx.user.upsert({
      where: { phone },
      update: { lastLoginAt: now },
      create: { phone, lastLoginAt: now, customer: { create: {} } },
      include: { customer: true },
    });
    // Accounts created by staff tooling may not have a customer profile yet.
    if (!user.customer) {
      const customer = await tx.customer.create({ data: { userId: user.id } });
      return { ...user, customer };
    }
    return user as typeof user & { customer: NonNullable<typeof user.customer> };
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }
}

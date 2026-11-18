import { Injectable } from "@nestjs/common";
import type { CustomerProfile, UpdateCustomerInput } from "@homecare/contracts";
import { notFound } from "../../common/app-exception.js";
import type { Customer, User } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma/prisma.service.js";

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  toProfile(user: Pick<User, "phone">, customer: Customer): CustomerProfile {
    return {
      id: customer.id,
      phone: user.phone,
      fullName: customer.fullName,
      email: customer.email,
      createdAt: customer.createdAt.toISOString(),
      profileComplete: !!customer.fullName,
    };
  }

  /** The caller's customer record (created at first sign-in). */
  async forUser(userId: string): Promise<Customer> {
    const customer = await this.prisma.customer.findUnique({ where: { userId } });
    if (!customer) throw notFound("Customer profile");
    return customer;
  }

  async getProfile(userId: string): Promise<CustomerProfile> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { customer: true } });
    if (!user?.customer) throw notFound("Customer profile");
    return this.toProfile(user, user.customer);
  }

  /** Phone is deliberately not updatable here: it is the verified account identity. */
  async updateProfile(userId: string, input: { fullName?: string; email?: string | null }): Promise<CustomerProfile> {
    const customer = await this.forUser(userId);
    await this.prisma.customer.update({
      where: { id: customer.id },
      data: { ...(input.fullName !== undefined && { fullName: input.fullName }), ...(input.email !== undefined && { email: input.email }) },
    });
    return this.getProfile(userId);
  }
}

export type { UpdateCustomerInput };

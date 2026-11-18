import { Injectable } from "@nestjs/common";
import { services } from "@homecare/catalog";
import { PrismaService } from "../../prisma/prisma.service.js";

/** Operational on/off switch per catalogue service. Canonical ids and copy stay in @homecare/catalog. */
@Injectable()
export class ServiceSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async disabledSlugs(): Promise<Set<string>> {
    const rows = await this.prisma.serviceSetting.findMany({ where: { enabled: false }, select: { slug: true } });
    return new Set(rows.map((r) => r.slug));
  }

  async isEnabled(slug: string): Promise<boolean> {
    const row = await this.prisma.serviceSetting.findUnique({ where: { slug } });
    return row?.enabled ?? true;
  }

  async enabledServices() {
    const disabled = await this.disabledSlugs();
    return services.filter((s) => !disabled.has(s.slug));
  }
}

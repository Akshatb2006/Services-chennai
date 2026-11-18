/**
 * Grants dashboard access to a phone number (run on the server, by someone with database access).
 * This is how the first super admin is created; afterwards super admins manage staff in the dashboard.
 *
 *   npm run staff:create -- --phone "98400 12345" --name "Priya Raman" --role super_admin
 *
 * There are no passwords: the person signs in at the dashboard with an OTP sent to that number.
 */
import "dotenv/config";
import { normaliseIndianMobile, staffRoles, type StaffRole } from "@homecare/contracts";
import { PrismaPg } from "@prisma/adapter-pg";
import { parseArgs } from "node:util";
import { PrismaClient } from "../src/generated/prisma/client.js";

const { values } = parseArgs({ options: { phone: { type: "string" }, name: { type: "string" }, role: { type: "string", default: "operations_staff" } } });
const phone = values.phone ? normaliseIndianMobile(values.phone) : null;
const role = values.role as StaffRole;
if (!phone || !values.name || values.name.trim().length < 2 || !staffRoles.includes(role)) {
  console.error(`Usage: npm run staff:create -- --phone <Indian mobile> --name "<full name>" --role <${staffRoles.join("|")}>`);
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
try {
  const staff = await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({ where: { phone }, update: {}, create: { phone, role: "staff" } });
    const s = await tx.staffMember.upsert({
      where: { userId: user.id },
      update: { fullName: values.name!.trim(), role, status: "active" },
      create: { userId: user.id, fullName: values.name!.trim(), role },
    });
    await tx.auditLog.create({ data: { action: "staff.bootstrapped", resourceType: "staff", resourceId: s.id, metadata: { role, via: "cli" } } });
    return s;
  });
  console.log(`✓ ${staff.fullName} (${phone}) can sign in to the dashboard as ${staff.role}.`);
} finally {
  await prisma.$disconnect();
}

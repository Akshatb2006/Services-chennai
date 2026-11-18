import { execSync } from "node:child_process";

/** Applies all migrations to the test database once per run. */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://homecare:homecare_dev@localhost:5433/homecare_test?schema=public";
  // Both variables point at the test database, so a MIGRATION_DATABASE_URL left in the shell can't redirect it.
  execSync("npx prisma migrate deploy", { env: { ...process.env, DATABASE_URL: url, MIGRATION_DATABASE_URL: url }, stdio: "pipe" });
}

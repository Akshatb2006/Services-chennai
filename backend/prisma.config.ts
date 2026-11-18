import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Prisma CLI configuration (generate, migrate).
 *
 * Migrations use MIGRATION_DATABASE_URL when set, otherwise DATABASE_URL (local development).
 * They need their own variable in production because the Prisma migration engine reads TLS options
 * differently from the runtime driver (node-postgres):
 *   runtime   DATABASE_URL           …?sslmode=verify-full&sslrootcert=/path/ca.crt
 *   migrate   MIGRATION_DATABASE_URL …?sslmode=require&sslaccept=strict[&sslcert=/path/ca.crt]
 * Without `sslaccept=strict` Prisma accepts ANY server certificate, so the migrate image
 * (REQUIRE_DB_TLS=true) refuses URLs that don't verify.
 */
const url = process.env["MIGRATION_DATABASE_URL"] ?? process.env["DATABASE_URL"];

if (process.env["REQUIRE_DB_TLS"] === "true") {
  const params = url ? new URL(url).searchParams : null;
  if (!params || params.get("sslmode") !== "require" || params.get("sslaccept") !== "strict") {
    throw new Error(
      "Refusing to migrate without verified TLS: set MIGRATION_DATABASE_URL with sslmode=require&sslaccept=strict " +
        "(add sslcert=/path/to/ca.crt for a private CA).",
    );
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url },
});

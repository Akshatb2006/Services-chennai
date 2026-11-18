# AGENTS.md

## NestJS

This app's version of NestJS is likely newer than what you know. https://docs.nestjs.com/llms.txt indexes its documentation, with a markdown page per chapter.

- Validation uses Zod schemas from `@homecare/contracts` with Nest's `StandardSchemaValidationPipe` (`@Body({ schema })`, `@Param('id', { schema })`). The same schemas generate the OpenAPI docs.
- Nest's packages are ESM only, and this project is ESM too: relative imports end in `.js`, `__dirname` doesn't exist (use `import.meta.dirname`), and tests run on Vitest (`vi.fn()`, not `jest.fn()`).
- The build uses the Rspack builder (`nest-cli.json`) so the shared TypeScript packages in `../catalog` and `../contracts` are bundled.

## Rules for this backend

- Every customer-owned query is scoped by `customerId`; another customer's id must behave exactly like a missing one (404).
- Never log or return OTP codes or tokens. Codes are stored only as peppered HMACs; refresh tokens only as SHA-256.
- A new service request is `pending` (under review), never a confirmed booking.
- Schema changes: edit `prisma/schema.prisma`, run `npx prisma migrate dev --name <change>`, and commit the migration.

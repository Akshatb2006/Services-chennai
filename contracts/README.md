# @homecare/contracts

The API contract between `backend/` and the apps: one file, `src/index.ts`.

- **Validation:** Zod schemas for every request body. The backend validates with them (Nest `StandardSchemaValidationPipe`, which also generates the OpenAPI docs), and the app reuses them in its forms.
- **Domain constants:** request statuses (and which ones a customer may cancel), preferred times, address labels, the service city.
- **Phone rules:** Indian mobile validation and E.164 normalisation.
- **Response types:** the shapes the API returns, inside the `{ data }` / `{ error }` envelope.

`zod` is a peer dependency: each consumer provides it. The consumer `tsconfig.json` maps `zod` to its own `node_modules`, and bundlers resolve it from the consumer.
Service identifiers come from `@homecare/catalog` (no duplicate list here).

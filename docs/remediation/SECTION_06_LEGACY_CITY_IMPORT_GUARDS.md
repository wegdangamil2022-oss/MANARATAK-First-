# Disabled P7 legacy direct write entrypoints — source only

On 2026-10-10 the following legacy CLIs were made fail-closed at their entrypoints (they are historical scripts and must not be used for canonical reference promotion):

- `scripts/import_asia_cities_combined.ts`
- `scripts/import_cities_all.ts`
- `scripts/import_real_asia_cities.ts`
- `scripts/import-sa-geography.ts`

They formerly performed direct Prisma writes or legacy API city/region promotion without a durable P7 review/apply contract. They now throw `REFERENCE_LEGACY_DIRECT_IMPORT_DISABLED_USE_GOVERNED_REVIEW_APPLY` before any importer loop or DB mutation. The archived source remains available for inspection, not execution.

Safe source inspection remains `scripts/dry-run-reference-geography.ts` (read-only CSV/XLSX parsing + owner preview). It is **not** proof of live DB state.

Re-enable import **only by replacing these CLIs** with an owner-approved durable P6→P7 pathway: staged source hashes, explicit reviewer/approval and scope, durable review identity/decision receipts, owner-side CAS/identity collision validation, transaction-bound Audit+Outbox, idempotency, recoverable checkpoints, and per-row provenance. A boolean environment bypass is intentionally **not** supported. No import command, database session or migration was executed in this review.

# Greenfield Migration Parity Verification

`npm run db:greenfield:verify` is the authoritative disposable-PostgreSQL verification for `MNT-AUD-0041`.

It requires two explicitly disposable PostgreSQL databases: a target database for full `prisma migrate deploy` replay and a separate shadow database for migration-directory evaluation. The verifier refuses production/live-looking database names, requires explicit disposable flags, and requires an additional opt-in for non-local CI hosts.

The gate performs:

1. Prisma schema validation.
2. Full checked-in migration replay onto the empty target.
3. Migration ledger status verification.
4. `migrate diff --from-url ... --to-schema-datamodel ... --exit-code` against the replayed target.
5. Independent `migrate diff --from-migrations ... --to-schema-datamodel ... --shadow-database-url ... --exit-code`.
6. PostgreSQL catalog checks for incomplete migration ledger, invalid indexes, unvalidated constraints, and unexpected user schemas under ADR-028.
7. Evidence artifacts under `greenfield-db-verification/` (or `GREENFIELD_VERIFY_OUTPUT_DIR`).

This command must run after dependencies and PostgreSQL tooling are available. Source verification alone does not claim database parity.

`prisma db push` is not an acceptable staging/production provisioning mechanism; migration-ledger replay is authoritative.

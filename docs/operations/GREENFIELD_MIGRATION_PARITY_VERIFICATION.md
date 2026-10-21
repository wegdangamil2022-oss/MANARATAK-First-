# Greenfield Migration Parity Verification

`npm run db:greenfield:verify` is the authoritative disposable-PostgreSQL verification for `MNT-AUD-0041`.

It requires two explicitly disposable PostgreSQL databases: a target database for full `prisma migrate deploy` replay and a separate shadow database for migration-directory evaluation. The current POST28 verifier accepts only declared disposable loopback targets and refuses production/live/restore names. It does not yet support Neon or other remote targets; do not bypass its guards.

The gate performs:

1. Prisma schema validation.
2. Full checked-in migration replay onto the empty target.
3. Migration ledger status verification.
4. private-argv `prisma-env-diff.mjs replayed` with `--exit-code` against the replayed target.
5. Independent migration-directory replay with `migrate deploy` onto a freshly verified empty DB-S, exact shadow ledger verification, then `migrate diff --from-schema-datasource ... --to-schema-datamodel ... --exit-code` using DB-S. Automatic shadow reset is not used: it drops `public` and requires database CREATE, which the limited role is forbidden to hold. Nonempty DB-S is refused rather than reset.
6. PostgreSQL catalog checks for incomplete migration ledger, invalid indexes, unvalidated constraints, and unexpected user schemas under ADR-028.
7. Exact per-migration name/checksum/order/finished/rollback/step verification, then a second deploy with byte-identical migration ledger.
8. Evidence artifacts under a required fresh absolute `GREENFIELD_VERIFY_OUTPUT_DIR` outside Git; existing paths are refused.

This command must run after dependencies and PostgreSQL tooling are available. Source verification alone does not claim database parity.

`prisma db push` is not an acceptable staging/production provisioning mechanism; migration-ledger replay is authoritative.

The SQL history is not edited. Static inventory currently finds multiple NOT VALID review candidates, including financial CHECK constraints, not just the student-document FK. The live catalog must identify remaining constraints, and orphan/data audits plus a reviewed validation procedure are mandatory before a final R04 result. No seed runs implicitly. See [Neon and R04/R05 preparation](POST28_NEON_R04_R05_PREPARATION.md).

A PASS from this structural verifier is not full R04 acceptance: required-only reference seed approval, reconciliation and repeat-apply evidence remain separate gates. See [R04 reconciliation](../remediation/POST28_R04_SCHEMA_RECONCILIATION_2026-10-16.md).

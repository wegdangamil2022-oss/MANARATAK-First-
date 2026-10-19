# R06 DEC06: actual database NULL-key uniqueness repair

Implementation source 7efa51061a9c9c1a739928d7c8799a6a74108393. Candidate SQL SHA-256 ae74cf355a8d6869a7e1368d98dfa7a262dc12c2e741dc0bf61ecbc81514cb9d.

## Delivered fix

The candidate replaces the existing UniversityProgramAdmissionRequirement_identity_key with a PostgreSQL16 unique index over the same four columns and the same index name, using NULLS NOT DISTINCT. It preserves all-status identity semantics and existing Prisma compound-key mapping. It does not coalesce NULL into invented IDs, alter domain fields, delete duplicates or depend on application owner locks.

The entire operation is transactional. A table SHARE ROW EXCLUSIVE lock prevents all INSERT/UPDATE/DELETE writers from racing between duplicate audit and index replacement while ordinary readers remain allowed. Explicit 5s lock and 60s statement limits cause safe failure instead of an indefinite deployment wait. The script validates PostgreSQL16 and the existing index's table, key order, unique/valid/ready flags, lack of expressions/predicate/INCLUDE columns and original NULL-distinct state before any replacement. Existing duplicate groups cause SQLSTATE23505 with ADMISSION_NULL_IDENTITY_DUPLICATES_REQUIRE_REVIEW; the original rows and index remain. Any DDL failure rolls the whole transaction back. There is no automatic retry, cleanup or acceptance bypass.

## Actual PostgreSQL verification

Two newly created PostgreSQL16.15 clusters applied the 110 unchanged historical migrations with matching checksums. Data assertions used two independent post28_app clients; only the declared non-superuser post28_tx_migrator role provisioned and exercised candidate DDL. Runtime had no schema CREATE or migration-ledger SELECT and no invoice/payment writes. Both owned clusters were cleanly stopped after proof.

On system7698175180333069092, ordinary direct inserts reproduced two identical NULL identities. Applying the candidate was rejected as designed, preserving both synthetic rows and the original index. Those duplicates were not deleted to make a later apply pass; the successful apply used the other independent clean cluster.

On system7698175180326932408, an explicit lab-only division-by-zero injection immediately after DROP INDEX proved transactional restoration of the original index. The unmodified candidate then applied successfully. Actual pg_index shows unique=true, valid=true, ready=true, indnullsnotdistinct=true, the exact four key columns and no partial predicate. Duplicate inserts fail with Prisma P2002 for all four NULL/non-NULL variant/version combinations, including a different status. Different combinations coexist. Two independent concurrent direct writers produce exactly one committed row and one P2002. A colliding direct UPDATE preserves its original identity. An FK ON DELETE SET NULL collision refuses the deletion and retains the variant and all dependent requirements. A companion University mutation in the same transaction rolls back when its duplicate insert fails.

The pinned Prisma5.22 migrate diff returned exit0 after the candidate and ordinary Prisma client reads/writes remained usable. This is compatibility evidence, not proof that Prisma represents or enforces the additional NULL semantics. The new read-only assertAdmissionNullIdentity catalog check rejects the historical index and accepts the corrected one. Promotion must carry this custom invariant into the accepted catalog checks; plain schema parity alone is insufficient. No Prisma upgrade or schema regeneration was needed. Node syntax check and source quality pass; API/Web/Admin builds and prior broad suites were not repeated because executable application code and dependencies did not change.

The check arrays include setup/role/catalog observations and are not presented as a count of new formal R06 test cases. Existing admission regression cases that intentionally insert historical duplicates remain applicable to the old 110-migration baseline; they were not deleted or weakened. A reviewed rollout must separate pre-migration duplicate-audit fixtures from post-migration rejection tests.

## Exact application status and gates

This is an implemented and experimentally verified migration candidate, not a production-applied constraint. Candidate path: docs/remediation/proposals/20261019000100_admission_null_identity/migration.sql. It deliberately remains outside Prisma's active migration tree. The 110-file inventory, accepted R04 schema/chain and historical migrations are unchanged; experimental application did not fabricate a migration-ledger entry or acceptance record. No existing database, Neon or production was touched. R05 remains blocked. R06's E01 implementation is now verified in the lab; controlled application/review remains open, so unrestricted writes on a database that has not received this index must still be treated as unprotected.

The owner explicitly requires extra migrations to retain their review/gates, and the current R06 authorization checks the accepted R04 schema and migration-chain hashes. Therefore moving this candidate into the active migration tree without a reviewed gate transition would break that contract; this work does not silently rewrite acceptance baselines. Review must approve the same four-key, all-status NULL-equality semantics; maintenance lock/timeout and volume suitability; the newly stricter FK SET NULL behavior; read-only duplicate-audit findings and any separate cleanup decision; and Prisma/catalog rollout verification. A separate cleanup request is required if actual duplicate data exists. There is no automated down migration, because silently removing the integrity protection would re-enable invalid writes.

## Resume

The concrete repair and laboratory proof are ready for review. After actual schema/R04/R05 gates are satisfied, place these exact reviewed bytes in a new append-only migration, apply only through the approved migration route, check duplicate audit + pg_index invariant + schema parity and then update accepted catalog evidence. Do not apply through db push/reset or reuse historical migration names. Do not rebuild the successful R07 application artifacts for these SQL/evidence-only additions. The R07 basic browser proof remains separately sourced to a821040.

Evidence: docs/reviews/evidence/post28/7efa51061a9c9c1a739928d7c8799a6a74108393/R06-null-identity/evidence-index.json.

Sources: [PostgreSQL16 uniqueness and NULL semantics](https://www.postgresql.org/docs/16/ddl-constraints.html), [Prisma custom migration workflow for unsupported features](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/unsupported-database-features). Current Prisma documentation describes the general workflow; actual version5.22 compatibility is established by the recorded local experiment, not inferred from v7 docs.

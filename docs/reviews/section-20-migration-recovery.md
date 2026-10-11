# P19 source-only migration and recovery

Migration source: `packages/infrastructure/prisma/migrations/20261011221500_section20_financial_safety/migration.sql`.

**UNAPPLIED / NOT_RUNTIME_SAFE.** Generation used Prisma datamodel-to-datamodel diff, and validation used a dummy localhost URL without connecting to a database. No migrate, SQL execution, seed, reset or backfill was run.

Changes add durable dispatch/capture claims, actor binding, provider evidence, scheduled reconciliation fields/indexes, financial record versions, immutable FX snapshots, replay command records, adjustment cases and incremental scan checkpoints/exceptions. New monetary writes have bounded positive-unit CHECKs. The partial unique active-obligation index requires historic duplicate review.

The SQL update is a planned safety quarantine for existing unresolved attempts, not a executed remediation: mark their dispatch/capture already claimed so a new release cannot replay old provider calls with a new key. Do not use a new idempotency key to evade an unresolved reservation. Old actor bindings, approvals and FX snapshots require independent review and attestation before runtime activation.

Deployment order after section 28: stop financial collection/dispatch workers, back up database and provider receipt records, inspect duplicate/invalid holds and ambiguous attempts, rehearse on a disposable restored target, apply the reviewed additive migration, verify Prisma parity and constraints, provision explicit roles and verified provider configuration, then execute sandbox concurrency/recovery acceptance. `FINANCE_RUNTIME_APPROVED` is an operational approval flag, not evidence itself; the signed release record is mandatory.

Rollback must preserve new immutable commands, signed evidence and unknown provider intentions. Disable dispatch first. Do not drop tables/claims or roll back to a binary that can re-charge unresolved work. If rollback is required, restore a tested compatible binary and separately reconcile external provider outcomes against persisted intent/ledger before allowing writes. No automatic destructive rollback SQL is provided.

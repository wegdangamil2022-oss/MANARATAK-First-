# WP1 Transactional Outbox Source Preparation

Status date: 2026-08-13

## Delivered in Codex

- Additive Prisma model with deterministic IDs, event/aggregate identity, payload/metadata, correlation and causation IDs.
- Pending, processing, processed, and failed states with attempts, availability, lease owner/expiry, and sanitized failure fields.
- Forward migration plus explicit rollback SQL. Neither was executed.
- `PrismaAtomicPersistenceUnitOfWork`, which exposes one transaction client to the business repository and Outbox append.
- `PrismaTransactionalOutboxStore`, which rejects append without that transaction context and fails closed when the migration is unavailable.
- `TransactionalOutboxDispatcher`, which claims batches, uses the Outbox ID as the delivery idempotency key, applies bounded exponential retry, parks exhausted records, and sanitizes error text.
- Read-only `outbox:verify` command for state, attempt, and expired-claim counters.

## Verification

| Check | Result |
|---|---|
| Prisma schema validation | PASS |
| TypeScript project references | PASS |
| Focused Outbox tests | 12/12 PASS |
| Migration applied | NO |
| Database connection | NONE |
| Database writes | 0 |
| Active worker composition | BLOCKED UNTIL MIGRATION |
| Active domain adoption | PENDING OWNER-BY-OWNER TRANSACTION TESTS |

## Required External Evidence

1. Close WP-1 backup and restore gate.
2. Review the authoritative database schema and migration SQL.
3. Apply the migration to the approved Development database.
4. Run the read-only verification command.
5. Adopt the unit of work in one owner use case at a time.
6. Prove business-write plus Outbox rollback on either failure.
7. Prove concurrent claim safety, retry, crash recovery, and idempotent delivery.
8. Enable dispatcher composition only after those checks pass.

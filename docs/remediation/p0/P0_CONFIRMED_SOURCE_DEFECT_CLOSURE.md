# P0 Confirmed Source Defect Closure

> **Operational supersession notice (2026-09-06):** Recovery-era database instructions in this historical artifact are superseded by [`docs/operations/GREENFIELD_DATABASE_PROVISIONING.md`](../../operations/GREENFIELD_DATABASE_PROVISIONING.md). This file remains evidence/history and is not current database-operation authority.

Date: 2026-08-14

## Verdict

`CONFIRMED SOURCE DEFECTS SRC-001 THROUGH SRC-014 = SOURCE CLOSED`

This closure covers source code, contracts, static database artifacts, and local automated verification. It does not authorize or claim migration application, production deployment, database reconciliation, restore verification, or runtime worker restart evidence.

## Closure Register

| Defect | Source closure evidence |
|---|---|
| SRC-001 | CI/type-safety defects corrected without weakening lint rules. |
| SRC-002 | Placeholder E2E replaced by real web, health, readiness, public-read, and unauthorized-admin checks. |
| SRC-003 | MJR/MAS/DOC/FEL source identities are preserved by promotion. |
| SRC-004 | University contracts moved out of generated/dummy definitions. |
| SRC-005 | Canonical University keys cannot be shadowed by optionalFields. |
| SRC-006 | University repository reads and writes normalized relationships. |
| SRC-007 | University Admin writes normalized details through an application boundary. |
| SRC-008 | International Test promotion uses transaction-bound persistence with Audit/Outbox. |
| SRC-009 | Major promotion uses transaction-bound persistence with automatic rollback. |
| SRC-010 | Retry classification, attempts, backoff, next availability, and DLQ thresholds are implemented. |
| SRC-011 | Worker claim, lease, heartbeat, completion, retry, and lease-loss protocol is implemented. |
| SRC-012 | Import dedup uses stable external identity plus canonical payload fingerprint; row order is excluded. |
| SRC-013 | Prisma University ChangeSet apply/rollback adapter records before/after state, Audit, and Outbox atomically. |
| SRC-014 | Additive University platform migration draft is present and unapplied. |

## Database Artifacts

- `20260814000100_import_worker_leases`: worker lease/retry columns and indexes.
- `20260814000200_add_normalized_university_platform`: normalized University tables, canonical foreign keys, ChangeSet persistence, and stable import uniqueness.

Both migrations remain unapplied until the Development Database Recovery Gate is closed.

## Verification

- TypeScript project build/typecheck: PASS.
- Prisma schema validation: PASS.
- Focused SRC-012/013/014 tests: PASS.
- Full Vitest repository suite: PASS.
- ESLint errors in changed scope: 0.
- Database mutations: NONE.

## Deferred Runtime Evidence

The following remain runtime/DB evidence, not source defects: backup and restore, migration review/application, persisted reconciliation counters, real worker kill/restart recovery, ChangeSet sample commit/rollback against Development PostgreSQL, and final bulk-import authorization.

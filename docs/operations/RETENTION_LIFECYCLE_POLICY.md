# MANARATAK Retention Lifecycle Policy

**Authority:** MNT-AUD-0081 / W2 source remediation  
**Runtime scheduler:** W3 PostgreSQL durable background-worker foundation (`MNT-AUD-0007`) — source-composed; PostgreSQL runtime proof remains pending.

## Owner policy

- **Import:** expiration purges only raw staging payload; the ImportRecord identity, status, provenance, offsets and evidence remain. Legal hold prevents disposition.
- **Audit:** expiration never deletes evidence. It transitions immutable evidence to `ARCHIVED`. Legal hold prevents disposition.
- **Asset:** `PERMANENT` assets are kept. Expired non-permanent assets are routed through the existing Asset lifecycle and AssetUsageRegistry boundary. Purge may proceed only after soft-delete and only when no authoritative consumer reference exists.

## Concurrency and retry

Each owner record has a bounded retention claim (`retentionClaimToken` / `retentionClaimUntil`). A worker must claim before applying a disposition. Failed work releases the claim and remains retryable. `RetentionDecisionRecord` is append-only evidence; only APPLIED/SKIPPED results are terminal for a decision key, while FAILED attempts do not suppress retry.

## Durable execution

`RetentionSweepUseCase` is composed with owner-specific Prisma gateways and registered as the `platform.retention.sweep` durable handler. Server bootstrap idempotently ensures the stable recurring job `system.retention.sweep`; execution is claimed from PostgreSQL by the generic worker. The API process timer only polls the durable queue and does not own job state. PostgreSQL migration/concurrency evidence remains `DB_RUNTIME_PENDING` until exercised on an approved disposable target.

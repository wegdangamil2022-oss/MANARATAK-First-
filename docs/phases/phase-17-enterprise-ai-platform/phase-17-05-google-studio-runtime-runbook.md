# Phase 17 — Google Studio Runtime Runbook

This runbook is intentionally deferred. Do not perform these actions during source implementation.

## 1. Database rollout

1. Back up the target database and confirm the rollback window.
2. Run Prisma migration status.
3. Apply `20260824170000_phase17_enterprise_ai_platform` with the approved deployment command.
4. Regenerate Prisma Client for the deployed build.
5. Verify the Phase 17 tables, indexes, and existing Phase 15/16 tables.
6. Create registry records through the Admin AI Center or a reviewed bootstrap job; do not seed fake executions.

## 2. Secret configuration

1. Choose only the providers approved for the environment.
2. Store provider keys in Google Studio secret/environment management.
3. Configure registry `secretReference` fields with the environment variable names only.
4. Never paste a key into Prisma, the Admin UI, logs, deployment output, or test fixtures.
5. Restart the API and confirm the selected provider changes from `NOT_CONFIGURED` to `READY`.

## 3. Controlled runtime proof

1. Configure one low-cost test model and one dedicated test consumer with strict quotas and cost limits.
2. Create and approve an immutable test prompt version, then deploy it explicitly. There is no auto-publish.
3. Execute one benign synchronous request and one asynchronous request.
4. Verify execution identity, trace/span chain, provider/model choice, safety decision, token usage, calculated cost, and idempotent replay.
5. Force a mocked or sandboxed retryable provider failure and prove fallback/circuit behavior.
6. Run a small evaluation dataset and a workflow run.
7. Index one approved, non-sensitive source and verify provenance without copying canonical business ownership into AI storage.
8. Reconcile provider-reported tokens and cost with `AIUsageRecord`; document tolerance.

## 4. Acceptance evidence

Capture migration status, provider readiness (without secrets), request/trace IDs, quota and budget results, safety/redaction evidence, fallback evidence, evaluation output, knowledge provenance, and cost reconciliation.

Required deferred outcomes:

- `LIVE_PROVIDER_CONFIGURATION = VERIFIED`
- `LIVE_PROVIDER_HEALTH_PROOF = VERIFIED`
- `LIVE_AI_INFERENCE = VERIFIED`
- `REAL_TOKEN_COST_RUNTIME_PROOF = VERIFIED`

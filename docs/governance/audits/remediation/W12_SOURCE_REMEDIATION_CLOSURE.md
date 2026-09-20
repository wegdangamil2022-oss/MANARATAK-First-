# W12 Source Remediation Closure — AI Platform Governance and Execution Safety

## Scope

Wave W12 closes the fourteen registered Phase 17 source findings in the official deep-audit register. No provider calls, migration deployment, quota backfill, circuit-state activation or production AI traffic is executed by this source remediation.

## Source closure

- Capability-to-prompt routing uses one explicit unique persisted binding. Migration preflight fails closed if legacy ACTIVE prompts collide on one capability.
- Prompt deployment accepts evaluation evidence only when target type, prompt key, immutable version and checksum exactly match the candidate version.
- Evaluation can execute an APPROVED immutable prompt version before deployment, preventing first-deployment circularity.
- Every declared evaluator has real fail-closed behavior; unsupported evaluator types never count as passes.
- PROMPT, MODEL, ROUTING and WORKFLOW evaluations use target-specific execution paths and persist immutable target evidence. KNOWLEDGE evaluation remains explicitly unsupported rather than masquerading as a generic capability evaluation.
- Workflow definitions create immutable version snapshots; queued runs execute their recorded frozen version, validate a DAG, honor `dependsOn` and bounded `retryLimit`, and persist step attempts.
- Human-review-required policies fail closed at activation and execution until a governed review workflow is provided.
- Structured output uses a recursive governed JSON Schema subset with explicit draft-2020-12 policy and fail-closed unsupported keywords/types/formats.
- Governed regexes are bounded and compiled at governance/schema time with unsafe-pattern rejection; request paths reuse compiled guardrails.
- Execution creation and maximum token/cost reservation share a Serializable persistence boundary. Historical usage remains counted while only pending reservations are added to actual usage.
- AI cost overview and budget enforcement preserve currency dimensions; unlike currencies are never added as one amount.
- Async jobs use expiring leases, Serializable stale-run reclaim, bounded attempts and outbox recovery evidence.
- Concurrent idempotency races resolve the unique-key winner to replay semantics instead of surfacing a persistence conflict.
- Provider circuit state is persisted/shared and retry delay includes bounded jitter.
- Integration Gate IG-H may proceed to W13 only after W12 source gates remain green.

## Runtime / database proof deferred to Google Studio

1. Backup/recovery gate and migration dry-run for `20260826045000_w12_ai_governance_execution_safety`.
2. Prompt capability binding collision report and deterministic active-prompt binding verification.
3. Governed re-save/freeze of currently active workflow definitions before enabling new workflow runs.
4. Legacy evaluation-run review; pre-W12 rows without exact target evidence must not authorize deployment.
5. Concurrent quota/idempotency load test across multiple API instances and PostgreSQL Serializable retry proof.
6. Async worker crash/reclaim test across processes and dead-letter evidence verification.
7. Shared provider circuit / half-open probe test across multiple instances.
8. Multi-currency usage/budget proof with real provider pricing snapshots.
9. Full repository typecheck/build/lint/unit/integration test run with dependencies installed.

`SOURCE_REMEDIATION=CLOSED`

`RUNTIME_DB_PROOF=PENDING_GOOGLE_STUDIO`

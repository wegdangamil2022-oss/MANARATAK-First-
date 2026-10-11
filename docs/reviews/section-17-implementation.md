# Section 17 — Enterprise AI Platform (P17) — Implementation review

**Verdict: SOURCE_INCOMPLETE — DO NOT CLAIM CODE_CLOSED OR RUNTIME_READY.**

- Repository: `wegdangamil2022-oss/MANARATAK-First-`; review branch: `feat/section-17-enterprise-ai-platform`.
- Baseline inspected: `main@4571ec9c3e4362470d03a2ed2706664cd8ee09c0` (merged PR #18).
- Authoritative plan: Library `MANARATAK_ADMIN_REVIEW_CODEX.md`, heading **18 — Enterprise AI Platform (P17)**, tasks `AI-ADM-001…030` and annex `FGA-18-001…002`. Plan's numeric 18 section is **not** P18 Student Tools.
- Additional source read: `docs/phases/phase-17-enterprise-ai-platform/phase-17-01…05`, `docs/reviews/section-16-implementation.md`, `docs/reviews/section-16-closure-gates.md`. No `AGENTS.md` at checked repository root / apps / packages parent directories.
- Phase ownership unchanged: P17 exclusively owns provider/model orchestration, prompt lifecycle, AI execution, accounting, and knowledge projections. P18 owns student-tool entitlements and UX. No cross-domain provider adapter introduced.
- Review standard: actual code and source-level tests inspected; older source closure reports **are not** current verification. Changes are confined to this feature branch. **No migration executed, no database touched, no worker started, no real provider/paid inference and no deployment.**

## Source changes delivered for independent review

1. **Prompt controls**: `PrismaAIPlatformRepository.ts` now compares actual stored `createdBy`/`approvedBy` with authenticated reviewer/deployer inside the transactional mutation; protects prior production version on denied deployment. Three distinct principals required.
2. **Evaluation provenance**: `AIPlatformUseCases.ts` derives an SHA-256 of evaluation definition, dataset, evaluators, target and deployment gate. Run commencement, completion and deploy compare it; result fingerprint and submitter/executor identities are stored in the existing JSON `targetEvidence` field. Evaluation approval is one-shot CAS and denies both submitter and executor, with audit/outbox in the same transaction. **Race/frozen-definition limitations noted below.**
3. **Async queue**: durable execution idempotency now derives from `job.publicId`, not optional request header. New repository claimable-job query filters due retries/expired leases before oldest-first bounding, reducing starvation. The existing transactional quota reservation/lease claim remains.
4. **RBAC**: fine-grained AI Admin `view/configure/prompt:author/prompt:review/deploy/safety:manage/cost:manage/execute/index:approve/queue:operate` authorization. Legacy `/ai` and `/admin/ai/operator` require execute permission. Frontend route and navigation require `admin:ai:view` rather than broad manage.
5. **Privacy/concurrency**: non-public input/output previews are not persisted for new executions. Higher data classification in owner metadata cannot be downgraded by a lower requested label. Existing AI registry updates require expected `updatedAt` comparison before modification.
6. **Knowledge containment**: legacy freeform unverified knowledge HTTP submissions are denied before provider calls. **Trusted canonical owner-ingestion must still be built**; this temporary fail-closed behavior is not functional indexing closure.
7. **Admin incident visibility**: execution list has consumer/provider/purpose facets and reset synced to query URL; async jobs link to existing execution/trace without launching new inference.

8. **Durable async result**: encrypted AES-GCM envelope stored in existing execution metadata with 24-hour read TTL and requester-scoped `GET /ai/executions/:publicId/result` (no-store). Actual plaintext is not written to general execution trace. Expired ciphertext purge/reconciliation still open.
9. **Routing/pricing/incident/source guards**: overlapping ACTIVE model pricing revisions rejected; model routes require explicit finite prices; conflicting active routing fails closed; audited incident state machine; provider response JSON size and schema complexity bounded. AI hub navigation/branding and text direction now include EN as well as AR; complete forms translation remains open.

## Task-by-task reconciliation

Status names mean **source patches only** unless a separate executed test record exists. A test file being present is not PASS.

| Plan item | Source status | Actual code evidence, gaps and acceptance needs |
| --- | --- | --- |
| `AI-ADM-001` | **PARTIAL** | Transaction blocks prompt author approval and author/checker deployment; distinct RBAC author/review/deploy. Missing explicit break-glass reviewed path, executed regression proof. |
| `AI-ADM-002` | **PARTIAL** | Definition/dataset/evaluator/gate SHA-256 bound to run, drift checked before and after evaluation, deploy requires match. Transaction-time revalidation, frozen-definition snapshot and race test still needed. |
| `AI-ADM-003` | **PARTIAL** | Worker-scoped stable idempotency key derived from job.publicId; no caller override. Provider outcome reconciliation, lease heartbeat/fencing and charge-once crash proof still pending. |
| `AI-ADM-004` | **PARTIAL** | Per-action authorization in AIAdminRouter and operator alias; Admin view route/navigation updated. Missing role provisioning proof, denied RBAC matrix runtime, permission-aware buttons. |
| `AI-ADM-005` | **OPEN** | No immutable activation gate for guardrail, routing, consumer spend ceilings, and emergency switch. |
| `AI-ADM-006` | **MITIGATED_NOT_CLOSED** | Manual unverified ingestion now fails closed before embedding provider; canonical owner verification and trusted read-only gateway remain unwired. |
| `AI-ADM-007` | **OPEN** | Plaintext chunks/vector persistence classification, retention, search scoping, and revocation lifecycle not completed. Legacy manual indexing is quarantined. |
| `AI-ADM-008` | **PARTIAL** | Execution now selects max sensitivity from caller/metadata/ownerDataClassification; authenticated owner provenance and positive consent still needed. |
| `AI-ADM-009` | **PARTIAL** | New non-PUBLIC input/output preview persistence suppressed; existing records purge, TTL and scoped diagnostics remain pending. |
| `AI-ADM-010` | **OPEN** | Reservation reconciliation for crash/unknown provider outcomes and operator adjudication missing. |
| `AI-ADM-011` | **OPEN** | Durable queue admission quota/occupancy/idempotency before submit absent; execution-time quota retained. |
| `AI-ADM-012` | **SOURCE_PATCHED_UNVERIFIED** | Database selects due QUEUED/RETRYING and expired RUNNING before oldest-first limit; new focused tests committed, not executed. |
| `AI-ADM-013` | **PARTIAL** | Durable AES-GCM 24h TTL-encrypted response envelope stored in AI execution metadata atomically with completion; requester-scoped no-store GET /ai/executions/:publicId/result and replay decryption use existing payload protector, tests authored. Physical purge after TTL, result custody during key rotation, recovery after provider ACK and runtime access proof still OPEN. |
| `AI-ADM-014` | **OPEN** | Workflow step outputs can still be raw snapshots and INTERNAL classification is fixed. |
| `AI-ADM-015` | **OPEN** | Workflow run requester identity/consumer budget/authorization missing. |
| `AI-ADM-016` | **OPEN** | Frozen prompt/model/routing bindings across workflow retry incomplete. |
| `AI-ADM-017` | **PARTIAL** | Active routing now fails closed when more than one exact/fallback policy applies, avoiding updatedAt silent winner. Atomic approved effective binding, immutable schedule and rollback still OPEN. |
| `AI-ADM-018` | **PARTIAL** | Evaluation submitter/executor identity recorded in evidence; independent one-shot reviewer and result checksum required at repository. Immutable definition snapshot and broader history proof missing. |
| `AI-ADM-019` | **SOURCE_PATCHED_UNVERIFIED** | Repository requires expectedUpdatedAt on existing records under transaction+advisory lock; Admin editor already sends revision. Need executed concurrent write regression. |
| `AI-ADM-020` | **PARTIAL** | Production execution enforces finite explicit model input/output prices (zero only if declared), checks effective overlapping ACTIVE pricing windows before writes, tests authored. Cost kind/ledger real-provider reconciliation and historic unknown amounts remain OPEN. |
| `AI-ADM-021` | **OPEN** | Requester-scoped fairness and concurrent in-flight admission not implemented. |
| `AI-ADM-022` | **OPEN** | Embedding replace identity still omits sourceType/version; collision risk remains (legacy path quarantined). |
| `AI-ADM-023` | **OPEN** | In-flight cancellation provider signal, honest cancel state and late-result CAS incomplete. |
| `AI-ADM-024` | **OPEN** | Atomic staged indexing/source activation and PENDING recovery not implemented (manual path quarantined). |
| `AI-ADM-025` | **PARTIAL** | Capability readiness now distinguishes canAttempt from healthVerified and declares RUNTIME_PENDING truthfully; first permitted attempt remains possible, as shown in admin readiness UX. Per-capability probe lifetime/evidence/runtime checks still OPEN. |
| `AI-ADM-026` | **PARTIAL** | AI Admin hub group/section navigation, title, intro and text direction respect language ar/en, but operational panels, dialogs, hints and error/status translations still Arabic-first. Full extraction to dictionaries and browser validation OPEN. |
| `AI-ADM-027` | **OPEN** | Canonical source ingestion byte/chunk/vector/provider batch bounds not implemented; unverified path blocked. |
| `AI-ADM-028` | **PARTIAL** | Incidents now transition only via atomic audited NOTE_ADDED / INVESTIGATION_UPDATE / MITIGATION_RECORDED / RESOLUTION_RECORDED state machine; direct status edits blocked. Severity-specific approval, replay-idempotent events, negative lifecycle runtime tests still OPEN. |
| `AI-ADM-029` | **PARTIAL** | Provider Fetch transport now limits response bytes before JSON parse; malformed/oversized mocks added; structured-output schema depth/node complexity bounded with hostile-shape tests authored. Full multi-provider fuzz/timeout/exhaustive matrix OPEN. |
| `AI-ADM-030` | **DEFERRED_POST_28** | Real provider, database migration, queue worker, outbox, cross-domain E2E/security tests deferred per instruction. |
| `FGA-18-001` | **SOURCE_PATCHED_UNVERIFIED** | Admin executions now offer consumerKey/providerKey/purpose facets, query URL persistence and reset; API already has validated filters. Pagination/backend fixture proof deferred. |
| `FGA-18-002` | **PARTIAL** | Async job table links existing executionPublicId to read-only execution/trace page, no API re-execution; richer attempt-cost correlation and RBAC/source timestamps pending. |

## Targeted regression source files added or modified

- `packages/infrastructure/tests/ai-platform/PrismaAIPlatformRepository.spec.ts`: self-approval, author/checker deployment, due queue ordering, independent evaluation approval guards.
- `packages/application/tests/ai-platform/AIAsyncExecution.spec.ts`: stable async job-key and due queue sweep.
- `packages/application/tests/ai-platform/AIPlatformGovernance.spec.ts`: immutable evaluation definition drift and unverified source ingestion denial.
- `apps/api/tests/presentation/api/router/AIAdminRouter.spec.ts` (new): fine-grained HTTP RBAC 401/403, reviewer allowed, unknown operations denied.

**Execution evidence:** Source tests committed but no full positive exact-head CI verification yet. GitHub plugin provided file/commit operations, but no working-tree shell with authenticated repository clone/installed dependencies. TypeScript, Vitest, ESLint, formatting, application build and coverage must be run in a trusted isolated checkout at this branch SHA. Do not convert the presence of source tests or previous `main` GitHub checks into success for this branch. Latest independent GitHub CI outcomes must be bound to head SHA when available.

## Unresolved source blockers — prerequisites before CODE_CLOSED

- P0: immutable per-gate snapshot locked with deployment transaction; async provider acknowledgement/charge-once reconciliation with lease renewal and recovery; explicit approved break-glass and independent-authority evidence.
- P1 security: immutable high-impact config approval; trusted owner-controlled indexing + privacy envelope; quota cleanup/admission; per-requester fair billing/routing and immutable workflow lifecycle; cancellation semantics; conflict-safe indexing/source version swap; incident authority and cost truth.
- P2 source: AR/EN localized AI center and operator permission-aware controls; safe provider parsing/indexing resource limits; full focused source/TypeScript test evidence; remaining linked job-cost observability.
- Post-28 runtime: disposable DB migration/rollback, worker lease fault injection, real provider sandbox tests, secrets/cost reconciliation, E2E requester privacy, audit/outbox, AR/EN browser checks.

**No claim of completion of 30 tasks; do not merge this Draft PR as source-closed.** Use it as an independently reviewable remediation tranche. See `section-17-closure-gates.md` for explicit release and follow-up verification gates.

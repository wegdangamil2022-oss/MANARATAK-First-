# Section 17 — Enterprise AI Platform (P17) — Implementation review

**Verdict: SOURCE_INCOMPLETE — DO NOT CLAIM CODE_CLOSED OR RUNTIME_READY.**

**Review PR:** [#19](https://github.com/wegdangamil2022-oss/MANARATAK-First-/pull/19) (Draft, targets main; no merge).

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
| `AI-ADM-002` | **PARTIAL** | SHA-256 binds definition/dataset/evaluators/gate to run; run checks drift pre/post evaluation; deployment now independently revalidates exact approved gate evidence inside its transaction and common advisory gate lock. Immutable evaluated snapshot, active gate activation governance and race proof still needed. |
| `AI-ADM-003` | **PARTIAL** | Durable job-scoped execution identity and a fenced 10-minute lease renewed every third of its lifetime; stale worker cannot finish under a different lock. Provider ACK loss, crash-time cost reconciliation, and actual multiworker fault tests remain open. |
| `AI-ADM-004` | **PARTIAL** | Admin API checks granular P17 permissions for each operation, operator alias execute-only; UI read-only viewer controls now deny mutations and navigation supports view. Active role/permission provisioning and every-route denied matrix runtime proof still required. |
| `AI-ADM-005` | **PARTIAL** | Guardrail, routing and consumer policies now require an unchanged REVIEW revision approved by a different authenticated actor, checked in the registry transaction; direct new ACTIVE or in-place ACTIVE rewrites rejected. Re-enabling the emergency-disabled runtime is denied until a governed approval path is built. Dedicated immutable staged activation/rollback, break-glass authorization and runtime proof remain OPEN. |
| `AI-ADM-006` | **MITIGATED_NOT_CLOSED** | Manual unverified ingestion now fails closed before embedding provider; canonical owner verification and trusted read-only gateway remain unwired. |
| `AI-ADM-007` | **OPEN** | Plaintext chunks/vector persistence classification, retention, search scoping, and revocation lifecycle not completed. Legacy manual indexing is quarantined. |
| `AI-ADM-008` | **PARTIAL** | Execution now selects max sensitivity from caller/metadata/ownerDataClassification; authenticated owner provenance and positive consent still needed. |
| `AI-ADM-009` | **PARTIAL** | New non-PUBLIC execution previews omitted; Admin now redacts historical private input/output and trace attributes on reads without mutating DB. Physical historical purge, purpose-scoped diagnostics and retention TTL still outstanding. |
| `AI-ADM-010` | **OPEN** | Reservation reconciliation for crash/unknown provider outcomes and operator adjudication missing. |
| `AI-ADM-011` | **PARTIAL** | Enqueue now bounds UTF-8 payload to 256 KB, serializes per-consumer admission with 1000 consumer / 25 requester active slots, and replays optional requester-scoped idempotency keys (P2002 race recovery and changed-payload rejection). Pre-enqueue token/cost reservation and required idempotency for all clients remain open. |
| `AI-ADM-012` | **SOURCE_PATCHED_UNVERIFIED** | Database selects due QUEUED/RETRYING and expired RUNNING before oldest-first limit; new focused tests committed, not executed. |
| `AI-ADM-013` | **PARTIAL** | Durable AES-GCM 24h TTL-encrypted response envelope stored in AI execution metadata atomically with completion; requester-scoped no-store GET /ai/executions/:publicId/result and replay decryption use existing payload protector, tests authored. Physical purge after TTL, result custody during key rotation, recovery after provider ACK and runtime access proof still OPEN. |
| `AI-ADM-014` | **PARTIAL** | New workflow checkpoint outputs are AES-GCM protected under the existing runtime protector, TTL 24h, plaintext historical snapshots rejected on resume; unknown owner input defaults to CONFIDENTIAL and input/output sizes bounded. Owner consent, per-step cross-provider policy and persisted requester authorization are still missing. |
| `AI-ADM-015` | **PARTIAL** | Workflow creation and execution now require authenticated requester identity, scoped in existing immutable input digest; cross-principal replay denied, and every billable workflow step inherits that requester for consumer quotas. No dedicated persisted requester column, per-workflow budget envelope or multi-process proof yet. Legacy unscoped runs intentionally fail closed on resume. |
| `AI-ADM-016` | **OPEN** | Frozen prompt/model/routing bindings across workflow retry incomplete. |
| `AI-ADM-017` | **PARTIAL** | Active routing now fails closed when more than one exact/fallback policy applies, avoiding updatedAt silent winner. Atomic approved effective binding, immutable schedule and rollback still OPEN. |
| `AI-ADM-018` | **PARTIAL** | Evaluation submitter/executor identity recorded in evidence; independent one-shot reviewer and result checksum required at repository. Immutable definition snapshot and broader history proof missing. |
| `AI-ADM-019` | **SOURCE_PATCHED_UNVERIFIED** | Repository requires expectedUpdatedAt on existing records under transaction+advisory lock; Admin editor already sends revision. Need executed concurrent write regression. |
| `AI-ADM-020` | **PARTIAL** | Production execution enforces explicit finite model prices even without a monthly cost limit (zero only when declared). Active price interval overlap is checked while holding a model-scoped transaction advisory lock; mocked negative tests authored. Ledger/provider reconciliation and unknown historical cost remain OPEN. |
| `AI-ADM-021` | **PARTIAL** | Per-requester consumer quotas (rate, daily, in-flight) now carry optional governed policy and safe bounded defaults into serializable atomic execution reservation. Full multi-process contention/fairness tests and async queue admission fairness still outstanding. |
| `AI-ADM-022` | **OPEN** | Embedding replace identity still omits sourceType/version; collision risk remains (legacy path quarantined). |
| `AI-ADM-023` | **PARTIAL** | Pre-dispatch cancellation atomically CASes RECEIVED/QUEUED to CANCELLED with governance audit/outbox and refuses in-flight false-success; dispatch CAS loses to cancellation and releases unused quota. Provider-level AbortSignal, reconciled unknown charges and late-response concurrency matrix remain open. |
| `AI-ADM-024` | **OPEN** | Atomic staged indexing/source activation and PENDING recovery not implemented (manual path quarantined). |
| `AI-ADM-025` | **PARTIAL** | Capability readiness now distinguishes canAttempt from healthVerified and declares RUNTIME_PENDING truthfully; first permitted attempt remains possible, as shown in admin readiness UX. Per-capability probe lifetime/evidence/runtime checks still OPEN. |
| `AI-ADM-026` | **PARTIAL** | AI Admin hub group/section navigation, title, intro and text direction respect language ar/en, but operational panels, dialogs, hints and error/status translations still Arabic-first. Full extraction to dictionaries and browser validation OPEN. |
| `AI-ADM-027` | **OPEN** | Canonical source ingestion byte/chunk/vector/provider batch bounds not implemented; unverified path blocked. |
| `AI-ADM-028` | **PARTIAL** | Incidents now transition only via atomic audited NOTE_ADDED / INVESTIGATION_UPDATE / MITIGATION_RECORDED / RESOLUTION_RECORDED state machine; direct status edits blocked. Severity-specific approval, replay-idempotent events, negative lifecycle runtime tests still OPEN. |
| `AI-ADM-029` | **PARTIAL** | Provider HTTP fetch caps body bytes before parsing and rejects malformed JSON; schema depth/node complexity capped; mocked hostile shape tests authored. Multi-provider large-response timeout/fuzz matrix incomplete. |
| `AI-ADM-030` | **DEFERRED_POST_28** | Real provider, database migration, queue worker, outbox, cross-domain E2E/security tests deferred per instruction. |
| `FGA-18-001` | **SOURCE_PATCHED_UNVERIFIED** | Admin executions now offer consumerKey/providerKey/purpose facets, query URL persistence and reset; API already has validated filters. Pagination/backend fixture proof deferred. |
| `FGA-18-002` | **PARTIAL** | Async job table links existing executionPublicId to read-only execution/trace page, no API re-execution; richer attempt-cost correlation and RBAC/source timestamps pending. |

## Targeted regression source files added or modified

- `packages/infrastructure/tests/ai-platform/PrismaAIPlatformRepository.spec.ts`: self-approval, author/checker deployment, due queue ordering, independent evaluation approval guards.
- `packages/application/tests/ai-platform/AIAsyncExecution.spec.ts`: stable async job-key and due queue sweep.
- `packages/application/tests/ai-platform/AIPlatformGovernance.spec.ts`: immutable evaluation definition drift and unverified source ingestion denial.
- `apps/api/tests/presentation/api/router/AIAdminRouter.spec.ts` (new): fine-grained HTTP RBAC 401/403, reviewer allowed, unknown operations denied.
- `apps/api/tests/presentation/api/router/AIGatewayRouter.spec.ts`: requester-owned encrypted result/no-store HTTP matrix.
- `.github/workflows/p17-targeted-source.yml`: Draft-PR source-only TypeScript and focused mock Vitest checks; no provider, DB, workers, migration or paid inference.

**Execution evidence (as of review; not a final exact-head pass):** New dedicated mock workflow initially failed because workspace package dist references were not compiled; source-project compile was added. A later run passed **46/47 tests** with one inconsistent unknown-price error-code assertion; that test was corrected. GitHub CI for subsequent PR heads is being re-run, and no final green result is implied by the prior passes. No database, worker or external provider tests executed. GitHub plugin provided file/commit operations, but no working-tree shell with authenticated repository clone/installed dependencies. TypeScript, Vitest, ESLint, formatting, application build and coverage must be run in a trusted isolated checkout at this branch SHA. Do not convert the presence of source tests or previous `main` GitHub checks into success for this branch. Latest independent GitHub CI outcomes must be bound to head SHA when available.

## Unresolved source blockers — prerequisites before CODE_CLOSED

- P0: immutable per-gate snapshot locked with deployment transaction; async provider acknowledgement/charge-once reconciliation with lease renewal and recovery; explicit approved break-glass and independent-authority evidence.
- P1 security: immutable high-impact config approval; trusted owner-controlled indexing + privacy envelope; quota cleanup/admission; per-requester fair billing/routing and immutable workflow lifecycle; cancellation semantics; conflict-safe indexing/source version swap; incident authority and cost truth.
- P2 source: AR/EN localized AI center and operator permission-aware controls; safe provider parsing/indexing resource limits; full focused source/TypeScript test evidence; remaining linked job-cost observability.
- Post-28 runtime: disposable DB migration/rollback, worker lease fault injection, real provider sandbox tests, secrets/cost reconciliation, E2E requester privacy, audit/outbox, AR/EN browser checks.

**No claim of completion of 30 tasks; do not merge this Draft PR as source-closed.** Use it as an independently reviewable remediation tranche. See `section-17-closure-gates.md` for explicit release and follow-up verification gates.


## New source remediation and exact-SHA CI evidence (11 October 2026)

The source was changed after the initial implementation report. Additional committed patches:
- `AI-ADM-002`: current ACTIVE evaluation gate/dataset/evaluator fingerprint, numeric score and reviewer are rechecked **under deployment's DB transaction** before retiring the prior production version; gate writes share the governance lock. See `PrismaAIPlatformRepository.ts` and its negative unit test. No live DB contention executed.
- `AI-ADM-004/009`: the Admin UI now gates privileged operation buttons by `useAdminAuthorization`, and Admin API execution list/detail/trace prevent older NON-PUBLIC previews/attributes being disclosed even when historically persisted. The API is still the primary authorization enforcement point.
- `AI-ADM-020/021/025/029`: governed model pricing (no unknown-cost-as-free), model-level overlap lock; requester concurrency and minute limits; health-verified vs can-attempt provider status; and bounded provider response parsing plus schema complexity.
- `AI-ADM-006`: UI disables manual unverified knowledge ingestion in addition to the fail-closed server path, pending canonical read-only owner gateway. This is an unavailable feature, **not** verified indexing completeness.
- Additional mock regression coverage: per-requester admission limits; stale evaluation transaction gate; historical confidential execution views; provider malformed/oversized JSON; deep/wide structured output; price interval overlap; incident transitions and protected async result retrieval.
- A source-only CI workflow `.github/workflows/p17-targeted-source.yml` now exercises six P17-specific mock/unit/HTTP suites. Its green/failed result must be recorded **at the final head SHA** before closure.

### CI observations and evidence boundaries

Prior failing CI runs on earlier P17 commits were inspected, **not treated as success**: TypeScript unused import, previously unrecognized `security(p17)` commit prefix, old source-contract assertions expecting `admin:ai:manage`, duplicate `export`, and an ESLint test fixture named `useCases`. These source failures were addressed in subsequent commits. A previous source mock workflow could not resolve the runtime `@manaratak/domain` entry because compiled package outputs were missing; the workflow was updated to build TypeScript project references before running Vitest. These fixes require re-verification on the final commit. Google AI Studio environment inventory checks have also reported staleness in one earlier run, and remain subject to final verification.

**Provisional evidence:** GH Actions are executing source checks. Only a `completed/success` check attached to the exact final PR commit counts as PASS. `queued`, `in_progress`, `cancelled` and prior-commit successes do not. Runtime migrations, provider calls, workers, DB faults, and E2E are deferred until after section 28. No live secret or credential was used or printed in this review.

## Additional continuation source patch — cancellation, leases, queue replay and workflow protection

On the same P17 feature branch, further commits added:

- **AI-ADM-003:** `IAIPlatformRepository.renewAsyncJobLease` / `PrismaAIPlatformRepository.renewAsyncJobLease` extend only an unexpired `RUNNING` lease with the same `lockedBy` and immutable `lockedAt`. `AIExecutionOrchestrator.processAsync` refreshes at one-third the lease TTL during a long provider call; heartbeat loss does not authorize a new paid attempt. The job ID still owns the execution idempotency key. Unit contract added; no real worker, DB or provider fault injection ran.
- **AI-ADM-011:** `submitAsync` derives a durable public job identity from SHA-256 of the authenticated requester, consumer, capability and optional idempotency key; it compares the protected original payload on replay, rejects key reuse with a changed payload, and tolerates a competing unique-insert P2002. Existing atomic queue occupancy remains in force, but no token/cost budget is reserved at admission. Tests cover same/different payload and insert race with mocks.
- **AI-ADM-023:** `cancelUnstartedExecution` updates only authenticated-requester-owned `RECEIVED/QUEUED` records using an atomic state CAS with audit + outbox; `updateExecution` also conditionally transitions to `RUNNING`, so cancellation cannot be overwritten by a subsequent dispatch. The pre-invocation quota reservation is released if dispatch loses to cancellation. In-flight cancellation returns an explicit conflict and does **not** assert that billing stopped. AbortSignal propagation and unknown charge reconciliation remain source gaps.
- **AI-ADM-014:** the existing `AI_ASYNC_PAYLOAD_KEY` AES-GCM protector now encrypts newly persisted workflow step checkpoints before database writes, expiring in 24 hours. A legacy plaintext checkpoint cannot be reused on resume; unknown-source workflow inputs are classified at least `CONFIDENTIAL`. Oversized workflow inputs/checkpoints are rejected before durable write. `AIWorkflowPrivacy.spec.ts` is included in `.github/workflows/p17-targeted-source.yml`. This does **not** yet establish workflow requester/owner access control.

**Current gate evidence:** these additions are source code and mock tests, not runtime verification. Only the check suite attached to the exact latest PR head can confirm their TypeScript and mocked behavior. No migrations, real services, worker start, real LLM requests, deployment or merge were performed.


## Further P17 source remediation — identity and high-impact policy gate

- `AI-ADM-015`: Admin workflow endpoints now forward the authenticated actor on start and run. The workflow's existing input hash binds payload to actor, so possession of the run ID alone cannot authorize replay. Sub-executions carry the same requester for shared quotas. Regression tests cover cross-principal rejection and absent identity; a dedicated immutable run owner column and full lifecycle accounting still require separately reviewed schema work.
- `AI-ADM-005`: `PrismaAIPlatformRepository.upsert` now allows activating a reviewed guardrail/routing/consumer policy **only** if its stored REVIEW revision matches the candidate exactly and the authenticated actor differs from the actor who last submitted the review revision; all checks and audit/outbox remain in one transaction. ACTIVE policies cannot be silently overwritten; self-approval, first-write activation and changed-content reviews are rejected. Emergency re-enable is blocked pending a separate two-person approval mechanism. This is a safety gate, **not complete maker-checker UX or production-ready activation**.
- No existing migration was edited or executed; source CI must be reevaluated on the **final** PR head, and runtime proof remains deferred as instructed.

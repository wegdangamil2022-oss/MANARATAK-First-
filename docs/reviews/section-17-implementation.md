# Section 17 — Enterprise AI Platform (P17)

**Status: CODE_CLOSED — RUNTIME_DEFERRED.**

**Branch:** `feat/section-17-enterprise-ai-platform`

**Review PR:** [#19](https://github.com/wegdangamil2022-oss/MANARATAK-First-/pull/19)

**Starting source:** `039cd7a731c0ef8e9ff0f6b6d2979ad610e08abc`

**Verified implementation:** `0086949fdd5a286d9657b71eef1d98b035519592` (after `c6000174b38201acd0d4ec8a28674997ac31dd8c` and `bdee24e`)

**Base:** `main@4571ec9c3e4362470d03a2ed2706664cd8ee09c0`

This replaces the accumulated incomplete reports. The inherited plan reconciliation covers the plan heading **18 — Enterprise AI Platform (P17)**, `AI-ADM-001–030` and `FGA-18-001–002`. It does not refer to P18 Student Tools. Twenty-nine administrative source tasks and two annex source tasks are closed within the supported scope described below; `AI-ADM-030` and real integration verification remain deferred until after section 28. Source closure does not assert production readiness.

## Review outcome

The incoming branch already contained prompt separation, evaluation fingerprints, requester-scoped async execution, worker lease fencing, protected result/checkpoint envelopes, bounded provider parsing, granular route authorization and pricing controls. Its own report correctly recorded substantial source gaps.

This review completed immutable staged policy review/activation/rollback, pre-enqueue token and cost reservation, required durable async intent, lost-acknowledgement replay, honest unknown-cost reconciliation, cancellation propagation, protected owner-controlled knowledge indexing and retrieval, retention maintenance, persisted workflow ownership/budgets/bindings, expiring model/capability health evidence and Arabic/English operational views. Regression tests cover these boundaries with isolated repositories, transports and synthetic encryption keys.

A competing dispatch cannot release another worker's reservation. Losing a queue insert acknowledgement first re-reads the durable job. Losing provider acknowledgement never authorizes another billed invocation or a zero-cost refund. Operators must propose evidence and obtain independent approval to reconcile unknown charges. Known ledger usage cannot be overwritten or counted a second time.

High-impact activation now uses a separate immutable revision and three distinct principals. The old direct activation route is denied even when the caller differs from the author. Initial runtime enablement and re-enable both require this governed path; emergency disabling remains available. Emergency revisions require an actual unresolved HIGH/CRITICAL incident, explicit break-glass permission at submission, expiry, and the normal independent review/deployment controls.

## Task closure map

Code is principally in `AIPlatformUseCases.ts`, `PrismaAIPlatformRepository.ts`, `ProviderAdapters.ts`, `AIAdminRouter.ts` and the Admin AI pages. Test abbreviations:

- **R:** infrastructure `PrismaAIPlatformRepository.spec.ts`.
- **P:** infrastructure `AIClosurePersistence.spec.ts`.
- **C:** application `AIClosureContracts.spec.ts`.
- **A:** application `AIAsyncExecution.spec.ts`.
- **W:** application `AIWorkflowPrivacy.spec.ts`.
- **G:** application `AIPlatformGovernance.spec.ts`.
- **H:** API `AIAdminRouter.spec.ts` and `AIGatewayRouter.spec.ts`.
- **T:** infrastructure `ProviderAdapters.spec.ts` and `EnvironmentAIAsyncPayloadProtector.spec.ts`.
- **U:** Admin `AIGovernancePage.spec.tsx`.

All are source/mock verification; PostgreSQL lock contention and external billing semantics are post-28 verification.

| Item       | Source verdict   | Implementation and verification                                                                                                                                                                                                                                                                                                     |
| ---------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AI-ADM-001 | CODE_CLOSED      | Stored prompt author/reviewer/deployer separation and transactional deployment gate; no caller-supplied authority. R/H. Emergency configuration references remain reviewed and audited rather than bypassing separation. P.                                                                                                         |
| AI-ADM-002 | CODE_CLOSED      | Immutable evaluated definition/dataset snapshot, pre/post fingerprints, independent result approval and deployment-time transaction/gate lock. G/R.                                                                                                                                                                                 |
| AI-ADM-003 | CODE_CLOSED      | Stable job execution identity, dispatch CAS, fenced renewed lease, acknowledgement-loss hold/replay and reconciliation without redispatch. A/C/R/P.                                                                                                                                                                                 |
| AI-ADM-004 | CODE_CLOSED      | Eleven granular catalog permissions, view navigation, explicit route permission checks, denied legacy manage escalation and permission-aware actions. H/U. Runtime role provisioning remains post-28.                                                                                                                               |
| AI-ADM-005 | CODE_CLOSED      | Immutable STAGE/APPROVE/ACTIVATE/ROLLBACK revisions, three distinct actors, checksums/base CAS, emergency incident/expiry, old activation denied. P/R/H.                                                                                                                                                                            |
| AI-ADM-006 | CODE_CLOSED      | Typed read-only owner gateway; published CMS adapter is wired through PublicCmsUseCases. Manual content, drafts, unsupported owners and private-owner inputs fail closed. C.                                                                                                                                                        |
| AI-ADM-007 | CODE_CLOSED      | Chunk text/vector encrypted together with owner/revision/scope/expiry; reader owner recheck and bounded physical old/expired projection cleanup. C/P.                                                                                                                                                                               |
| AI-ADM-008 | CODE_CLOSED      | Most-sensitive effective classification, explicit workflow consent, verified owner classification for knowledge; STUDENT_PRIVATE/HIGHLY_SENSITIVE workflow inputs without owner verification denied. W/C/G.                                                                                                                         |
| AI-ADM-009 | CODE_CLOSED      | Nonpublic previews suppressed and historical reads redacted; maintenance removes historical private previews/trace attributes and expired protected data. G/P.                                                                                                                                                                      |
| AI-ADM-010 | CODE_CLOSED      | Bounded reservation recovery; known charges committed, unstarted orphan admissions cancelled safely, unknown charges held; independent evidence approval cannot override known usage. P/C.                                                                                                                                          |
| AI-ADM-011 | CODE_CLOSED      | Required requester intent and pre-queue quota reservation, queue occupancy limits, durable insert-ack recovery and reserved execution binding. A/C/R.                                                                                                                                                                               |
| AI-ADM-012 | CODE_CLOSED      | Database-side due/expired-lease predicate precedes bounded oldest-first scan. A/R.                                                                                                                                                                                                                                                  |
| AI-ADM-013 | CODE_CLOSED      | Atomic protected result/completion, full result replay without paid re-execution, ciphertext-bound owner/job/expiry, no-store owner route, previous-key decrypt and TTL cleanup. C/A/H/T/P.                                                                                                                                         |
| AI-ADM-014 | CODE_CLOSED      | Protected workflow checkpoints bind run/requester/step/expiry and verify output hash; consent, per-step classification/provider rules and input/output bounds. W/C.                                                                                                                                                                 |
| AI-ADM-015 | CODE_CLOSED      | Persisted requester and immutable execution plan/budget; legacy unscoped runs denied, prior actual costs counted and remaining budget enforced. W/C. Nullable expand migration prepared only.                                                                                                                                       |
| AI-ADM-016 | CODE_CLOSED      | Approved prompt version and model/provider/routing/pricing/guardrail fingerprint frozen per step; drift rejects before dispatch; retry uses the same step execution intent. C/W.                                                                                                                                                    |
| AI-ADM-017 | CODE_CLOSED      | Conflicting active routes denied, staged same-binding activation serialized, active version retained during review; rollback requires a new review. P/C.                                                                                                                                                                            |
| AI-ADM-018 | CODE_CLOSED      | Frozen evaluation definition and dataset, submitter/executor identity, independent one-shot review and result/deployment fingerprints. G/R.                                                                                                                                                                                         |
| AI-ADM-019 | CODE_CLOSED      | Revision precondition and transaction CAS on existing configuration and staged base; stale activation cannot overwrite a newer record. R/P.                                                                                                                                                                                         |
| AI-ADM-020 | CODE_CLOSED      | Finite explicit prices, overlapping intervals denied, price selected at execution start, ledger usage and reviewed reconciliation preserve known/unknown cost. R/C/P.                                                                                                                                                               |
| AI-ADM-021 | CODE_CLOSED      | Serializable consumer/requester admission limits plus queue occupancy and reserved workflow envelope; outstanding unknown reservations remain counted across month changes. R/C/A.                                                                                                                                                  |
| AI-ADM-022 | CODE_CLOSED      | Owner type/reference/revision namespace, authenticated owner read and protected active revision retrieval; removal locks the projection; stale retention scan cannot remove fresh indexing. Canonical publication ordering is checked under the projection lock, so a late older completion cannot replace a newer revision. R/C/P. |
| AI-ADM-023 | CODE_CLOSED      | Pre-dispatch cancellation CAS/refund; in-flight cancellation is a request, propagated via AbortSignal, and never claims billing stopped. A/R/C/T.                                                                                                                                                                                   |
| AI-ADM-024 | CODE_CLOSED      | Owner revision rechecked after embedding; chunks, active source and completed indexing run swap in one transaction. Failure keeps prior active source and records actual usage; older or ambiguous same-timestamp publication completion is rejected before chunk deletion. C/R/P.                                                  |
| AI-ADM-025 | CODE_CLOSED      | Attemptability differs from readiness; successful evidence is scoped to capability/model and expires after five minutes. Wrong capability/model and expired evidence remain pending. T.                                                                                                                                             |
| AI-ADM-026 | CODE_CLOSED      | AR/EN labels, statuses, direction, dialogs and operational panels; localized display-name preference and generic errors. Actual section-key source rendering covered. U. Browser interaction remains post-28.                                                                                                                       |
| AI-ADM-027 | CODE_CLOSED      | Bounded canonical source bytes, chunk count, vector dimensions, protected chunk size and single bounded embedding batch. R/C.                                                                                                                                                                                                       |
| AI-ADM-028 | CODE_CLOSED      | Locked incident state machine; independent HIGH/CRITICAL resolution; durable actor-scoped event intent replays before transition checks and rejects changed payload. R/P/H.                                                                                                                                                         |
| AI-ADM-029 | CODE_CLOSED      | Provider byte/JSON/schema bounds, timeout and cancellation propagation; malformed and oversized mock responses denied. T/G.                                                                                                                                                                                                         |
| AI-ADM-030 | DEFERRED_POST_28 | Real DB, migration/restore, provider, worker, multi-process, billing, audit/outbox and browser E2E tests. No execution claimed.                                                                                                                                                                                                     |
| FGA-18-001 | CODE_CLOSED      | Consumer/provider/purpose facets, validated API filters, query URL/reset and bounded pagination retained. H/source closure gates.                                                                                                                                                                                                   |
| FGA-18-002 | CODE_CLOSED      | Queue attempts link the existing execution, trace, provider/model, known cost/currency and updated timestamp through a narrow read projection. Unknown cost stays unknown. P/U.                                                                                                                                                     |

## Supported behavior and practical limits

- Knowledge ingestion currently supports **published public CMS pages only**, in Arabic or English, through the owner's public read contract. Other domain adapters and private-owner provenance are not available. Requests for those paths are denied before provider dispatch; this report does not claim private student-record indexing.
- A knowledge index has one active owner reference projection. Use separate language-specific index keys when retaining both localized revisions of the same owner reference.
- Workflow bindings are immutable fingerprints. Configuration drift stops execution for review rather than silently selecting another provider or price. Historical runs without the new persisted owner/plan remain unavailable.
- Ambiguous provider outcomes retain reservations and require evidence. The system cannot reconstruct a response that neither the provider nor the application durably retained; it does not pay again to guess.
- Read TTL is enforced immediately; physical cleanup is bounded and runs through the existing background handler. Workers were not started here.
- Key rotation supports the configured current key and up to three previous keys through the optional `AI_ASYNC_PAYLOAD_KEY_PREVIOUS` runtime setting. Retired keys fail closed. No real keys were configured.
- Source/mocked transaction tests verify requested locks and atomic operations, not PostgreSQL contention or a provider's external exactly-once billing contract.

## Security follow-up

GitHub CodeQL identified two high-severity findings in the inherited PII email/phone matching expressions at PR head `45f0e9c1044f2ea306878da2d7a9f188727147dd`. The final security patch bounds all token/separator repetitions, preserving normal email/phone/payment-card removal and adding adversarial 256 KiB repeated-character tests. TypeScript and all 145 focused tests passed after the patch. The findings were fixed in source, not dismissed; final-head CodeQL evidence is available on the PR checks.

## Verification and delivery

Executed commands, counts and stored evidence are in [section-17-validation.json](section-17-validation.json) and [closure gates](section-17-closure-gates.md). The focused source suite passed **146 tests in 11 files** at the implementation commit. TypeScript, Prisma validate/generate without DB access, source quality, lint, build and the source closure manifest were checked; the general run passed 3,857 Vitest tests (45 skipped) and 316 Node tests (no skips). Skipped cases are recorded explicitly in validation.

The React source review checked hook ordering, stable request fencing, explicit button types, labelled controls, permission-aware actions, localized direction and bounded operational projections. Source quality reports zero package/file cycles and zero accessibility findings. Lint has existing and new type-style warnings, with zero errors; it is not warning-free.

The new nullable workflow owner/plan migration is expand-only, registered with backup/restore recovery, and **not applied**. See [migration recovery](section-17-migration-recovery.md). Existing migration history was not changed.

No real database, provider/paid inference, worker startup, deployment, merge to main or P18 implementation was performed. PR #19 remains available for independent review; final-head GitHub checks determine review readiness independently of this source closure.

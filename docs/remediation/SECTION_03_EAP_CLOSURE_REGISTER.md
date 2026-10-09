# Section 03 — EAP closure register

Canonical tasks: MANARATAK_ADMIN_REVIEW_CODEX.md §03.10–03.17.
This register is an evidence map, not an authorization to deploy or to mark runtime PASS.

## Latest recovery continuation (supersedes older source-blocker snapshots below)
- PREPARED activation intent now persists before any provider movement; recovery is source+digest idempotent and COMPLETE/ACTIVE is CAS-persisted. Manual recovery exists; no automatic reconciler is claimed.
- Retention policy is preserved for new archive/delete transitions; unknown/expired historical policies fail restore before external effects. No backfill/default duration.
- Local event artifacts are explicitly non-dispatched; see docs/operations/ASSET_LIFECYCLE_RECOVERY.md. Production outbox adoption remains a future consumer contract, not an implemented feature.
- Typed operational envelopes reuse existing EAP-owned JSON. No new schema, migration, production DB or external provider write was executed locally.
- Pending activation blocks deletion/evidence changes. Terminal HTTP errors start a fresh explicit HTTP attempt; ambiguous network/in-progress retries retain their key. The durable operation ID remains stable.
- Verdict: **NOT CLOSED / NO-GO**, pending provider, operational, usage race and remaining workspace acceptance gates.

## Gate status
- SOURCE: partial verification. Latest known source CI before this register: run 37867695630, commit eca47ba2d40c876612a0d6741ecb50c320a92f54.
- DISPOSABLE_DB: ten PostgreSQL integration tests previously passed in that run. No production DB was contacted.
- PROVIDER_SANDBOX: PENDING. Atomic object-version promotion, real upload grant, MIME/magic bytes, scanner, sanitizer, archive/restore/delete idempotency and failure injections require external provider evidence.
- BROWSER_E2E: PENDING. Upload-to-reuse workflow, lifecycle, permissions, Arabic/English and empty/error states not validated end to end.
- OPERATIONS: PENDING. Durable cross-system saga/reconciliation, alerting on compensation failure, expired lease heartbeat, real CDN expiry/cache, legal hold races and realistic pagination data.
- VERDICT: NOT CLOSED / NO-GO.

## Continuation review — 2026-10-09
- Source continuation based on branch commit `1482556`: 220 passing tests including selected IAM/Audit regressions; TypeScript and source quality PASS, 13 Node security guards PASS.
- Admin UI Chromium check PASS only with intercepted test API, dev HMR disabled and test-context CSP bypass. No production CSP/provider/browser end-to-end claim.
- Historical CI run 37869788764 at `8eb794b` confirmed success, including ten disposable PostgreSQL tests. This does not validate newer commits.
- Newly fixed: proof rechecks include signature/MIME/size/date; manual scan failure cannot resurrect deleted/purged assets; safe lifecycle actions mounted with usage confirmation; HTTP coordinates hidden; inventory guard understands inline router dependencies and tracks three reviewed asset additions.
- Source blockers remain: durable activation reconciliation/journal, event/outbox integration or approved non-contract ADR, usage-vs-lifecycle concurrent serialization, restoration of original retention policy. Provider and operations gates above remain open.
- Optional rights and renditions tasks FGA-03-001/002 remain PROPOSED_ENHANCEMENT, not CLOSED.
- Current CI run [37872775726](https://github.com/wegdangamil2022-oss/MANARATAK-First-/actions/runs/37872775726) at `6e60a15702ae3e0eec7246ed6d6f32a3f6ad7c53`: **SUCCESS**, 184 source tests + 10 disposable PostgreSQL tests; TypeScript/quality/audit guards PASS. The evidence-only follow-up changes no source. Global source contract failures remain separate.
- Verdict remains **NOT CLOSED / NO-GO**. See task-by-task current review in SECTION_03_EAP_IMPLEMENTATION.md and evidence/section-03/README.md.

## Completion criteria to check, never infer from source-only PASS
1. Upload remains INITIATED until provider confirms actual bytes; evidence persists.
2. Malware-failed or missing-scan assets never reach CLEAN/ACTIVE.
3. Verified signature, MIME, checksum and post-sanitizer scan bind to the same immutable provider object version.
4. Provider idempotency keys are derived from asset identity and operation identity and resist replay across replicas.
5. Asset reuse permits least-privileged editors without destructive management rights; owner saves revalidate.
6. Active consumer references prevent unsafe archive, delete and purge, including under concurrent writes.
7. Asset Center has complete upload, list/detail, secure preview, usage, state-aware actions, safe errors, audit and retry flow.
8. Search/cursor contract survives multiple pages, draft filter changes and duplicate requests.
9. Legal holds, retention expiry and worker claims are checked atomically in disposable DB and approved sandbox.
10. External storage success followed by DB failure is always recoverable without exposing infected or unintended content.
11. Restore-vs-purge and lease expiry races are fenced at both DB and provider object-version boundaries.
12. Domain events/outbox persistence and dispatch truthfulness have real owner-path acceptance evidence.
13. All source and runtime gates link to a commit SHA, execution result and operator/reviewer.

## Deferred EAP capability register (not a claim of implementation)
- Image variants, compression, WebP/AVIF conversion: OPEN.
- Video processing/transcoding: OPEN.
- OCR / document preview extraction: OPEN.
- Metadata extraction and EXIF validation: OPEN.
- Native object version-chain reconstruction: OPEN.
- CDN invalidation, signed URL expiration and caching: OPEN.
- Cross-provider reconciliation worker/operation journal: OPEN.
- Production-scale asset pagination and derived usage-registry performance: OPEN.

## Testing boundaries
No production migrations, seed, purge, retention sweeps or object-store mutations are authorized by this register.
Disposable PostgreSQL is allowed only inside the isolated CI environment and is not a substitute for provider/browser runtime evidence.

The Section 03 DoD requires **both source correctness and independently verified runtime behavior**. Source-only and mock tests must not be relabeled CLOSED.

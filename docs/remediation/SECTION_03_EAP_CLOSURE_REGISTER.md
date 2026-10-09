# Section 03 — EAP closure register

Canonical tasks: MANARATAK_ADMIN_REVIEW_CODEX.md §03.10–03.17.
This register is an evidence map, not an authorization to deploy or to mark runtime PASS.

## Gate status
- SOURCE: partial verification. Latest known source CI before this register: run 37867695630, commit eca47ba2d40c876612a0d6741ecb50c320a92f54.
- DISPOSABLE_DB: ten PostgreSQL integration tests previously passed in that run. No production DB was contacted.
- PROVIDER_SANDBOX: PENDING. Atomic object-version promotion, real upload grant, MIME/magic bytes, scanner, sanitizer, archive/restore/delete idempotency and failure injections require external provider evidence.
- BROWSER_E2E: PENDING. Upload-to-reuse workflow, lifecycle, permissions, Arabic/English and empty/error states not validated end to end.
- OPERATIONS: PENDING. Durable cross-system saga/reconciliation, alerting on compensation failure, expired lease heartbeat, real CDN expiry/cache, legal hold races and realistic pagination data.
- VERDICT: NOT CLOSED / NO-GO.

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

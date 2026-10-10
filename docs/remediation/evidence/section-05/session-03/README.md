# Section 05 — Session 3/3 verification and source disposition

Branch: `codex/section-01-iam-rbac`; starting commit `1f74864`. This containing commit records source and evidence. Remote CI is not asserted. Section 05 is **IN PROGRESS — SOURCE FIXES REQUIRED**: the three-session allocation did not complete all original requirements.

| Check | Command | Result |
| --- | --- | --- |
| Focused source contracts/security | `npx --no-install vitest run --config vitest.config.ts` with the exact 30 files in `.github/workflows/import-section-05-source.yml` | PASS: 289 tests, 30 files, 21.47 seconds; 60-second command budget |
| TypeScript | `npm run typecheck` | PASS |
| Quality | `npm run quality:source` | PASS |
| Reviewed audit inventory | `npm run audit:coverage:verify` | PASS: 328 handlers / 327 endpoints; source test/run routes added under mounted imports permission and global auth/idempotency/request audit |
| Scoped lint | `npx --no-install eslint` on changed/new TS/TSX files | PASS: 0 errors, 167 warnings |
| Secrets | `npm run security:secrets` after staging | PASS; secrets.log |
| Whitespace | `git diff --check` | PASS |
| W2 source guard | `npm run w2:verify` | 82/84; inherited asset purge usage / migration recovery authority failures persist |
| Persistence ownership | `npm run architecture:persistence:verify` | Same 18 inherited migration metadata violations in six prior Section 03/04 migrations; no schema/migration added or applied |

New tests verify atomic queue visibility, exact staging acceptance counts, version/lease recovery, stale parser refusal, unfinished reservation conflicts, strict CSV byte offsets across every chunk split, spool admission/release, bounded identities, source activation/foreign owner/actor/revision gates, source changes during acquisition, strict HTTP command schemas, diff scope/identity/owner ambiguity, missing fingerprint handling, parent/record cursor version pins, worker paging beyond page 50, and legal hold/replay retention fences. These use mocks, controlled native temporary files and inert providers, not PostgreSQL or live network proof.

## Original source disposition after all three sessions

| Original finding | Current source evidence / remaining obligation |
| --- | --- |
| IMP-P0-001 | Full UUID batch/record identifiers implemented and retained; historical IDs untouched. |
| IMP-P0-002 | Sorted PostgreSQL transaction advisory lock + lookup + insert retained. Unfinished staging collisions now conflict; rejected reservations no longer dedup. Real DB contention is runtime deferred. |
| IMP-P0-003 | Exact worker attempt/lease generation fencing retained. Staging adds separate expiry/renewal fences. Owner-evidence-backed stranded stop resolution remains OPEN SOURCE. |
| IMP-P0-004 | Cooperative pending stop and worker acknowledgement retained; no timeout-only owner acknowledgement. Authorized reconciliation for stranded owner calls remains OPEN SOURCE. |
| IMP-P0-005 | Existing consumers are screening only; mutating registrations are refused; uncertainty cannot auto-replay. Actual owner-controlled receipt/inbox and audited resolution remain OPEN SOURCE; no receipt is invented. |
| IMP-P0-006 | Accepted persisted totals and zero-work terminal progress retained; API separates stream received/staged/skipped/invalid. Complete persisted counter model across legacy/recovery/replay remains OPEN SOURCE. |
| IMP-P1-007 | Partial completion and review-required non-success protection retained. Separate durable review/failure counters and historical reconciliation remain OPEN SOURCE. |
| IMP-P1-008 | Atomic per-attempt worker failure evidence, redaction and projected error export retained. Independently available owner/record/correlation context, memory parity and retention assignment remain OPEN SOURCE. |
| IMP-P1-009 | Bounded checkpoint accepted-key window retained; oversized source identity keys now refused. |
| IMP-P1-010 | Per-500 staging dedup/accepted IDs retained; stream staging adds lease renewal and atomic visibility. Legacy interrupted finalized CREATED jobs still require reconciliation. |
| IMP-P1-011 | Authenticated generic owned/trusted EAP artifact stream is composed. Real native provider, process death/orphan cleanup and fleet resource behavior remain unverified; orphan lifecycle cleanup remains OPEN SOURCE. |
| IMP-P1-012 | Only CSV/NDJSON advertised. Unsupported formats fail; no pretend XLSX/XML support. CSV UTF-8/quotes/header/byte offsets repaired. Broader requested formats are unavailable. |
| IMP-P1-013 | Queued 202 with job Location, preflight and pinned bytes, resource ceilings implemented. Configured provider hard limits and browser flow are runtime deferred. Full consistent API envelopes remain OPEN SOURCE. |
| IMP-P1-014 | Generic create/detail/edit/status/test/run + Admin entry points, revision fences and transactional definition/status audit/outbox implemented. Tests are configuration-only; network run intentionally requires ACTIVE PUBLIC_ALLOWED. Full authorized multi-stage execution/compliance and owner-domain source workflows remain OPEN SOURCE. |
| IMP-P0-015 | Fail-closed classifications retained, including activation. Actual robots/account/agreement authority integration remains OPEN SOURCE; metadata cannot authorize access. |
| IMP-P1-016 | Scope and pinned-DNS transport guards retained; generic run cannot override targets. Real robots/credential/agreement proofs remain OPEN SOURCE. |
| IMP-P1-017 | Retry-After/backoff retained. ETag/Last-Modified conditional acquisition and validated 304 reuse remain OPEN SOURCE. |
| IMP-P1-018 | Local shared-origin limiter repair retained. Distributed/fleet production budget and governed cross-source policy remain OPEN SOURCE. |
| IMP-P1-019 | Drift detection utility exists but executable persisted decision workflow remains OPEN SOURCE. |
| IMP-P1-020 | Silent browser/substitute fallback remains disabled. Actual authorized fallback lifecycle remains OPEN SOURCE. |
| IMP-P1-021 | Manual EAP and registered-source provenance are importer-controlled; source run revision/raw snapshot metadata pinned. Full typed immutable provenance and receipt/context coverage remain OPEN SOURCE. |
| IMP-P1-022 | Source stale/missing/denied/capacity HTTP outcomes distinguished and strict schemas retained. Whole import API/error envelope reconciliation remains OPEN SOURCE. |
| IMP-P1-023 | Legal hold/expiry/terminal parent now fenced in import purge transaction; uncertain records and checkpoints preserved. Systematic governed expiry assignment, history/backfill policy and spool orphan retention remain OPEN SOURCE. |
| IMP-P1-024 | Verification claims reconciled with actual local results; legacy remote CI history unchanged. No source closure/runtime GO asserted. |
| IMP-P1-025 | Actual parser/connector/consumer capabilities exposed; screening-only/no canonical mutation/no transactional receipt explicitly reported. Unavailable capabilities remain unavailable. |
| Patch I | Owned artifact and generic source operations, safer status actions and batch comparison added; existing operations/error export/reconciliation retained. Complete timeline/actionable error/owner receipt flows remain OPEN SOURCE. |
| FGA-05-001 | Versioned provider/domain mapping profiles, aliases/type constraints, sample preview and batch profile pin remain OPEN SOURCE. Source revision pin is not a mapping profile. |
| FGA-05-002 | Bounded read-only diff API/UI summary implemented: source/domain, stable external IDs and owner links, deterministic counts, ambiguity denial, 200-row version-pinned cursor, no deletion/publication. Scope is persisted accepted rows, not complete source snapshots. Historical mapping/normalization evidence is absent; complete acceptance remains partial. |
| FGA-05-003 | Reviewer claim/CAS, delegated reviewer authority, assignment/due dates and central queue linkage remain OPEN SOURCE. |

## Deferred runtime evidence

No DB connection, migrations, live provider/source acquisition, dev server/browser session, deployment or merge occurred. PostgreSQL transaction isolation/rollback/contention, recovery across real processes, provider native stream behavior, legal hold/replay races, cursor SQL execution, browser Arabic/English/RBAC flows and load/performance remain POST-28. All focused commands finished within their budget. A mocked passing test is not runtime proof.

## Remaining recovery/resource limits

New STAGING streams queue atomically. Recovery runs before new streams, at most 20 batches each time; an idle deployment still needs an operational sweep. Session 2 interrupted CREATED streams with unfinished staging markers are recovered conservatively. Fully finalized historical CREATED jobs without markers and zero-row historical jobs need manual evidence review. Rejection retains data and never acknowledges an owner result. Private spool reservations cover normal process lifetime; kill-orphan cleanup and shared fleet disk governance remain unresolved source lifecycle work.

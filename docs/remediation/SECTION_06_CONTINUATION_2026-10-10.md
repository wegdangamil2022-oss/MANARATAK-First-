# Section 06 / P7 — continuation, 2026-10-10

Branch: codex/section-01-iam-rbac. Starting checkpoint: e4fc7c50730c714556e571d5d3605504be7598d9. Status: PARTIAL; NOT CODE_CLOSED.

## New source implementation

- P6→P7 universal screening-only consumer registered with generic screening receipts. Explicit reference entity type required; failed validation stays INVALID. No canonical data writes from the consumer.
- Removed automatic seed READY_TO_APPLY. Seed identity keys delegate to P7 domain validation; all intra-batch duplicate canonical keys are quarantined. The old direct ReferenceDataSeedApplyService now always refuses promotion without durable owner approval.
- Four owner tabs have on-demand aliases, provider mappings, historical versions, replacement relationships, DEPRECATED transition and dependency impact inspection. Explicit provider-key transfer has a dedicated target search, required reason and stable request identifier.
- Provider mapping reconciliation in the owner repository takes ordered row locks, checks both optimistic versions, enforces city same-country scoping, writes both temporal history versions, and executes with atomic Audit+Outbox. Replays are intercepted before duplicate events.
- Actual owner counts for per-country cities, missing canonical region, timezone, identity and country links, and inconsistent country/region relationships. Non-FK consumers and authoritative data coverage remain unknown.
- ISO639 alpha2/alpha3 language codes separated from BCP47 locale tags. Standard snapshot contracts cover source authority/version/hash/reviewer for ISO3166/ISO4217/ISO639/UN M49/IANA TZ/CLDR but no reviewed snapshots are persisted.
- Country source preview maps Arabic canonical name to nameAr and disallows source review statuses becoming live lifecycle commands.

## Still functionally incomplete

- Durable P7 operator approval + transactional apply owner inbox, including idempotent source checksum receipt. Screening is **not** apply.
- Verified authority source snapshots and persistent multilingual locale/CLDR/IANA operational coverage.
- Complete downstream non-FK dependency impacts before terminal lifecycle transitions; full metadata UX parity.
- Full DB-backed historical city/alias duplicate reconciliation and university/city inventory. The earlier 2052 review-only unmatched scoped cities have not been inserted.
- Targeted TypeScript and unit/contract/security tests remain **NOT RUN** in this environment. Test specs are not proof of PASS.

## Exclusions

No database queries or data modification, migrations, seed/backfill, live imports, browser/E2E/performance/provider tests, CI, deployment or branch merge. Existing source city CSVs and university review artifacts remain unchanged. Read SECTION_06_ITEM_MATRIX.md and SECTION_06_CHECK_LOG.md for exact statuses.

## Later source improvements and one targeted structural check

- Four admin tabs now support non-active-only filtering from the owner repository. Region q/country/status/page state is URL-persisted. Country form includes official name, subregion, calling code and bounded, active-only searchable currency/language default selection. Currency form adds ISO minor unit; city form adds latitude/longitude.
- Provider mapping owner-transfer replay additionally validates original actor identity in its version receipt.
- A single lightweight **source inspection** of 14 files with 11 structural checks returned **11/11 PASS**. This ran before the last four UI/actor changes; it does not certify them. TypeScript/Vitest and runtime: **NOT RUN**.

## Further continuation (P7 owner correctness fixes)

- Terminal ARCHIVED/MERGED/SUPERSEDED actions are now **blocked by owner transactional logic** for generic reference types until a reviewed full downstream dependency-impact policy is built. UI-only prevention was insufficient.
- P7 version history now captures complete persisted record state and the active aliases/provider mappings after each upsert, including edits that omitted these collections in request payloads; historical DB rows were not backfilled.
- Optimized existing P7.13 generic DAG (contracts were already in domain), timezone ICU validation + UTC, admin timezone choices, and accurate non-active lifecycle status accounting.
- Added *explicit single-city* legacy country-link repair: exact ISO2, reviewed active country, region consistency, expectedVersion, reason/actor, atomic Audit/Outbox, and temporal version. This is not an automated data correction.
- Six authority standard families are shown as missing reviewed snapshots, backed by source contracts rather than fabricated coverage.
- This continuation's single static source inspection passed 10/10 checks; TypeScript, Vitest and DB/runtime remain NOT RUN.

**Still not CODE_CLOSED:** P7-owned durable review and atomic canonical apply/inbox, verifiable approved source standards and full cross-domain non-FK terminal impact. University-city source comparisons have not changed and no candidate rows were automatically inserted.

## P7 receipt review and scoped resolver follow-up

1. P7 import SCREENING_ONLY now fails closed when the durable P6 screening receipt store is unavailable; source artifact ID and SHA-256 content hash are required and upstream P6 review warnings are retained.
2. P7 has a **read-only**, bounded receipt-backed screening queue in the Admin area. Neither the API nor UI can approve/apply, because the separate P7 operator approval and atomic owner inbox are not yet implemented.
3. Source duplicates now quarantine both legitimate-looking and malformed records with the same identity. The pure domain SeedPlanner cannot elevate validated batches to READY_TO_APPLY and the legacy SeedApply is disabled.
4. ReferenceResolver CITY/REGION alias/provider lookups now require national ISO2 scope (global canonical ID lookups remain possible), and owner ambiguity inspection uses same-country comparisons.
5. REGION terminal lifecycle transitions are blocked by the same owner-side dependency-certification boundary as non-Region entities.
6. One-pass structural source audit: 13/13 PASS across 11 files. No TS, Vitest, DB, seed, backfill, live import, E2E or CI runs.

Remaining: *P7-owned durable operator approval and atomic canonical import/apply*, reviewed/versioned authoritative standards datasets, full consumer impact and actual source/DB reconciliation. **Status: PARTIAL; NOT CODE_CLOSED.**

## Continuation from ef39904f — review integrity and owner read performance

Added after the last checkpoint:

1. P6→P7 typed source fields and canonical-control spoofing rejection; bound the review result to SHA256 of the normalized payload as well as the original artifact hash. The source hash is only a supplied P6 evidence string until independently confirmed against the raw archived artifact.
2. Added source-only review readiness classifier: INVALID_SOURCE, LEGACY_RECEIPT_MISSING_EVIDENCE, SOURCE_ISSUES_REQUIRE_REVIEW, REVIEWABLE. **None** implies a durable operator approval, an Apply authorization or a canonical write.
3. Fixed stale lifecycle-vs-active-flag disagreements in canonical resolver and application entity getters, and held country/region and country default currency/language parents in audited transaction reads.
4. Added paginated governance version history and async admin navigation to avoid loading unbounded source history into one modal.
5. **13/13 targeted static source invariants passed once**. TypeScript, unit tests, database and service runtime were not exercised.

Still open: durable P7 owner approval inbox and transactional apply; genuine reviewed authority standards snapshots; full direct/non-FK dependency impact; historical city reconciliation. No live DB operations were performed, and the section remains PARTIAL.

## Source continuation from ef39904f — 2026-10-10

Further P7 source changes: strict allowed source field types and metadata JSON bounds; SHA256 hash of normalized payload in screening evidence; reviewer triage labels not equivalent to approval; active lifecycle + compatibility flag enforced for canonical lookup; ordered country→region→city row locks and locked default currency/language references; bounded history API/UI and explicit legacy history overflow. New targeted specs exist but are NOT RUN. Static source inspection 13/13 PASS before the final edits is not full compilation/runtime confirmation.

Remaining source implementation: P7-owned durable reviewer decision, checksum-bound transactional inbox + canonical Apply; official reviewed standard source snapshots; full downstream non-FK impact and legacy city reconciliation. No DB operations or schema migrations applied.

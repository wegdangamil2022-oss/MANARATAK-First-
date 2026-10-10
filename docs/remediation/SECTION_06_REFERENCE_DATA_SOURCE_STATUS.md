# Section 06 (Global Reference Data / P7): source-only implementation checkpoint

**2026-10-10**. Source baseline: `7231f2c53b307cb5f98e3af0083285322802603a`. Work remains on `codex/section-01-iam-rbac`. This is **not** a P7 closure certificate.

## Implemented in this review

- Unicode-safe identity-name normalization and a separate search-folding function; both conserve non-Latin scripts and preserve original source strings. Prior persisted canonical keys are not backfilled or rewritten; old keyed collision probe fails closed.
- Public regions and other public reference reads constrained to ACTIVE; public city collections default to bounded 50-row pages, at most 100 rows per request, with filtered total counts.
- Generic lifecycle transitions require an actor, expectedVersion, transactional execution, row lock and version predicate; replacement target must be ACTIVE, and city target must have the same ISO2 country. REGION retains its dedicated lifecycle governance.
- Silent provider-mapping ownership changes by conflict upsert are blocked. **Explicit reconciliation with durable history remains unimplemented.**
- History append closes the previous open interval using `[from,to)` and keeps new current intervals open; mutation actor and correlation are passed to non-region version snapshots through the audited owner mutation context. Historical reconciliation of old null actors remains deferred.
- Country defaults are checked against currently ACTIVE currency and language reference records at application write time; city timezone is checked against canonical ICU-supported IANA identifiers (runtime ICU may be incomplete; this is not a bundled complete IANA registry).
- Inspected five city source CSVs and the unresolved university geography queue. Per-record dispositions and no-auto-import candidates: `workspace/reports/section-06/`.

## Not completed (functional / source gaps; **not** just pending tests)

1. 06.01–06.50 require per-item remediation evidence; this checkpoint **does not certify** each item. In particular, generic country/currency/language/city updates still need full ID-scoped CAS and stable-identity editing.
2. Region and generic replacement-relationship graph cycle verification; region temporal version audit must be rechecked against schema and prior history; no live runtime verification.
3. Governed provider-mapping reassignment/reconciliation endpoint + audit/history; country/city alias collision query and safe legacy-key migration.
4. Durable P6→P7 owner review/apply transfer path with inbox/receipts. No seed/import promotion is authorized.
5. FGA-06-001: editing selected records in country/currency/language/city tabs with stable ID, prefilled metadata and conflict UX. FGA-06-002: source-backed quality and coverage server-side drill-down. FGA-06-003: URL-stable dependent server-side filters. These are **OPEN implementation gaps**.
6. Fully bounded searchable canonical pickers instead of an eager all-pages compatibility helper; generic usage impact contracts, bilingual authoring QA.
7. Exhaustive ISO/UN M49/CLDR/IANA/BCP47 snapshots and provenance, language-vs-locale schema boundaries, country-to-language/currency historical alias validity.
8. Coverage of ALL university XLSX/stage3+4 rows (current comparison covers only the 3,549 **previously unresolved** university rows). Database row counts, whether ~1,600 rows are missing, DB/source discrepancies and actual import acceptance are **UNKNOWN**.

## Standards source authority and provenance policy

- ISO 3166-1/2 (countries and subdivisions), ISO 4217 (currencies), ISO 639 (language codes), UN M49 (geographic regions), IANA TZDB (timezone names), IETF BCP 47 (locale tags), and Unicode UAX #15 are distinct authoritative standards; none is assumed fully bundled here.
- Country code, region code, language code and IANA timezone can only be called canonical after validating against a recorded versioned authority snapshot and policy. Locale tags such as `zh-Hans-CN` are **not** ISO 639 language codes; store locale tags separately when a Locale concept is implemented. The current language DTO/API still admits BCP47-like strings and needs a documented contract migration before an ISO-only guarantee.
- Capture source URL/issuer, dataset name, published revision/date, retrieval date, content hash, original code/name, transformation version and reviewer decision per update. No invented ID, coordinates, region or official authority status.
- Use P7-owned generic contracts for impact and resolution. University and scholarship subsystems consume P7 identities; P7 must not depend on them (Zero Upward Dependency).

## Execution exclusions

No database connection, migrations, seed, backfill, provider API calls, live import, runtime deployment, merge or production publication in this review. Source and test files only. Actual source/unit/contract checks must be reported individually; files added under tests/ do not count as executed tests.

## Follow-up source commits after the checkpoint

Selected-record editors now propagate canonical ID and expectedVersion to row-locked writes; explicit 409 conflicts retain form state. Admin list URL query and quality counts exist (coverage unknown); bounded search pickers replace eager full-list loading; resolver now exposes historical replacement metadata. Refer to `SECTION_06_ITEM_MATRIX.md` for all 50 items and FG status. The earlier list of open features is a historical checkpoint; this matrix supersedes its FGA-06-001 and URL-filter status. No DB or runtime validation was performed.

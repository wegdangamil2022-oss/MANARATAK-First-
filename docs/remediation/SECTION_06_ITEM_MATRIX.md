# Section 06 / P7 — item-by-item source acceptance matrix

Baseline: `7231f2c53b307cb5f98e3af0083285322802603a`; branch `codex/section-01-iam-rbac`, report 2026-10-10.

`SOURCE_IMPLEMENTED` means a source patch is present, **not** that type/unit/runtime verification has passed. `PARTIAL` and `OPEN` are **execution gaps** and must NOT be relabeled 'deferred tests'. Database/runtime items are separately marked.

| Item | Planned review theme | Source status | Evidence / still missing |
|---|---|---|---|
| 06.01 | 01 Inventory/UI existing types | PARTIAL | See original MANARATAK_ADMIN_REVIEW_CODEX.md and checkpoint status; source completeness not yet established. |
| 06.02 | 02 Panel coherence | PARTIAL | See original MANARATAK_ADMIN_REVIEW_CODEX.md and checkpoint status; source completeness not yet established. |
| 06.03 | 03 Unicode-safe city identity | PARTIAL | PrismaReferenceDataRepository.ts; ReferenceIdentityNormalization.ts; source collision review still required |
| 06.04 | 04 Unicode aliases | PARTIAL | ReferenceIdentityNormalization.ts; historical DB alias keys unchanged |
| 06.05 | 05 Public Regions ACTIVE | SOURCE_IMPLEMENTED | LocalizedReferenceDataQueries.ts; PrismaReferenceDataRepository.ts |
| 06.06 | 06 Public Cities pagination | SOURCE_IMPLEMENTED | ReferenceDataPublicRouter.ts; max pageSize=100 / default=50 |
| 06.07 | 07 Generic lifecycle semantics | PARTIAL | P7 owner blocks unsafe terminal lifecycle states for all reference types including REGION; active canonical checks now require BOTH isActive and lifecycleState. Full dependency certification still absent. |
| 06.08 | 08 CRUD expectedVersion/CAS | PARTIAL | ReferenceDataContracts.ts; admin router; PrismaReferenceDataRepository.ts; selected-record editor |
| 06.09 | 09 Version temporal intervals | PARTIAL | Paginated owner version history endpoint uses bounded Prisma count/page and independent admin paging; legacy unbounded endpoint remains, cleanup outstanding. |
| 06.10 | 10 Non-region actor provenance | SOURCE_IMPLEMENTED | ReferenceDataUseCases.ts and PrismaReferenceDataRepository.ts actor / snapshot correlation |
| 06.11 | 11 Provider mapping reassignment | PARTIAL | Audited explicit mapping transfer with source/destination CAS, stable replay receipt, city country scope and reviewed admin target; runtime/test unverified. |
| 06.12 | 12 Replacement resolver continuity | SOURCE_IMPLEMENTED | ReferenceResolverService.ts and IReferenceResolver.ts replacement metadata |
| 06.13 | 13 ISO639 versus BCP47 Locale | PARTIAL | ISO639 alpha2/alpha3 validator and separate BCP47 canonical locale parser; legacy locale code data needs review. |
| 06.14 | 14 Canonical IANA timezones | PARTIAL | Runtime ICU IANA timezone validator now accepts UTC plus resolvable region names and rejects bare labels; city admin datalist added; no versioned reviewed IANA source snapshot. |
| 06.15 | 15 Country default Currency/Language reference | PARTIAL | Cross-entity canonical selection and city writer check isActive+lifecycle; country parent locked before region and city, country default currency/language locked during audited transaction. |
| 06.16 | 16 Standards registry provenance | PARTIAL | Read-only standards readiness API/UI lists six unverified families; versioned authority manifest contract exists. No reviewed official sources are falsely claimed. |
| 06.17 | 17 Public CLDR localization | OPEN | See original MANARATAK_ADMIN_REVIEW_CODEX.md and checkpoint status; source completeness not yet established. |
| 06.18 | 18 Global scope vs active runtime scope | PARTIAL | See original MANARATAK_ADMIN_REVIEW_CODEX.md and checkpoint status; source completeness not yet established. |
| 06.19 | 19 Hierarchy/DAG generic contracts | SOURCE_IMPLEMENTED_UNVERIFIED | Generic DAG contracts already existed under packages/domain/src/hierarchy and are exported. This continuation adds optional closure read contracts and linear-time iterative path traversal. Real graph-persistence usage needs independent verification. |
| 06.20 | 20 P6→P7 durable handoff | PARTIAL | P6→P7 SCREENING_ONLY requires durable P6 receipt storage; mapped payload SHA256 fingerprint recorded; no P7 owner approval or atomic apply. |
| 06.21 | 21 Unsafe SeedApply exposure gate | SOURCE_IMPLEMENTED_UNVERIFIED | Both Legacy SeedApplyService and pure SeedPlanner READY_TO_APPLY are fail-closed without durable P7 owner approval. |
| 06.22 | 22 Import canonical city identity | PARTIAL | Strict P6 mapped field allowlists reject canonical lifecycle/version keys, non-JSON metadata, malformed runtime types and source shape drift; staged duplicates quarantined. |
| 06.23 | 23 Intentionally incomplete migration | DB_DEFERRED | No database migration applied, per instruction |
| 06.24 | 24 Scalable canonical pickers | PARTIAL | canonicalPickers.ts; CanonicalPicker.tsx — first bounded page + search; callsites still need review |
| 06.25 | 25 Admin server query filters | PARTIAL | Four owner tabs and Region preserve q/country/status(active/all/nonactive)/page in URL; updatedFrom/mappingStatus facets pending |
| 06.26 | 26 Active label/status UI | SOURCE_IMPLEMENTED_UNVERIFIED | ReferenceDataAdminPage.tsx active/all/nonactive, filtered count owner read and URL persistence |
| 06.27 | 27 Generic governance admin workflow | PARTIAL | Governance history paginated independently; persisted screening queue has review-evidence classification, no forged APPROVED status/actions. |
| 06.28 | 28 Dependency impact before lifecycle | PARTIAL | Non-Region terminal actions now fail closed in owner transaction pending full certified downstream impact; FK usage preview explicitly remains partial with unknown non-FK consumers. |
| 06.29 | 29 Zero Upward Dependency | PARTIAL | No upward references newly imported into domain P7 |
| 06.30 | 30 Country source preview Dry Run | SOURCE_PRESERVED | Countries source preview remains dry-run |
| 06.31 | 31 Canonical country source fields vs metadata | PARTIAL | Country XLSX preview now maps name_ar to canonical nameAr; lifecycle review stays metadata-only; additional metadata still unresolved. |
| 06.32 | 32 Derived currency/language sources not authority | SOURCE_PRESERVED | Source-only derived previews remain non-authoritative |
| 06.33 | 33 Replacement target validation | PARTIAL | Region terminal owner guard added. Resolver city/region aliases and provider candidate searches use explicit country ISO2 scope before ambiguity limiting. Replacement target active and cycle checks retained. |
| 06.34 | 34 Alias ambiguity fail closed | PARTIAL | Canonical resolver is country-scoped for CITY/REGION non-ID lookups; owner ambiguity diagnostics for city/region aliases compare same ISO2 only. Historical alias collisions still require DB review. |
| 06.35 | 35 Search versus identity normalization | SOURCE_IMPLEMENTED_UNVERIFIED | Unicode identity/search normalization remains separate; ICU timezone policy added. Source invariant inspection passed, TS runtime not checked. |
| 06.36 | 36 Canonical codes and UUID identity | PARTIAL | Selected edit uses id, expectedVersion; non-upsert creations preserve UUID |
| 06.37 | 37 Region golden pattern | PARTIAL | See original MANARATAK_ADMIN_REVIEW_CODEX.md and checkpoint status; source completeness not yet established. |
| 06.38 | 38 API contract gaps | PARTIAL | Bounded owner history read, evidence-based screening review and stable normalized payload digest; no publication endpoint. |
| 06.39 | 39 Error status and conflicts | PARTIAL | ReferenceDataAdminRouter.ts explicit 409 conflict taxonomy |
| 06.40 | 40 Admin UX completeness | PARTIAL | Admin screening inbox displays review triage/digests and bounded history; legacy history read refuses over 100 versions. |
| 06.41 | 41 Quality/governance metrics | PARTIAL | Non-active query complements public selectability, including legacy isActive=false and Region parent-country lifecycle; owner city quality counters previously added. |
| 06.42 | 42 Standards snapshot registry | PARTIAL | Read-only ISO/UN/IANA/CLDR reviewed-snapshot readiness delivered to admin; no reviewed source files or persistent registry approval engine yet. |
| 06.43 | 43 Additional global data types | OPEN | See original MANARATAK_ADMIN_REVIEW_CODEX.md and checkpoint status; source completeness not yet established. |
| 06.44 | 44 Patch execution order | PARTIAL | See original MANARATAK_ADMIN_REVIEW_CODEX.md and checkpoint status; source completeness not yet established. |
| 06.45 | 45 Targeted acceptance source/unit checks | PARTIAL | One 13/13 static source inspection across 12 files was performed before final patches. TypeScript/Vitest/DB NOT RUN. |
| 06.46 | 46 Existing regression contracts | NOT_EXECUTED | Existing tests not run; legacy seed tests and stage source-key expectations updated in code only |
| 06.47 | 47 Runtime/DB deferred | DB_RUNTIME_DEFERRED | No DB connected/migrations/seeds/backfill |
| 06.48 | 48 Documentation clean-up | PARTIAL | Updated matrix, check log and continuation report to differentiate durable P6 screening receipts from missing P7 reviewed atomic canonical apply. |
| 06.49 | 49 Definition of Done | OPEN | Cannot CODE_CLOSE until owner durable P6→P7 reviewed apply workflow, authoritative standards snapshots and full lifecycle dependency coverage are implemented and source/type checks verified. |
| 06.50 | 50 Review decision | OPEN | Section 06 remains PARTIAL, P7 != P9 |

## Functional gap annex (06.FG)

| Gap | Source status | Result |
|---|---|---|
| FGA-06-001 | PARTIAL | Selected-record edits plus alias/mapping/history/relationship/impact inspector and explicit provider reconciliation now present; not all metadata form controls implemented. |
| FGA-06-002 | PARTIAL | Active/total/nonactive owner counts; city ISO2 region/timezone/canonical key gaps and mismatched country/region FK counts; global source/authority coverage unknown. |
| FGA-06-003 | PARTIAL | Four owner tabs and Regions now preserve q/status/country/page in URL. Added nonactive-only source-owner lifecycle filter; mappingStatus/updatedFrom remain unimplemented. |

## Continuation checkpoint: 2026-10-10

The P6 SCREENING_ONLY consumer, explicit audited provider-key transfer, source-owned FK impact and quality counters, four-tab governance inspector, ISO639/BCP47 code separation and fail-closed legacy SeedApply are present **as source patches only**. No TypeScript/Vitest/DB/runtime PASS is claimed. All city CSV review evidence remains unchanged.

## New continuation delta — after commit 6200d3e

- Owner repository now blocks **all non-Region terminal lifecycle transitions** without a certified usage-impact protocol (prevents bypassing UI-only controls). Region retains its pre-existing guarded lifecycle.
- Effective persisted aliases, provider mappings and complete canonical database fields now enter every new generic version snapshot, with actor and correlation.
- Admin status filtering is the exact complement of public ACTIVE selectability (including legacy isActive flags and inactive parent countries).
- Optimized existing P7.13 DAG validation/path traversal, avoided creating duplicate contracts.
- IANA ICU-based source validation now recognizes UTC and provides city editor suggestions; audited versioned official IANA authority snapshots remain missing.
- Added single-record, reviewed legacy city country-FK repair: immutable city UUID, same ISO2, ACTIVE canonical country, CAS, actor/reason, atomic Audit+Outbox, audit version, reviewer picker. **Not a batch repair/backfill**.
- Read-only six-family standards evidence readiness API and admin section are now live in source and explicitly mark all reviewed snapshots missing.
- Focused source-contract static inspection **10/10 PASS across 9 files**, not TypeScript, unit tests, DB or runtime; inspected before this documentation-only commit.

## Further continuation — P7 screening receipt safety and country-scoped resolution

- P6→P7 dispatcher now refuses unreceipted screening. Source staging requires an immutable artifact ID and SHA-256 source hash and preserves P6 review warnings.
- Owner read-only paginated import screening queue reuses existing `ImportScreeningReceipt` schema. It exposes canonical-key/issue/source evidence, but **never** asserts approval, reviews completed or canonical publication.
- `ReferenceDataSeedPlanner.markReadyToApply` no longer grants READY status just because validator passed. Unsafe SeedApply remains disabled; atomic P7 owner approval and canonical apply are **not** implemented.
- All batch duplicates are rejected, including when only one record of the pair passed field validation.
- Country ISO2 scope is now required before CITY/REGION alias/provider matching, not merely filtered after LIMIT 2. Owner inspector only reports same-country CITY/REGION alias collisions.
- Owner terminal-state safety includes REGION; no terminal state can rely on incomplete FK-only impact.
- Lightweight structural inspection: **13/13 PASS** across 11 source files in a *single* static audit; TypeScript/Vitest/Prisma runtime **NOT RUN**. No DB migrations/seed/backfill.

## Continuation after commit ef39904f (2026-10-10)

- Strengthened import-screening trust boundary: typed field guards for P6 payloads, forbidden canonical lifecycle/id/version flags, stable mapped-payload SHA256 digest in durable screening receipt and P7 review triage.
- Added evidence-only review eligibility labels. **REVIEWABLE != REVIEWED != APPROVED != APPLIED**; no approval buttons or canonical writes.
- Fixed resolver and owner reference getter to require both lifecycle ACTIVE and compatibility isActive, preventing stale flag selection.
- Added parent-first row lock policy for CITY (active COUNTRY FOR SHARE → REGION FOR UPDATE → CITY), and lock-recheck for COUNTRY default currency and language references; all in source, no DB connected.
- Added bounded paginated historical version API and on-demand admin controls; older unbounded history endpoint is still a follow-up.
- One lightweight static invariant inspection: **13/13 PASS across 12 files**. TypeScript/Vitest/DB tests NOT RUN, test specifications do not count as passing.
- No migrations, seed/backfill, import publish or production operations.

## Source continuation after ef39904f (2026-10-10)

- Durable P6 receipt now contains SHA256 of typed, allowlisted P7 normalized payload, separately from submitted source artifact SHA256. The latter is still P6 evidence, not verified against a raw archive.
- Rejects unknown mapped keys, non-JSON metadata, bad typed code values, forged owner ID/lifecycle/version fields, invalid numeric values and overlong issue text.
- Read-only review labels: REVIEWABLE, SOURCE_ISSUES_REQUIRE_REVIEW, LEGACY_RECEIPT_MISSING_EVIDENCE, INVALID_SOURCE; never operator APPROVED/APPLIED.
- Public canonical resolvers require lifecycleState ACTIVE and isActive true. Child writes lock parent COUNTRY before REGION/CITY; country default currency and language references are transactionally rechecked.
- Owner history paging is bounded; old history route now fails closed for more than 100 versions.
- One 13/13 targeted static source pass across 12 files predates some final edits; not a TS/Vitest/DB test.

## Actionable open implementation blockers

1. Persisted P7 owner review/approval, idempotent atomic canonical apply inbox and source-content receipts remain a functional source gap. P6 screening is NOT publication; existing direct SeedApply stays disabled.
2. Versioned authoritative ISO/UN/CLDR/IANA source datasets, with real provenance and reviewer approval; only evidence DTOs exist.
3. Cross-platform non-FK reference consumption impact, complete terminal lifecycle guard, full metadata admin form coverage and Region URL filters.
4. Reconcile historical/legacy city identity collisions and source mismatches using live DB evidence, without automatic imports.
5. Run restricted **targeted** source/unit/type acceptance and confirm prior TS contracts; no checks executed in the continuation.
6. Do not declare CODE_CLOSED while these actual source capabilities are missing, even when heavier E2E/DB tests are deferred after phase 28.

## DB/runtime specifically deferred (not counted as implementation closure)

No runtime DB queries or authoritative live inventory; no migrations/seeds/backfill, browser E2E or provider/pressure tests. The report's 3,549 university rows are a *previously unresolved source queue*, not all university rows or a DB measurement.

### Source check results

Two focused checks passed: Unicode normalization 10 multilingual cases, and four fail-closed legacy import entrypoints. The aggregated source-contract and large-file integrity checks were attempted once each but interrupted by connector limits/truncated content; neither was rerun and neither is a PASS. TypeScript build, Vitest and runtime checks were not executed. See `SECTION_06_CHECK_LOG.md`.

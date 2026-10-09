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
| 06.07 | 07 Generic lifecycle semantics | PARTIAL | PrismaReferenceDataRepository.ts; target active and country, CAS; dependencies not complete |
| 06.08 | 08 CRUD expectedVersion/CAS | PARTIAL | ReferenceDataContracts.ts; admin router; PrismaReferenceDataRepository.ts; selected-record editor |
| 06.09 | 09 Version temporal intervals | PARTIAL | PrismaReferenceDataRepository.ts; interval predecessor closure; DB overlap constraints unverified |
| 06.10 | 10 Non-region actor provenance | SOURCE_IMPLEMENTED | ReferenceDataUseCases.ts and PrismaReferenceDataRepository.ts actor / snapshot correlation |
| 06.11 | 11 Provider mapping reassignment | PARTIAL | Audited explicit mapping transfer with source/destination CAS, stable replay receipt, city country scope and reviewed admin target; runtime/test unverified. |
| 06.12 | 12 Replacement resolver continuity | SOURCE_IMPLEMENTED | ReferenceResolverService.ts and IReferenceResolver.ts replacement metadata |
| 06.13 | 13 ISO639 versus BCP47 Locale | PARTIAL | ISO639 alpha2/alpha3 validator and separate BCP47 canonical locale parser; legacy locale code data needs review. |
| 06.14 | 14 Canonical IANA timezones | PARTIAL | ReferenceDataValidationService.ts runtime ICU; no complete IANA snapshot |
| 06.15 | 15 Country default Currency/Language reference | PARTIAL | ReferenceDataUseCases.ts checks active ISO codes, no DB FK enforcement |
| 06.16 | 16 Standards registry provenance | PARTIAL | Versioned source snapshot evidence DTO with hash/reviewer/authority; no reviewed source artifacts stored. |
| 06.17 | 17 Public CLDR localization | OPEN | See original MANARATAK_ADMIN_REVIEW_CODEX.md and checkpoint status; source completeness not yet established. |
| 06.18 | 18 Global scope vs active runtime scope | PARTIAL | See original MANARATAK_ADMIN_REVIEW_CODEX.md and checkpoint status; source completeness not yet established. |
| 06.19 | 19 Hierarchy/DAG generic contracts | OPEN | See original MANARATAK_ADMIN_REVIEW_CODEX.md and checkpoint status; source completeness not yet established. |
| 06.20 | 20 P6→P7 durable handoff | PARTIAL | Registered P6-to-P7 SCREENING_ONLY consumer with generic receipt boundary; P7 owner durable approval/inbox/apply still missing. |
| 06.21 | 21 Unsafe SeedApply exposure gate | SOURCE_IMPLEMENTED_UNVERIFIED | Legacy ReferenceDataSeedApplyService now always rejects unreceipted promotions; owner apply unavailable. |
| 06.22 | 22 Import canonical city identity | SOURCE_IMPLEMENTED_UNVERIFIED | Seed staging uses validator scoped Unicode CITY key; all duplicate-key rows invalidated. |
| 06.23 | 23 Intentionally incomplete migration | DB_DEFERRED | No database migration applied, per instruction |
| 06.24 | 24 Scalable canonical pickers | PARTIAL | canonicalPickers.ts; CanonicalPicker.tsx — first bounded page + search; callsites still need review |
| 06.25 | 25 Admin server query filters | PARTIAL | Four owner tabs and Region preserve q/country/status(active/all/nonactive)/page in URL; updatedFrom/mappingStatus facets pending |
| 06.26 | 26 Active label/status UI | SOURCE_IMPLEMENTED_UNVERIFIED | ReferenceDataAdminPage.tsx active/all/nonactive, filtered count owner read and URL persistence |
| 06.27 | 27 Generic governance admin workflow | PARTIAL | Four admin owner tabs expose alias/mapping editing, version history, relationships, DEPRECATED, version conflict; terminal impact remains incomplete. |
| 06.28 | 28 Dependency impact before lifecycle | PARTIAL | Owner FK impact count with PARTIAL and unknown non-FK consumers; UI exposes known counts but does not certify terminal safety. |
| 06.29 | 29 Zero Upward Dependency | PARTIAL | No upward references newly imported into domain P7 |
| 06.30 | 30 Country source preview Dry Run | SOURCE_PRESERVED | Countries source preview remains dry-run |
| 06.31 | 31 Canonical country source fields vs metadata | PARTIAL | Country XLSX preview now maps name_ar to canonical nameAr; lifecycle review stays metadata-only; additional metadata still unresolved. |
| 06.32 | 32 Derived currency/language sources not authority | SOURCE_PRESERVED | Source-only derived previews remain non-authoritative |
| 06.33 | 33 Replacement target validation | PARTIAL | Lifecycle transition target ACTIVE and CITY ISO2; graph cycle guard |
| 06.34 | 34 Alias ambiguity fail closed | PARTIAL | Existing canonical resolution ambiguity behavior preserved |
| 06.35 | 35 Search versus identity normalization | SOURCE_IMPLEMENTED | normalizeReferenceIdentityToken distinct from search token |
| 06.36 | 36 Canonical codes and UUID identity | PARTIAL | Selected edit uses id, expectedVersion; non-upsert creations preserve UUID |
| 06.37 | 37 Region golden pattern | PARTIAL | See original MANARATAK_ADMIN_REVIEW_CODEX.md and checkpoint status; source completeness not yet established. |
| 06.38 | 38 API contract gaps | PARTIAL | Owner APIs for governance details, history/impact, per-country city quality and explicit mapping reconciliation; unverified. |
| 06.39 | 39 Error status and conflicts | PARTIAL | ReferenceDataAdminRouter.ts explicit 409 conflict taxonomy |
| 06.40 | 40 Admin UX completeness | PARTIAL | Owner UI governance inspector and explicit mapping transfer picker, existing Region Golden Pattern; remaining metadata UX unverified. |
| 06.41 | 41 Quality/governance metrics | PARTIAL | Owner city regional/timezone/identity and mismatching FK counts by country; complete authority/alias coverage unknown. |
| 06.42 | 42 Standards snapshot registry | PARTIAL | Six reviewed standard family snapshot evidence contracts; full approved ISO/CLDR/IANA datasets NOT present. |
| 06.43 | 43 Additional global data types | OPEN | See original MANARATAK_ADMIN_REVIEW_CODEX.md and checkpoint status; source completeness not yet established. |
| 06.44 | 44 Patch execution order | PARTIAL | See original MANARATAK_ADMIN_REVIEW_CODEX.md and checkpoint status; source completeness not yet established. |
| 06.45 | 45 Targeted acceptance source/unit checks | NOT_EXECUTED | New focused source/unit contract specs written, not executed; no TS compilation. |
| 06.46 | 46 Existing regression contracts | NOT_EXECUTED | Existing tests not run; legacy seed tests and stage source-key expectations updated in code only |
| 06.47 | 47 Runtime/DB deferred | DB_RUNTIME_DEFERRED | No DB connected/migrations/seeds/backfill |
| 06.48 | 48 Documentation clean-up | PARTIAL | docs/remediation/ and workspace/reports/section-06/ |
| 06.49 | 49 Definition of Done | OPEN | Cannot close while implementation gaps remain |
| 06.50 | 50 Review decision | OPEN | Section 06 remains PARTIAL, P7 != P9 |

## Functional gap annex (06.FG)

| Gap | Source status | Result |
|---|---|---|
| FGA-06-001 | PARTIAL | Selected-record edits plus alias/mapping/history/relationship/impact inspector and explicit provider reconciliation now present; not all metadata form controls implemented. |
| FGA-06-002 | PARTIAL | Active/total/nonactive owner counts; city ISO2 region/timezone/canonical key gaps and mismatched country/region FK counts; global source/authority coverage unknown. |
| FGA-06-003 | PARTIAL | Four owner tabs and Regions now preserve q/status/country/page in URL. Added nonactive-only source-owner lifecycle filter; mappingStatus/updatedFrom remain unimplemented. |

## Continuation checkpoint: 2026-10-10

The P6 SCREENING_ONLY consumer, explicit audited provider-key transfer, source-owned FK impact and quality counters, four-tab governance inspector, ISO639/BCP47 code separation and fail-closed legacy SeedApply are present **as source patches only**. No TypeScript/Vitest/DB/runtime PASS is claimed. All city CSV review evidence remains unchanged.

## Actionable open implementation blockers

1. Persisted P7 owner review and approval, atomic idempotent canonical apply inbox and source-content receipt (P6 screening is not publication).
2. Versioned authoritative ISO/UN/CLDR/IANA source datasets, with real provenance and reviewer approval; only evidence DTOs exist.
3. Cross-platform non-FK reference consumption impact, complete terminal lifecycle guard, full metadata admin form coverage and Region URL filters.
4. Reconcile historical/legacy city identity collisions and source mismatches using live DB evidence, without automatic imports.
5. Run restricted **targeted** source/unit/type acceptance and confirm prior TS contracts; no checks executed in the continuation.
6. Do not declare CODE_CLOSED while these actual source capabilities are missing, even when heavier E2E/DB tests are deferred after phase 28.

## DB/runtime specifically deferred (not counted as implementation closure)

No runtime DB queries or authoritative live inventory; no migrations/seeds/backfill, browser E2E or provider/pressure tests. The report's 3,549 university rows are a *previously unresolved source queue*, not all university rows or a DB measurement.

### Source check results

Two focused checks passed: Unicode normalization 10 multilingual cases, and four fail-closed legacy import entrypoints. The aggregated source-contract and large-file integrity checks were attempted once each but interrupted by connector limits/truncated content; neither was rerun and neither is a PASS. TypeScript build, Vitest and runtime checks were not executed. See `SECTION_06_CHECK_LOG.md`.

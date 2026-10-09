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
| 06.11 | 11 Provider mapping reassignment | PARTIAL | PrismaReferenceDataRepository.ts prevents silent ownership transfer; explicit reconciliation missing |
| 06.12 | 12 Replacement resolver continuity | SOURCE_IMPLEMENTED | ReferenceResolverService.ts and IReferenceResolver.ts replacement metadata |
| 06.13 | 13 ISO639 versus BCP47 Locale | OPEN | See original MANARATAK_ADMIN_REVIEW_CODEX.md and checkpoint status; source completeness not yet established. |
| 06.14 | 14 Canonical IANA timezones | PARTIAL | ReferenceDataValidationService.ts runtime ICU; no complete IANA snapshot |
| 06.15 | 15 Country default Currency/Language reference | PARTIAL | ReferenceDataUseCases.ts checks active ISO codes, no DB FK enforcement |
| 06.16 | 16 Standards registry provenance | OPEN | See original MANARATAK_ADMIN_REVIEW_CODEX.md and checkpoint status; source completeness not yet established. |
| 06.17 | 17 Public CLDR localization | OPEN | See original MANARATAK_ADMIN_REVIEW_CODEX.md and checkpoint status; source completeness not yet established. |
| 06.18 | 18 Global scope vs active runtime scope | PARTIAL | See original MANARATAK_ADMIN_REVIEW_CODEX.md and checkpoint status; source completeness not yet established. |
| 06.19 | 19 Hierarchy/DAG generic contracts | OPEN | See original MANARATAK_ADMIN_REVIEW_CODEX.md and checkpoint status; source completeness not yet established. |
| 06.20 | 20 P6→P7 durable handoff | OPEN | No durable review/apply receipt implementation |
| 06.21 | 21 Unsafe SeedApply exposure gate | SAFE_NOT_EXPOSED_TO_BE_VERIFIED | Do not wire unsafe ReferenceDataSeedApplyService as generic promotion |
| 06.22 | 22 Import canonical city identity | OPEN | Staging still not proven to reuse canonical city scope |
| 06.23 | 23 Intentionally incomplete migration | DB_DEFERRED | No database migration applied, per instruction |
| 06.24 | 24 Scalable canonical pickers | PARTIAL | canonicalPickers.ts; CanonicalPicker.tsx — first bounded page + search; callsites still need review |
| 06.25 | 25 Admin server query filters | PARTIAL | ReferenceDataAdminPage.tsx URL p7Q,p7Status,p7Country,p7Page; not all facets |
| 06.26 | 26 Active label/status UI | SOURCE_IMPLEMENTED | ReferenceDataAdminPage.tsx status field and all/active label |
| 06.27 | 27 Generic governance admin workflow | PARTIAL | ReferenceDataAdminPage.tsx selected edit prefill and CAS; advanced governance missing |
| 06.28 | 28 Dependency impact before lifecycle | OPEN | Owner-neutral usage impact service not yet available |
| 06.29 | 29 Zero Upward Dependency | PARTIAL | No upward references newly imported into domain P7 |
| 06.30 | 30 Country source preview Dry Run | SOURCE_PRESERVED | Countries source preview remains dry-run |
| 06.31 | 31 Canonical country source fields vs metadata | OPEN | Source-to-canonical country mapping not completed |
| 06.32 | 32 Derived currency/language sources not authority | SOURCE_PRESERVED | Source-only derived previews remain non-authoritative |
| 06.33 | 33 Replacement target validation | PARTIAL | Lifecycle transition target ACTIVE and CITY ISO2; graph cycle guard |
| 06.34 | 34 Alias ambiguity fail closed | PARTIAL | Existing canonical resolution ambiguity behavior preserved |
| 06.35 | 35 Search versus identity normalization | SOURCE_IMPLEMENTED | normalizeReferenceIdentityToken distinct from search token |
| 06.36 | 36 Canonical codes and UUID identity | PARTIAL | Selected edit uses id, expectedVersion; non-upsert creations preserve UUID |
| 06.37 | 37 Region golden pattern | PARTIAL | See original MANARATAK_ADMIN_REVIEW_CODEX.md and checkpoint status; source completeness not yet established. |
| 06.38 | 38 API contract gaps | PARTIAL | 422/409 and paged source API partially expanded |
| 06.39 | 39 Error status and conflicts | PARTIAL | ReferenceDataAdminRouter.ts explicit 409 conflict taxonomy |
| 06.40 | 40 Admin UX completeness | PARTIAL | ReferenceDataAdminPage.tsx selected edits; alias/mapping/history UI incomplete |
| 06.41 | 41 Quality/governance metrics | PARTIAL | getQualitySnapshot server owner counts + unknown coverage; no region/timezone facets |
| 06.42 | 42 Standards snapshot registry | OPEN | See original MANARATAK_ADMIN_REVIEW_CODEX.md and checkpoint status; source completeness not yet established. |
| 06.43 | 43 Additional global data types | OPEN | See original MANARATAK_ADMIN_REVIEW_CODEX.md and checkpoint status; source completeness not yet established. |
| 06.44 | 44 Patch execution order | PARTIAL | See original MANARATAK_ADMIN_REVIEW_CODEX.md and checkpoint status; source completeness not yet established. |
| 06.45 | 45 Targeted acceptance source/unit checks | NOT_EXECUTED | Tests added but NOT executed |
| 06.46 | 46 Existing regression contracts | NOT_EXECUTED | Existing tests not rerun; test doubles may need update |
| 06.47 | 47 Runtime/DB deferred | DB_RUNTIME_DEFERRED | No DB connected/migrations/seeds/backfill |
| 06.48 | 48 Documentation clean-up | PARTIAL | docs/remediation/ and workspace/reports/section-06/ |
| 06.49 | 49 Definition of Done | OPEN | Cannot close while implementation gaps remain |
| 06.50 | 50 Review decision | OPEN | Section 06 remains PARTIAL, P7 != P9 |

## Functional gap annex (06.FG)

| Gap | Source status | Result |
|---|---|---|
| FGA-06-001 | SOURCE_IMPLEMENTED_UNVERIFIED | Country/currency/language/city rows now have Edit with prefill ID and expectedVersion, repository CAS + 409 conflict; aliases, provider mapping and full metadata editing still open. |
| FGA-06-002 | PARTIAL | Server-owned active/total/nonactive counts, drill-down, unknown coverage explicitly. Missing-country facets (region/timezone, alias collisions, broken relationships) not implemented. |
| FGA-06-003 | PARTIAL | URL-backed q/status/country filters on four owner tabs and bounded page totals. Region tab URL sync, mappingStatus and updatedFrom filters are not implemented. |

## Actionable open implementation blockers

1. Persisted P6→P7 staging/review/approval/atomic apply receipts and consumer inbox, with no generic promotion.
2. Provider mapping governed reassignment with durable history and replay/idempotency; audit/outbox semantics need isolated tests.
3. Country/city quality facets per country; region/timezone/alias/relationship owner drill-down.
4. Edit/inspect aliases, provider mappings, version history and governed lifecycle for all four generic tabs, with impact check.
5. Runtime/IANA versioned authority snapshots, ISO language-code vs BCP47 locale separation, standards registry.
6. Unified city scope for stage import deduplication; 2,052 review-only candidates remain unresolved, no automatic inserts.
7. Complete acceptance source/contract/security targeted checks and prior test compatibility; none executed yet at matrix creation.

## DB/runtime specifically deferred (not counted as implementation closure)

No runtime DB queries or authoritative live inventory; no migrations/seeds/backfill, browser E2E or provider/pressure tests. The report's 3,549 university rows are a *previously unresolved source queue*, not all university rows or a DB measurement.

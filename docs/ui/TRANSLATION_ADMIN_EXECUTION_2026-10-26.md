# Translation administration: audit and implementation

Date: 2026-10-26. Scope: Translation administration and its read API only.

## Basis and boundaries

The supplied v1.16 plan on this machine ends at section 09; it does not contain a dedicated Translation implementation section. This audit therefore uses the current implementation, `B11_TRANSLATION_OWNER_CONTRACT_2026-10-15.md`, `B11_OWNER_TRANSLATION_CLOSURE_2026-10-15.md`, and the shared owner-capability and publication policies. It does not claim to implement a missing plan section.

The central workspace monitors name coverage for five owners: scholarships, universities, majors, international tests and courses. The capability guide additionally covers study destinations, services and jobs. CMS content, reference names and interface copy have separate ownership; registering a language does not enable that language on the public site.

`TRANSLATION_CONTENT_MODE=INFRASTRUCTURE_ONLY` remains unchanged. Translation authoring, central import and publication have not been activated. Presence of a name, a recorded publication state and verified public readiness are distinct facts. No migration or original content write is part of this change.

## Findings and delivered changes

| Before                                                           | Implemented                                                                                                                                                                                                 |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Long technical capability listing ahead of the working area      | Records are the default tab; a separate, bilingual Translation routes guide explains ownership and provides permitted links.                                                                                |
| Empty details area always occupies layout space                  | A selected-record dialog opens on demand, with content/source views, close/Escape, keyboard focus management and previous/next navigation within the loaded page.                                           |
| Unfiltered domain controls                                       | Domain navigation and owner links follow server capabilities and existing permissions. Failed capability reads have retry and never fabricate access.                                                       |
| Page-local coverage and unavailable counts substituted with zero | Four compact metrics use server totals for the matching result set. Unknown is shown as a dash, loading as an ellipsis; counts explicitly describe names, not content completeness or publication approval. |
| Search misses translated names                                   | Search matches Arabic/English localized names, source name, public ID and slug before counting/paging. Literal SQL wildcard characters are escaped.                                                         |
| Limited filters and no shareable query                           | Coverage, review language, recorded state including rejection, updated-since date, three server sorts, bounded search and server pagination persist in URL parameters. Filters reset paging.                |
| Inconsistent and oversized presentation                          | Scoped Cairo typography, indigo/petrol header, Lucide icons, compact equal metrics, table/card view modes, white/ivory surfaces and responsive grids.                                                       |
| Technical operational wording and dead frozen authoring actions  | Read-only locale previews explain the current policy; real owner links remain available. The existing future-gated editing code is retained without enabling it.                                            |
| Course links target the old workspace                            | Native courses open their editor; external courses open the existing external-course drawer route.                                                                                                          |
| Late fetches can replace a newly selected context                | Request cancellation and generation checks protect domain changes and details; existing draft/readback regression cases remain covered.                                                                     |

The route guide replaces the confusing “translation scopes and review routes” area; it is a navigation guide, not another review queue. Content decisions and publication remain in the owning sections. The related-workflows area links to CMS and reference administration only when permitted and explains where interface strings are maintained.

## Files

- `apps/admin/src/pages/AdminTranslationWorkspacePage.tsx`
- `apps/admin/src/features/translations/`: styles, query-state parser, capabilities reader, record dialog, locale preview/editor and owner model helpers.
- `apps/admin/src/components/TranslationOwnerCapabilitiesPanel.tsx`
- Arabic/English dictionaries: clearer existing source/readiness notices.
- Translation workspace router, application query contract and Prisma read gateway: additive read filters/search/sorts.
- Translation UI, capability, router and gateway regression tests; dedicated Vitest configuration.
- Audit-coverage source parser: normalize TypeScript line endings before policy fingerprinting. Its regression proves LF/CRLF equivalence while still rejecting a real permission change. No approved policy inventory or SQL migration bytes were changed.

## Verification

| Check                                  | Result                                                                                                                                                                                                                                                                                           |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Translation suite                      | 125 passed, 26 files, zero failed/skipped. Includes freeze/permissions, stale responses, unavailable-count handling, opposite-locale draft protection, failed-readback duplicate protection, URL state, course links and API validation.                                                         |
| Audit-source regression                | 20 passed.                                                                                                                                                                                                                                                                                       |
| Source preflight                       | PASS, including 38 preflight checks.                                                                                                                                                                                                                                                             |
| Source architecture and source quality | PASS; zero dependency cycles or accessibility findings reported by the source gate.                                                                                                                                                                                                              |
| TypeScript project build               | PASS.                                                                                                                                                                                                                                                                                            |
| Admin production build                 | PASS; Vite still reports the existing large-bundle warning.                                                                                                                                                                                                                                      |
| API bundle                             | PASS.                                                                                                                                                                                                                                                                                            |
| Isolated PostgreSQL 16                 | Seven acceptance checks passed: Arabic/English global search, a translated match beyond page one, second-page totals, stable timestamp ordering, literal wildcard escaping, real empty counts, recorded rejection and complete rollback of acceptance fixtures. Original database writes: zero.  |
| Actual browser                         | Arabic desktop and English guide, table/cards, filtered search returning one matching synthetic owner, source preview, Escape and eight owner-guide links inspected in an isolated canonical API/MFA runtime. Computed Cairo/22px page title/15px area title/13px labels/12px controls verified. |

ESLint on touched source/tests completed with zero errors and 18 explicit-any warnings in test mocks. The production translation components have no lint findings.

## Browser evidence and limits

- [Arabic desktop records](evidence/translations-20261026/desktop-ar.png): 900px viewport; a synthetic isolated course searched by its public ID. Document width 885px. This image is scrolled to filters/results.
- [Arabic routes guide](evidence/translations-20261026/routes-ar.png): actual browser, 900px viewport. The central-import wording was subsequently made more explicit that activation is pending.
- [English phone, before header wrapping correction](evidence/translations-20261026/phone-en.png): actual 360px viewport. The translation component fitted the viewport; the shared shell's English action row caused document width 384px. A translation-scoped mobile header-wrapping rule was then added and rebuilt.

The browser connector disconnected before the final mobile shell correction could be visually rechecked or the viewport reset. The phone image is retained as a **pre-correction diagnostic**, not a final passing screenshot. At 360px the actual dialog previously measured left 7px/right 353px and closed with Escape. No final 320px, text-zoom or production-account visual pass is claimed. No original-account browser session or MFA secret was inspected.

## Remaining activation work

Central content authoring/import/publication must remain gated until their owner contracts, current source/value evidence, version/reason/conflict handling and deployment approval are completed. The retained future-gated editor is not a claim that those contracts are production-ready. Automatic translation and historical translation analytics were not introduced. Existing database/network latency tuning is outside this UI audit.

The work is delivered on `feat/translation-admin-workspace-20261026`; this change does not merge itself into `main`.

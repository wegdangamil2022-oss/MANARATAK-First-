# MANARATAK 2.0 — CMS Deep Restructure Source Closure

**Date:** 2026-09-05  
**Mode:** SOURCE-ONLY / RUNTIME-LATER  
**Database:** NOT CONNECTED  
**Migration application:** 0  
**Cloud SQL mutations:** 0  
**Backfills/imports:** 0

## 1. Closure decision

The CMS is closed at source level as a bounded **Editorial Content + Site Experience** capability. It is not a second database for universities, scholarships, majors, international tests, courses, countries, translations, or global review state.

### Canonical editorial content types

- `ARTICLE`
- `STUDY_GUIDE`
- `NEWS`
- `FAQ`
- `CHECKLIST`
- `STATIC_PAGE`
- `LANDING_PAGE`

`ANNOUNCEMENT` and `CONTENT_BLOCK` were removed from the editorial content enum because they already have dedicated Site Operations models and lifecycles.

## 2. Site Operations remain separate

The following remain dedicated operational capabilities rather than article/content types:

- Navigation menus
- Redirects
- Dynamic content blocks
- Announcements
- Publishing calendar/scheduling
- Review status summary

Technical Block Schema creation remains available through governed backend/API capability, but it was removed from the ordinary editor workspace. Editors may use only approved active schemas.

Navigation authoring was corrected so adding a link preserves the existing menu nodes and sends the current `expectedVersion`, preventing blind replacement and stale concurrent overwrites.

## 3. Cross-domain editorial relationships

CMS now supports explicit canonical relationships through `CmsContentDomainLink`.

Supported targets:

- `UNIVERSITY`
- `ACADEMIC_PROGRAM`
- `SCHOLARSHIP`
- `MAJOR`
- `INTERNATIONAL_TEST`
- `COURSE`
- `REFERENCE_COUNTRY`

Supported semantic relations:

- `RELATED`
- `FEATURED`
- `GUIDE`
- `APPLICATION`
- `REQUIREMENTS`
- `ELIGIBILITY`

### Relationship rules

1. CMS stores references, never copied canonical domain names/details.
2. `targetId` must be the canonical **owner UUID**.
3. Display names, slugs, aliases and public labels are forbidden as relationship identity.
4. Duplicated semantic links are rejected.
5. A content item may contain at most 50 domain links through the authoring API.
6. Public delivery returns only published CMS projections for the requested locale/site.
7. `STUDY_DESTINATION` is intentionally not a CMS target type. A study destination is the rich profile/projection of the canonical `ReferenceCountry`; creating another target identity would duplicate ownership.

### Runtime validation still required

Because the database is intentionally offline during this source cycle, source code can validate the UUID identity shape but cannot prove target existence. Before runtime closure, every `CmsContentDomainLink.targetId` must be resolved against the owning domain and orphan count must equal zero.

## 4. Cross-domain graph integration

Published related editorial content is projected into the existing composition-only cross-domain read model for:

- Major → editorial content
- University → editorial content
- Scholarship → editorial content
- Country / study destination → editorial content

The graph continues to query each owning domain. CMS does not mutate or shadow domain entities.

## 5. Translation and review ownership

The CMS no longer exposes duplicate local-preview Translation or Review Queue workspaces.

- Translation governance belongs to the central **Translation & Localization** capability.
- Each CMS locale still has its own content lifecycle/revision state, but there is no second translation authority.
- Review/approval authority belongs to the global Review Queue; the CMS may show a contextual summary only.
- Publishing remains locale-specific and maker-checker governed.

## 6. Local Admin Preview cleanup

The old Local Admin Preview CMS CRUD pages contained hardcoded sample articles, FAQs, pages, categories and detail records. They were removed.

Legacy preview URLs now redirect to the safe CMS architecture map rather than displaying fake admin data.

The canonical operational CMS is the real `apps/admin` control plane and its API/Application/Repository contracts.

## 7. Locale, SEO and visual system

- Site Operations queries/mutations now use the selected locale instead of hardcoded `ar`.
- Direction follows locale (`RTL` / `LTR`).
- Canonical URLs remain generated/governed rather than editor-overridden.
- Existing localized publishing, redirect and navigation governance remains intact.
- CMS surfaces use the current MANARATAK design tokens:
  - Indigo `#142B5F`
  - Petroleum `#0E7C86`
  - Digital turquoise `#21A7B4`
  - Gold `#D6A43B`
  - Light gold `#F2CD78`
  - Ivory `#FAF7F0`
  - Knowledge mist `#DDEFF2`

## 8. Database source delta

Source-only draft migration:

`packages/infrastructure/prisma/migrations/20260905014500_cms_domain_links_source_only/migration.sql`

It creates the CMS-domain link table, CMS ownership constraint/indexes, allowed target/relation checks, and a UUID-shape constraint for target owner IDs. It MUST NOT be applied until the runtime/database safety gate is opened.

## 9. Source verification evidence

Latest source verification in this closure:

```text
CMS_SOURCE_VERIFY_PASS=18
SOURCE_QUALITY_PACKAGE_CYCLES=0
SOURCE_QUALITY_FILE_CYCLES=0
SOURCE_QUALITY_A11Y_FINDINGS=0
SOURCE_QUALITY_GATE=PASS
PHASE_16_SOURCE_VERIFY=PASS 22/22
W14_SOURCE_VERIFIER=PASS 14/14
TS_CHANGED_FILES=24
TS_SYNTAX_ERRORS=0
DATABASE_CONNECTED=NO
MIGRATIONS_APPLIED=0
CLOUD_SQL_MUTATIONS=0
```

A full dependency-backed monorepo typecheck is not claimed by this report. The delivery ZIP intentionally excludes installed dependencies; changed TypeScript/TSX sources were syntax-transpiled and the repository source gates above passed.

## 10. Runtime closure gate — deferred

When the database/runtime phase opens, execute in dependency order:

1. Confirm Development/Remediation DB identity.
2. Backup + independent schema snapshot + restore/recovery proof.
3. Review the source-only migration before applying it.
4. Apply migration only through the approved Prisma migration path.
5. Validate CMS domain targets against owning repositories; `orphans = 0`.
6. Validate duplicate links; `duplicates = 0`.
7. Test maker-checker and locale-specific publishing with real actors.
8. Test navigation optimistic concurrency and rollback.
9. Test redirects and loop prevention.
10. Test dynamic blocks against approved schemas.
11. Test announcements publish/archive windows.
12. Test scheduler worker, outbox/audit and delivery cache invalidation.
13. Probe Major/University/Scholarship/Country → related editorial projections.
14. Test Arabic and English public delivery independently.
15. Run end-to-end DB → API → Admin/Public evidence and rollback/replay.

## 11. Final source status

```text
CMS_INFORMATION_ARCHITECTURE = CLOSED_SOURCE
CMS_EDITORIAL_BOUNDARY = CLOSED_SOURCE
CMS_SITE_OPERATIONS_BOUNDARY = CLOSED_SOURCE
CMS_CROSS_DOMAIN_LINKING = SOURCE_READY
CMS_FAKE_ADMIN_PREVIEW_DATA = REMOVED
CMS_TRANSLATION_DUPLICATION = REMOVED
CMS_REVIEW_DUPLICATION = REMOVED
CMS_RUNTIME_PROOF = PENDING
DATABASE_CONNECTED = NO
MIGRATIONS_APPLIED = 0
CLOUD_SQL_MUTATIONS = 0
```

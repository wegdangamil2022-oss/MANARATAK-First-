# MANARATAK Study Destinations — Source Closure

Date: 2026-09-05

## Ownership decision

`ReferenceCountry` remains Phase 7 canonical identity only: ISO identity, canonical/localized name, region/subregion, default reference currency/language, calling code, flag and lifecycle.

A separate `StudyDestinationProfile` now owns study-destination editorial and operational content:

- bilingual destination overview;
- study system and admission highlights;
- canonical study-language references;
- student visa summary, requirements and official visa URL;
- living-cost tier, range and canonical currency;
- student-life and cost highlights;
- official links;
- source evidence, audit date and source-verification state;
- editorial feature state and publish lifecycle.

Reference Data is therefore no longer treated as an implicit list of public study destinations.

## Publication workflow

`DRAFT -> IN_REVIEW -> PUBLISHED -> ARCHIVED`

Publishing requires the source readiness policy to pass. `VERIFIED` is an explicit workflow transition and cannot be authored in the normal editor payload. Source-sensitive edits reset verification. If a published profile changes in a source-sensitive way, it returns to `DRAFT`, clears `publishedAt`, and disappears from public Study Destination delivery until it is reviewed, verified and published again.

## Canonical relationships

The destination profile does not duplicate identities owned by other domains.

- Country identity: `ReferenceCountry.id`.
- Study languages: canonical `ReferenceLanguage.id` join.
- Living-cost currency: canonical `ReferenceCurrency.id`.
- Universities: read from University domain by `countryReferenceId`.
- University programs and Majors: composed from University academic programs; Major identities are resolved by canonical `majorId`.
- Scholarships: read from Scholarship domain by `countryReferenceId`.
- International Tests: read from Tests domain by canonical ISO2 relationship.
- Services: read from Services domain by supported canonical country ID.
- Career Jobs: read from Career domain by canonical country ID.
- CMS: read from CMS domain target `REFERENCE_COUNTRY`.
- Courses: only provider-headquarters geography is exposed here and is explicitly **not** interpreted as a study-country relationship.

No `CourseStudyCountry` or `CourseStudyDestination` foreign key was introduced.

## Admin information architecture

The Study Destination detail workspace is reduced to seven coherent sections:

1. Overview / canonical identity boundary.
2. Study system and admission.
3. Student visa.
4. Living cost and student life.
5. Locations and owner-domain relationships.
6. Evidence and official links.
7. Readiness and publication.

The old Phase 7 metadata-driven `Pending` panels and duplicate status filters are removed.

## Public delivery

The public country destination catalog now loads only `PUBLISHED` `StudyDestinationProfile` records through `/api/v1/study-destinations`. It no longer maps every active Reference Country to a study destination. The public country detail receives curated study-system, admission, visa, cost, language and official-link content, then enriches universities, scholarships, canonical majors and tests through the cross-domain graph.

## Database safety

This closure is source-only.

- Database executions: 0.
- Migration executions: 0.
- Backfill executions: 0.
- A source-only Prisma migration is included for the new Study Destination profile tables and canonical language/currency relations; it was not applied.

## Final source verification

- Study Destinations source closure: **83/83 PASS**.
- Courses regression: **88/88 PASS**.
- Imported Courses regression: **90/90 PASS**.
- International Tests regression: **37/37 PASS**.
- International Test source baseline: **59/59** (`56 Active + 3 Archived`, duplicate IDs/slugs = 0).
- P4 cross-domain read models: **64/64 PASS**.
- P10 public-plan source closure: **96/96 PASS** after updating the country-source contract from generic active Reference Countries to published Study Destination profiles.
- P13 final source closure: **98/98 PASS** (`RUNTIME_PENDING` remains explicit).
- Import Foundation source closure: **PASS**.
- W2 source verifier: **23/23 PASS**.
- Source Quality: **PASS** (`package cycles = 0`, `file cycles = 0`, `accessibility findings = 0`).
- Modified TS/TSX syntax: **19/19 PASS**.
- Existing migration files changed: **0**.
- Existing migration files removed: **0**.
- New migration files: **1**, source-only and not executed.

## Runtime boundary

The packaged source does not contain installed `node_modules` / Prisma CLI. The Prisma source gate therefore stops explicitly with `PRISMA_SOURCE_GATE=FAIL reason=prisma-cli-not-installed`. No tool was downloaded implicitly, no database connection was opened, and no migration/backfill was executed. Full dependency-backed typecheck, Prisma validate/generate, database integration and browser E2E remain runtime-pending rather than being claimed as certified.

## Admin deep-link completion — 2026-09-05

The Study Destination relationship workspace now behaves as an operational navigation surface, not only a read-only graph summary:

- Every university returned by the country graph links directly to the owning University Domain admin record (`/universities/:id`).
- The destination exposes a country-scoped “open universities” action that routes to `/universities?countryReferenceId=<canonical-country-id>`.
- `UniversityAdminPage` consumes that canonical `countryReferenceId` query filter and forwards it to the owner API instead of filtering by display name.
- Academic-program rows link back to their owning university and, when canonically mapped, to the owning Major record.
- Canonical Major, Scholarship, and International Test relationship cards deep-link to their owner-domain admin records.
- No university, program, major, scholarship, or test data is duplicated into `StudyDestinationProfile`; all navigation is built on owner IDs returned by the cross-domain graph.

Verification after this completion: **STUDY_DESTINATIONS_SOURCE_CLOSURE = 90/90 PASS**.

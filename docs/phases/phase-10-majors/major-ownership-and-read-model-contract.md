# Major Ownership And Read Model Contract

## Canonical Ownership

- Phase 8 owns `DegreeLevel` and `AcademicTaxonomyNode` identities.
- Phase 10 owns Major academic identity, level-profile linkage, source evidence, and academic completeness.
- Phase 16 owns long-form editorial/CMS content.
- Phase 21 owns careers, jobs, salaries, and market truth.
- Public Major pages aggregate these capabilities; aggregation does not transfer ownership.

`MajorLevel` is a compatibility subset derived from `CanonicalDegreeLevelCode`. It is not an independent source of truth. New level-profile writes carry the Phase 8 `degreeLevelId` when resolved.

## Completeness

`COMPLETE` requires canonical Major identity plus DegreeLevel linkage, taxonomy linkage, source identity, and no critical unresolved mappings. Free-text degree, faculty, field, or content cannot satisfy canonical readiness. `GAP_TAXONOMY_TRUE` is an explicit review gap and blocks publication through the central readiness policy.

## Read Models

- List endpoints return bounded summaries: default page size 50, maximum 100.
- Database search and canonical filters execute in Prisma query predicates.
- The static source catalog is cached, filtered, and paginated before DB enrichment; enrichment queries only the current page's codes.
- Detail endpoints load profiles, mappings, and content sections only when specifically requested.
- There is no unbounded active `listByStatus` Major query.

## Import Boundary

Phase 6 remains generic. Major parsing, semantic matching, taxonomy resolution, profile creation, and promotion remain inside the Major application/domain boundary.

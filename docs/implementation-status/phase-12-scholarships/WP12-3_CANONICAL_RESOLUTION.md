# WP12-3 — Cross-Domain Canonical Resolution

Source-only implementation of deterministic Scholarship canonical resolution.

## Canonical targets

- provider / University
- Country
- Language
- Currency
- DegreeLevel
- Major
- InternationalTest

## Safety invariants

- existing canonical entities are read only;
- University linkage requires an existing `INS-*` identity;
- Major IDs are existing `MJR-*`, `MAS-*`, or `DOC-*` identities; Fellowships are not coerced into Major links;
- raw source values survive unresolved, ambiguous, and review-required outcomes;
- no fuzzy matching, entity creation, upsert, or silent replacement;
- WP12-3 creates no Prisma migration and performs no database mutation.

## Persistence note

The accepted WP12-2 normalized model contains Country/Degree/Major/Test/University targets and Benefit Currency targets. WP12-3 additionally resolves Language as required by the Phase 12 plan, but does not alter persistence. Language resolution can be carried by the Phase 6 → Phase 12 staging handoff; any normalized Language FK addition must be handled in an explicitly reviewed schema packet before runtime transfer.

```text
CROSS_DOMAIN_RESOLVERS = SOURCE_READY
MIGRATIONS_APPLIED = 0
CLOUD_SQL_MUTATIONS = 0
BACKFILL_EXECUTED = NO
```

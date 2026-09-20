# WP4 Database Closure Register

> **Operational supersession notice (2026-09-06):** Any instruction in this historical remediation artifact that requires an “Original Development Database”, a Google Studio recovery gate, or `WP1_RECOVERY_GATE` is superseded by [`docs/operations/GREENFIELD_DATABASE_PROVISIONING.md`](../../operations/GREENFIELD_DATABASE_PROVISIONING.md). This file remains historical/evidence context and is not current database-operation authority.

No item authorizes database access or mutation before the Google Studio recovery gate is closed.

## Source Preparation Update (2026-08-13)

- Source verification confirms 7 canonical Degree Levels with unique ranks.
- ISCED-F verification confirms 163 nodes, 152 edges, 39 aliases, and 1 mapping with no duplicate node/edge keys or missing referenced nodes.
- `seed-degree-levels` and `seed-taxonomy` now fail closed unless the Recovery Gate and explicit mutation approval are both present.
- Database closure items below remain pending; no database operation was executed.

| Item | Classification | Source evidence | Required closure | Owner |
|---|---|---|---|---|
| Canonical DegreeLevel rows | GOOGLE STUDIO / DB CLOSURE REQUIRED | Seven codes are fixed in the source contract and seed service | Verify rows, stable IDs, uniqueness, and status without reseeding | Academic Taxonomy + DB Operations |
| Major profile degree references | GOOGLE STUDIO / DB CLOSURE REQUIRED | `degreeLevelId` relation exists; `level` string remains | Audit profiles, resolve valid legacy values, then approve backfill | Majors |
| International Test degree relationships | GOOGLE STUDIO / DB CLOSURE REQUIRED | Prisma relationship targets DegreeLevel | Validate every persisted relationship and unresolved legacy code | International Tests |
| Legacy imported degree labels | GOOGLE STUDIO / DB CLOSURE REQUIRED | Major import maps labels to a local compatibility subset | Produce mapping exceptions and backfill only after backup | Majors |
| Taxonomy edge deletion/runtime behavior | GOOGLE STUDIO / DB CLOSURE REQUIRED | Router now delegates lookup and deletion to Application/Repository | Verify not-found, delete, rollback, and audit persistence | Academic Taxonomy |
| Taxonomy mutation audit persistence | GOOGLE STUDIO / DB CLOSURE REQUIRED | WP1 mutation middleware covers `/admin/academic-taxonomy` | Verify critical audit records in original development DB | Audit + Academic Taxonomy |
| Reverse mapped-majors query | SOURCE_CLOSED / RUNTIME_READ_PENDING | Phase 10 Major repository owns `listByTaxonomyNode`; Application and API tests pass | Verify returned persisted mappings in the approved Development DB | Majors |
| Existing taxonomy IDs and ISCED-F baseline | VALIDATION REQUIRED | Source baseline unchanged | Compare restored DB to approved baseline; do not regenerate IDs | Academic Taxonomy + DB Operations |

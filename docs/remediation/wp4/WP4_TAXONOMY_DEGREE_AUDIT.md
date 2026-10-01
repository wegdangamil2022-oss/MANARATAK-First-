# WP4 Taxonomy and DegreeLevel Audit

| Area | Before | After | Remaining limitation |
|---|---|---|---|
| Phase 8 to Phase 10 | Taxonomy Admin Router queried `majorClassificationMapping` directly | No Phase 8 source imports or persistence reads from Majors | Reverse display awaits a Phase 10-owned query contract |
| Reverse mapped-majors display | Phase 8 owned a Major persistence query | Phase 10 Major repository owns a read-only taxonomy reverse lookup consumed through Application | Runtime DB result verification pending |

## Reverse Major Lookup Closure (2026-08-14)

- `IMajorRepository.listByTaxonomyNode` is the Phase 10-owned read contract.
- `PrismaMajorRepository` reads `MajorClassificationMapping` with its Major/Profile display owners.
- `AdminMajorUseCases` exposes the query to the Admin API boundary.
- The Taxonomy Admin endpoint now returns mapped majors and no longer reports `501 NOT_CONFIGURED`.
- Application and router tests cover delegation and response shape. No schema or database mutation was required.
| Taxonomy mutation boundary | Router queried Prisma for edge then called a use case | Router delegates lookup and deletion to `removeEdgeByNodes` | Runtime DB/audit verification pending |
| DegreeLevel mutation boundary | Router called repository directly | `DegreeLevelUseCases` owns list/get/update behavior | Runtime DB/audit verification pending |
| Degree SSoT | Canonical model existed but local Major union was independently declared | Seven-code canonical type is defined in Phase 8; Major union is a typed subset | Legacy strings remain compatibility inputs |
| Taxonomy ownership | Reverse display blurred ownership | Taxonomy owns nodes, edges, aliases, and standard mappings only | Major classification linkage remains Phase 10-owned |

## Representation Classification

- `DegreeLevel`, `DegreeLevelDto`, `DegreeLevelReference`, and `CanonicalDegreeLevelCode`: `CANONICAL_PHASE8`.
- `MajorLevel`: `SUBSET/MAPPING`, derived from `CanonicalDegreeLevelCode`.
- Major catalog kinds and parser display labels: `SUBSET/MAPPING` or input compatibility, not persistence identity.
- `MajorLevelProfile.level`, loose `degreeLevel` strings, and imported labels: `LEGACY`; database validation/backfill is deferred.
- No second persisted degree entity was found in Phases 8-10.

The ISCED-F baseline, taxonomy IDs, DegreeLevel IDs, canonical codes, and live mappings were not changed.

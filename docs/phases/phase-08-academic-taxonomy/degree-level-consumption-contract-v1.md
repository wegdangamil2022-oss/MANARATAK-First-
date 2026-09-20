# DegreeLevel Consumption Contract v1

## Canonical Identity

Phase 8 `DegreeLevel` is the single source of truth for academic degree levels. Relationships use `DegreeLevel.id`; integration and compatibility boundaries may resolve by `canonicalCode`.

The canonical codes are stable:

- `ASSOCIATE`
- `DIPLOMA`
- `BACHELOR`
- `MASTER`
- `FELLOWSHIP`
- `DOCTORATE`
- `CERTIFICATE`

Display names, imported labels, and local enums are not identity keys.

## Consumers

| Consumer | Contract | Compatibility status |
|---|---|---|
| Phase 9 International Tests | Persisted `degreeLevelId` relationship; canonical code may be accepted at an input boundary and resolved | Source model supports the relationship; existing data validation/backfill pending |
| Phase 10 Majors | `MajorLevelProfile.degreeLevelId`; `MajorLevel` is a typed UI/use-case subset of `CanonicalDegreeLevelCode` | Legacy imported labels are mapped before persistence; existing profiles require validation |
| Phase 11 Universities | Future academic-program contract uses DegreeLevel ID or canonical code resolver | Readiness only; no Phase 11 implementation in WP4 |

The compatibility rule is: parse a legacy label, map it to one of the seven canonical codes, resolve the canonical Phase 8 record, and persist its stable ID. A consumer must not create a new level merely because an input label is unknown.

This source contract does not authorize a migration or backfill.

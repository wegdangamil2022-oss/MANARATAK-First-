# Phase 10 Final Freeze and Handoff

Status: `SOURCE FREEZE PREPARED`

Final freeze remains pending Google Studio database reconciliation, build, tests, and runtime approval. This document must not be read as `PHASE 10 FROZEN`.

## Canonical Ownership

Phase 10 owns academic Major identity, aliases, source evidence, level-profile linkage, versions, academic classifications, academic relationships, and Major-specific academic requirements.

Phase 10 does not own canonical DegreeLevel or Academic Taxonomy identities. It also does not own CMS editorial workflow, careers/jobs, salaries, labor-market truth, or institution-specific program admission rules.

## Frozen Source Contracts

- Source IDs use the unchanged `MJR-*`, `MAS-*`, `DOC-*`, and `FEL-*` identities.
- `MajorLevel` is a compatibility subset of the Phase 8 canonical DegreeLevel codes, not a second SSoT.
- A `MajorLevelProfile` references the canonical Phase 8 `degreeLevelId`.
- Major classification stores linkage to Phase 8 taxonomy nodes; it cannot create taxonomy identities.
- `GAP_TAXONOMY_TRUE` remains a review gap and cannot be classified or published as complete.
- Canonical columns govern DTO and persistence behavior. Reserved `optionalFields` keys are removed at the repository boundary; persisted legacy collisions require database verification.
- Phase 6 hands generic import data to the Major owner. Parsing, matching, merge, promotion, and canonical persistence remain in the Major boundary.

## Relationship Invariants

- `MajorSource` requires a Major or MajorLevelProfile owner.
- `MajorClassificationMapping` requires an owner and a canonical `taxonomyNodeId`; duplicate semantic mappings are rejected within a write batch.
- `MajorRelationship` requires valid source and target owners; self-links and duplicate semantic tuples are rejected within a write batch.
- Fake canonical linkage is prohibited. Persisted endpoint existence, dangling rows, and cross-batch duplicates remain `DATABASE_VERIFICATION_REQUIRED`.

## Publication Readiness

The central Publication Readiness engine and `MajorPublicationReadinessPolicy` are the only publication gate. A Major cannot be published without the required lifecycle state, complete canonical identity, canonical DegreeLevel, required taxonomy linkage, source identity, and resolution of critical mappings.

Draft and review states may preserve incomplete source material. They do not imply publication readiness.

## Phase 11 Consumption Contract

The source contract is `packages/domain/src/majors/Phase11MajorConsumptionContract.ts`.

```text
AcademicProgram
  -> MajorId
  -> DegreeLevelId
```

Phase 11 must reference existing canonical IDs. It must not regenerate Major IDs, match solely by program name, automatically create a Major for an unmatched program, or copy Major taxonomy into a new Program-owned SSoT. Taxonomy may be derived through the referenced Major when needed. Unresolved programs remain explicitly `MAJOR_REVIEW_REQUIRED`, `AMBIGUOUS`, or `UNMAPPED`.

No University schema or University import is created or authorized by this contract.

## Catalog to Database Freeze Gate

`SOURCE IDENTITIES VERIFIED = 3,402`

`DATABASE CANONICAL LINKAGE = DATABASE_VERIFICATION_REQUIRED`

Final approval requires exactly one reviewed linkage result for every source identity: canonical linkage or an explicit reviewed gap. Duplicate linkage, missing identity, orphan profile, dangling mapping, regenerated identity, and lost relation counts must all be zero. Before/after counters, backup, referential validation, rollback evidence, build output, and executable tests are mandatory.

## Allowed Future Changes

After source-freeze preparation, Major identity, relationship semantics, DegreeLevel consumption, taxonomy linkage, and the Phase 11 contract may change only for a confirmed defect or an approved Architecture Review Board change. Genuine defect fixes remain allowed and must retain migration and compatibility evidence where applicable.

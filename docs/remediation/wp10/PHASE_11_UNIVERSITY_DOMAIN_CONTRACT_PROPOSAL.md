# Phase 11 University Domain Contract Proposal

Status: `READINESS_PREPARED / NOT_IMPORTED / PENDING_GOOGLE_STUDIO`

This proposal defines source contracts only. It does not finalize a Prisma schema, authorize migrations, or activate University import.

## Identity

`SourceReferenceId` is the stable source identity and preserves the existing `INS-*` value exactly. A separate internal `UniversityId` may be assigned by approved persistence, with a unique immutable association to the source reference. Slugs and names are display/search attributes, never canonical matching keys. Existing source references are never renumbered or regenerated.

## University Reference

The source contract is `packages/domain/src/universities/UniversityReadinessContracts.ts`. It includes internal identity, `SourceReferenceId`, official/local names, Phase 7 Country/Region/City reference IDs, institution type and ownership, identifiers/aliases, lifecycle, and provenance. Country, region, and city names/codes are compatibility/display evidence only.

## Institutional Hierarchy and Ownership

```text
University
  -> Campus
    -> Faculty / School / College
      -> Department
        -> AcademicProgram
```

Each child has its own ID and the owning University ID. Campus owns physical location and canonical geographic references. Faculty, School, College, and Department are institution-owned organizational units; none creates or owns Phase 8 taxonomy identities.

## Academic Program

An AcademicProgram is an institution-specific offering owned by its University and optionally an organizational unit. A canonically mapped program references both `MajorId` from Phase 10 and `DegreeLevelId` from Phase 8. Program taxonomy is derived through Major. A separate Program taxonomy classification requires a future approved architecture decision.

Program names do not create Major identity. Unresolved mapping remains `MAJOR_REVIEW_REQUIRED` or `UNMAPPED`; silent fuzzy remapping and fake Major creation are prohibited.

## Admission Requirements

Phase 11 owns the fact that a Program accepts or requires a test. `ProgramAdmissionRequirement` references Phase 9 `InternationalTestId` and may record variant/version, overall and section thresholds, validity/restriction metadata, and lifecycle. It never copies or creates the Test definition.

## Import Ownership

```text
Explicit Input Selection
  -> Phase 6 UniversalImportHandoff
  -> Phase 11 University Application Adapter
  -> Domain validation and matching
  -> Dry Run / Preview
  -> Explicit approval
  -> Commit (blocked until external gates close)
```

Phase 6 owns generic source/artifact/execution mechanics. Phase 11 owns matching, duplicate review, canonical resolution, create/update decisions, and conflict states. Direct Prisma/SQL/ad-hoc import and automatic root-folder watching are prohibited.

Supported future source selections are uploaded file, explicitly selected project-root file, API/provider source, and manual structured payload. Every source uses the same handoff boundary and identifies `Import Type = UNIVERSITY` and `Target Domain = PHASE_11_UNIVERSITY`.

## Duplicate and Dry-Run Rules

Stable `SourceReferenceId` is the primary match. Official identifiers, aliases, official website, and government registry identity are review evidence. Name alone cannot close a duplicate decision; ambiguity becomes `REVIEW_REQUIRED`.

Dry Run returns `NEW`, `MATCHED`, `UPDATE`, `NO_CHANGE`, `CONFLICT`, `REVIEW_REQUIRED`, or `REJECTED`, plus source identity, proposed internal ID, reference resolutions, Program/Major state, validation issues, provenance, and `databaseWrites = 0`.

Missing City, Major, DegreeLevel, Test, or taxonomy never creates a placeholder. It produces `UNRESOLVED_REFERENCE`, `REFERENCE_REVIEW_REQUIRED`, or `MAJOR_REVIEW_REQUIRED`.

## Current File Compatibility

The six external continent workbooks were inspected read-only and contain 10,723 Phase 1 rows under one consistent 12-column layout. Reference ID, names, Country/ISO3, City, institution type/ownership, status, website, and source map without changing identity: canonical relationships use resolved IDs while original values remain provenance/compatibility evidence. Source-level compatibility is `SOURCE_VALIDATED`; Phase 7 resolution, DB matching, and write losslessness remain `PENDING_GOOGLE_STUDIO`. See `PHASE_1_UNIVERSITY_SOURCE_DRY_RUN_REPORT.md`.

## Compatibility

- Phase 6: `UniversalImportHandoff`, version-compatible additive metadata only.
- Phase 7: canonical Country/Region/City IDs.
- Phase 8: canonical DegreeLevel ID; taxonomy is consumed through Major unless separately approved.
- Phase 9: canonical InternationalTest ID for admission requirements.
- Phase 10: canonical Major ID under the WP9 handoff contract.

Breaking identity or relationship changes require a confirmed defect or approved ARB decision and migration/rollback evidence.

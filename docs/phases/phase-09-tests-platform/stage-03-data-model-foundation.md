# Phase 9 Remediation - Stage 3: Full Data Model Foundation

## Status

Implemented as a schema and domain-contract foundation.

This stage completes the approved Phase 9 data-model expansion that was previously summarized too narrowly. The platform now has explicit structures for test families, test versions, delivery modes, sessions, centers, requirements, policies, cross-phase relationships, score equivalencies, and reviewable content blocks.

## Scope

This stage adds the model foundation only. It intentionally does not migrate the 49 Markdown files into the new structures yet, and it does not rebuild the import center or admin detail page. Those remain later stages in the approved plan.

## Prisma Models Added

- `InternationalTestFamily`
- `InternationalTestProvider`
- `InternationalTestVersion`
- `InternationalTestDeliveryModeProfile`
- `InternationalTestVersionScoreScale`
- `InternationalTestSession`
- `InternationalTestCenter`
- `InternationalTestRequirement`
- `InternationalTestPolicy`
- `InternationalTestCountryRelationship`
- `InternationalTestLanguageRelationship`
- `InternationalTestAcademicTaxonomyRelationship`
- `InternationalTestDegreeRelationship`
- `InternationalTestEquivalencyMapping`
- `InternationalTestContentBlock`

## Existing Model Expanded

`InternationalTest` now supports optional links to:

- family
- provider
- current published version
- versions
- sessions
- centers
- requirements
- policies
- country relationships
- language relationships
- academic taxonomy relationships
- degree relationships
- equivalency mappings

The existing fields and child tables were kept in place for backward compatibility.

## Domain Contracts Added

The Phase 9 domain contracts now include DTOs for:

- test families
- providers
- test versions
- delivery-mode profiles
- version score scales
- sessions
- centers
- requirements
- policies
- reference relationships
- academic taxonomy relationships
- equivalency mappings
- content blocks

The existing `InternationalTestDto` and `UpsertInternationalTestDto` now expose optional fields for the new model surfaces.

## Why This Is A Foundation, Not Migration

The current 49-test seed remains a baseline catalog. The new versioned schema is ready, but the detailed Markdown sources have not yet been parsed into:

- version records
- source hashes
- change diffs
- normalized sessions
- normalized centers
- normalized score scales
- normalized requirements
- normalized policies
- content blocks

That work belongs to the import/versioning and migration stages.

## Compatibility Notes

- New foreign keys are optional so existing demo seed behavior remains compatible.
- Existing `InternationalTestVariant`, `InternationalTestSection`, `InternationalTestScoreScale`, `InternationalTestFeeMetadata`, `InternationalTestAvailability`, and `InternationalTestEvidence` remain available.
- Existing API and repository paths are not forced to load the new graph yet.

## Remaining Work

Next stages must:

1. Add repository/use-case methods for version creation, source-file linking, and diff review.
2. Connect import records to `InternationalTestVersion`.
3. Preserve unknown Markdown sections as `InternationalTestContentBlock` with `NEEDS_REVIEW`.
4. Migrate the current 49 test records into versioned baseline records.
5. Rebuild the admin UI around the new model.

## Files Changed

- `packages/infrastructure/prisma/schema.prisma`
- `packages/domain/src/tests-platform/contracts.ts`
- `scripts/seed-demo.ts`


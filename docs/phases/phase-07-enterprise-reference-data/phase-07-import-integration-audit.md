# Phase 07 P7G: Reference Data Import Integration Audit

## 1. Files Inspected
- `/docs/phases/phase-06-import-foundation/phase-06-domain-handoff-match-merge.md`
- `/packages/domain/src/import-foundation/value-objects/DomainHandoffRequest.ts`
- `/packages/domain/src/import-foundation/value-objects/MergeProposal.ts`
- `/packages/domain/src/import-foundation/enums/ImportTargetDomain.ts`
- `/packages/domain/src/reference-data/seed/ReferenceDataSeedTypes.ts`

## 2. Existing Phase 06 Contracts Relevant to Handoff
Phase 06 has established strict unidirectional boundary contracts. The relevant value objects for handing off data to a domain include:
- `DomainHandoffRequest`: Contains the `targetDomain`, `normalizedPayload`, and an array of `ExtractionCandidate`s with evidence. 
- `MergeProposal`: A structured proposal containing `matchCandidate`, `fieldDiffs`, `completenessReport`, and a `requiresReview` flag.

Both of these contracts explicitly prohibit direct domain writes (`canWriteToDomain(): false`, `canAutoPublish(): false`), adhering to Phase 06 constraints. Note: `ImportTargetDomain` enum does not currently have a `REFERENCE_DATA` value, meaning `Generic` might be used or it may need to be added in the future.

## 3. Phase 07 Readiness Status
Phase 07 is fully ready to evaluate incoming records. The `ReferenceDataValidationService` enforces all data rules and completeness requirements. The `ReferenceDataSeedPlanner` can group these evaluated records into a `ReferenceDataSeedBatch`.
- **Entity Types**: `COUNTRY`, `CURRENCY`, `LANGUAGE`, `CITY`.
- **Deterministic Keys**: `iso2Code` (Country), `isoCode` (Currency/Language), `countryIso2Code:name` (City).
- **Validation**: Incoming staged records can be mapped to reference data DTOs and validated, determining if they can transition to `READY_TO_APPLY`.

## 4. Unsafe Write Paths
There are currently no unsafe direct import-to-domain write paths. Phase 06 is fully isolated and does not use Prisma repositories directly, ensuring that Phase 07 retains full authority over what gets persisted.

## 5. Recommended P7G Implementation Option
**Option A** is the recommended path.
We should create an application service (e.g., `ReferenceDataImportHandoffService`) that accepts Phase 06 staged payloads/handoff requests and converts them into a Phase 07 `ReferenceDataSeedBatch` using the `ReferenceDataSeedPlanner`. This batch will be held in `VALIDATED` or `READY_TO_APPLY` status for final review, ensuring zero automatic database writes and preserving the advisory nature of Phase 06.

## 6. Allowed Files for Next Slice
- `packages/application/src/reference-data/services/ReferenceDataImportHandoffService.ts`
- `packages/application/tests/reference-data/ReferenceDataImportHandoffService.spec.ts`
- `packages/application/src/reference-data/services/index.ts`
- `packages/domain/src/index.ts` (for export updates if needed)
- `packages/application/src/index.ts` (for export updates if needed)

## 7. Forbidden Files for Next Slice
- `packages/infrastructure/**`
- `apps/api/**`
- `apps/admin/**`
- `apps/web/**`
- Phase 06 `import-foundation` files
- `package.json`

## Final Classification
PHASE_07_P7G_REFERENCE_DATA_IMPORT_INTEGRATION_AUDIT_COMPLETE_NO_CODE_CHANGES

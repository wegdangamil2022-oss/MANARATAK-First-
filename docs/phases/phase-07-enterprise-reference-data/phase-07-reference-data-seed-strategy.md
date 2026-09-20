# Phase 07 Reference Data Seed Strategy

## 1. Seed Source Principles

The reference data seeding mechanism follows strict enterprise standards to ensure data integrity, predictability, and compliance:

- **ISO-backed Standards**: Official standards (such as ISO-3166 for Countries, ISO-4217 for Currencies, ISO-639 / BCP-47 for Languages) are preferred for all foundational reference data records.
- **Deterministic & Reviewable**: Seed source datasets must be static, version-controlled, fully deterministic, and human-reviewable.
- **No Unvetted Crawling or Generative AI Facts**: Web crawling, scraping, or AI-generated facts are strictly prohibited for seeding foundational reference data.
- **Phase 06 Import Pipeline Boundary**: Seed batches must be ingested and staged through the Phase 06 Import Foundation as staged candidates. They must pass validation before being promoted to the active domain repository.

## 2. Seed Categories

Initial reference data seeds encompass four key categories:
1. **Countries**: ISO2, ISO3, official names, calling codes, flags, regions.
2. **Currencies**: ISO code, numeric code, name, symbol, minor units.
3. **Languages**: ISO code (or BCP-47 tag), name, native name, direction (LTR/RTL).
4. **Cities**: Country ISO2 code, city name, region, timezone, geographic coordinates.

## 3. Seed Lifecycle States

Every seed batch transitions through a explicit lifecycle:

- `DRAFT`: Initial state when a seed batch is created with input records.
- `VALIDATED`: The seed batch has been processed by the `ReferenceDataValidationService`, with individual `validationReport`s attached to all records.
- `READY_TO_APPLY`: All records in the batch are valid (`canBeImported === true`), and the batch is approved for database persistence/promotion.
- `APPLIED`: The batch has been successfully applied to the reference data store by an authorized process.
- `REJECTED`: The batch contained unresolvable validation errors or was manually rejected by an administrator.

## 4. Validation Before Apply Rules

- Every seed record must pass validation through `IReferenceDataValidationService` (`ReferenceDataValidationService`).
- A record can only be approved if `canBeImported` is `true` (meaning `isComplete` is true and no `ERROR` severity issues exist).
- Missing or invalid deterministic keys (`iso2Code` for countries, `isoCode` for currencies/languages, `countryIso2Code:name` for cities) immediately block the batch from becoming `READY_TO_APPLY`.
- `WARNING` and `INFO` issues (such as missing optional region or native name) do not block application.

## 5. Audit Expectations

Every seed batch retains audit metadata for full traceability:
- `seedBatchId`: Unique identifier for the seed batch.
- `sourceName`: Identifier of the source dataset (e.g., `ISO-3166-1-Official`).
- `sourceVersion`: Version or snapshot date of the source dataset (e.g., `2026.1`).
- `status`: Current `ReferenceDataSeedStatus`.
- `createdAt`: Timestamp when batch was created.
- `validatedAt`: Timestamp when validation was performed.
- `appliedAt`: Timestamp when batch was applied (when executed).
- `appliedBy`: Identity or process that executed the application.
- `validationSummary`: Summary containing `totalRecords`, `validRecords`, and `invalidRecords`.

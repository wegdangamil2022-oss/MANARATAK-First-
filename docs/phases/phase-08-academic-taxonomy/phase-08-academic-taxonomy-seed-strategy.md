# Phase 08 Academic Taxonomy - Seed Strategy Document

## 1. Seed Source Principles
- **Official Standards Focus**: Taxonomy seeds must be derived from official, stable, versioned academic classification standards (e.g., ISCED-F 2013, CIP 2020, or verified national academic frameworks).
- **No AI-Generated Facts**: Taxonomy structure, codes, and canonical names must originate from authoritative classification sources, never generated or invented by LLMs/AI models.
- **No Scraped or Unverified Data**: Data scraped from unverified websites or informal sources is strictly forbidden in canonical seed batches.
- **Deterministic & Auditable**: Seed sources must be deterministic, reviewable, versioned, and fully auditable with source references and batch identifiers.
- **Strict Separation from Phase 10 Majors**: Taxonomy seeds only define broad taxonomy fields, disciplines, program areas, and mappings. They **do not** create university-specific degree programs or Phase 10 Major entities.

## 2. Seed Categories
Seed batches can contain records across four distinct taxonomy categories:
1. **Taxonomy Nodes** (`NODE`): Field, Discipline, Program Area, or Specialization nodes.
2. **Hierarchy Edges** (`EDGE`): Parent-child structural relationships establishing the taxonomy DAG (Directed Acyclic Graph).
3. **Aliases & Synonyms** (`ALIAS`): Localized or multi-language labels, search keywords, and synonyms tied to taxonomy nodes.
4. **Cross-Standard Mappings** (`MAPPING`): Crosswalk equivalences between standard classification systems (e.g., ISCED-F to CIP).

## 3. Seed Lifecycle
Seed batches progress through a strict deterministic state machine:
- **`DRAFT`**: Initial creation of the seed batch with source metadata and candidate records.
- **`VALIDATED`**: The batch has passed comprehensive node validation, completeness checks, DAG cycle checks, alias conflict detection, and mapping validation.
- **`READY_TO_APPLY`**: Manually or programmatically reviewed and approved for ingestion into persistent taxonomy storage.
- **`APPLIED`**: Successfully applied to the persistent repository, with timestamps and actor tracking recorded.
- **`REJECTED`**: Rejected due to validation errors, conflicts, or administrative decision.

## 4. Validation Before Apply
Before any batch transitions to `READY_TO_APPLY` or `APPLIED`, every record must be validated:
- **Node Validation**: Every `NODE` record must pass `AcademicTaxonomyValidationService.validateNode` (valid nodeType, non-empty canonicalCode and canonicalName, valid status and standardType).
- **Edge / DAG Validation**: Every `EDGE` record must pass `validateEdge` (valid parent/child existence, self-parenting check, duplicate edge check, and strict cycle detection).
- **Alias Validation**: Every `ALIAS` record must pass `validateAlias` (non-empty alias string, normalization, cross-node conflict check).
- **Mapping Validation**: Every `MAPPING` record must pass `validateMapping` (valid source/target standards, valid strength, non-self mapping, valid confidence 0..1).
- **Forbidden Metadata**:
  - **No Phase 10 Major Fields**: Keys like `tuition`, `salary`, `careerOutcomes`, `universityId`, `countryRanking`, `featuredMajor` are rejected.
  - **No Raw Phase 06 Evidence**: Raw import evidence keys like `evidenceSnippet`, `confidenceScore`, `validationResults`, `sourceText`, `rawPayload` must not be injected into canonical taxonomy nodes.

## 5. Phase 06 Import Boundary
- **Staging & Extraction**: Phase 06 Import Foundation handles file ingestion, text extraction, raw staging, and candidate record proposal.
- **Taxonomy Ownership**: Phase 08 Academic Taxonomy owns taxonomy validation, node completeness, deterministic key calculation (`AcademicTaxonomyDeterministicKey`), DAG cycle checks, alias conflict detection, mapping crosswalks, and the final batch apply decision.
- **Strict Boundary**: Phase 06 is forbidden from directly inserting records into canonical Phase 08 taxonomy tables (`AcademicTaxonomyNode`, `AcademicTaxonomyEdge`, `AcademicTaxonomyAlias`, `AcademicStandardMapping`). All seed data must go through Phase 08 batch validation and seed contracts.

## 6. Audit Metadata
Every seed batch must record complete audit metadata:
- `seedBatchId`: Unique identifier for the seed batch.
- `sourceName`: Name of the standard classification source (e.g., "UNESCO ISCED-F 2013").
- `sourceVersion`: Version string of the standard source (e.g., "2013.1").
- `sourceUrl`: Optional URL pointing to official source documentation or dataset.
- `status`: Current lifecycle status (`DRAFT`, `VALIDATED`, `READY_TO_APPLY`, `APPLIED`, `REJECTED`).
- `createdAt`: Timestamp when the seed batch was constructed.
- `validatedAt`: Optional timestamp when validation was last run.
- `appliedAt`: Optional timestamp when the batch was successfully applied to repository storage.
- `appliedBy`: Optional user ID or agent system identifier that executed the apply operation.
- `validationSummary`: Structured summary containing total, valid, invalid, and category-level record counts (`nodeRecords`, `edgeRecords`, `aliasRecords`, `mappingRecords`).

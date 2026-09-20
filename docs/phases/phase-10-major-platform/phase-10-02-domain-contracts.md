> **Note:** This phase references the [Enterprise Shared Contracts Specification](../../architecture/shared-contracts/03-enterprise-shared-contracts-specification.md) as the canonical architectural source for shared foundation contracts.

# MANARATAK 2.0: Phase 10 Major Platform Enterprise Domain

> **Note:** This phase references the [Enterprise Lifecycle Framework Specification](../../architecture/lifecycle-framework/03-enterprise-lifecycle-framework-specification.md) as the canonical architectural source for all state, status, and lifecycle governance.

## Part B — Domain Contracts

### 10.6.B Major Standards Contracts

**Architectural Commentary**
This section explicitly separates the intellectual owner of the major curriculum criteria (Standard) from the execution vendor (Provider). Both entities natively manage their own organizational identity tracking (per ADR-027).

```typescript
/**
 * Governs the architectural definition of an academic major standard.
 * Standard = The intellectual owner or creator of the academic criteria (e.g., ISCED, CIP).
 */
export interface IMajorStandard extends IReferenceEntity {
  /**
   * Defines the architectural reference to the governing body owning this standard.
   * Resolved natively within this bounded context (per ADR-027).
   */
  governingBodyReferenceId: string;
}

/**
 * Governs the authoritative body operationalizing the Major, natively managed.
 * Provider = The operational vendor/entity formally recognized for standard administration.
 */
export interface IMajorProvider extends IReferenceEntity {
  /**
   * Defines the architectural reference to the native provider.
   */
  providerReferenceId: string;
}
```

### 10.7.B Major Taxonomy Contracts

**Architectural Commentary**
These contracts define the hierarchical classification boundaries of the major domain. They conform strictly to the Phase 7 Generic Hierarchy Foundation, establishing architectural alignment without replicating any Directed Acyclic Graph (DAG) logic.

```typescript
/**
 * Defines the architectural contract for major taxonomy nodes within the enterprise hierarchy.
 * Hierarchical properties (Path, Depth, Parent) are strictly inherited.
 */
export interface IMajorHierarchyNode extends IHierarchyNode<IMajorTaxonomyEntity> {
  // Pure architectural contract boundary. No redundant properties shall be defined here.
}
```

### 10.8.B Major Classification Contracts

**Architectural Commentary**
Classification contracts define orthogonal, non-hierarchical categorization tags (e.g., STEM, Humanities) mapping to canonical majors independently of the primary taxonomy tree.

```typescript
/**
 * Governs the independent architectural classification tag for a major.
 */
export interface IMajorClassificationEntity extends IReferenceEntity {
  // Identity inherited canonically.
}
```

### 10.9.B Major Entity Contracts

#### 10.9.B.1 Entity Contracts

**Architectural Commentary**
This section establishes the core architectural domain entities for the Major Platform. It strictly enforces the boundary between Identity Entities (which inherit canonical identity) and Value Objects (which possess no independent identity).

```typescript
/**
 * Governs the architectural representation of an academic major taxonomy classification entity.
 */
export interface IMajorTaxonomyEntity extends IReferenceEntity {}

/**
 * Governs the canonical definition of an academic major. (Single Source of Truth).
 */
export interface IMajorEntity extends IReferenceEntity {}

/**
 * Governs the specific iteration of a Major that defines temporal validity and structural revisions.
 */
export interface IMajorVersionEntity extends IReferenceEntity {
  /**
   * Defines the reference to the parent major canonical entity.
   */
  majorReferenceId: string;
}

/**
 * Governs the structural prerequisites associated with a Major Version.
 * STRICT ARCHITECTURAL ISOLATION: This governs structural rules only (e.g., prior degree levels).
 * It MUST NOT contain any university admission processing rules.
 */
export interface IMajorRequirementEntity extends IReferenceEntity {
  majorVersionReferenceId: string;
}

/**
 * Governs the methodology of delivery (e.g., On-Campus, Online, Hybrid).
 * Defined as a local canonical entity exclusively owned by Phase 10.
 */
export interface IDeliveryFormat extends IReferenceEntity {
  formatCode: string;
}

/**
 * Governs the temporal span required to complete the major.
 * STRICT VALUE OBJECT: Does not possess canonical identity.
 */
export interface IStudyDuration {
  minimumMonths: number;
  maximumMonths: number;
}

/**
 * Governs approved alternative institutional nomenclatures for a canonical major.
 */
export interface IMajorAlias extends IReferenceEntity {
  majorReferenceId: string;
}

/**
 * Governs search-friendly semantic equivalents for resolution engines.
 */
export interface IMajorSynonym extends IReferenceEntity {
  majorReferenceId: string;
}
```

#### 10.9.B.2 Repository Contracts

**Architectural Commentary**
These contracts define the exclusive read and write boundaries. They extend enterprise repository foundations without exposing underlying persistence mechanisms. They utilize strict asynchronous signatures and materialized collections.

```typescript
/**
 * Defines the architectural interaction boundaries for generic major entities.
 * Inherits structural CRUD operations from Phase 7 Foundation.
 */
export interface IMajorRepository<T extends IReferenceEntity> extends IReferenceRepository<T> {
  /**
   * Defines the contract for canonical retrieval by public-facing enterprise identifier.
   */
  getByPublicIdAsync(publicId: string, cancellationToken?: any): Promise<T>;

  /**
   * Defines the contract for materialized retrieval of all active major entities.
   */
  getAllActiveAsync(cancellationToken?: any): Promise<readonly T[]>;
}

/**
 * Defines the architectural interaction boundaries explicitly for major taxonomy entities.
 */
export interface IMajorTaxonomyRepository extends IMajorRepository<IMajorTaxonomyEntity> {
  // Inherits base operational boundaries seamlessly.
}
```

### 10.10.B Major Relationship Contracts

**Architectural Commentary**
This section defines the internal structural linkages. External domains (like Universities) linking upward to Majors MUST own their relationships externally. Phase 10 exclusively owns these downward mappings.

```typescript
/**
 * Governs the downward architectural relationship associating a Major with a Canonical Country.
 */
export interface IMajorCountryRelationship extends IReferenceEntity {
  majorReferenceId: string;
  countryReferenceId: string;
}

/**
 * Governs the downward architectural relationship associating a Major with a Canonical Language.
 */
export interface IMajorLanguageRelationship extends IReferenceEntity {
  majorReferenceId: string;
  languageReferenceId: string;
}

/**
 * Governs the downward architectural relationship associating a Major with an Academic Taxonomy (Phase 8).
 */
export interface IMajorAcademicTaxonomyRelationship extends IReferenceEntity {
  majorReferenceId: string;
  academicTaxonomyReferenceId: string;
}

/**
 * Governs the downward architectural relationship associating a Major with a Canonical Degree Level (Phase 8).
 */
export interface IMajorDegreeLevelRelationship extends IReferenceEntity {
  majorReferenceId: string;
  degreeLevelReferenceId: string;
}
```

### 10.11.B Major Resolution Contracts

#### 10.11.B.1 Resolution Contracts

**Architectural Commentary**
These marker contracts define identity resolution capabilities for Alias and Synonym mapping without dictating behavioral implementation.

```typescript
/**
 * Defines the architectural boundary for resolving canonical major entities across the enterprise.
 * Behavioral execution semantics are strictly deferred to Part C.
 */
export interface IMajorReferenceResolver {
  // Pure marker boundary for resolution capability.
}
```

#### 10.11.B.2 Specification Contracts

```typescript
/**
 * Governs the architectural boundary for constraint evaluation against major reference entities.
 */
export interface IMajorSpecification<T extends IReferenceEntity> {
  // Pure marker contract. Verification behavior is strictly deferred.
}
```

### 10.12.B Cross-Major Mapping Contracts

**Architectural Commentary**
Governs equivalencies and translations between disparate major frameworks, strictly subjected to the approved enterprise governance lifecycle.

```typescript
/**
 * Governs the canonical reference linking two disparate major definitions.
 */
export interface IMajorEquivalencyMapping extends IReferenceEntity {
  /**
   * Defines the reference to the source major entity.
   */
  sourceMajorReferenceId: string;

  /**
   * Defines the reference to the target major entity.
   */
  targetMajorReferenceId: string;

  /**
   * Defines the architectural governance status of this mapping.
   */
  status: MappingStatus;
}
```

### 10.13.B Major Import Specification Contracts

**Architectural Commentary**
Defines the strict interfaces governing the deterministic ingestion, deduplication, and enrichment of academic major data from external sources, strictly mapping against the Phase 10 import rules.

```typescript
/**
 * Defines the mandatory fields that must be present for any imported major record to be considered structurally valid.
 */
export interface IMajorImportRequiredFields {
  canonicalMajorName: string;
  academicFieldOrDiscipline: string;
  degreeLevel: string;
  sourceClassificationSystem: string;
  officialSourceUrl: string;
}

/**
 * Defines the optional enrichment fields that can be selectively merged during deduplication.
 */
export interface IMajorImportOptionalFields {
  localizedNames?: Record<string, string>;
  aliases?: string[];
  synonyms?: string[];
  relatedSpecializations?: string[];
  equivalentMajorCodes?: string[];
  facultyOrCollege?: string;
  department?: string;
  typicalStudyDuration?: string;
  studyLanguage?: string[];
  coreSubjects?: string[];
  skillsGained?: string[];
  commonAdmissionRequirements?: string[];
  relatedMajors?: string[];
  sourceTrustLevel?: string;
  lastVerifiedAt?: string;
}

/**
 * Defines the architectural source provenance of an imported major.
 */
export interface IMajorImportSource {
  sourceId: string;
  sourceType: 'ISCED' | 'CIP' | 'University' | 'Authority' | 'Aggregator';
  sourceTrustLevel: string;
  retrievedAt: string;
}

/**
 * Defines the deterministic composite key used to detect duplicate major records during import.
 */
export interface IMajorCanonicalIdentityRule {
  canonicalMajorName: string;
  academicFieldOrDiscipline: string;
  degreeLevel: string;
  sourceClassificationSystem: string;
}

/**
 * Defines the deduplication rule for major imports.
 */
export interface IMajorDeduplicationRule {
  compositeKey: IMajorCanonicalIdentityRule;
  mergeStrategy: 'PreserveReviewed' | 'OverwriteIfEmpty';
}

/**
 * Defines the overarching completeness status of an imported record within the administrative lifecycle.
 */
export type IMajorImportCompletenessStatus = 
  | 'Imported'
  | 'Incomplete'
  | 'Complete'
  | 'NeedsReview'
  | 'ReadyToPublish'
  | 'Published'
  | 'Rejected'
  | 'Archived';

/**
 * The unified import record combining required fields, optional fields, source metadata, and lifecycle status.
 */
export interface IMajorImportRecord {
  importSource: IMajorImportSource;
  requiredFields: IMajorImportRequiredFields;
  optionalFields: IMajorImportOptionalFields;
  canonicalIdentity: IMajorCanonicalIdentityRule;
  completenessStatus: IMajorImportCompletenessStatus;
}

/**
 * Defines the policy for AI or imported editorial content routing to the Phase 16 CMS.
 */
export interface IMajorEditorialDraftPolicy {
  allowAutoPublishing: false; // Always false for editorial content
  targetCmsDraftQueue: string;
  requireHumanReview: true;
}

/**
 * Defines the strict boundary ownership rules for majors import integration.
 */
export interface IMajorImportMatchMergeOwnership {
  // Pure marker representing domain-specific policy ownership.
}
```

#### 10.13.B.2 Import Match/Merge Ownership Contracts

To support incoming data from the Phase 06 Import Foundation without violating domain boundaries, this domain explicitly defines and owns the following lifecycle integration responsibilities:

- **Deterministic Match Key**: This domain defines and owns the majors platform deterministic match keys (such as composite keys of major name, degree level, and academic field) used to identify reference record overlaps.
- **Completeness Policy**: This domain defines and owns all validation rules and criteria determining when an academic major record is complete and eligible for operational activation.
- **Merge/Overwrite Policy**: This domain defines and owns the merge policies (such as source-authority hierarchies and mutable/immutable fields) that govern how incoming major updates merge with existing records.
- **Final Approval/Publish**: This domain owns final approval, manual major catalog review, and active publication lifecycle state transitions.
- **Phase 06 Role**: The Phase 06 Import Foundation is restricted to delivering raw extraction proposals, major field diffs, and associated evidence and confidence metrics. It is strictly prohibited from writing directly to majors platform tables.

### 10.14.B Integration Contracts

**Architectural Commentary**
This section defines the exclusive projection read-models and domain events. To support Event-Driven Architecture (EDA) without abstract leakage, all domain events encapsulate explicit Entity Reference IDs.

```typescript
/**
 * Defines the read-only architectural summary projection of an academic major.
 */
export interface IMajorSummaryProjection {
  majorReferenceId: string;
  canonicalName: string;
}

/**
 * Defines the read-only architectural projection of a major hierarchy node.
 */
export interface IMajorNodeProjection {
  nodeReferenceId: string;
  parentReferenceId: string | null;
}

/**
 * Governs the architectural contract for an event representing the creation of a major entity.
 */
export interface IMajorCreatedEvent extends IEnterpriseDomainEvent {
  majorReferenceId: string;
  canonicalName: string;
}

/**
 * Governs the architectural contract for an event representing a structural update to a major entity.
 */
export interface IMajorUpdatedEvent extends IEnterpriseDomainEvent {
  majorReferenceId: string;
}

/**
 * Governs the architectural contract for an event representing the publication of a major version.
 */
export interface IMajorVersionPublishedEvent extends IEnterpriseDomainEvent {
  majorVersionReferenceId: string;
  majorReferenceId: string;
}

/**
 * Governs the architectural contract for an event representing an alias or synonym resolution update.
 */
export interface IMajorResolutionUpdatedEvent extends IEnterpriseDomainEvent {
  majorReferenceId: string;
}
```

### 10.15.B Contracts Review

**Formal Architectural Confirmation**

The Enterprise Architecture Board formally confirms the following regarding the contents of this Phase 10, Part B document:

- Part B adheres strictly to the SSoT and Clean Architecture boundaries defined in Part A.
- Part B contains zero implementation details and no Prisma ORM leakage.
- Part B accurately defines `IStudyDuration` as a pure Value Object devoid of reference identity.
- No runtime behavioral methods or specifications have been implemented.
- Domain events are declared as interfaces encapsulating necessary canonical references to support the Event-Driven Integration (Search/Cache/AI) outlined in Part C.

---

### Navigation

- **Previous**: [Phase 10 — Enterprise Architecture Specification](phase-10-01-enterprise-architecture-specification.md)
- **Next**: [Phase 10 — Implementation Guide](phase-10-03-implementation-guide.md)

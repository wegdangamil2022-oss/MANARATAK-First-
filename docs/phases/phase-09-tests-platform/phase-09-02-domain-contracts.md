> **Note:** This phase references the [Enterprise Shared Contracts Specification](../../architecture/shared-contracts/03-enterprise-shared-contracts-specification.md) as the canonical architectural source for shared foundation contracts.

# MANARATAK 2.0: Phase9 PartB Domain Contracts

> **Note:** This phase references the [Enterprise Lifecycle Framework Specification](../../architecture/lifecycle-framework/03-enterprise-lifecycle-framework-specification.md) as the canonical architectural source for all state, status, and lifecycle governance.

## Part B — Domain Contracts

### 9.6.B Test Standards Contracts

**Architectural Commentary**
This section defines the architectural contracts governing the standards and issuing bodies associated with international tests. These contracts establish the canonical boundaries for organizational associations natively, managing B2B organizational relationships locally without a centralized organization platform.

```typescript
/**
 * Governs the architectural definition of an international test standard.
 * @remarks Standard = The intellectual owner/creator of the test criteria.
 */
export interface ITestStandard extends IReferenceEntity {
  /**
   * Defines the architectural reference to the governing body owning this standard.
   * Resolved natively within this bounded context (per ADR-027).
   */
  governingBodyReferenceId: string;
}
```

### 9.7.B Test Taxonomy Contracts

**Architectural Commentary**
These contracts define the hierarchical classification boundaries of the test domain. They conform strictly to the Generic Hierarchy & DAG Foundation, establishing architectural alignment without recreating structural logic.

```typescript
/**
 * Defines the architectural contract for test taxonomy nodes within the enterprise hierarchy.
 */
export interface ITestHierarchyNode extends IHierarchyNode<ITestTaxonomyEntity> {}
```

### 9.8.B Test Entity Contracts

#### 9.8.B.1 Entity Contracts

**Architectural Commentary**
This section establishes the core architectural domain entities for the International Tests platform. These interfaces enforce the structural shape of tests, versions, scoring, and delivery mechanisms, acting as the singular source of truth for the enterprise.

```typescript
/**
 * Governs the architectural representation of a test taxonomy classification entity.
 */
export interface ITestTaxonomyEntity extends IReferenceEntity {}

/**
 * Governs the canonical definition of an international examination.
 */
export interface ITestEntity extends IReferenceEntity {}

/**
 * Governs the specific iteration of a Test that governs temporal validity and structure.
 */
export interface ITestVersionEntity extends IReferenceEntity {
  /**
   * Defines the reference to the parent test canonical entity.
   */
  parentTestReferenceId: string;
}

/**
 * Governs the authoritative body owning the Test, relying on canonical native provider identity.
 * @remarks Provider = The operational vendor administering the test.
 */
export interface ITestProvider extends IReferenceEntity {
  /**
   * Defines the architectural reference to the native provider organization.
   */
  providerReferenceId: string;
}

/**
 * Governs the methodology of administration, mapped strictly to foundational reference data.
 */
export interface IDeliveryMode extends IReferenceEntity {
  /**
   * Defines the canonical code establishing the delivery mode.
   */
  modeCode: string;
}

/**
 * Governs the structural breakdown of a Test Version for granular grading and evaluation.
 */
export interface ITestSection extends IReferenceEntity {
  /**
   * Defines the architectural reference to the parent test version.
   */
  testVersionReferenceId: string;
}

/**
 * Governs the mandatory preconditions associated with a Test Version.
 */
export interface ITestRequirement extends IReferenceEntity {}

/**
 * Governs the structural period in which a Test Version is administered.
 */
export interface ITestSession extends IReferenceEntity {}

/**
 * Governs the physical or virtual location of administration, resolved via the Enterprise Reference Foundation.
 */
export interface ITestCenter extends IReferenceEntity {
  /**
   * Defines the architectural reference to the canonical location.
   */
  locationReferenceId: string;
}

/**
 * Governs the absolute bounds and numerical increments of grading.
 */
export interface IScoreScale extends IReferenceEntity {}

/**
 * Governs the categorical classification representing a specific score range.
 */
export interface IScoreBand extends IReferenceEntity {
  /**
   * Defines the architectural reference to the parent score scale.
   */
  scoreScaleReferenceId: string;
}

/**
 * Governs the temporal span during which a Test result remains officially recognized.
 */
export interface IValidityPeriod {}

/**
 * Governs the architectural rules appended to a Test Version.
 */
export interface ITestPolicy extends IReferenceEntity {}
```

#### 9.8.B.2 Repository Contracts

**Architectural Commentary**
These contracts define the exclusive read and write boundaries for the domain. They extend enterprise repository foundations without exposing underlying persistence technology or specific query mechanisms.

```typescript
/**
 * Governs the architectural interaction boundaries for generic test entities.
 */
export interface ITestRepository<T extends IReferenceEntity>
  extends IReferenceRepository<T>, IReferenceQueryRepository<T> {
  /**
   * Establishes the contract for retrieving the entity conforming to the architectural contract by its public-facing enterprise identifier.
   */
  getByPublicIdAsync(publicId: string): Promise<T | null>;
}

/**
 * Governs the architectural interaction boundaries explicitly for test taxonomy entities.
 */
export interface ITestTaxonomyRepository extends ITestRepository<ITestTaxonomyEntity> {}
```

### 9.9.B Test Relationship Contracts

#### 9.9.B.1 Relationship Entity Contracts

**Architectural Commentary**
This section explicitly defines the internal structural linkages of the enterprise domain. The enterprise domain SHALL exclusively own and govern these downward relationships. Relationship management MUST NOT exceed these explicitly defined linkages.

```typescript
/**
 * Governs the downward architectural relationship associating a Test with a canonical Country.
 */
export interface ITestCountryRelationship extends IReferenceEntity {
  /**
   * Defines the reference to the internal Test entity.
   */
  testReferenceId: string;

  /**
   * Defines the reference to the canonical Country defined by Phase 7.
   */
  countryReferenceId: string;
}

/**
 * Governs the downward architectural relationship associating a Test with a canonical Language.
 */
export interface ITestLanguageRelationship extends IReferenceEntity {
  /**
   * Defines the reference to the internal Test entity.
   */
  testReferenceId: string;

  /**
   * Defines the reference to the canonical Language defined by Phase 7.
   */
  languageReferenceId: string;
}

/**
 * Governs the downward architectural relationship associating a Test with a canonical Academic Taxonomy.
 */
export interface ITestAcademicTaxonomyRelationship extends IReferenceEntity {
  /**
   * Defines the reference to the internal Test entity.
   */
  testReferenceId: string;

  /**
   * Defines the reference to the canonical Academic Taxonomy defined by Phase 8.
   */
  academicTaxonomyReferenceId: string;
}

/**
 * Governs the downward architectural relationship associating a Test with a canonical Degree.
 */
export interface ITestDegreeRelationship extends IReferenceEntity {
  /**
   * Defines the reference to the internal Test entity.
   */
  testReferenceId: string;

  /**
   * Defines the reference to the canonical Degree defined by Phase 8.
   */
  degreeReferenceId: string;
}
```

### 9.10.B Test Resolution Contracts

#### 9.10.B.1 Resolution Contracts

**Architectural Commentary**
These contracts define the canonical identity resolution capabilities, establishing architectural boundaries for mapping aliases and external identities to foundational test entities.

```typescript
/**
 * Governs the architectural rules for resolving canonical test entities across the enterprise.
 */
export interface ITestReferenceResolver {}
```

#### 9.10.B.2 Specification Contracts

**Architectural Commentary**
Specification contracts govern the architectural evaluation of structural rules and preconditions without exposing operational querying mechanics.

```typescript
/**
 * Governs the architectural contract for evaluating constraints against test reference entities.
 */
export interface ITestSpecification<T extends IReferenceEntity> {
  isSatisfiedBy(entity: T): boolean;
}
```

### 9.11.B Cross-Test Mapping Contracts

**Architectural Commentary**
These contracts establish the architectural governance for defining equivalencies and score translations between disparate testing standards, strictly bounded by governed lifecycle constraints.

```typescript
/**
 * Governs the architectural depth and strictness of a test equivalency mapping.
 */
export enum EquivalencyLevel {
  /**
   * Defines an architectural alignment at the complete test level.
   */
  FullTest = 1,

  /**
   * Defines an architectural alignment strictly bounded to individual test sections.
   */
  SectionSpecific = 2,

  /**
   * Defines an architectural alignment mapped against categorical scoring bands.
   */
  ScoreBand = 3,
}

/**
 * Governs the canonical reference linking two disparate test standards.
 */
export interface ITestEquivalencyMapping extends IReferenceEntity {
  /**
   * Defines the reference to the source test standard entity.
   */
  sourceTestReferenceId: string;

  /**
   * Defines the reference to the target test standard entity.
   */
  targetTestReferenceId: string;

  /**
   * Defines the architectural governance status of this mapping.
   */
  status: MappingStatus;

  /**
   * Defines the architectural equivalency depth of this mapping.
   */
  level: EquivalencyLevel;
}
```

### 9.12.B Test Import Contracts

**Architectural Commentary**
These contracts define Phase 09-owned import structures for international test catalog ingestion. They describe domain schemas and governance states only; Phase 06 remains responsible for generic parsing, batching, retry, failed-row handling, and import history.

```typescript
export interface ITestImportRequiredFields {
  testName: string;
  testCategory: 'LanguageProficiency' | 'UndergraduateAdmission' | 'GraduateAdmission' | 'ProfessionalLicensing' | 'AcademicPlacement' | 'Other';
  providerName: string;
  officialRegistrationUrl: string;
  scoreScaleDefinition: string;
}

export interface ITestImportOptionalFields {
  localizedNames?: Record<string, string>;
  aliases?: readonly string[];
  testPurpose?: string;
  acceptedUseCases?: readonly string[];
  testFormat?: string;
  deliveryModes?: readonly string[];
  durationMinutes?: number | null;
  testSections?: readonly Record<string, unknown>[];
  scoreBands?: readonly Record<string, unknown>[];
  equivalencyMappings?: readonly Record<string, unknown>[];
  validityPeriodMonths?: number | null;
  registrationFee?: string | null;
  currencyCode?: string | null;
  priceRange?: string | null;
  lateFee?: string | null;
  reschedulingFee?: string | null;
  cancellationFee?: string | null;
  feeValidityWindow?: string | null;
  availableCountries?: readonly string[];
  testCenterReferences?: readonly string[];
  availableLanguages?: readonly string[];
  requiredIdentificationDocuments?: readonly string[];
  ageRules?: string | null;
  retakePolicy?: string | null;
  resultDeliveryTime?: string | null;
  officialPreparationUrls?: readonly string[];
  sampleMaterialUrls?: readonly string[];
  sampleMaterialAssetReferences?: readonly string[];
  preparationCourseReferences?: readonly string[];
  relatedServiceReferences?: readonly string[];
  sourceTrustLevel?: 'Official' | 'Partner' | 'TrustedAggregator' | 'UnverifiedAggregator';
}

export interface ITestCanonicalIdentityRule {
  canonicalTestName: string;
  providerName: string;
  testCategory: string;
  deliveryMode: string;
  scoreScaleDefinition: string;
  canonicalDeduplicationKey: string;
}

export type TestImportCompletenessStatus =
  | 'Imported'
  | 'Incomplete'
  | 'Complete'
  | 'NeedsReview'
  | 'ReadyToPublish'
  | 'Published'
  | 'Rejected'
  | 'Archived';

export interface ITestImportRecord {
  importRecordId: string;
  requiredFields: ITestImportRequiredFields;
  optionalFields?: ITestImportOptionalFields;
  canonicalIdentity: ITestCanonicalIdentityRule;
  completenessStatus: TestImportCompletenessStatus;
  officialSourceUrl: string;
  lastVerifiedAt?: Date | string | null;
}
```

#### 9.12.B.2 Import Match/Merge Ownership Contracts

To support incoming data from the Phase 06 Import Foundation without violating domain boundaries, this domain explicitly defines and owns the following lifecycle integration responsibilities:

- **Deterministic Match Key**: This domain defines and owns the international tests deterministic match keys (such as standard test code or unique registration aliases) used to identify reference record overlaps.
- **Completeness Policy**: This domain defines and owns all validation rules and criteria determining when a test standard record is complete and eligible for operational activation.
- **Merge/Overwrite Policy**: This domain defines and owns the merge policies (such as source-authority hierarchies and provider-specific field lockouts) that govern how incoming test updates merge with existing records.
- **Final Approval/Publish**: This domain owns final approval, manual test catalog review, and active publication lifecycle state transitions.
- **Phase 06 Role**: The Phase 06 Import Foundation is restricted to delivering raw extraction proposals, test field diffs, and associated evidence and confidence metrics. It is strictly prohibited from writing directly to international test tables.

### 9.13.B Integration Contracts

**Architectural Commentary**
This section defines the exclusive projection and domain event contracts that form the architectural integration boundary. These are purely read-only structural contracts and canonical state representations, maintaining strict architectural decoupling.

```typescript
/**
 * Governs the read-only architectural projection of a test hierarchy node for enterprise consumption.
 */
export interface ITestNodeProjection {
  /**
   * Defines the canonical identifier of the test node.
   */
  nodeReferenceId: string;

  /**
   * Defines the canonical nomenclature of the test node.
   */
  nomenclature: string;
}

/**
 * Governs the read-only architectural summary projection of an international test.
 */
export interface ITestSummaryProjection {
  /**
   * Defines the canonical identifier of the test.
   */
  testReferenceId: string;

  /**
   * Defines the canonical code of the test standard.
   */
  standardCode: string;
}

/**
 * Governs the read-only architectural projection describing a verified internal relationship.
 */
export interface ITestRelationshipProjection {
  /**
   * Defines the canonical identifier of the source test entity.
   */
  sourceEntityReferenceId: string;

  /**
   * Defines the canonical identifier of the target reference entity.
   */
  targetReferenceId: string;
}

/**
 * Governs the architectural contract for an enterprise event representing the creation of a test entity.
 */
export interface ITestCreatedEvent extends IEnterpriseDomainEvent {
  /**
   * Defines the canonical identifier of the test entity.
   */
  testReferenceId: string;

  /**
   * Defines the canonical nomenclature of the test.
   */
  nomenclature: string;
}

/**
 * Governs the architectural contract for an enterprise event representing a structural update to a test entity.
 */
export interface ITestUpdatedEvent extends IEnterpriseDomainEvent {
  /**
   * Defines the canonical identifier of the updated test entity.
   */
  testReferenceId: string;
}

/**
 * Governs the architectural contract for an enterprise event representing the publication of a test version.
 */
export interface ITestVersionPublishedEvent extends IEnterpriseDomainEvent {
  /**
   * Defines the canonical identifier of the published test version.
   */
  testVersionReferenceId: string;

  /**
   * Defines the canonical identifier of the parent test entity.
   */
  testReferenceId: string;
}
```

### 9.14.B Contracts Review

**Formal Architectural Confirmation**

The Enterprise Architecture Board formally confirms the following regarding the contents of this Phase 9, Part B document:

- Part B contains zero implementation details.
- Part B is entirely technology agnostic.
- Part C is solely responsible for technical realization and implementation.
- No runtime behaviour has been defined or implied.
- No infrastructure components have been defined.
- No operational services or managers have been defined.
- No repositories have been implemented; only architectural boundaries are specified.
- No business logic exists within this document.

---

### Status

- **Current Status:** BASELINED / SOURCE_COMPLETE — RUNTIME_EVIDENCE_PENDING

---

### Navigation

- **Previous**: [Phase 09 — Enterprise Architecture Specification](phase-09-01-enterprise-architecture-specification.md)
- **Next**: [Phase 09 — Implementation Guide](phase-09-03-implementation-guide.md)
> **Current remediation status (2026-08-12): `SOURCE_IMPLEMENTED_RUNTIME_PENDING`.**
> This document records a historical contract baseline. Operational, database, migration, build, and runtime claims are superseded by `docs/remediation/wp8/WP8_GOOGLE_STUDIO_CLOSURE_MASTER_REGISTER.md`; they are not evidence of Production readiness.

> **Note:** This phase references the [Enterprise Shared Contracts Specification](../../architecture/shared-contracts/03-enterprise-shared-contracts-specification.md) as the canonical architectural source for shared foundation contracts.

# MANARATAK 2.0: Phase 12 (Scholarships) Enterprise Domain

> **Note:** This phase references the [Enterprise Lifecycle Framework Specification](../../architecture/lifecycle-framework/03-enterprise-lifecycle-framework-specification.md) as the canonical architectural source for all state, status, and lifecycle governance.

## Part B — Enterprise Domain Contracts

### 12.B.1 Foundation Contracts

**Architectural Commentary**
The foundation contracts establish the core identity, metadata, and lifecycle of a scholarship offering. These interfaces ensure that scholarships are uniquely identifiable, versionable, and strictly governed throughout their enterprise lifecycle.

```typescript
export enum ScholarshipLifecycleState {
  Draft = 'Draft',
  Proposed = 'Proposed',
  Active = 'Active',
  Expired = 'Expired',
  Closed = 'Closed',
  Suspended = 'Suspended',
  Deprecated = 'Deprecated',
  Archived = 'Archived',
}

export enum ScholarshipApplicationMethod {
  Internal = 'Internal',
  External = 'External',
}

/**
 * Governs the absolute, immutable identity of a scholarship offering across the enterprise.
 */
export interface IScholarshipIdentity {
  /**
   * The globally unique enterprise identifier for the scholarship.
   */
  publicId: string;

  /**
   * The canonical, official name of the scholarship.
   */
  canonicalName: string;
}

/**
 * Defines the state machine transitions for a scholarship's lifecycle.
 */
export interface IScholarshipLifecycle extends Enterprise.Architecture.Shared.Contracts
  .ILifecycle<ScholarshipLifecycleState> {}

/**
 * Provides architectural versioning capabilities, allowing scholarship rules to evolve non-destructively.
 */
export interface IScholarshipVersion {
  /**
   * The integer sequence indicating the structural version.
   */
  versionNumber: number;

  /**
   * The date this version becomes architecturally active.
   */
  effectiveFrom: string;

  /**
   * The date this version ceases to be active (null if currently active).
   */
  effectiveUntil: string | null;
}

/**
 * Defines the searchable and categorical metadata for a scholarship.
 */
export interface IScholarshipMetadata {
  /**
   * Indicates if the scholarship is featured for platform promotion.
   */
  isFeatured: boolean;

  /**
   * The academic year the scholarship targets (e.g., "2026/2027").
   */
  academicYear: string;

  /**
   * The application method supported (e.g., Internal or External).
   */
  applicationMethod: ScholarshipApplicationMethod;

  /**
   * Controls the visibility of the scholarship independently of its lifecycle state.
   */
  statusVisibility: string;

  /**
   * Independent contextual keywords for enhanced discoverability.
   */
  readonly tags: string[];
}
```

### 12.B.2 Scholarship Entity Contracts

**Architectural Commentary**
These contracts define the root entities of the Scholarship domain. Following Clean Architecture principles, they inherit from Phase 7's `IReferenceEntity` to maintain a consistent enterprise footprint.

```typescript
/**
 * The canonical root entity representing a scholarship offering.
 */
export interface IScholarshipEntity
  extends
    IReferenceIdentity,
    IReferenceVersioning,
    IReferenceMetadata,
    IScholarshipIdentity,
    IScholarshipLifecycle {
  /**
   * Reference to the sponsor offering the scholarship.
   */
  sponsorReferenceId: string;

  /**
   * Reference to the canonical country of the scholarship (Phase 7). Nullable if global.
   */
  countryReferenceId: string | null;

  /**
   * Defines the type of funding (e.g., "Government", "University", "Foundation").
   */
  sourceTypeCode: string;

  /**
   * Defines the basis of the scholarship (e.g., "Merit-based", "Need-based").
   */
  meritTypeCode: string;
}

/**
 * Represents a specific, immutable structural iteration of a scholarship.
 */
export interface IScholarshipVersionEntity
  extends IReferenceEntity, IScholarshipVersion, IScholarshipMetadata {
  /**
   * The canonical scholarship this version belongs to.
   */
  scholarshipReferenceId: string;

  /**
   * The canonical degree level this version targets (Phase 8).
   */
  degreeLevelReferenceId: string;

  /**
   * The required study mode (e.g., "Online", "On-Campus").
   */
  studyModeCode: string;

  /**
   * Reference to the canonical language of instruction (Phase 7).
   */
  languageReferenceId: string;
}
```

### 12.B.3 Sponsor Contracts

**Architectural Commentary**
Sponsors are managed within the Scholarship context. If a sponsor is a recognized University, it strictly references the canonical Phase 11 University identity without duplicating its data. Governmental or private sponsors are modeled natively without depending on a centralized organization platform.

```typescript
/**
 * The entity providing the funding for the scholarship.
 */
export interface IScholarshipSponsorEntity extends IReferenceEntity {
  /**
   * The localized name of the sponsor within the scholarship context.
   */
  sponsorName: string;

  /**
   * An optional link to the canonical Organization entity managed natively by this domain to avoid duplication.
   */
  referenceEntityId: string | null;

  /**
   * An optional link to a specific University (Phase 11) if the sponsor is an academic institution.
   */
  universityReferenceId: string | null;

  /**
   * The type of sponsor (e.g., "Corporate", "NGO", "Government").
   */
  sponsorTypeCode: string;
}
```

### 12.B.4 Eligibility Contracts

**Architectural Commentary**
Eligibility rules determine applicant qualification. The architecture models these as independently versioned entities, while the specific conditions are modeled as Value Objects that link to external canonical reference data (Zero Upward Dependency).

```typescript
/**
 * The root entity defining a set of eligibility requirements for a scholarship version.
 * Must be independently versioned.
 */
export interface IEligibilityRuleEntity extends IReferenceEntity {
  /**
   * The version of the scholarship this rule applies to.
   */
  scholarshipVersionReferenceId: string;

  /**
   * The structural version of this specific eligibility rule.
   */
  ruleVersionNumber: number;

  /**
   * The composite matching logic (e.g., "ALL_MUST_MATCH", "ANY_MUST_MATCH").
   */
  logicalOperatorCode: string;

  /**
   * The collection of specific conditions forming this rule.
   */
  readonly conditions: IEligibilityCondition[];
}

/**
 * Value Object representing a specific eligibility constraint.
 */
export interface IEligibilityCondition {
  /**
   * The type of condition (e.g., "Nationality", "MinimumGPA", "TestScore").
   */
  conditionTypeCode: string;

  /**
   * Optional link to a Target Country (Phase 7) or Required Nationality (Phase 7).
   */
  countryReferenceId: string | null;

  /**
   * Optional link to an Allowed Major (Phase 10).
   */
  majorReferenceId: string | null;

  /**
   * Optional link to a Required International Test (Phase 9).
   */
  testReferenceId: string | null;

  /**
   * The numeric threshold required, if applicable (e.g., GPA or Test Score).
   */
  minimumThresholdValue: number | null;

  /**
   * Allows deterministic evaluation order when multiple eligibility conditions exist.
   */
  priorityOrder: number;
}
```

### 12.B.5 Application Contracts

**Architectural Commentary**
Governs the temporal windows and procedural stages of the scholarship application lifecycle.

```typescript
/**
 * Entity governing a specific intake cycle for a scholarship.
 */
export interface IApplicationCycleEntity extends IReferenceEntity {
  /**
   * The specific version of the scholarship this cycle applies to.
   */
  scholarshipVersionReferenceId: string;

  /**
   * The name of the cycle (e.g., "Fall 2026 Intake").
   */
  cycleName: string;

  /**
   * The opening date for applications.
   */
  openDate: string;

  /**
   * The closing date for applications.
   */
  closeDate: string;

  /**
   * The type of deadline (e.g., "Fixed", "Rolling").
   */
  deadlineTypeCode: string;
}
```

### 12.B.6 Award & Funding Contracts

**Architectural Commentary**
Models the financial and operational benefits. Funding structures are strictly modeled as Value Objects and must comply with canonical currencies.

```typescript
/**
 * Value Object representing the total benefits provided.
 */
export interface IAwardPackage {
  /**
   * The level of funding (e.g., "Fully Funded", "Partially Funded").
   */
  fundingLevelCode: string;

  /**
   * The structure detailing the exact financial coverage.
   */
  fundingDetails: IFundingStructure;
}

/**
 * Value Object detailing the financial components of the award.
 */
export interface IFundingStructure {
  /**
   * The total value of the scholarship.
   */
  totalEstimatedValue: number;

  /**
   * Reference to the Canonical Currency (Phase 7).
   */
  currencyReferenceId: string;

  /**
   * Explicit tracking of how long the funding applies (e.g., "3 Years", "12 Months").
   */
  fundingDuration: string;

  /**
   * Supports renewable grants (e.g., "Renewable every Academic Year", "Renewable based on GPA").
   */
  renewalConditionCode: string;

  /**
   * Indicates if tuition is fully covered.
   */
  coversTuition: boolean;

  /**
   * Indicates if a monthly stipend is provided.
   */
  providesStipend: boolean;

  /**
   * Indicates if accommodation is covered.
   */
  coversAccommodation: boolean;
}

/**
 * Value Object representing non-financial scholarship benefits.
 */
export interface IAwardBenefit {
  benefitTypeCode: string;
  isOptional: boolean;
  displayOrder: number;
}
```

### 12.B.7 Mapping Contracts

**Architectural Commentary**
These contracts manage the cross-domain relationships linking a scholarship version to specific reference data. This supports the highly connected taxonomy while preventing data duplication.

```typescript
/**
 * Links a scholarship version to an allowed target country (Phase 7).
 */
export interface IScholarshipCountryMapping {
  scholarshipVersionReferenceId: string;
  countryReferenceId: string;
}

/**
 * Links a scholarship version to a target university (Phase 11).
 */
export interface IScholarshipUniversityMapping {
  scholarshipVersionReferenceId: string;
  universityReferenceId: string;
}

/**
 * Links a scholarship version to a specific canonical major (Phase 10).
 */
export interface IScholarshipMajorMapping {
  scholarshipVersionReferenceId: string;
  majorReferenceId: string;
}

/**
 * Links a scholarship version to a specific canonical test requirement (Phase 9).
 */
export interface IScholarshipTestRequirementMapping {
  scholarshipVersionReferenceId: string;
  testReferenceId: string;
}
```

### 12.B.8 Scholarship Import Contracts

**Architectural Commentary**
These contracts govern the validation, required/optional data structures, deduplication rules, and administrative completeness states for scholarships imported from third-party platforms or aggregators.

```typescript
export enum ScholarshipImportCompletenessStatus {
  Imported = 'Imported',
  Incomplete = 'Incomplete',
  Complete = 'Complete',
  NeedsReview = 'NeedsReview',
  ReadyToPublish = 'ReadyToPublish',
  Published = 'Published',
  Rejected = 'Rejected',
  Archived = 'Archived',
}

/**
 * Validates the canonical name normalization logic.
 */
export interface IScholarshipCanonicalNameRule {
  readonly rawName: string;
  readonly sponsorName: string | null;
  readonly intakeCycle: string | null;

  normalize(): string;
}

/**
 * Defines the rule for matching imports to existing canonical scholarships.
 */
export interface IScholarshipDeduplicationRule {
  readonly canonicalName: string;
  readonly sponsorName: string | null;
  readonly intakeCycle: string | null;
  readonly countryReferenceId: string | null;
  readonly officialUrl: string | null;

  isMatch(existingRecord: IScholarshipSummaryProjection): boolean;
}

/**
 * Defines the mandatory fields required to accept an import record.
 */
export interface IScholarshipImportRequiredFields {
  scholarshipName: string;
  fundingCoverage: string;
  coverageDetails: string;
  eligibleMajorsOrFields: string[];
  degreeLevel: string;
}

/**
 * Defines optional enrichment fields that can be captured at import or enriched later.
 */
export interface IScholarshipImportOptionalFields {
  requiredDocuments: string[] | null;
  eligibilityCriteria: string | null;
  studyLanguage: string | null;
  applicationDeadline: string | null;
  studyCountry: string | null;
  applicationLink: string | null;
  officialSourceUrl: string | null;
  sponsorName: string | null;
  targetUniversities: string[] | null;
  targetAcademicPrograms: string[] | null;
  fundingAmount: number | null;
  currency: string | null;
  duration: string | null;
  localizedNames: Record<string, string> | null;
}

/**
 * Represents the structured import record for a scholarship.
 */
export interface IScholarshipImportRecord {
  importReferenceId: string;
  sourcePlatformId: string;
  sourceUrl: string;
  importedAt: string;
  completenessStatus: ScholarshipImportCompletenessStatus;

  requiredFields: IScholarshipImportRequiredFields;
  optionalFields: IScholarshipImportOptionalFields;
}

/**
 * Represents a request to fetch missing data from an official or trusted source.
 */
export interface IScholarshipMissingDataFetchRequest {
  importReferenceId: string;
  targetSourceUrl: string;
  requestedFields: string[];
  requestedAt: string;
  trustLevel: string;
}
```

#### 12.B.8.2 Import Match/Merge Ownership Contracts

To support incoming data from the Phase 06 Import Foundation without violating domain boundaries, this domain explicitly defines and owns the following lifecycle integration responsibilities:

- **Deterministic Match Key**: This domain defines and owns the scholarships deterministic match keys (such as composite keys of scholarship name, sponsor name, intake cycle, and official URL) used to identify reference record overlaps.
- **Completeness Policy**: This domain defines and owns all validation rules and criteria determining when a scholarship record is complete and eligible for operational activation.
- **Merge/Overwrite Policy**: This domain defines and owns the merge policies (such as source-authority hierarchies and mutable/immutable award package details) that govern how incoming scholarship updates merge with existing records.
- **Final Approval/Publish**: This domain owns final approval, manual scholarship offer review, and active publication lifecycle state transitions.
- **Phase 06 Role**: The Phase 06 Import Foundation is restricted to delivering raw extraction proposals, scholarship field diffs, and associated evidence and confidence metrics. It is strictly prohibited from writing directly to scholarship tables.

### 12.B.9 Repository Contracts

**Architectural Commentary**
Repository contracts define data access abstractions, ensuring the domain remains completely decoupled from Prisma ORM implementation details.

```typescript
/**
 * Contract for persisting and retrieving Scholarship root entities.
 */
export interface IScholarshipRepository extends IReferenceRepository<IScholarshipEntity> {
  getByPublicIdAsync(publicId: string, cancellationToken?: any): Promise<IScholarshipEntity>;
}

/**
 * Contract for persisting and retrieving Sponsor entities.
 */
export interface ISponsorRepository extends IReferenceRepository<IScholarshipSponsorEntity> {
  getByOrganizationIdAsync(
    organizationReferenceId: string,
    cancellationToken?: any,
  ): Promise<IScholarshipSponsorEntity>;
}
```

### 12.B.10 Resolution Contracts

**Architectural Commentary**
Marker interfaces defining enterprise query boundary capabilities, strictly used to retrieve canonical identities and aggregate views without leaking repository states.

```typescript
/**
 * Marker interface for the service that resolves Scholarship identities.
 */
export interface IScholarshipResolver {}

/**
 * Marker interface for the service that resolves Sponsor identities.
 */
export interface ISponsorResolver {}
```

### 12.B.11 Scholarship Detail Page Data Contracts

**Architectural Commentary**
Defines the structured domain data models explicitly exposed by Phase 12 for downstream public page composition (Phase 24).

```typescript
/**
 * The structured funding summary for a scholarship detail page.
 */
export interface IScholarshipFundingSummary {
  fundingCoverage: string;
  coverageDetails: string;
  tuitionCoverage: string | null;
  monthlyStipend: number | null;
  accommodationCoverage: string | null;
  travelAllowance: string | null;
  insuranceCoverage: string | null;
  booksOrMaterialsCoverage: string | null;
  otherBenefits: string[];
  currencyReferenceId: string | null;
}

/**
 * The structured eligibility summary for a scholarship detail page.
 */
export interface IScholarshipEligibilitySummary {
  eligibleCountryReferenceIds: string[];
  eligibleMajorReferenceIds: string[];
  degreeLevelReferenceIds: string[];
  minimumGPA: number | null;
  requiredTestReferenceIds: string[];
  ageLimit: number | null;
  languageRequirements: string[];
  otherEligibilityCriteria: string[];
}

/**
 * Metadata indicating official source trust and freshness.
 */
export interface IScholarshipOfficialSource {
  sourcePlatform: string;
  officialSourceUrl: string | null;
  lastVerifiedAt: string;
  sourceTrustLevel: string;
  dataCompletenessStatus: string;
  missingFields: string[];
}

/**
 * The application timeline and instructions.
 */
export interface IScholarshipApplicationInfo {
  applicationOpenDate: string | null;
  applicationDeadline: string | null;
  resultAnnouncementDate: string | null;
  studyStartDate: string | null;
  applicationMethod: string;
  applicationLink: string | null;
  officialSourceUrl: string | null;
  applicationInstructionsSummary: string;
}

/**
 * A required document constraint for the scholarship.
 */
export interface IScholarshipDocumentRequirement {
  documentName: string;
  isRequired: boolean;
  notes: string | null;
  sourceReference: string | null;
}

/**
 * The unified read-model contract representing the full detail page structured data.
 */
export interface IScholarshipDetailPageData {
  scholarshipReferenceId: string;
  scholarshipName: string;
  canonicalScholarshipName: string;
  sponsorName: string;
  scholarshipStatus: string;
  studyCountryReferenceId: string | null;
  applicationDeadline: string | null;
  applicationMethod: string;
  officialSourceUrl: string | null;
  applicationLink: string | null;

  fundingSummary: IScholarshipFundingSummary;
  eligibilitySummary: IScholarshipEligibilitySummary;

  targetUniversityReferenceIds: string[];
  targetAcademicProgramReferenceIds: string[];
  targetMajorReferenceIds: string[];
  degreeLevelReferenceIds: string[];
  studyLanguageReferenceIds: string[];

  applicationInfo: IScholarshipApplicationInfo;
  requiredDocuments: IScholarshipDocumentRequirement[];

  meritBasedCriteria: string | null;
  needBasedCriteria: string | null;
  interviewRequired: boolean;
  recommendationLettersRequired: boolean;
  evaluationNotes: string | null;

  officialSource: IScholarshipOfficialSource;

  similarScholarshipsByCountryReferenceIds: string[];
  similarScholarshipsByMajorReferenceIds: string[];
  similarScholarshipsByDegreeLevelReferenceIds: string[];
  similarScholarshipsByFundingTypeReferenceIds: string[];
}
```

### 12.B.12 Integration Contracts

**Architectural Commentary**
Defines the Read Models (Projections) exposed to consumers and the immutable Enterprise Domain Events used to drive cross-platform reactivity in the Event-Driven Architecture.

```typescript
// --- Projections (Read Models) ---

/**
 * Immutable, flattened view of a scholarship for cross-platform caching and search indexing.
 */
export interface IScholarshipSummaryProjection {
  scholarshipReferenceId: string;
  publicId: string;
  canonicalName: string;
  lifecycleState: string;
  fundingLevelCode: string;
  countryReferenceId: string | null;
}

/**
 * Immutable view of a sponsor.
 */
export interface ISponsorSummaryProjection {
  sponsorReferenceId: string;
  sponsorName: string;
}

// --- Domain Events ---

/**
 * Emitted when a new scholarship is formally created.
 */
export interface IScholarshipCreatedEvent extends IEnterpriseDomainEvent {
  scholarshipReferenceId: string;
  publicId: string;
}

/**
 * Emitted when an existing scholarship is structurally updated (generating a new version).
 */
export interface IScholarshipUpdatedEvent extends IEnterpriseDomainEvent {
  scholarshipReferenceId: string;
  scholarshipVersionReferenceId: string;
}

/**
 * Emitted when a scholarship cycle closes or is administratively closed.
 */
export interface IScholarshipClosedEvent extends IEnterpriseDomainEvent {
  scholarshipReferenceId: string;
}

/**
 * Emitted when a scholarship lifecycle changes.
 */
export interface IScholarshipLifecycleChangedEvent extends IEnterpriseDomainEvent {
  scholarshipReferenceId: string;
  previousLifecycleState: string;
  currentLifecycleState: string;
  changedAt: string;
}
```

### 12.B.13 Contracts Review

**Formal Review Conclusion**

- **Single Source of Truth (SSoT):** Validated. Phase 12 strictly models scholarship capabilities and points externally to Phase 7, 8, 9, 10, and 11 via Reference IDs. It does not duplicate Country (Phase 7) or University (Phase 11) definitions.
- **Clean Architecture:** Validated. All contracts are pure TypeScript interfaces. Zero implementation details or ORM leakage (no Prisma ORM attributes or virtual navigation collections) exist in the domain layer.
- **Value Object Separation:** Validated. Core concepts like `IEligibilityCondition`, `IAwardPackage`, and `IFundingStructure` are strictly modeled as Value Objects devoid of arbitrary Identity (`Id`) or `IReferenceEntity` inheritance.
- **Event-Driven Architecture (EDA):** Validated. Cross-platform notifications rely purely on ID-based domain events adhering to `IEnterpriseDomainEvent`.

**Status:** BASELINED / SOURCE_COMPLETE — RUNTIME_EVIDENCE_PENDING

---

### Navigation

- **Previous**: [Phase 12 — Enterprise Architecture Specification](phase-12-01-enterprise-architecture-specification.md)
- **Next**: [Phase 12 — Implementation Guide](phase-12-03-implementation-guide.md)

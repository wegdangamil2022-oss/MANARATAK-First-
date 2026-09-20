> **Note:** This phase references the [Enterprise Shared Contracts Specification](../../architecture/shared-contracts/03-enterprise-shared-contracts-specification.md) as the canonical architectural source for shared foundation contracts.

# MANARATAK 2.0: Phase 11 (Universities & Institutions) Enterprise Domain

> **Note:** This phase references the [Enterprise Lifecycle Framework Specification](../../architecture/lifecycle-framework/03-enterprise-lifecycle-framework-specification.md) as the canonical architectural source for all state, status, and lifecycle governance.

## Part B — Enterprise Domain Contracts

### 11.B.1 Institutional Hierarchy Contracts

**Architectural Commentary**
This section defines the structural backbone of an educational institution. Each entity is a strict IReferenceEntity possessing canonical identity. Downward relationships are modeled explicitly via Reference IDs.

```typescript
/**
 * Governs the canonical definition of the top-level educational institution.
 */
export interface IUniversityEntity extends IReferenceEntity {
  countryReferenceId: string; // Phase 7
  canonicalName: string;
  foundedYear: number;
}

/**
 * Governs the physical or virtual operational location of the university.
 */
export interface ICampusEntity extends IReferenceEntity {
  universityReferenceId: string;
  cityReferenceId: string; // Phase 7
}

/**
 * Governs the canonical academic organizational unit (Faculty, College, or School) within the university.
 */
export interface IFacultyEntity extends IReferenceEntity {
  universityReferenceId: string;
  campusReferenceId: string | null; // Nullable if the organizational unit spans multiple campuses
  organizationalUnitTypeCode: string; // e.g., FACULTY, COLLEGE, SCHOOL
}

/**
 * Governs the specialized academic unit within an academic organizational unit.
 */
export interface IDepartmentEntity extends IReferenceEntity {
  organizationalUnitReferenceId: string;
}
```

### 11.B.2 Academic Program Contracts

**Architectural Commentary**
This is the most critical contract in Phase 11. The IAcademicProgramEntity acts as the operational intersection between the University (Phase 11), the Major (Phase 10), and the Degree Level (Phase 8).

```typescript
/**
 * Governs the deliverable academic offering.
 * Represents the strict intersection of Institution, Major, and Degree Level.
 */
export interface IAcademicProgramEntity extends IReferenceEntity {
  /**
   * The institution offering the program (Phase 11).
   */
  universityReferenceId: string;

  /**
   * The canonical academic organizational unit (Faculty, College, or School) (Phase 11).
   */
  organizationalUnitReferenceId: string;

  /**
   * The specialized academic unit (Phase 11). Nullable for flexible hierarchy.
   */
  departmentReferenceId: string | null;

  /**
   * The canonical academic discipline (Phase 10).
   */
  majorReferenceId: string;

  /**
   * The canonical degree level (e.g., Bachelor, Master) (Phase 8).
   */
  degreeLevelReferenceId: string;

  /**
   * The delivery mode (e.g., Full-Time, Part-Time, Online, Hybrid).
   */
  deliveryModeReferenceId: string;
}
```

### 11.B.3 Value Objects & Ancillary Contracts

**Architectural Commentary**
These interfaces define properties that do not possess independent canonical identity (Value Objects) or act as child entities tied to the lifecycle of a University or Program.

```typescript
/**
 * Governs admission prerequisites. Strictly acts as a Value Object linked to an Academic Program.
 */
export interface IAdmissionRequirement {
  testReferenceId: string | null; // Phase 9 (e.g., IELTS, SAT)
  minimumTestScore: number | null;
  minimumGPA: number | null;
  requiresInterview: boolean;
  requiresPortfolio: boolean;
}

/**
 * Governs the financial pricing structure. Acts as a Value Object.
 */
export interface ITuition {
  amount: number;
  currencyReferenceId: string; // Phase 7
  pricingModelCode: string; // e.g., "PER_YEAR", "PER_CREDIT"
  tuitionCategoryCode: string; // e.g., "DOMESTIC", "INTERNATIONAL", "SCHOLARSHIP"
  effectiveFrom: string;
  effectiveUntil: string | null;
}

/**
 * Governs official recognition. Can be Institutional or Programmatic.
 */
export interface IAccreditationEntity extends IReferenceEntity {
  accreditingBodyReferenceId: string; // Natively managed (ADR-027)
  universityReferenceId: string | null; // Populated if Institutional
  academicProgramReferenceId: string | null; // Populated if Programmatic
  validFrom: string;
  validUntil: string | null;
}

/**
 * Governs formal global/regional standings.
 */
export interface IRankingEntity extends IReferenceEntity {
  universityReferenceId: string;
  rankingSystemCode: string; // e.g., "QS_GLOBAL", "THE_IMPACT"
  year: number;
  position: number;
  score: number | null;
}
```

### 11.B.4 Repository Contracts

**Architectural Commentary**
Defines the strict read/write boundaries for the application layer. Extends the Phase 7 IReferenceRepository to ensure architectural continuity without leaking Prisma ORM.

```typescript
/**
 * Defines the architectural interaction boundaries for generic university entities.
 */
export interface IUniversityPlatformRepository<
  T extends IReferenceEntity,
> extends IReferenceRepository<T> {
  /**
   * Contract for resolving a canonical entity by its immutable public identifier.
   */
  getByPublicIdAsync(publicId: string, cancellationToken?: any): Promise<T>;

  /**
   * Contract for verifying the existence of a canonical entity by its immutable public identifier.
   */
  existsAsync(publicId: string, cancellationToken?: any): Promise<boolean>;

  /**
   * Contract for materialized retrieval of all active entities of type T.
   */
  getAllActiveAsync(cancellationToken?: any): Promise<readonly T[]>;
}
```

### 11.B.5 Integration & Event Contracts

**Architectural Commentary**
To support the Mandatory Event-Driven Execution principle (EDA), domain events are declared as interfaces. Projections define the lightweight read-models shared across the enterprise to prevent deep SQL joins across microservices.

```typescript
// --- Projections (Read Models) ---

/**
 * Read-only projection of a University for enterprise-wide reference.
 */
export interface IUniversitySummaryProjection {
  universityReferenceId: string;
  canonicalName: string;
  countryReferenceId: string;
}

/**
 * Read-only projection of an Academic Program.
 */
export interface IAcademicProgramSummaryProjection {
  programReferenceId: string;
  universityReferenceId: string;
  majorReferenceId: string;
  degreeLevelReferenceId: string;
}

// --- Domain Events ---

/**
 * Dispatched when a new university canonical record is established.
 */
export interface IUniversityCreatedEvent extends IEnterpriseDomainEvent {
  universityReferenceId: string;
}

/**
 * Dispatched when an existing university canonical record is modified.
 */
export interface IUniversityUpdatedEvent extends IEnterpriseDomainEvent {
  universityReferenceId: string;
}

/**
 * Dispatched when a new academic program is established.
 */
export interface IAcademicProgramCreatedEvent extends IEnterpriseDomainEvent {
  programReferenceId: string;
  universityReferenceId: string;
}

/**
 * Dispatched when an academic program alters its status, requirements, or tuition.
 */
export interface IAcademicProgramUpdatedEvent extends IEnterpriseDomainEvent {
  programReferenceId: string;
  universityReferenceId: string;
}

/**
 * Dispatched when an academic program is permanently closed.
 */
export interface IAcademicProgramClosedEvent extends IEnterpriseDomainEvent {
  programReferenceId: string;
  universityReferenceId: string;
}
```

### 11.B.6 University Import Contracts

**Architectural Commentary**
Defines the strict interfaces governing the deterministic ingestion, deduplication, and enrichment of university data from external sources, strictly mapping against the Phase 11 import rules.

```typescript
/**
 * Defines the mandatory fields that must be present for any imported university record to be considered structurally valid.
 */
export interface IUniversityImportRequiredFields {
  officialUniversityName: string;
  country: string; // Phase 07 canonical resolution target
  primaryCityOrLocation: string; // Phase 07 canonical resolution target
  officialWebsiteUrl: string;
  institutionType: string;
  officialSourceUrl: string;
}

/**
 * Defines the optional enrichment fields that can be selectively merged during deduplication.
 */
export interface IUniversityImportOptionalFields {
  logoAssetReference?: string; // Phase 05 AssetId
  galleryAssetReferences?: string[]; // Phase 05 AssetIds
  establishedYear?: number;
  shortOverview?: string;
  localizedNames?: Record<string, string>;
  accreditationStatus?: string;
  rankingData?: string;
  campuses?: any[];
  facultiesOrColleges?: any[];
  academicDepartments?: any[];
  academicPrograms?: any[];
  degreeLevelsOffered?: string[];
  studyLanguages?: string[];
  tuitionFees?: any[];
  admissionRequirements?: any[];
  requiredTests?: string[];
  applicationDeadlines?: string[];
  applicationUrls?: string[];
  scholarshipLinks?: string[];
  studentHousing?: boolean;
  studentServices?: string[];
  contactInformation?: any;
  sourceTrustLevel?: string;
  lastVerifiedAt?: string;
}

/**
 * Defines the deterministic composite key used to detect duplicate university records during import.
 */
export interface IUniversityCanonicalIdentityRule {
  canonicalUniversityName: string;
  country: string;
  officialWebsiteDomain: string;
}

/**
 * Defines the overarching completeness status of an imported record within the administrative lifecycle.
 */
export type IUniversityImportCompletenessStatus = 
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
export interface IUniversityImportRecord {
  importSourceId: string;
  requiredFields: IUniversityImportRequiredFields;
  optionalFields: IUniversityImportOptionalFields;
  canonicalIdentity: IUniversityCanonicalIdentityRule;
  completenessStatus: IUniversityImportCompletenessStatus;
}
```

#### 11.B.6.2 Import Match/Merge Ownership Contracts

To support incoming data from the Phase 06 Import Foundation without violating domain boundaries, this domain explicitly defines and owns the following lifecycle integration responsibilities:

- **Deterministic Match Key**: This domain defines and owns the universities deterministic match keys (such as composite keys of canonical university name, country code, and official website domain) used to identify reference record overlaps.
- **Completeness Policy**: This domain defines and owns all validation rules and criteria determining when a university or program record is complete and eligible for operational activation.
- **Merge/Overwrite Policy**: This domain defines and owns the merge policies (such as source-authority hierarchies and mutable/immutable campus details) that govern how incoming university updates merge with existing records.
- **Final Approval/Publish**: This domain owns final approval, manual institution review, and active publication lifecycle state transitions.
- **Phase 06 Role**: The Phase 06 Import Foundation is restricted to delivering raw extraction proposals, university/program field diffs, and associated evidence and confidence metrics. It is strictly prohibited from writing directly to university/institution tables.

### 11.B.7 Contracts Review

**Formal Architectural Confirmation**

The Enterprise Architecture Board formally confirms the following regarding Phase 11, Part B:

- **Clean Architecture Adherence**: No implementation details, attributes, or persistence frameworks (Prisma ORM) exist in these contracts.
- **Value Object Segregation**: `IAdmissionRequirement` and `ITuition` are accurately modeled as Value Objects devoid of `IReferenceEntity` inheritance.
- **Intersection Principle Validated**: `IAcademicProgramEntity` perfectly models the architectural intersection between University, Major, and Degree Level without duplicating external domain data.
- **Event-Driven Architecture**: Integration contracts explicitly define domain events needed for cache invalidation and search indexing.

---

### Navigation

- **Previous**: [Phase 11 — Enterprise Architecture Specification](phase-11-01-enterprise-architecture-specification.md)
- **Next**: [Phase 11 — Implementation Guide](phase-11-03-implementation-guide.md)
> **Current remediation status (2026-08-12): `READINESS_PREPARED / NOT_IMPORTED / PENDING_GOOGLE_STUDIO`.**
> This document is a historical contract baseline, not evidence of implemented persistence or imported Universities. The active readiness proposal is `docs/remediation/wp10/PHASE_11_UNIVERSITY_DOMAIN_CONTRACT_PROPOSAL.md`.

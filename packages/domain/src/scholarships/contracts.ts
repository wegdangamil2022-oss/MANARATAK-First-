import type { AtomicPersistenceContext } from '../event-foundation/outbox/TransactionalOutbox';

export enum ScholarshipCompletenessState {
  INCOMPLETE = 'INCOMPLETE',
  NEEDS_REVIEW = 'NEEDS_REVIEW',
  COMPLETE = 'COMPLETE',
}

/** Canonical lifecycle dimension; independent of legacy workflow/review status. */
export enum ScholarshipVerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  FAILED = 'FAILED',
}

/** Canonical public exposure dimension; never infer this only from workflow status. */
export enum ScholarshipPublicationStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum ScholarshipStatus {
  IMPORTED = 'IMPORTED',
  ARCHIVED = 'ARCHIVED',
  REJECTED = 'REJECTED',
  PUBLISHED = 'PUBLISHED',
  READY_TO_PUBLISH = 'READY_TO_PUBLISH',
  READY_TO_REVIEW = 'READY_TO_REVIEW',
}

export interface ScholarshipBenefitDto {
  id?: string;
  scholarshipId?: string;
  benefitKey: string;
  benefitTypeCode: string;
  coverageTypeCode?: string | null;
  amount?: string | number | null;
  currencyReferenceId?: string | null;
  valueText?: string | null;
  durationText?: string | null;
  frequencyCode?: string | null;
  isCovered?: boolean;
  isOptional?: boolean;
  displayOrder?: number;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ScholarshipDegreeTargetDto {
  id?: string;
  scholarshipId?: string;
  targetKey: string;
  degreeLevelId?: string | null;
  sourceLabel?: string | null;
  resolutionStatus?: string;
  metadata?: Record<string, unknown> | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ScholarshipMajorTargetDto {
  id?: string;
  scholarshipId?: string;
  targetKey: string;
  majorId?: string | null;
  sourceLabel?: string | null;
  resolutionStatus?: string;
  metadata?: Record<string, unknown> | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ScholarshipEligibilityItemDto {
  id?: string;
  scholarshipId?: string;
  itemKey: string;
  itemTypeCode: string;
  operatorCode?: string | null;
  valueText?: string | null;
  minimumValue?: string | number | null;
  maximumValue?: string | number | null;
  countryReferenceId?: string | null;
  degreeLevelId?: string | null;
  majorId?: string | null;
  internationalTestId?: string | null;
  isRequired?: boolean;
  priorityOrder?: number;
  resolutionStatus?: string;
  metadata?: Record<string, unknown> | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ScholarshipRequiredDocumentDto {
  id?: string;
  scholarshipId?: string;
  documentKey: string;
  documentTypeCode?: string | null;
  displayName: string;
  description?: string | null;
  internationalTestId?: string | null;
  sourceLabel?: string | null;
  resolutionStatus?: string;
  isRequired?: boolean;
  displayOrder?: number;
  metadata?: Record<string, unknown> | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ScholarshipSourceEvidenceDto {
  id?: string;
  scholarshipId?: string;
  evidenceKey: string;
  sourceTypeCode: string;
  sourceUrl: string;
  sourceName?: string | null;
  sourceHash?: string | null;
  trustLevel?: string | null;
  isOfficial?: boolean;
  importRecordId?: string | null;
  capturedAt?: Date;
  verifiedAt?: Date | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ScholarshipUniversityLinkDto {
  id?: string;
  scholarshipId?: string;
  linkKey: string;
  universityId?: string | null;
  academicProgramId?: string | null;
  sourceLabel?: string | null;
  relationshipTypeCode?: string;
  resolutionStatus?: string;
  metadata?: Record<string, unknown> | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateScholarshipDto {
  publicId: string;
  slug: string;
  canonicalName: string;
  canonicalDedupKey: string;
  displayName: string;
  status: ScholarshipStatus;
  completenessStatus: ScholarshipCompletenessState;
  verificationStatus?: ScholarshipVerificationStatus;
  publicationStatus?: ScholarshipPublicationStatus;
  providerName?: string | null;
  amountMinorUnits?: string | null;
  amountCurrencyCode?: string | null;
  isFullyFunded?: boolean;
  applicationDeadline?: Date | null;
  officialWebsite?: string | null;
  sourceUrl?: string | null;

  academicYear?: string | null;
  cycleName?: string | null;
  countryReferenceId?: string | null;
  countrySourceLabel?: string | null;
  countryScope?: string | null;
  fundingTypeCode?: string | null;
  deadlineType?: string | null;
  applicationMethod?: string | null;
  applicationUrl?: string | null;
  officialSourceUrl?: string | null;
  sourceImportRecordId?: string | null;
  sourceLocale?: string | null;
  lastVerifiedAt?: Date | null;
  studyLanguageReferenceId?: string | null;
  studyLanguageSourceLabel?: string | null;
  studyLanguageResolutionStatus?: string | null;

  benefits?: ScholarshipBenefitDto[];
  degreeTargets?: ScholarshipDegreeTargetDto[];
  majorTargets?: ScholarshipMajorTargetDto[];
  eligibilityItems?: ScholarshipEligibilityItemDto[];
  requiredDocumentItems?: ScholarshipRequiredDocumentDto[];
  sourceEvidence?: ScholarshipSourceEvidenceDto[];
  universityLinks?: ScholarshipUniversityLinkDto[];

  // Legacy compatibility fields retained during Expand/Backfill.
  fundingCoverage?: string;
  coverageDetails?: string;
  eligibleMajorsOrFields?: string | string[];
  degreeLevel?: string;
  studyCountry?: string;
  applicationLink?: string;
  sponsorName?: string;
  requiredDocuments?: string | string[];
  eligibilityCriteria?: string;
  studyLanguage?: string;
  targetUniversities?: string[];
  targetAcademicPrograms?: string[];
  fundingAmount?: string | number;
  currency?: string;
  duration?: string;
  localizedNames?: Record<string, string>;
  metadata?: Record<string, unknown>;
  optionalFields?: Record<string, unknown>;
}

export interface ScholarshipVersionDto {
  id?: string;
  scholarshipId?: string;
  versionNumber: number;
  status: string;
  sourceImportRecordId?: string | null;
  snapshot: Record<string, unknown>;
  changeSummary?: Record<string, unknown> | null;
  createdAt?: Date;
  publishedAt?: Date | null;
}

export interface ScholarshipSponsorContextDto {
  id?: string;
  scholarshipId?: string;
  sponsorType: string;
  displayName: string;
  universityId?: string | null;
  source?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ScholarshipApplicationCycleDto {
  id?: string;
  scholarshipId?: string;
  versionId?: string | null;
  cycleKey: string;
  academicYear?: string | null;
  opensAt?: Date | null;
  closesAt?: Date | null;
  graceEndsAt?: Date | null;
  status: string;
  metadata?: Record<string, unknown> | null;
}

export interface ScholarshipDto extends CreateScholarshipDto {
  id: string;
  versions?: ScholarshipVersionDto[];
  sponsorContext?: ScholarshipSponsorContextDto | null;
  applicationCycles?: ScholarshipApplicationCycleDto[];
  createdAt: Date;
  updatedAt: Date;
}

export type UpdateScholarshipDto = Partial<
  Omit<CreateScholarshipDto, 'publicId' | 'slug' | 'canonicalName' | 'canonicalDedupKey'>
>;

// Internal persistence shape. canonicalDedupKey is derived by Application and
// is deliberately absent from UpdateScholarshipDto/API authoring contracts.
export type ScholarshipRepositoryUpdateDto = UpdateScholarshipDto & {
  canonicalDedupKey?: string;
};

export interface ScholarshipFilters {
  status?: ScholarshipStatus;
  completenessStatus?: ScholarshipCompletenessState;
  countryReferenceId?: string;
  studyLanguageReferenceId?: string;
  currencyReferenceId?: string;
  degreeLevelId?: string;
  majorId?: string;
  internationalTestId?: string;
  universityId?: string;
  academicProgramId?: string;
  fundingCoverage?: string;
  sponsorName?: string;
  verificationStatus?: ScholarshipVerificationStatus;
  translationState?: 'NEEDS_TRANSLATION' | 'TRANSLATED';
  deadlineFrom?: Date;
  deadlineTo?: Date;
  sourceType?: string;
  query?: string;
  page?: number;
  pageSize?: number;
}

export interface ScholarshipAdminSummary {
  all: number;
  imported: number;
  missingFields: number;
  needsVerification: number;
  needsTranslation: number;
  readyToPublish: number;
  published: number;
  archived: number;
}

export interface PublicScholarshipFilters {
  countryReferenceId?: string;
  studyLanguageReferenceId?: string;
  currencyReferenceId?: string;
  degreeLevelId?: string;
  majorId?: string;
  internationalTestId?: string;
  universityId?: string;
  academicProgramId?: string;
  fundingCoverage?: string;
  sponsorName?: string;
  applicationDeadlineFrom?: Date;
  applicationDeadlineTo?: Date;
  cursor?: string;
  limit?: number;
}

export interface ScholarshipPage<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore?: boolean;
  nextCursor?: string | null;
}

export type PublicScholarshipDto = Omit<
  ScholarshipDto,
  | 'id'
  | 'canonicalDedupKey'
  | 'sourceImportRecordId'
  | 'status'
  | 'completenessStatus'
  | 'createdAt'
  | 'optionalFields'
  | 'verificationStatus'
  | 'publicationStatus'
  | 'versions'
  | 'sponsorContext'
  | 'applicationCycles'
>;

export interface IScholarshipRepository {
  create(data: CreateScholarshipDto): Promise<ScholarshipDto>;
  update(id: string, updates: ScholarshipRepositoryUpdateDto): Promise<ScholarshipDto>;
  findByDedupKey(key: string): Promise<ScholarshipDto | null>;
  findById(id: string): Promise<ScholarshipDto | null>;
  findBySlug(slug: string): Promise<ScholarshipDto | null>;
  findPublishedBySlug(slug: string): Promise<ScholarshipDto | null>;
  updateStatus(id: string, status: ScholarshipStatus): Promise<void>;
  updateLifecycle?(id: string, lifecycle: {
    workflowStatus?: ScholarshipStatus;
    verificationStatus?: ScholarshipVerificationStatus;
    publicationStatus?: ScholarshipPublicationStatus;
  }): Promise<void>;
  list(filters: ScholarshipFilters): Promise<ScholarshipPage<ScholarshipDto>>;
  listPublished(filters: PublicScholarshipFilters): Promise<ScholarshipPage<ScholarshipDto>>;
  findByPublicId?(publicId: string): Promise<ScholarshipDto | null>;
  updateImportLink?(id: string, sourceImportRecordId: string): Promise<void>;
  listByStatus?(status: ScholarshipStatus): Promise<ScholarshipDto[]>;
  listPublishable?(): Promise<ScholarshipDto[]>;
}

export interface ITransactionalScholarshipRepository extends IScholarshipRepository {
  withTransaction(context: AtomicPersistenceContext): IScholarshipRepository;
}

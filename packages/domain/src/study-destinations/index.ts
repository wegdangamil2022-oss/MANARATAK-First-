export enum StudyDestinationStatus {
  DRAFT = 'DRAFT',
  IN_REVIEW = 'IN_REVIEW',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum StudyDestinationCompletenessStatus {
  INCOMPLETE = 'INCOMPLETE',
  READY_FOR_REVIEW = 'READY_FOR_REVIEW',
  READY_TO_PUBLISH = 'READY_TO_PUBLISH',
  COMPLETE = 'COMPLETE',
}

export enum StudyDestinationVerificationStatus {
  UNVERIFIED = 'UNVERIFIED',
  VERIFIED = 'VERIFIED',
}

export enum StudyDestinationLivingCostTier {
  LOW = 'LOW',
  MODERATE = 'MODERATE',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH',
}

export type StudyDestinationOfficialLinkCategory =
  | 'GOVERNMENT_STUDY'
  | 'IMMIGRATION_VISA'
  | 'EDUCATION_AUTHORITY'
  | 'SCHOLARSHIP_PORTAL'
  | 'COST_OF_LIVING'
  | 'STUDENT_SUPPORT'
  | 'OTHER';

export interface StudyDestinationOfficialLink {
  labelAr: string;
  labelEn?: string;
  url: string;
  category: StudyDestinationOfficialLinkCategory;
  noteAr?: string;
  noteEn?: string;
}

export interface StudyDestinationEvidenceSource {
  label: string;
  url: string;
  sourceType:
    | 'GOVERNMENT'
    | 'OFFICIAL_EDUCATION_AUTHORITY'
    | 'OFFICIAL_IMMIGRATION'
    | 'OFFICIAL_STATISTICS'
    | 'OTHER_OFFICIAL';
  verifiedAt?: string;
}

export interface StudyDestinationCostHighlight {
  label: string;
  value: string;
}

export interface StudyDestinationAuthorityDecision {
  origin: string;
  authorityName: string;
  evidenceUrl: string;
  exceptionReason?: string;
}
export interface StudyDestinationSourceProof {
  fingerprint: string;
  authorId: string;
  reviewerId: string;
  reviewedRevision: number;
  reviewedAt: string;
  reason: string;
  authorities: StudyDestinationAuthorityDecision[];
}
export interface StudyDestinationGovernance {
  lastEditorId?: string;
  proof?: StudyDestinationSourceProof | null;
  readiness?: Record<string, boolean>;
}
export const STUDY_DESTINATION_READINESS_KEYS = [
  'overview-ar',
  'overview-en',
  'study-system-ar',
  'study-system-en',
  'admission-highlights',
  'admission-highlights-en',
  'study-languages',
  'visa-summary-ar',
  'visa-summary-en',
  'visa-requirements',
  'visa-requirements-en',
  'visa-official-url',
  'living-cost-range',
  'living-cost-currency',
  'official-links',
  'official-links-en',
  'evidence-sources',
  'source-audit-date',
  'source-verification',
  'image',
  'cost-highlights-en',
  'student-life-en',
] as const;
export type StudyDestinationMissingCheck = (typeof STUDY_DESTINATION_READINESS_KEYS)[number];

export interface StudyDestinationProfileDto {
  revision: number;
  governance: StudyDestinationGovernance;
  cityReferenceIds: string[];
  id: string;
  publicId: string;
  slug: string;
  countryReferenceId: string;
  status: StudyDestinationStatus;
  completenessStatus: StudyDestinationCompletenessStatus;
  overviewAr?: string | null;
  overviewEn?: string | null;
  studySystemSummaryAr?: string | null;
  studySystemSummaryEn?: string | null;
  admissionHighlightsAr: string[];
  admissionHighlightsEn: string[];
  visaSummaryAr?: string | null;
  visaSummaryEn?: string | null;
  visaRequirementsAr: string[];
  visaRequirementsEn: string[];
  visaOfficialUrl?: string | null;
  livingCostTier?: StudyDestinationLivingCostTier | null;
  averageMonthlyLivingCostMin?: number | null;
  averageMonthlyLivingCostMax?: number | null;
  livingCostCurrencyReferenceId?: string | null;
  costHighlightsAr: StudyDestinationCostHighlight[];
  costHighlightsEn: StudyDestinationCostHighlight[];
  studentLifeHighlightsAr: string[];
  studentLifeHighlightsEn: string[];
  officialLinks: StudyDestinationOfficialLink[];
  sourceVerificationStatus: StudyDestinationVerificationStatus;
  sourceAuditDate?: string | null;
  evidenceSources: StudyDestinationEvidenceSource[];
  imageAssetId?: string | null;
  studyLanguageReferenceIds: string[];
  isFeatured: boolean;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudyDestinationProfileInput {
  cityReferenceIds?: string[];
  overviewAr?: string | null;
  overviewEn?: string | null;
  studySystemSummaryAr?: string | null;
  studySystemSummaryEn?: string | null;
  admissionHighlightsAr?: string[];
  admissionHighlightsEn?: string[];
  visaSummaryAr?: string | null;
  visaSummaryEn?: string | null;
  visaRequirementsAr?: string[];
  visaRequirementsEn?: string[];
  visaOfficialUrl?: string | null;
  livingCostTier?: StudyDestinationLivingCostTier | null;
  averageMonthlyLivingCostMin?: number | null;
  averageMonthlyLivingCostMax?: number | null;
  livingCostCurrencyReferenceId?: string | null;
  costHighlightsAr?: StudyDestinationCostHighlight[];
  costHighlightsEn?: StudyDestinationCostHighlight[];
  studentLifeHighlightsAr?: string[];
  studentLifeHighlightsEn?: string[];
  officialLinks?: StudyDestinationOfficialLink[];
  sourceVerificationStatus?: StudyDestinationVerificationStatus;
  sourceAuditDate?: string | null;
  evidenceSources?: StudyDestinationEvidenceSource[];
  imageAssetId?: string | null;
  studyLanguageReferenceIds?: string[];
  isFeatured?: boolean;
}

export interface StudyDestinationRepositoryCreateInput extends StudyDestinationProfileInput {
  governance?: StudyDestinationGovernance;
  publicId: string;
  slug: string;
  countryReferenceId: string;
  status: StudyDestinationStatus;
  completenessStatus: StudyDestinationCompletenessStatus;
}

export interface StudyDestinationRepositoryUpdateInput extends StudyDestinationProfileInput {
  governance?: StudyDestinationGovernance;
  status?: StudyDestinationStatus;
  completenessStatus?: StudyDestinationCompletenessStatus;
  publishedAt?: string | null;
}

export interface StudyDestinationFilters {
  q?: string;
  region?: string;
  status?: StudyDestinationStatus;
  completenessStatus?: StudyDestinationCompletenessStatus;
  countryReferenceId?: string;
  isFeatured?: boolean;
  page?: number;
  pageSize?: number;
}

export interface PaginatedStudyDestinationResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface StudyDestinationReadinessCheck {
  key: string;
  section: 'OVERVIEW' | 'ACADEMICS' | 'VISA' | 'LIVING_COST' | 'OFFICIAL_LINKS' | 'EVIDENCE';
  label: string;
  complete: boolean;
  blocking: boolean;
  message?: string;
}

export interface StudyDestinationReadinessReport {
  readyForReview: boolean;
  readyForPublish: boolean;
  completenessStatus: StudyDestinationCompletenessStatus;
  checks: StudyDestinationReadinessCheck[];
}

export interface IStudyDestinationRepository {
  withTransaction?(
    context: import('../event-foundation/outbox/TransactionalOutbox').AtomicPersistenceContext,
  ): IStudyDestinationRepository;
  lockCountry?(countryReferenceId: string): Promise<void>;
  lockReferences?(
    profile: Pick<
      StudyDestinationProfileDto,
      | 'countryReferenceId'
      | 'studyLanguageReferenceIds'
      | 'livingCostCurrencyReferenceId'
      | 'cityReferenceIds'
    >,
  ): Promise<void>;
  listAdminCountries?(
    filters: Omit<StudyDestinationFilters, 'status'> & {
      status?: StudyDestinationStatus | 'NO_PROFILE';
      missingCheck?: StudyDestinationMissingCheck;
    },
  ): Promise<
    PaginatedStudyDestinationResult<{
      country: import('../reference-data/dto/ReferenceDataContracts').ReferenceCountryDto;
      profile: StudyDestinationProfileDto | null;
    }>
  >;
  findById(id: string): Promise<StudyDestinationProfileDto | null>;
  findBySlug(slug: string): Promise<StudyDestinationProfileDto | null>;
  findByCountryReferenceId(countryReferenceId: string): Promise<StudyDestinationProfileDto | null>;
  list(
    filters: StudyDestinationFilters,
  ): Promise<PaginatedStudyDestinationResult<StudyDestinationProfileDto>>;
  listPublished(
    filters: Omit<StudyDestinationFilters, 'status' | 'completenessStatus'>,
  ): Promise<PaginatedStudyDestinationResult<StudyDestinationProfileDto>>;
  create(data: StudyDestinationRepositoryCreateInput): Promise<StudyDestinationProfileDto>;
  update(
    id: string,
    data: StudyDestinationRepositoryUpdateInput,
    expectedUpdatedAt?: string,
    expectedRevision?: number,
  ): Promise<StudyDestinationProfileDto>;
}

const meaningful = (value: unknown): boolean =>
  typeof value === 'string' && value.trim().length > 0;
const nonEmpty = (value: readonly unknown[] | undefined | null): boolean =>
  Array.isArray(value) && value.length > 0;

export const STUDY_DESTINATION_REVIEW_MAX_AGE_DAYS = 180;

export class StudyDestinationPublishingPolicy {
  public constructor(
    private readonly maxAuditAgeDays = STUDY_DESTINATION_REVIEW_MAX_AGE_DAYS,
    private readonly now: () => number = Date.now,
  ) {}
  public isAuditDateFresh(value: string | null | undefined): boolean {
    const date = Date.parse(value ?? ''),
      now = this.now();
    return Number.isFinite(date) && date <= now && date >= now - this.maxAuditAgeDays * 86400000;
  }
  public evaluate(profile: StudyDestinationProfileDto): StudyDestinationReadinessReport {
    const costRangeValid =
      typeof profile.averageMonthlyLivingCostMin === 'number' &&
      typeof profile.averageMonthlyLivingCostMax === 'number' &&
      Number.isFinite(profile.averageMonthlyLivingCostMin) &&
      Number.isFinite(profile.averageMonthlyLivingCostMax) &&
      profile.averageMonthlyLivingCostMin >= 0 &&
      profile.averageMonthlyLivingCostMax >= profile.averageMonthlyLivingCostMin;

    const checks: StudyDestinationReadinessCheck[] = [
      {
        key: 'image',
        section: 'OVERVIEW',
        label: 'Destination image',
        complete: meaningful(profile.imageAssetId),
        blocking: false,
      },
      {
        key: 'overview-ar',
        section: 'OVERVIEW',
        label: 'Arabic overview',
        complete: meaningful(profile.overviewAr),
        blocking: true,
      },
      {
        key: 'overview-en',
        section: 'OVERVIEW',
        label: 'English overview',
        complete: meaningful(profile.overviewEn),
        blocking: true,
      },
      {
        key: 'study-system-ar',
        section: 'ACADEMICS',
        label: 'Arabic study system',
        complete: meaningful(profile.studySystemSummaryAr),
        blocking: true,
      },
      {
        key: 'study-system-en',
        section: 'ACADEMICS',
        label: 'English study system',
        complete: meaningful(profile.studySystemSummaryEn),
        blocking: true,
      },
      {
        key: 'admission-highlights',
        section: 'ACADEMICS',
        label: 'Admission highlights',
        complete: nonEmpty(profile.admissionHighlightsAr),
        blocking: true,
      },
      {
        key: 'study-languages',
        section: 'ACADEMICS',
        label: 'Canonical study languages',
        complete: nonEmpty(profile.studyLanguageReferenceIds),
        blocking: true,
      },
      {
        key: 'visa-summary-ar',
        section: 'VISA',
        label: 'Arabic visa summary',
        complete: meaningful(profile.visaSummaryAr),
        blocking: true,
      },
      {
        key: 'visa-summary-en',
        section: 'VISA',
        label: 'English visa summary',
        complete: meaningful(profile.visaSummaryEn),
        blocking: true,
      },
      {
        key: 'visa-requirements',
        section: 'VISA',
        label: 'Visa requirements',
        complete: nonEmpty(profile.visaRequirementsAr),
        blocking: true,
      },
      {
        key: 'visa-official-url',
        section: 'VISA',
        label: 'Official visa URL',
        complete: meaningful(profile.visaOfficialUrl),
        blocking: true,
      },
      {
        key: 'living-cost-range',
        section: 'LIVING_COST',
        label: 'Living cost range',
        complete: costRangeValid,
        blocking: true,
      },
      {
        key: 'living-cost-currency',
        section: 'LIVING_COST',
        label: 'Canonical living cost currency',
        complete: meaningful(profile.livingCostCurrencyReferenceId),
        blocking: true,
      },
      {
        key: 'official-links',
        section: 'OFFICIAL_LINKS',
        label: 'Official links',
        complete: nonEmpty(profile.officialLinks),
        blocking: true,
      },
      {
        key: 'evidence-sources',
        section: 'EVIDENCE',
        label: 'Evidence sources',
        complete: nonEmpty(profile.evidenceSources),
        blocking: true,
      },
      {
        key: 'source-audit-date',
        section: 'EVIDENCE',
        label: 'Source audit date',
        complete: meaningful(profile.sourceAuditDate) &&
          Date.parse(profile.sourceAuditDate!) <= this.now() &&
          Date.parse(profile.sourceAuditDate!) >= this.now() - this.maxAuditAgeDays * 86400000,
        blocking: true,
      },
      {
        key: 'source-verification',
        section: 'EVIDENCE',
        label: 'Source verification',
        complete: profile.sourceVerificationStatus === StudyDestinationVerificationStatus.VERIFIED &&
          Boolean(
            profile.governance?.proof?.fingerprint &&
            profile.governance.proof.authorId &&
            profile.governance.proof.reviewerId &&
            Number.isSafeInteger(profile.governance.proof.reviewedRevision) &&
            profile.governance.proof.reviewedRevision >= 1 &&
            profile.governance.proof.reviewerId !== profile.governance.proof.authorId &&
            profile.governance.proof.authorId === profile.governance.lastEditorId &&
            Date.parse(profile.governance.proof.reviewedAt) <= this.now() &&
            Date.parse(profile.governance.proof.reviewedAt) >=
              this.now() - this.maxAuditAgeDays * 86400000,
          ),
        blocking: true,
      },
    ];
    checks.push(
      {
        key: 'admission-highlights-en',
        section: 'ACADEMICS',
        label: 'English admission highlights',
        complete: nonEmpty(profile.admissionHighlightsEn),
        blocking: true,
      },
      {
        key: 'visa-requirements-en',
        section: 'VISA',
        label: 'English visa requirements',
        complete: nonEmpty(profile.visaRequirementsEn),
        blocking: true,
      },
      {
        key: 'official-links-en',
        section: 'OFFICIAL_LINKS',
        label: 'English official link labels',
        complete: profile.officialLinks.every((link) => meaningful(link.labelEn)),
        blocking: true,
      },
      {
        key: 'cost-highlights-en',
        section: 'LIVING_COST',
        label: 'English cost highlights',
        complete:
          profile.costHighlightsEn.length === profile.costHighlightsAr.length &&
          [...profile.costHighlightsAr,...profile.costHighlightsEn].every(item => meaningful(item.label) && meaningful(item.value)),
        blocking: true,
      },
      {
        key: 'student-life-en',
        section: 'ACADEMICS',
        label: 'English student life',
        complete:
          profile.studentLifeHighlightsEn.length === profile.studentLifeHighlightsAr.length &&
          [...profile.studentLifeHighlightsAr,...profile.studentLifeHighlightsEn].every(meaningful),
        blocking: true,
      },
    );

    const reviewKeys = new Set([
      'overview-ar',
      'overview-en',
      'study-system-ar',
      'study-system-en',
      'admission-highlights',
      'visa-summary-ar',
      'visa-summary-en',
      'visa-requirements',
      'visa-official-url',
      'living-cost-range',
      'living-cost-currency',
      'official-links',
      'evidence-sources',
      'admission-highlights-en',
      'visa-requirements-en',
      'official-links-en',
      'cost-highlights-en',
      'student-life-en',
    ]);
    const readyForReview = checks
      .filter((check) => reviewKeys.has(check.key))
      .every((check) => check.complete);
    const readyForPublish = checks
      .filter((check) => check.blocking)
      .every((check) => check.complete);
    const completenessStatus = readyForPublish
      ? StudyDestinationCompletenessStatus.READY_TO_PUBLISH
      : readyForReview
        ? StudyDestinationCompletenessStatus.READY_FOR_REVIEW
        : StudyDestinationCompletenessStatus.INCOMPLETE;

    return { readyForReview, readyForPublish, completenessStatus, checks };
  }
}

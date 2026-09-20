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
  sourceType: 'GOVERNMENT' | 'OFFICIAL_EDUCATION_AUTHORITY' | 'OFFICIAL_IMMIGRATION' | 'OFFICIAL_STATISTICS' | 'OTHER_OFFICIAL';
  verifiedAt?: string;
}

export interface StudyDestinationCostHighlight {
  label: string;
  value: string;
}

export interface StudyDestinationProfileDto {
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
  publicId: string;
  slug: string;
  countryReferenceId: string;
  status: StudyDestinationStatus;
  completenessStatus: StudyDestinationCompletenessStatus;
}

export interface StudyDestinationRepositoryUpdateInput extends StudyDestinationProfileInput {
  status?: StudyDestinationStatus;
  completenessStatus?: StudyDestinationCompletenessStatus;
  publishedAt?: string | null;
}

export interface StudyDestinationFilters {
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
  findById(id: string): Promise<StudyDestinationProfileDto | null>;
  findBySlug(slug: string): Promise<StudyDestinationProfileDto | null>;
  findByCountryReferenceId(countryReferenceId: string): Promise<StudyDestinationProfileDto | null>;
  list(filters: StudyDestinationFilters): Promise<PaginatedStudyDestinationResult<StudyDestinationProfileDto>>;
  listPublished(filters: Omit<StudyDestinationFilters, 'status' | 'completenessStatus'>): Promise<PaginatedStudyDestinationResult<StudyDestinationProfileDto>>;
  create(data: StudyDestinationRepositoryCreateInput): Promise<StudyDestinationProfileDto>;
  update(id: string, data: StudyDestinationRepositoryUpdateInput): Promise<StudyDestinationProfileDto>;
}

const meaningful = (value: unknown): boolean => typeof value === 'string' && value.trim().length > 0;
const nonEmpty = (value: readonly unknown[] | undefined | null): boolean => Array.isArray(value) && value.length > 0;

export class StudyDestinationPublishingPolicy {
  public evaluate(profile: StudyDestinationProfileDto): StudyDestinationReadinessReport {
    const costRangeValid =
      typeof profile.averageMonthlyLivingCostMin === 'number' &&
      typeof profile.averageMonthlyLivingCostMax === 'number' &&
      profile.averageMonthlyLivingCostMin >= 0 &&
      profile.averageMonthlyLivingCostMax >= profile.averageMonthlyLivingCostMin;

    const checks: StudyDestinationReadinessCheck[] = [
      { key: 'overview-ar', section: 'OVERVIEW', label: 'Arabic overview', complete: meaningful(profile.overviewAr), blocking: true },
      { key: 'overview-en', section: 'OVERVIEW', label: 'English overview', complete: meaningful(profile.overviewEn), blocking: true },
      { key: 'study-system-ar', section: 'ACADEMICS', label: 'Arabic study system', complete: meaningful(profile.studySystemSummaryAr), blocking: true },
      { key: 'study-system-en', section: 'ACADEMICS', label: 'English study system', complete: meaningful(profile.studySystemSummaryEn), blocking: true },
      { key: 'admission-highlights', section: 'ACADEMICS', label: 'Admission highlights', complete: nonEmpty(profile.admissionHighlightsAr), blocking: true },
      { key: 'study-languages', section: 'ACADEMICS', label: 'Canonical study languages', complete: nonEmpty(profile.studyLanguageReferenceIds), blocking: true },
      { key: 'visa-summary-ar', section: 'VISA', label: 'Arabic visa summary', complete: meaningful(profile.visaSummaryAr), blocking: true },
      { key: 'visa-summary-en', section: 'VISA', label: 'English visa summary', complete: meaningful(profile.visaSummaryEn), blocking: true },
      { key: 'visa-requirements', section: 'VISA', label: 'Visa requirements', complete: nonEmpty(profile.visaRequirementsAr), blocking: true },
      { key: 'visa-official-url', section: 'VISA', label: 'Official visa URL', complete: meaningful(profile.visaOfficialUrl), blocking: true },
      { key: 'living-cost-range', section: 'LIVING_COST', label: 'Living cost range', complete: costRangeValid, blocking: true },
      { key: 'living-cost-currency', section: 'LIVING_COST', label: 'Canonical living cost currency', complete: meaningful(profile.livingCostCurrencyReferenceId), blocking: true },
      { key: 'official-links', section: 'OFFICIAL_LINKS', label: 'Official links', complete: nonEmpty(profile.officialLinks), blocking: true },
      { key: 'evidence-sources', section: 'EVIDENCE', label: 'Evidence sources', complete: nonEmpty(profile.evidenceSources), blocking: true },
      { key: 'source-audit-date', section: 'EVIDENCE', label: 'Source audit date', complete: meaningful(profile.sourceAuditDate), blocking: true },
      { key: 'source-verification', section: 'EVIDENCE', label: 'Source verification', complete: profile.sourceVerificationStatus === StudyDestinationVerificationStatus.VERIFIED, blocking: true },
    ];

    const reviewKeys = new Set([
      'overview-ar', 'overview-en', 'study-system-ar', 'study-system-en', 'admission-highlights',
      'visa-summary-ar', 'visa-summary-en', 'visa-requirements', 'visa-official-url',
      'living-cost-range', 'living-cost-currency', 'official-links', 'evidence-sources',
    ]);
    const readyForReview = checks.filter((check) => reviewKeys.has(check.key)).every((check) => check.complete);
    const readyForPublish = checks.filter((check) => check.blocking).every((check) => check.complete);
    const completenessStatus = readyForPublish
      ? StudyDestinationCompletenessStatus.READY_TO_PUBLISH
      : readyForReview
        ? StudyDestinationCompletenessStatus.READY_FOR_REVIEW
        : StudyDestinationCompletenessStatus.INCOMPLETE;

    return { readyForReview, readyForPublish, completenessStatus, checks };
  }
}

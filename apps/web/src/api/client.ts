import { CsrfClientManager } from '@manaratak/shared';

function currentPublicLocale(): 'ar' | 'en' {
  if (typeof window !== 'undefined') {
    const routeLocale = window.location.pathname.split('/').filter(Boolean)[0];
    if (routeLocale === 'ar' || routeLocale === 'en') return routeLocale;
  }
  if (typeof document !== 'undefined' && document.documentElement.lang === 'en') return 'en';
  return 'ar';
}

export interface ReferenceCountryDto {
  id: string;
  iso2Code: string;
  iso3Code: string;
  name: string;
  nameAr?: string | null;
  officialName?: string | null;
  region?: string | null;
  subregion?: string | null;
  defaultCurrencyCode?: string | null;
  defaultLanguageCode?: string | null;
  callingCode?: string | null;
  flagAssetId?: string | null;
  isActive: boolean;
  metadata?: Record<string, unknown>;
}

export interface PublicStudyDestinationDto {
  id: string;
  publicId: string;
  slug: string;
  countryReferenceId: string;
  status: 'PUBLISHED';
  completenessStatus: 'COMPLETE' | 'READY_TO_PUBLISH' | string;
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
  livingCostTier?: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH' | null;
  averageMonthlyLivingCostMin?: number | null;
  averageMonthlyLivingCostMax?: number | null;
  livingCostCurrencyReferenceId?: string | null;
  costHighlightsAr: Array<{ label: string; value: string }>;
  costHighlightsEn: Array<{ label: string; value: string }>;
  studentLifeHighlightsAr: string[];
  studentLifeHighlightsEn: string[];
  officialLinks: Array<{ labelAr: string; labelEn?: string; url: string; category: string; noteAr?: string; noteEn?: string }>;
  sourceVerificationStatus: 'VERIFIED';
  sourceAuditDate?: string | null;
  imageAssetId?: string | null;
  studyLanguageReferenceIds: string[];
  isFeatured: boolean;
  publishedAt?: string | null;
  country: ReferenceCountryDto;
  studyLanguages: Array<{ id: string; name: string; nameAr?: string | null; languageCode?: string; iso6391Code?: string | null }>;
  livingCostCurrency: { id: string; name: string; nameAr?: string | null; isoCode?: string; currencyCode?: string } | null;
}

export interface AdministrativeRegionDto {
  id: string;
  countryReferenceId?: string | null;
  countryIso2Code: string;
  regionCode: string;
  name: string;
  nameAr?: string | null;
  localName?: string | null;
  regionType?: string | null;
}

export interface ReferenceCityDto {
  id: string;
  countryReferenceId?: string | null;
  countryIso2Code: string;
  name: string;
  region?: string | null;
  timezone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isActive: boolean;
  metadata?: Record<string, unknown>;
  administrativeRegionId?: string | null;
  administrativeRegion?: AdministrativeRegionDto | null;
}

export interface ReferenceCountryFilters {
  region?: string;
  q?: string;
  activeOnly?: boolean;
}

export type AcademicTaxonomyNodeType =
  | 'ACADEMIC_FIELD'
  | 'DISCIPLINE'
  | 'PROGRAM_AREA'
  | 'SPECIALIZATION_CATEGORY'
  | 'STANDARD_CLASSIFICATION';
export type AcademicTaxonomyStatus = 'DRAFT' | 'READY_TO_REVIEW' | 'ACTIVE' | 'ARCHIVED';
export type AcademicStandardType = 'ISCED' | 'CIP' | 'CUSTOM_NATIONAL';

export interface AcademicTaxonomyNodeDto {
  nodeId: string;
  nodeType: AcademicTaxonomyNodeType;
  canonicalCode: string;
  canonicalName: string;
  description?: string;
  status: AcademicTaxonomyStatus;
  standardType?: AcademicStandardType;
  standardCode?: string;
  localizedNames?: Record<string, string>;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AcademicTaxonomyFilters {
  q?: string;
  nodeType?: AcademicTaxonomyNodeType;
  status?: AcademicTaxonomyStatus;
  standardType?: AcademicStandardType;
}

export interface AcademicTaxonomyAliasDto {
  aliasId: string;
  nodeId: string;
  locale?: string;
  alias: string;
  normalizedAlias: string;
  createdAt: string;
}

export interface AcademicStandardMappingDto {
  mappingId: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceStandard: AcademicStandardType;
  targetStandard: AcademicStandardType;
  strength: string;
  confidence?: number;
  notes?: string;
  createdAt: string;
}

export interface ScholarshipFilters {
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
  applicationDeadlineFrom?: string;
  applicationDeadlineTo?: string;
  cursor?: string;
  limit?: number;
}

export interface AdminScholarshipFilters {
  status?: string;
  completenessStatus?: string;
  country?: string;
  degreeLevel?: string;
  fundingCoverage?: string;
  sponsorName?: string;
  verificationStatus?: string;
  translationState?: 'NEEDS_TRANSLATION' | 'TRANSLATED';
  deadlineFrom?: string;
  deadlineTo?: string;
  sourceType?: string;
  query?: string;
  page?: number;
  pageSize?: number;
}

export interface AdminScholarshipSummary {
  all: number; imported: number; missingFields: number; needsVerification: number;
  needsTranslation: number; readyToPublish: number; published: number; archived: number;
}

export interface UniversityFilters {
  locale?: 'ar' | 'en';
  countryReferenceId?: string;
  countryIso2Code?: string;
  regionReferenceId?: string;
  cityReferenceId?: string;
  institutionType?: string;
  majorId?: string;
  search?: string;
  cursor?: string;
  limit?: number;
}

export interface MajorFilters {
  locale?: 'ar' | 'en';
  degreeLevel?: string;
  academicFieldOrDiscipline?: string;
  collegeOrFaculty?: string;
  cursor?: string;
  limit?: number;
}

export interface CourseFilters {
  accessType?: string;
  originType?: string;
  platformName?: string;
  category?: string;
  learningLanguage?: string;
  cursor?: string;
  limit?: number;
}

export type NativeCourseStatus =
  'DRAFT' | 'READY_TO_REVIEW' | 'READY_TO_PUBLISH' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED';
export interface NativeCourseDto {
  id: string;
  publicId: string;
  slug: string;
  displayName: string;
  canonicalName: string;
  originType: 'NATIVE_MANARATAK_COURSE';
  status: NativeCourseStatus;
  accessType: 'FREE_STUDY' | 'FREE_CERTIFICATE' | 'FREE_STUDY_AND_CERTIFICATE' | 'PAID';
  directCourseUrl: string;
  learningLanguage?: string;
  learningLanguageReferenceId?: string | null;
  category?: string;
  difficultyLevel?: string;
  studyDuration?: string;
  certificateAvailable?: boolean;
  thumbnailAssetId?: string;
  optionalFields?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
export interface CreateNativeCourseInput {
  titleAr: string;
  titleEn?: string;
  accessType?: 'FREE_STUDY' | 'FREE_CERTIFICATE' | 'FREE_STUDY_AND_CERTIFICATE' | 'PAID';
  learningLanguage?: string;
  category?: string;
  difficultyLevel?: string;
}
export interface UpdateNativeCourseInput {
  displayName?: string;
  accessType?: 'FREE_STUDY' | 'FREE_CERTIFICATE' | 'FREE_STUDY_AND_CERTIFICATE' | 'PAID';
  learningLanguage?: string | null;
  category?: string | null;
  difficultyLevel?: string | null;
  studyDuration?: string | null;
  certificateAvailable?: boolean | null;
  thumbnailAssetId?: string | null;
  description?: string;
  courseContent?: string;
  titleEn?: string;
  instructor?: string;
  prerequisites?: string[];
  targetAudience?: string[];
  learningOutcomes?: string[];
  promotionalVideoAssetId?: string;
  completionCriteria?: Record<string, unknown>;
}

export interface CourseEnrollmentPolicyDto {
  courseId: string;
  isCapacityLimited: boolean;
  maximumSeats?: number | null;
  requiresApproval: boolean;
  waitlistEnabled: boolean;
  prerequisiteCourseIds: string[];
  eligibilityRules?: Record<string, unknown> | null;
  requiresFinancialClearance: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CourseRelationshipReviewModel {
  courseId: string;
  source: {
    status: string;
    sourceImportRecordId?: string | null;
    shortCourseTopicsRaw?: string | null;
    learningLanguageRaw?: string | null;
    learningLanguageReferenceId?: string | null;
    learningLanguageResolutionState: string;
    learningLanguageResolutionMethod?: string | null;
    externalProviderId?: string | null;
  };
  taxonomyLinks: Array<Record<string, any> & { id: string; taxonomyNodeId: string; sourceTerm: string; reviewState: string; taxonomyNode?: { id: string; canonicalCode: string; canonicalName: string; nodeType: string } | null }>;
  majorProjections: Array<Record<string, any> & { id: string; majorId: string; relationshipType: string; projectionState: string; major?: { id: string; publicId: string; slug: string; displayName: string; status: string } | null }>;
  internationalTestRelationships: Array<Record<string, any> & {
    id: string;
    internationalTestId: string;
    relationshipType: 'PREPARATION' | 'PRACTICE' | 'EXAM_READINESS' | 'RELATED';
    reviewState: string;
    internationalTest?: { id: string; publicId: string; slug: string; displayName: string; abbreviation?: string | null; status: string } | null;
  }>;
  geography: {
    courseId: string;
    providerId?: string | null;
    providerName?: string | null;
    providerHeadquartersCountryReferenceId?: string | null;
    providerHeadquartersCountry?: { id: string; iso2Code: string; iso3Code: string; name: string } | null;
    studyCountryReferenceIds: string[];
    semantics: 'PROVIDER_HEADQUARTERS_ONLY' | 'NO_GEOGRAPHY';
  };
  closure: {
    languageCanonical: boolean;
    approvedTaxonomyLinks: number;
    approvedMajorProjections: number;
    approvedInternationalTestRelationships: number;
    reviewRequired: boolean;
  };
}

export interface AdminReferenceLanguageDto {
  id: string;
  isoCode: string;
  name: string;
  nameAr?: string | null;
  nativeName?: string | null;
  direction: 'LTR' | 'RTL';
  isActive: boolean;
}

export interface CourseModuleDto {
  id: string;
  courseId: string;
  title: string;
  description?: string | null;
  position: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}
export interface CourseLessonDto {
  id: string;
  courseId: string;
  moduleId: string;
  title: string;
  summary?: string | null;
  lessonType: string;
  position: number;
  estimatedDurationMinutes?: number | null;
  contentText?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}
export interface CourseLessonAssetDto {
  id: string;
  lessonId: string;
  assetId: string;
  assetReference?: string | null;
  title?: string | null;
  assetType: string;
  position: number;
  isRequired: boolean;
  metadata?: Record<string, unknown> | null;
}
export interface CourseQuizDto {
  id: string;
  courseId: string;
  moduleId?: string | null;
  lessonId?: string | null;
  title: string;
  instructions?: string | null;
  position: number;
  passingScore?: number | null;
  maxAttempts?: number | null;
  status: string;
}
export interface CourseQuestionBankDto {
  id: string;
  courseId: string;
  title: string;
  description?: string | null;
  status: string;
}
export interface CourseQuestionDto {
  id: string;
  courseId: string;
  quizId?: string | null;
  questionBankId?: string | null;
  questionType: string;
  prompt: string;
  choices?: unknown;
  correctAnswer?: unknown;
  explanation?: string | null;
  points: number;
  position: number;
  status: string;
}
export interface CourseCurriculumSnapshotDto {
  modules: CourseModuleDto[];
  lessons: CourseLessonDto[];
  assets: CourseLessonAssetDto[];
  quizzes: CourseQuizDto[];
  questionBanks: CourseQuestionBankDto[];
  questions: CourseQuestionDto[];
}
export interface NativeCourseReadinessDto {
  ready: boolean;
  percentage: number;
  checks: Array<{
    key: string;
    label: string;
    state: 'COMPLETE' | 'INCOMPLETE' | 'OPTIONAL';
    message?: string;
    targetSection?: string;
  }>;
}

export interface CmsFilters {
  contentType?: string;
  categorySlug?: string;
  q?: string;
  locale?: string;
  page?: number;
  pageSize?: number;
}

export interface StudentToolFilters {
  category?: string;
  visibility?: string;
  implementationStatus?: string;
  search?: string;
}

export interface ServiceFilters {
  serviceCategory?: string;
  fulfillmentType?: string;
  serviceAvailabilityStatus?: string;
  deliveryMode?: string;
  cursor?: string;
  limit?: number;
}

export interface InternationalTestFilters {
  locale?: 'ar' | 'en';
  testCategory?: string;
  providerName?: string;
  page?: number;
  pageSize?: number;
}

export interface PublicSearchRequest {
  scope: string;
  query: string;
  page?: number;
  limit?: number;
}

export interface PublicSearchMatchDto {
  target: {
    entityNamespace: string;
    resourceKey: string;
  };
  score: number;
  payload?: Record<string, unknown>;
}

export interface PublicSearchResponseDto {
  requestId: string;
  reference: string;
  matches: PublicSearchMatchDto[];
  totalCount: number;
  executionTimeMs: number;
}

export interface PublicScholarshipDto {
  publicId: string;
  slug: string;
  displayName: string;
  canonicalName: string;
  countryReferenceId?: string | null;
  countrySourceLabel?: string | null;
  studyLanguageReferenceId?: string | null;
  fundingTypeCode?: string | null;
  applicationUrl?: string | null;
  degreeTargets?: Array<{ degreeLevelId?: string | null; sourceLabel?: string | null; resolutionStatus?: string }>;
  majorTargets?: Array<{ majorId?: string | null; sourceLabel?: string | null; resolutionStatus?: string }>;
  eligibilityItems?: Array<{ itemTypeCode: string; valueText?: string | null; countryReferenceId?: string | null; degreeLevelId?: string | null; majorId?: string | null; internationalTestId?: string | null; resolutionStatus?: string }>;
  requiredDocumentItems?: Array<{ displayName: string; internationalTestId?: string | null; resolutionStatus?: string }>;
  universityLinks?: Array<{ universityId?: string | null; academicProgramId?: string | null; sourceLabel?: string | null; resolutionStatus?: string }>;
  benefits?: Array<{ benefitTypeCode: string; valueText?: string | null; amount?: string | number | null; currencyReferenceId?: string | null }>;
  fundingCoverage: string;
  coverageDetails: string;
  eligibleMajorsOrFields: string | string[];
  degreeLevel: string;

  requiredDocuments?: string;
  eligibilityCriteria?: string;
  studyLanguage?: string;
  applicationDeadline?: string | null;
  studyCountry?: string;
  applicationLink?: string;
  officialSourceUrl?: string;
  sponsorName?: string;
  targetUniversities?: string | string[];
  targetAcademicPrograms?: string | string[];
  fundingAmount?: string;
  currency?: string;
  duration?: string;
  localizedNames?: any;

  updatedAt: string;
}

export interface PublicUniversityDto {
  publicId: string;
  slug: string;
  displayName: string;
  canonicalName: string;
  officialWebsite: string;
  country: string;
  institutionType: string;
  countryReferenceId?: string | null;
  regionReferenceId?: string | null;
  cityReferenceId?: string | null;

  sourceUrl?: string | null;
  officialSourceUrl?: string | null;
  city?: string | null;
  logoAssetId?: string | null;
  foundedYear?: number | null;

  localizedNames?: Record<string, string>;
  campuses?: Record<string, unknown>[];
  accreditations?: Record<string, unknown>[];
  rankings?: Record<string, unknown>[];
  description?: string;
  languagesOfInstruction?: string[];
  tuitionReferences?: Record<string, unknown>[];
  admissionRequirements?: Record<string, unknown>[];
  academicPrograms?: Record<string, unknown>[];
  contactEmail?: string;
  contactPhone?: string;
  socialLinks?: Record<string, string>;
  metadata?: Record<string, unknown>;

  updatedAt: string;
}

export interface PublicMajorDto {
  publicId: string;
  slug: string;
  displayName: string;
  canonicalName: string;
  degreeLevel: string;
  sourceClassificationSystem: string;

  academicFieldOrDiscipline?: string | null;
  collegeOrFaculty?: string | null;
  classificationCode?: string | null;
  sourceUrl?: string | null;
  officialSourceUrl?: string | null;

  localizedNames?: Record<string, string>;
  aliases?: string | string[];
  synonyms?: string | string[];
  equivalencyMappings?: Record<string, unknown>[];
  degreeLevelMappings?: Record<string, unknown>[];
  relatedMajors?: string | string[];
  description?: string;
  studentFriendlySummary?: string;
  acquiredSkills?: string[];
  careerOutcomes?: string[];
  typicalCourses?: string[];
  contentSections?: Array<{
    sectionKey?: string;
    title?: string;
    content?: string;
    reviewStatus?: string;
    metadata?: Record<string, unknown>;
  }>;
  phaseLinks?: Array<{
    targetType: 'ACADEMIC_PROGRAM' | 'SCHOLARSHIP' | 'COURSE' | 'CAREER' | 'JOB' | 'TAXONOMY_NODE';
    label: string;
    href: string;
    query: Record<string, string>;
    phase: number;
    relationship: string;
    source: 'MAJOR_IDENTITY' | 'MAJOR_LEVEL_PROFILE' | 'TEXT_MATCH' | 'TAXONOMY_MAPPING';
    metadata?: Record<string, unknown>;
  }>;
  relationships?: Array<{
    targetMajorId?: string;
    relationshipType?: string;
    notes?: string;
    metadata?: Record<string, unknown>;
  }>;
  metadata?: Record<string, unknown>;

  updatedAt: string;
}

export interface PublicCourseDto {
  /** Required canonical P13 owner identity. Keep synchronized with the owner DTO. */
  ownerId: string;
  publicId: string;
  slug: string;
  displayName: string;
  canonicalName: string;
  accessType: string;
  originType: string;
  directCourseUrl: string;
  isStudyFree?: boolean | null;
  isFreeCertificate?: boolean | null;
  certificateType?: string | null;
  learningLanguageReferenceId?: string | null;

  platformName?: string | null;
  providerName?: string | null;
  learningLanguage?: string | null;
  studyDuration?: string | null;
  certificateAvailable?: boolean | null;
  category?: string | null;
  difficultyLevel?: string | null;
  sourceUrl?: string | null;
  officialSourceUrl?: string | null;
  thumbnailAssetId?: string | null;

  courseContent?: string;
  relatedMajorsOrFields?: string | string[];
  acquiredSkills?: string[];
  localizedNames?: Record<string, string>;
  metadata?: Record<string, unknown>;

  updatedAt: string;
}

export interface StudentCourseProgressSnapshotDto {
  enrollment: {
    id: string;
    courseId: string;
    studentReferenceId: string;
    status: string;
    enrolledAt: string;
    completedAt?: string | null;
    progressPercentage: number;
    lastAccessedAt?: string | null;
  };
  lessons: Array<{
    id: string;
    courseId: string;
    lessonId: string;
    studentReferenceId: string;
    status: string;
    progressPercentage: number;
    startedAt?: string | null;
    completedAt?: string | null;
  }>;
  quizAttempts: Array<{
    id: string;
    courseId: string;
    quizId: string;
    studentReferenceId: string;
    attemptNumber: number;
    status: string;
    score?: number | null;
    passed?: boolean | null;
    startedAt: string;
    submittedAt?: string | null;
  }>;
  completion?: { id: string; status: string; completedAt: string; eligibleForCertificate: boolean } | null;
}

export interface CourseLearnerQuestionDto {
  id: string;
  quizId?: string | null;
  questionType: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | string;
  prompt: string;
  choices?: unknown;
  points: number;
  position: number;
}

export interface CourseLearnerWorkspaceDto {
  progress: StudentCourseProgressSnapshotDto;
  curriculum: {
    modules: CourseModuleDto[];
    lessons: CourseLessonDto[];
    assets: Array<{ id: string; lessonId: string; title?: string | null; assetType: string; position: number; isRequired: boolean }>;
    quizzes: CourseQuizDto[];
    questions: CourseLearnerQuestionDto[];
  };
}

export interface StudentCourseQuizAttemptDto {
  id: string;
  courseId: string;
  quizId: string;
  studentReferenceId: string;
  attemptNumber: number;
  status: string;
  score?: number | null;
  passed?: boolean | null;
  startedAt: string;
  submittedAt?: string | null;
}

export interface CertificateVerificationDto {
  publicId: string;
  serialNumber: string;
  verificationCode: string;
  verificationUrl?: string | null;
  status: string;
  certificateType: string;
  recipientDisplayName?: string | null;
  achievementType: 'COURSE' | 'LEARNING_PATH';
  achievementDisplayName: string;
  courseDisplayName?: string | null;
  learningPathDisplayName?: string | null;
  completedAt: string;
  /** Compatibility alias for older admin-preview code; public API uses completedAt. */
  courseCompletedAt?: string;
  issuedAt: string;
  expiresAt?: string | null;
  validityPolicy: string;
  issuerName?: string | null;
  grade?: string | null;
  skills: string[];
  competencies: string[];
  templateVersion?: string | null;
  revokedAt?: string | null;
  isValid: boolean;
  integrityVerified: boolean;
}

export interface AdminCertificateDto extends CertificateVerificationDto {
  id: string;
  studentReferenceId: string;
  verificationHash?: string;
  revocationReason?: string | null;
  courseId: string;
  courseCompletionId: string;
  validityPolicy: string;
  templateId?: string | null;
  certificatePdfAssetId?: string | null;
  previewImageAssetId?: string | null;
  verificationQrAssetId?: string | null;
  digitalSignature?: string | null;
  signingKeyReference?: string | null;
  score?: number | null;
  archivedAt?: string | null;
  replacesCertificateId?: string | null;
  replacedByCertificateId?: string | null;
}

export interface AdminCertificateTemplateDto {
  id: string;
  publicId: string;
  code: string;
  name: string;
  nameAr: string;
  nameEn: string;
  templateVersion: string;
  status: string;
  issuerName: string;
  issuerReferenceId?: string | null;
  language: 'ARABIC' | 'ENGLISH' | 'BILINGUAL';
  layout: 'LANDSCAPE' | 'PORTRAIT';
  accentColor: string;
  secondaryColor: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  signatoryNameAr?: string | null;
  signatoryNameEn?: string | null;
  signatoryTitleAr?: string | null;
  signatoryTitleEn?: string | null;
  logoAssetId?: string | null;
  sealAssetId?: string | null;
  signatureAssetId?: string | null;
  designAssetId?: string | null;
  updatedAt: string;
}

export interface CertificateAnalyticsDto {
  total: number;
  active: number;
  revoked: number;
  archived: number;
  expiringSoon: number;
  templates: number;
  verifications: number;
}

export interface StudentWorkspaceDto {
  id: string;
  studentReferenceId: string;
  displayName?: string | null;
  preferredLanguage?: string | null;
  avatarAssetId?: string | null;
  status: string;
  version: number;
  timezone?: string | null;
  theme?: string | null;
  layoutPreferences?: Record<string, unknown> | null;
  notificationMatrix?: Record<string, unknown> | null;
  privacyPreferences?: Record<string, unknown> | null;
  accessibilityPreferences?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  lastActiveAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudentOwnedAssetDto {
  id: string;
  reference: string;
  lifecycleState?: string;
  metadata?: { originalFilename?: string; mimeType?: string };
}

export interface StudentOwnedAssetPageDto {
  items: StudentOwnedAssetDto[];
  hasMore: boolean;
  nextCursor: string | null;
}

export interface StudentAssetDeliveryGrantDto {
  assetId: string;
  url: string;
  headers?: Record<string, string>;
  expiresAt: string;
}

export interface StudentPrivacyConsentDecisionDto {
  id: string;
  studentReferenceId: string;
  workspaceVersion: number;
  changedFields: string[];
  afterPreferences: Record<string, boolean>;
  decidedAt: string;
}

export interface StudentSavedItemDto {
  id: string;
  studentReferenceId: string;
  collectionId?: string | null;
  entityType: string;
  entityId: string;
  entitySlug?: string | null;
  displayName?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  savedAt: string;
  updatedAt: string;
}

export interface HydratedStudentSavedItemDto {
  savedItem: StudentSavedItemDto;
  owner: {
    ownerType: string;
    ownerId: string;
    publicId?: string;
    slug?: string;
    displayName?: string;
    lifecycleStatus?: string;
    available: boolean;
  } | null;
}

export interface StudentServiceRequestDto {
  id: string; publicId: string; studentReferenceId: string; serviceId: string; status: string;
  requestParameters: Record<string, unknown>; providerReferenceId?: string | null; financeInvoiceId?: string | null; financeInvoicePublicId?: string | null;
  fulfillmentMetadata?: Record<string, unknown> | null; createdAt: string; updatedAt: string; completedAt?: string | null; version: number;
}

export interface StudentApplicationTrackerDto {
  id: string; studentReferenceId: string; scholarshipId: string; scholarshipSlug?: string | null; stage: string; notes?: string | null;
  deadlineAt?: string | null; status: 'ACTIVE' | 'ARCHIVED'; version: number; createdAt: string; updatedAt: string; archivedAt?: string | null;
  checklist: Array<{ id: string; trackerId: string; label: string; completed: boolean; position: number; completedAt?: string | null; createdAt: string; updatedAt: string }>;
  owner?: { id: string; slug?: string | null; displayName: string; country?: string | null; deadlineAt?: string | null; lifecycleStatus?: string | null; available: boolean } | null;
}

export interface StudentSavedCollectionDto {
  id: string;
  studentReferenceId: string;
  name: string;
  description?: string | null;
  type: string;
  color?: string | null;
  icon?: string | null;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface StudentCourseProgressDto {
  enrollmentId: string;
  courseId: string;
  courseSlug: string;
  courseName: string;
  status: string;
  progressPercentage: number;
  enrolledAt: string;
  lastAccessedAt?: string | null;
  completedAt?: string | null;
}

export interface StudentCertificateProjectionDto {
  id: string;
  publicId: string;
  serialNumber: string;
  verificationCode: string;
  status: string;
  courseDisplayName: string;
  issuedAt: string;
  expiresAt?: string | null;
  certificatePdfAssetId?: string | null;
  previewImageAssetId?: string | null;
}

export interface StudentActivityDto {
  id: string;
  activityType?: string;
  eventType?: string;
  title: string;
  description?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  entitySlug?: string | null;
  sourceDomain?: string;
  occurredAt: string;
}

export interface StudentNotificationProjectionDto {
  id: string;
  category: string;
  title: string;
  message: string;
  actionUrl?: string | null;
  readAt?: string | null;
  occurredAt: string;
}

export interface StudentQuickActionDto {
  id: string;
  label: string;
  description: string;
  href: string;
  priority: number;
  kind: string;
}

export interface StudentRecentlyViewedDto {
  id: string;
  entityType: string;
  entityId: string;
  entitySlug?: string | null;
  viewedAt: string;
}

export interface StudentWorkspaceSnapshotDto {
  id: string;
  label?: string | null;
  workspaceVersion: number;
  createdAt: string;
}

export interface StudentWidgetDefinitionDto {
  key: string;
  labelAr: string;
  labelEn: string;
  defaultVisible: boolean;
  supportedDevices: string[];
}

export interface StudentDashboardSummaryDto {
  workspace: StudentWorkspaceDto;
  savedItems: StudentSavedItemDto[];
  collections: StudentSavedCollectionDto[];
  timeline: StudentActivityDto[];
  recentActivity: StudentActivityDto[];
  courseEnrollments: StudentCourseProgressDto[];
  certificates: StudentCertificateProjectionDto[];
  notifications: StudentNotificationProjectionDto[];
  quickActions: StudentQuickActionDto[];
  recentlyViewed: StudentRecentlyViewedDto[];
  widgetRegistry: StudentWidgetDefinitionDto[];
  statistics: {
    savedItems: number;
    activeCourses: number;
    completedCourses: number;
    averageCourseProgress: number;
    certificates: number;
    unreadNotifications: number;
  };
  certificateCount: number;
  activeCourseEnrollmentCount: number;
  completedCourseEnrollmentCount: number;
  capabilityStatus: Record<string, 'AVAILABLE' | 'DEGRADED' | 'NOT_CONFIGURED'>;
  partialFailures: string[];
}

export interface MoneyAmountDto {
  amountMinorUnits: string;
  currencyCode: string;
  scale: number;
}

export interface StudentFinanceInvoiceDto {
  id: string;
  publicId: string;
  invoiceNumber: string;
  originDomain: string;
  originReferenceId: string;
  studentReferenceId?: string | null;
  payerReferenceId?: string | null;
  status: string;
  totalAmount: MoneyAmountDto;
  amountDue: MoneyAmountDto;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: MoneyAmountDto;
    totalPrice: MoneyAmountDto;
  }>;
  dueDate?: string | null;
  issuedAt?: string | null;
  paidAt?: string | null;
  updatedAt: string;
}

export interface StudentFinancePaymentDto {
  id: string;
  publicId: string;
  invoiceId: string;
  amount: MoneyAmountDto;
  status: string;
  paymentMethod: string;
  gatewayProvider?: string | null;
  gatewayReference?: string | null;
  capturedAt?: string | null;
  createdAt: string;
}

export interface CmsLocalizedPayloadDto {
  id: string;
  contentId: string;
  locale: string;
  localizedSlug: string;
  title: string;
  summary?: string | null;
  body: string;
  readingTimeMinutes?: number | null;
  seoMetadata?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicCmsContentDto {
  publicId: string;
  contentId: string;
  siteIdentifier: string;
  locale: string;
  slug: string;
  canonicalUrl: string;
  contentType: string;
  title: string;
  summary?: string | null;
  body: string;
  categorySlug?: string | null;
  featuredAssetId?: string | null;
  attachmentAssetIds: string[];
  tags: Array<{ normalizedValue: string; label: string }>;
  publishedAt: string;
  versionNumber: number;
  availableLocales: Array<{ locale: string; slug: string }>;
  localizedPayload?: CmsLocalizedPayloadDto | null;
  seoMetadata: {
    title: string;
    description: string;
    canonicalUrl?: string | null;
    keywords: string[];
    noIndex: boolean;
    noFollow: boolean;
    openGraphAssetId?: string | null;
  };
}

export interface PublicStudentToolDto {
  id?: string;
  toolKey: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  category: string;
  executionType: string;
  visibility: string;
  implementationStatus: string;
  lifecycle: string;
  availability: { publicEnabled: boolean; anonymousEnabled: boolean; authenticatedEnabled: boolean; adminOnly: boolean; maintenanceMode: boolean };
  featureFlags: { globallyEnabled: boolean; anonymousEnabled: boolean; authenticatedEnabled: boolean; maintenanceMode: boolean };
  estimatedMinutes: number;
  inputSchema?: { fields?: Array<{ key: string; labelAr: string; labelEn?: string; required: boolean; type: string }> };
  outputSchema?: { fields?: Array<{ key: string; labelAr: string; labelEn?: string; required: boolean; type: string }> };
  dependencies?: Array<{ phase: string; required: boolean; description: string; capabilityKey?: string | null }>;
  currentVersion: { semanticVersion: string };
  launchOrder: number;
}

export interface StudentToolExecutionResponseDto {
  toolKey: string;
  executionId: string;
  toolVersion: string;
  status: string;
  result?: unknown;
  warnings?: string[];
}

export interface PublicServiceCatalogItemDto {
  publicId: string;
  slug: string;
  displayName: string;
  serviceCategory: string;
  fulfillmentType: string;
  serviceDescription: string;
  serviceAvailabilityStatus: string;
  requiredInputsOrDocuments: string[];
  deliveryMode: string;
  responsibleServiceOwnerType: string;
  providerName?: string | null;
  estimatedDeliveryTime?: string | null;
  appointmentRequired?: boolean | null;
  supportedCountryReferenceIds?: string[] | null;
  supportedLanguageReferenceIds?: string[] | null;
  supportedCountries?: string[] | null;
  supportedLanguages?: string[] | null;
  servicePrerequisites?: string[] | null;
  deliveryArtifactTypes?: string[] | null;
  pricingReferenceId?: string | null;
  thumbnailAssetId?: string | null;
  publicDisplayMetadata?: Record<string, unknown> | null;
}

export interface PublicInternationalTestVariantDto {
  id: string;
  variantName: string;
  deliveryMode: string;
  isActive: boolean;
  specificOfficialUrl?: string;
  administrativeNotes?: string;
}

export interface PublicInternationalTestSectionDto {
  id: string;
  sectionName: string;
  sectionType: string;
  durationMinutes?: number;
  order: number;
  questionTypes?: string[];
  scoreMinimum?: number;
  scoreMaximum?: number;
}

export interface PublicInternationalTestScoreScaleDto {
  id: string;
  overallMinimum: number;
  overallMaximum: number;
  scoreIncrement?: number;
  bandsOrLevels?: string[];
  passFailRules?: string;
  cefrEquivalency?: string;
  crossTestEquivalency?: string;
  resultValidityDurationMonths?: number;
  resultDeliveryTimeDays?: number;
  scoreReportingUrl?: string;
}

export interface PublicInternationalTestFeeMetadataDto {
  id: string;
  feeType: string;
  amount: number;
  currencyCode: string;
  hasRegionalVariation: boolean;
  validityWindowNotes?: string;
}

export interface PublicInternationalTestOfficialLinkDto {
  id: string;
  linkType: string;
  url: string;
  description?: string;
}

export interface PublicInternationalTestReferenceRelationshipDto {
  id?: string;
  canonicalReferenceId: string;
  referenceCode?: string;
  relationshipType: string;
  notes?: string;
}

export interface PublicInternationalTestAvailabilityDto {
  id: string;
  availableCountryIds: string[];
  availableCityIds?: string[];
  onlineAvailabilityRegions?: string[];
  testingWindowsNotes?: string;
}

export interface PublicInternationalTestPreparationMaterialDto {
  id: string;
  materialType: string;
  url?: string;
  assetId?: string;
  title: string;
  description?: string;
}

export interface PublicInternationalTestDto {
  id: string;
  publicId?: string;
  slug: string;
  canonicalName: string;
  displayName: string;
  localizedNameAr?: string;
  localizedNameEn?: string;
  abbreviation?: string;
  testCode?: string;
  testCategory: string;
  providerName: string;

  status: string;
  isPubliclyVisible?: boolean;
  completenessStatus?: string;

  variants?: PublicInternationalTestVariantDto[];
  scoreScale?: PublicInternationalTestScoreScaleDto;
  sections?: PublicInternationalTestSectionDto[];
  fees?: PublicInternationalTestFeeMetadataDto[];

  registrationRequirements?: string;
  identificationRequirements?: string;
  retakePolicy?: string;
  cancellationReschedulingNotes?: string;
  accessibilityNotes?: string;

  availability?: PublicInternationalTestAvailabilityDto;
  countryRelationships?: PublicInternationalTestReferenceRelationshipDto[];
  languageRelationships?: PublicInternationalTestReferenceRelationshipDto[];
  officialLinks?: PublicInternationalTestOfficialLinkDto[];
  preparationMaterials?: PublicInternationalTestPreparationMaterialDto[];

  [key: string]: unknown;
}

export interface PublicCareerEmployerDto {
  id: string;
  publicId: string;
  slug: string;
  displayName: string;
  employerType: string;
  industry?: string | null;
  countryReferenceId?: string | null;
  cityReferenceId?: string | null;
  country?: string | null;
  city?: string | null;
  websiteUrl?: string | null;
  description?: string | null;
}

export interface PublicCareerJobDto {
  id: string;
  publicId: string;
  slug: string;
  canonicalTitle: string;
  title: string;
  opportunityType: string;
  employmentType: string;
  jobCategory: string;
  description: string;
  countryReferenceId: string;
  cityReferenceId?: string | null;
  country?: string | null;
  city?: string | null;
  employerId: string;
  employer?: PublicCareerEmployerDto;
  applicationDeadline?: string | null;
  externalPostingUrl?: string | null;
  salaryRange?: Record<string, unknown> | null;
  requiredSkills?: string[] | null;
  educationRequirement?: string | null;
  languageRequirements?: string[] | null;
  remoteOption: boolean;
  metadata?: Record<string, unknown> | null;
  updatedAt: string;
}

export interface StablePublicGraphIdentity {
  ownerId: string;
  publicId?: string;
  slug?: string;
  canonicalCode?: string;
  displayName: string;
}


export interface PublicEditorialGraphIdentity {
  contentId: string;
  publicId: string;
  slug: string;
  contentType: string;
  title: string;
  summary?: string | null;
  locale: string;
  publishedAt: string;
}

export interface PublicMajorGraphDto {
  subject: StablePublicGraphIdentity;
  relationships: {
    universities: PaginatedResult<StablePublicGraphIdentity & { matchingPrograms?: Array<{ ownerId: string; sourceProgramName: string; degreeLevelId?: string | null; majorOwnerId: string }> }>;
    scholarships: PaginatedResult<StablePublicGraphIdentity>;
    courses: PaginatedResult<StablePublicGraphIdentity & { directCourseUrl: string; providerName?: string | null; category?: string | null }>;
    editorialContent: PublicEditorialGraphIdentity[];
  };
}

export interface PublicUniversityGraphDto {
  subject: StablePublicGraphIdentity;
  countryOwnerId?: string | null;
  relationships: {
    majors: StablePublicGraphIdentity[];
    academicPrograms: Array<{ ownerId: string; sourceProgramName: string; degreeLevelId?: string | null; majorOwnerId: string }>;
    scholarships: PaginatedResult<StablePublicGraphIdentity>;
    editorialContent: PublicEditorialGraphIdentity[];
  };
}

export interface PublicScholarshipGraphDto {
  subject: StablePublicGraphIdentity;
  countryOwnerId?: string | null;
  relationships: {
    universities: StablePublicGraphIdentity[];
    academicPrograms: Array<{ ownerId: string; universityOwnerId: string; universityPublicId: string; universitySlug: string; universityDisplayName: string; sourceProgramName: string; degreeLevelId?: string | null; majorOwnerId?: string | null; majorMappingState: string; status: string }>;
    majors: StablePublicGraphIdentity[];
    editorialContent: PublicEditorialGraphIdentity[];
  };
}

export interface PublicCountryGraphDto {
  subject: StablePublicGraphIdentity & { canonicalCode: string };
  relationships: {
    universities: PaginatedResult<StablePublicGraphIdentity>;
    academicPrograms: Array<{ ownerId: string; universityOwnerId: string; universityPublicId: string; universitySlug: string; universityDisplayName: string; sourceProgramName: string; degreeLevelId?: string | null; majorOwnerId?: string | null; majorMappingState: string; status: string }>;
    majors: StablePublicGraphIdentity[];
    scholarships: PaginatedResult<StablePublicGraphIdentity>;
    internationalTests: PaginatedResult<StablePublicGraphIdentity & { providerName: string; status: string }>;
    services: PaginatedResult<StablePublicGraphIdentity & { serviceCategory: string; deliveryMode: string }>;
    careerJobs: PaginatedResult<StablePublicGraphIdentity & { opportunityType: string; employmentType: string }>;
    providerHeadquartersCourses: PaginatedResult<StablePublicGraphIdentity & { directCourseUrl: string; providerName?: string | null; category?: string | null }>;
    editorialContent: PublicEditorialGraphIdentity[];
  };
}

export interface CareerFilters {
  opportunityType?: string;
  employmentType?: string;
  jobCategory?: string;
  countryReferenceId?: string;
  cityReferenceId?: string;
  employerId?: string;
  cursor?: string;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  hasMore: boolean;
  nextCursor: string | null;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const csrfManager = CsrfClientManager.getInstance(API_BASE_URL);

function ensureCanonicalMutationHeaders(init?: RequestInit): RequestInit | undefined {
  if (!init) return init;
  const method = (init.method || 'GET').toUpperCase();
  if (!['POST', 'PUT', 'PATCH'].includes(method)) return init;
  const headers = new Headers(init.headers);
  if (!headers.has('Idempotency-Key')) headers.set('Idempotency-Key', crypto.randomUUID());
  if (!headers.has('X-Correlation-ID')) headers.set('X-Correlation-ID', crypto.randomUUID());
  return { ...init, headers };
}

export async function apiFetch(
  input: string | URL | Request,
  init?: RequestInit,
): Promise<Response> {
  return csrfManager.fetchWithCsrf(input, ensureCanonicalMutationHeaders(init));
}

const STUDENT_TOOLS_SESSION_STORAGE_KEY = 'manaratak_student_tools_session';

async function studentToolFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  try {
    const token = sessionStorage.getItem(STUDENT_TOOLS_SESSION_STORAGE_KEY);
    if (token) headers.set('x-student-tools-session', token);
  } catch {
    // Storage may be unavailable in privacy-restricted contexts; server-side network limiting still applies.
  }
  const response = await apiFetch(input, { ...init, headers });
  const issued = response.headers.get('x-student-tools-session');
  if (issued) {
    try { sessionStorage.setItem(STUDENT_TOOLS_SESSION_STORAGE_KEY, issued); } catch { /* no-op */ }
  }
  return response;
}

function getAdminHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  return {
    ...extraHeaders,
  };
}

function getStudentHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  return {
    ...extraHeaders,
  };
}

async function adminCourseRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(`${API_BASE_URL}/admin/courses${path}`, {
    ...init,
    headers: getAdminHeaders({
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers as Record<string, string> | undefined),
    }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      (typeof body.error === 'string' ? body.error : body.error?.message) ||
        `Course request failed (${response.status})`,
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const errorData = await res.json();
    if (typeof errorData === 'string') return errorData;
    if (errorData?.error) {
      if (typeof errorData.error === 'string') return errorData.error;
      if (typeof errorData.error.message === 'string') return errorData.error.message;
      if (typeof errorData.error.code === 'string') return errorData.error.code;
    }
    if (typeof errorData?.message === 'string') return errorData.message;
  } catch {
    // Ignore parse errors
  }
  return fallback;
}

async function studentCourseRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(`${API_BASE_URL}/student/courses${path}`, {
    ...init,
    headers: getStudentHeaders({
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers as Record<string, string> | undefined),
    }),
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error('STUDENT_AUTHENTICATION_REQUIRED');
    throw new Error(await parseErrorMessage(response, `Student course request failed (${response.status})`));
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export type PublicGlobalSearchKind = 'scholarships' | 'universities' | 'majors' | 'countries' | 'courses' | 'exams' | 'articles' | 'services' | 'tools' | 'jobs';
export interface PublicGlobalSearchItem {
  target: { entityNamespace: string; resourceKey: string };
  score: number;
  kind: PublicGlobalSearchKind;
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  originType?: string;
  contentType?: string;
  url: string;
}
export interface PublicGlobalSearchPage {
  items: PublicGlobalSearchItem[];
  hasMore: boolean;
  nextCursor: string | null;
}

export class ApiClient {
  static async searchPublicCatalog(input: {
    q: string;
    locale?: 'ar' | 'en';
    limit?: number;
    cursor?: string;
    kinds?: PublicGlobalSearchKind[];
  }): Promise<PublicGlobalSearchPage> {
    const params = new URLSearchParams({ q: input.q, locale: input.locale ?? currentPublicLocale(), limit: String(input.limit ?? 20) });
    if (input.cursor) params.set('cursor', input.cursor);
    if (input.kinds?.length) params.set('kinds', input.kinds.join(','));
    const res = await apiFetch(`${API_BASE_URL}/search/public?${params.toString()}`);
    if (!res.ok) throw new Error(await parseErrorMessage(res, 'تعذر تنفيذ البحث العام'));
    return res.json();
  }


  static async getAdminHealthOverview(): Promise<any> {
    const res = await apiFetch(`${API_BASE_URL}/monitoring/overview`, {
      headers: getAdminHeaders(),
      credentials: 'include',
    });
    if (!res.ok) throw new Error(await parseErrorMessage(res, 'Failed to fetch health overview'));
    return res.json();
  }

  static async getStudyDestinations(filters: { isFeatured?: boolean; page?: number; pageSize?: number } = {}): Promise<PaginatedResult<PublicStudyDestinationDto>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== null) params.set(key, String(value)); });
    const res = await apiFetch(`${API_BASE_URL}/study-destinations?${params.toString()}`);
    if (!res.ok) throw new Error(await parseErrorMessage(res, 'Failed to fetch study destinations'));
    return res.json();
  }

  static async getStudyDestinationBySlug(slug: string): Promise<PublicStudyDestinationDto> {
    const res = await apiFetch(`${API_BASE_URL}/study-destinations/${encodeURIComponent(slug)}`);
    if (!res.ok) {
      if (res.status === 404) throw new Error('Study destination not found');
      throw new Error(await parseErrorMessage(res, 'Failed to fetch study destination'));
    }
    return res.json();
  }

  static async getReferenceCountries(
    filters: ReferenceCountryFilters = {},
  ): Promise<ReferenceCountryDto[]> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });

    const res = await apiFetch(`${API_BASE_URL}/reference-data/countries?${params.toString()}`);
    if (!res.ok) {
      const msg = await parseErrorMessage(res, 'Failed to fetch countries');
      throw new Error(msg);
    }
    const payload = await res.json();
    return payload.data || [];
  }

  static async getReferenceCountry(iso2Code: string): Promise<ReferenceCountryDto> {
    const res = await apiFetch(
      `${API_BASE_URL}/reference-data/countries/${encodeURIComponent(iso2Code)}`,
    );
    if (!res.ok) {
      if (res.status === 404) throw new Error('Country not found');
      const msg = await parseErrorMessage(res, 'Failed to fetch country');
      throw new Error(msg);
    }
    return res.json();
  }

  static async getAdminReferenceCountries(
    filters: ReferenceCountryFilters = {},
  ): Promise<ReferenceCountryDto[]> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') params.append(key, String(value));
    });
    const res = await apiFetch(
      `${API_BASE_URL}/admin/reference-data/countries?${params.toString()}`,
      {
        headers: getAdminHeaders(),
      },
    );
    if (!res.ok) {
      const msg = await parseErrorMessage(res, 'Failed to fetch admin countries');
      throw new Error(msg);
    }
    const payload = await res.json();
    return payload.data || [];
  }

  static async getAdminReferenceCountry(iso2Code: string): Promise<ReferenceCountryDto> {
    const res = await apiFetch(
      `${API_BASE_URL}/admin/reference-data/countries/${encodeURIComponent(iso2Code)}`,
      {
        headers: getAdminHeaders(),
      },
    );
    if (!res.ok) {
      if (res.status === 404) throw new Error('Country not found');
      const msg = await parseErrorMessage(res, 'Failed to fetch admin country');
      throw new Error(msg);
    }
    return res.json();
  }

  static async listReferenceCities(
    filters: { countryIso2Code?: string; q?: string; region?: string } = {},
  ): Promise<ReferenceCityDto[]> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') params.append(key, String(value));
    });
    const res = await apiFetch(`${API_BASE_URL}/reference-data/cities?${params.toString()}`);
    if (!res.ok) {
      const msg = await parseErrorMessage(res, 'Failed to fetch cities');
      throw new Error(msg);
    }
    const payload = await res.json();
    return payload.data || [];
  }

  static async getAdminAcademicTaxonomyNodes(
    filters: AcademicTaxonomyFilters = {},
  ): Promise<AcademicTaxonomyNodeDto[]> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    const res = await apiFetch(
      `${API_BASE_URL}/admin/academic-taxonomy/nodes?${params.toString()}`,
      {
        headers: getAdminHeaders(),
      },
    );
    if (!res.ok) {
      const msg = await parseErrorMessage(res, 'Failed to fetch academic taxonomy nodes');
      throw new Error(msg);
    }
    const payload = await res.json();
    return payload.data || [];
  }

  static async getAdminAcademicTaxonomyNode(nodeId: string): Promise<AcademicTaxonomyNodeDto> {
    const res = await apiFetch(
      `${API_BASE_URL}/admin/academic-taxonomy/nodes/${encodeURIComponent(nodeId)}`,
      {
        headers: getAdminHeaders(),
      },
    );
    if (!res.ok) {
      const msg = await parseErrorMessage(res, 'Academic taxonomy node not found');
      throw new Error(msg);
    }
    return res.json();
  }

  static async getAdminAcademicTaxonomyChildren(
    nodeId: string,
  ): Promise<AcademicTaxonomyNodeDto[]> {
    const res = await apiFetch(
      `${API_BASE_URL}/admin/academic-taxonomy/nodes/${encodeURIComponent(nodeId)}/children`,
      {
        headers: getAdminHeaders(),
      },
    );
    if (!res.ok) {
      const msg = await parseErrorMessage(res, 'Failed to fetch taxonomy children');
      throw new Error(msg);
    }
    const payload = await res.json();
    return payload.data || [];
  }

  static async getAdminAcademicTaxonomyParents(nodeId: string): Promise<AcademicTaxonomyNodeDto[]> {
    const res = await apiFetch(
      `${API_BASE_URL}/admin/academic-taxonomy/nodes/${encodeURIComponent(nodeId)}/parents`,
      {
        headers: getAdminHeaders(),
      },
    );
    if (!res.ok) {
      const msg = await parseErrorMessage(res, 'Failed to fetch taxonomy parents');
      throw new Error(msg);
    }
    const payload = await res.json();
    return payload.data || [];
  }

  static async getAdminAcademicTaxonomyAliases(
    nodeId: string,
  ): Promise<AcademicTaxonomyAliasDto[]> {
    const res = await apiFetch(
      `${API_BASE_URL}/admin/academic-taxonomy/nodes/${encodeURIComponent(nodeId)}/aliases`,
      {
        headers: getAdminHeaders(),
      },
    );
    if (!res.ok) {
      const msg = await parseErrorMessage(res, 'Failed to fetch taxonomy aliases');
      throw new Error(msg);
    }
    const payload = await res.json();
    return payload.data || [];
  }

  static async getAdminAcademicTaxonomyMappings(
    nodeId: string,
  ): Promise<AcademicStandardMappingDto[]> {
    const res = await apiFetch(
      `${API_BASE_URL}/admin/academic-taxonomy/nodes/${encodeURIComponent(nodeId)}/mappings`,
      {
        headers: getAdminHeaders(),
      },
    );
    if (!res.ok) {
      const msg = await parseErrorMessage(res, 'Failed to fetch taxonomy mappings');
      throw new Error(msg);
    }
    const payload = await res.json();
    return payload.data || [];
  }

  static async search(request: PublicSearchRequest): Promise<PublicSearchResponseDto> {
    const res = await apiFetch(`${API_BASE_URL}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scope: request.scope,
        criteria: {
          query: request.query,
          filters: [],
          logicalOperator: 'AND',
        },
        pagination: {
          page: request.page ?? 1,
          limit: request.limit ?? 10,
        },
      }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to execute search',
      );
    }
    return res.json();
  }

  static async getScholarships(
    filters: ScholarshipFilters,
    locale: 'ar' | 'en' = currentPublicLocale(),
  ): Promise<PaginatedResult<PublicScholarshipDto>> {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    params.set('locale', locale);
    const res = await apiFetch(`${API_BASE_URL}/public/scholarships?${params.toString()}`);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to fetch scholarships',
      );
    }
    return res.json();
  }

  static async getScholarshipBySlug(slug: string, locale: 'ar' | 'en' = currentPublicLocale()): Promise<PublicScholarshipDto> {
    const res = await apiFetch(`${API_BASE_URL}/public/scholarships/${encodeURIComponent(slug)}?locale=${encodeURIComponent(locale)}`);
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error('Scholarship not found');
      }
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to fetch scholarship',
      );
    }
    return res.json();
  }

  static async getUniversities(
    filters: UniversityFilters,
  ): Promise<PaginatedResult<PublicUniversityDto>> {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    params.set('locale', filters.locale ?? currentPublicLocale());
    const res = await apiFetch(`${API_BASE_URL}/public/universities?${params.toString()}`);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to fetch universities',
      );
    }
    return res.json();
  }

  static async getUniversityBySlug(
    slug: string,
    locale: 'ar' | 'en' = currentPublicLocale(),
  ): Promise<PublicUniversityDto> {
    const res = await apiFetch(`${API_BASE_URL}/public/universities/${encodeURIComponent(slug)}?locale=${encodeURIComponent(locale)}`);
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error('University not found');
      }
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to fetch university',
      );
    }
    return res.json();
  }

  static async getMajors(filters: MajorFilters): Promise<PaginatedResult<PublicMajorDto>> {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    params.set('locale', filters.locale ?? currentPublicLocale());
    const res = await apiFetch(`${API_BASE_URL}/public/majors?${params.toString()}`);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to fetch majors',
      );
    }
    return res.json();
  }

  static async getMajorBySlug(
    slug: string,
    locale: 'ar' | 'en' = currentPublicLocale(),
  ): Promise<PublicMajorDto> {
    const res = await apiFetch(`${API_BASE_URL}/public/majors/${encodeURIComponent(slug)}?locale=${encodeURIComponent(locale)}`);
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error('Major not found');
      }
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to fetch major',
      );
    }
    return res.json();
  }

  static async getCourses(
    filters: CourseFilters,
    locale: 'ar' | 'en' = currentPublicLocale(),
  ): Promise<PaginatedResult<PublicCourseDto>> {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    params.set('locale', locale);
    const res = await apiFetch(`${API_BASE_URL}/public/courses?${params.toString()}`);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to fetch courses',
      );
    }
    return res.json();
  }

  static async getCourseBySlug(slug: string, locale: 'ar' | 'en' = currentPublicLocale()): Promise<PublicCourseDto> {
    const res = await apiFetch(`${API_BASE_URL}/public/courses/${encodeURIComponent(slug)}?locale=${encodeURIComponent(locale)}`);
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error('Course not found');
      }
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to fetch course',
      );
    }
    return res.json();
  }

  static enrollStudentCourse(courseId: string): Promise<StudentCourseProgressSnapshotDto> {
    return studentCourseRequest<StudentCourseProgressSnapshotDto>(`/${encodeURIComponent(courseId)}/enroll`, { method: 'POST' });
  }

  static getStudentCourseWorkspace(courseId: string): Promise<CourseLearnerWorkspaceDto> {
    return studentCourseRequest<CourseLearnerWorkspaceDto>(`/${encodeURIComponent(courseId)}/workspace`);
  }

  static markStudentCourseLessonComplete(courseId: string, lessonId: string): Promise<StudentCourseProgressSnapshotDto> {
    return studentCourseRequest<StudentCourseProgressSnapshotDto>(`/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}/progress`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'COMPLETED', progressPercentage: 100 }),
    });
  }

  static startStudentCourseQuiz(courseId: string, quizId: string): Promise<StudentCourseQuizAttemptDto> {
    return studentCourseRequest<StudentCourseQuizAttemptDto>(`/${encodeURIComponent(courseId)}/quizzes/${encodeURIComponent(quizId)}/attempts`, { method: 'POST' });
  }

  static submitStudentCourseQuiz(courseId: string, attemptId: string, answers: Record<string, unknown>): Promise<StudentCourseQuizAttemptDto> {
    return studentCourseRequest<StudentCourseQuizAttemptDto>(`/${encodeURIComponent(courseId)}/quiz-attempts/${encodeURIComponent(attemptId)}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    });
  }

  static completeStudentCourse(courseId: string): Promise<StudentCourseProgressSnapshotDto> {
    return studentCourseRequest<StudentCourseProgressSnapshotDto>(`/${encodeURIComponent(courseId)}/complete`, { method: 'POST' });
  }

  static async verifyCertificate(verificationCode: string): Promise<CertificateVerificationDto> {
    const encodedCode = encodeURIComponent(verificationCode.trim());
    const res = await apiFetch(`${API_BASE_URL}/public/certificates/verify/${encodedCode}`);
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error('Certificate not found');
      }
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to verify certificate',
      );
    }
    return res.json();
  }

  static async getAdminCertificates(
    params: { search?: string; status?: string; page?: number; pageSize?: number } = {},
  ): Promise<{ data: AdminCertificateDto[]; total: number; page: number; pageSize: number }> {
    const query = new URLSearchParams(
      Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== '')
        .map(([key, value]) => [key, String(value)]),
    );
    return this.adminCertificateRequest(`/admin/certificates?${query}`);
  }
  static async getAdminCertificateAnalytics(): Promise<CertificateAnalyticsDto> {
    return this.adminCertificateRequest('/admin/certificates/analytics');
  }
  static async getAdminCertificate(id: string): Promise<AdminCertificateDto> {
    return this.adminCertificateRequest(`/admin/certificates/${encodeURIComponent(id)}`);
  }
  static async getAdminCertificateLedger(id: string): Promise<{
    data: Array<{
      id: string;
      action: string;
      actorId: string;
      reason?: string;
      occurredAt: string;
    }>;
  }> {
    return this.adminCertificateRequest(`/admin/certificates/${encodeURIComponent(id)}/ledger`);
  }
  static async getAdminCertificateTemplates(): Promise<{ data: AdminCertificateTemplateDto[] }> {
    return this.adminCertificateRequest('/admin/certificates/templates');
  }
  static async createAdminCertificateTemplate(
    payload: Omit<AdminCertificateTemplateDto, 'id' | 'publicId' | 'status' | 'updatedAt'>,
  ): Promise<AdminCertificateTemplateDto> {
    return this.adminCertificateRequest('/admin/certificates/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }
  static async updateAdminCertificateTemplate(
    id: string,
    payload: Partial<AdminCertificateTemplateDto>,
  ): Promise<AdminCertificateTemplateDto> {
    return this.adminCertificateRequest(`/admin/certificates/templates/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }
  static async transitionAdminCertificateTemplate(
    id: string,
    status: string,
  ): Promise<AdminCertificateTemplateDto> {
    return this.adminCertificateRequest(
      `/admin/certificates/templates/${encodeURIComponent(id)}/transition`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      },
    );
  }
  static async certificateAction(
    id: string,
    action: 'revoke' | 'reissue' | 'archive',
    payload: Record<string, unknown>,
  ): Promise<AdminCertificateDto> {
    return this.adminCertificateRequest(`/admin/certificates/${encodeURIComponent(id)}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }
  private static async adminCertificateRequest(path: string, init?: RequestInit): Promise<any> {
    const res = await apiFetch(`${API_BASE_URL}${path}`, init);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'تعذر تنفيذ عملية الشهادات');
    }
    return res.json();
  }

  static async getStudentDashboard(
    studentReferenceId: string,
  ): Promise<StudentDashboardSummaryDto> {
    const res = await apiFetch(
      `${API_BASE_URL}/student/${encodeURIComponent(studentReferenceId)}/dashboard`,
      { headers: getStudentHeaders() },
    );
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to fetch student dashboard',
      );
    }
    return res.json();
  }

  static async getMyStudentDashboard(): Promise<StudentDashboardSummaryDto> {
    const res = await apiFetch(`${API_BASE_URL}/student/dashboard`, { headers: getStudentHeaders() });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'تعذر تحميل مساحة الطالب');
    }
    return res.json();
  }

  static async getStudentInvoices(
    studentReferenceId: string,
  ): Promise<PaginatedResult<StudentFinanceInvoiceDto>> {
    const res = await apiFetch(
      `${API_BASE_URL}/student/${encodeURIComponent(studentReferenceId)}/finance/invoices`,
      { headers: getStudentHeaders() },
    );
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to fetch student invoices',
      );
    }
    return res.json();
  }

  static async getStudentInvoicePayments(
    studentReferenceId: string,
    invoiceId: string,
  ): Promise<StudentFinancePaymentDto[]> {
    const res = await apiFetch(
      `${API_BASE_URL}/student/${encodeURIComponent(studentReferenceId)}/finance/invoices/${encodeURIComponent(invoiceId)}/payments`,
      { headers: getStudentHeaders() },
    );
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to fetch student invoice payments',
      );
    }
    const payload = await res.json();
    return payload.data;
  }

  static async getCmsContent(filters: CmsFilters): Promise<PaginatedResult<PublicCmsContentDto>> {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const res = await apiFetch(`${API_BASE_URL}/public/cms/content?${params.toString()}`);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to fetch CMS content',
      );
    }
    return res.json();
  }

  static async getCmsContentBySlug(slug: string, locale = 'ar'): Promise<PublicCmsContentDto> {
    const res = await apiFetch(
      `${API_BASE_URL}/public/cms/content/${encodeURIComponent(slug)}?locale=${encodeURIComponent(locale)}`,
    );
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error('CMS content not found');
      }
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to fetch CMS content',
      );
    }
    return res.json();
  }

  static async getStudentTools(filters: StudentToolFilters = {}): Promise<PublicStudentToolDto[]> {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });

    const res = await apiFetch(`${API_BASE_URL}/public/student-tools?${params.toString()}`);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to fetch student tools',
      );
    }

    const payload = await res.json();
    return payload.data;
  }

  static async executeStudentTool(
    toolKey: string,
    input: unknown,
    locale: 'ar' | 'en' = currentPublicLocale(),
  ): Promise<StudentToolExecutionResponseDto> {
    const res = await studentToolFetch(
      `${API_BASE_URL}/public/student-tools/${encodeURIComponent(toolKey)}/execute`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, locale, idempotencyKey: crypto.randomUUID() }),
      },
    );
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to execute student tool',
      );
    }
    const payload = await res.json();
    return payload.data;
  }

  static async saveStudentToolExecution(executionId: string): Promise<{ savedReference: string }> {
    const res = await apiFetch(
      `${API_BASE_URL}/public/student-tools/executions/${encodeURIComponent(executionId)}/save`,
      { method: 'POST' },
    );
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to save student tool result',
      );
    }
    return (await res.json()).data;
  }

  static async getServices(
    filters: ServiceFilters,
  ): Promise<PaginatedResult<PublicServiceCatalogItemDto>> {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const res = await apiFetch(`${API_BASE_URL}/public/services?${params.toString()}`);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to fetch services',
      );
    }
    return res.json();
  }

  static async getServiceBySlug(slug: string): Promise<PublicServiceCatalogItemDto> {
    const res = await apiFetch(`${API_BASE_URL}/public/services/${encodeURIComponent(slug)}`);
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error('Service not found');
      }
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to fetch service',
      );
    }
    return res.json();
  }

  static async getInternationalTests(
    filters: InternationalTestFilters,
  ): Promise<PaginatedResult<PublicInternationalTestDto>> {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    params.set('locale', filters.locale ?? currentPublicLocale());
    const res = await apiFetch(`${API_BASE_URL}/public/international-tests?${params.toString()}`);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to fetch international tests',
      );
    }
    return res.json();
  }

  static async getInternationalTestBySlug(
    slug: string,
    locale: 'ar' | 'en' = currentPublicLocale(),
  ): Promise<PublicInternationalTestDto> {
    const res = await apiFetch(
      `${API_BASE_URL}/public/international-tests/${encodeURIComponent(slug)}?locale=${encodeURIComponent(locale)}`,
    );
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error('International test not found');
      }
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to fetch international test',
      );
    }
    return res.json();
  }

  static async getCareerJobs(filters: CareerFilters = {}): Promise<PaginatedResult<PublicCareerJobDto>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') params.append(key, String(value));
    });
    const res = await apiFetch(`${API_BASE_URL}/public/careers/jobs?${params.toString()}`);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error((typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) || 'Failed to fetch career opportunities');
    }
    return res.json();
  }

  static async getCareerJobBySlug(slug: string): Promise<PublicCareerJobDto> {
    const res = await apiFetch(`${API_BASE_URL}/public/careers/jobs/${encodeURIComponent(slug)}`);
    if (!res.ok) {
      if (res.status === 404) throw new Error('Career opportunity not found');
      const errorData = await res.json().catch(() => ({}));
      throw new Error((typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) || 'Failed to fetch career opportunity');
    }
    return res.json();
  }

  static async getMajorGraph(slug: string, page = 1, pageSize = 12): Promise<PublicMajorGraphDto> {
    const res = await apiFetch(`${API_BASE_URL}/public/graph/majors/${encodeURIComponent(slug)}?page=${page}&pageSize=${pageSize}&locale=${currentPublicLocale()}`);
    if (!res.ok) throw new Error(res.status === 404 ? 'Major graph not found' : 'Failed to fetch major graph');
    return res.json();
  }

  static async getUniversityGraph(slug: string, page = 1, pageSize = 12): Promise<PublicUniversityGraphDto> {
    const res = await apiFetch(`${API_BASE_URL}/public/graph/universities/${encodeURIComponent(slug)}?page=${page}&pageSize=${pageSize}&locale=${currentPublicLocale()}`);
    if (!res.ok) throw new Error(res.status === 404 ? 'University graph not found' : 'Failed to fetch university graph');
    return res.json();
  }

  static async getScholarshipGraph(slug: string): Promise<PublicScholarshipGraphDto> {
    const res = await apiFetch(`${API_BASE_URL}/public/graph/scholarships/${encodeURIComponent(slug)}?locale=${currentPublicLocale()}`);
    if (!res.ok) throw new Error(res.status === 404 ? 'Scholarship graph not found' : 'Failed to fetch scholarship graph');
    return res.json();
  }

  static async getCountryGraph(iso2Code: string, page = 1, pageSize = 12): Promise<PublicCountryGraphDto> {
    const res = await apiFetch(`${API_BASE_URL}/public/graph/countries/${encodeURIComponent(iso2Code)}?page=${page}&pageSize=${pageSize}&locale=${currentPublicLocale()}`);
    if (!res.ok) throw new Error(res.status === 404 ? 'Country graph not found' : 'Failed to fetch country graph');
    return res.json();
  }

  static async getStudentWorkspace(studentReferenceId: string): Promise<StudentWorkspaceDto> {
    const res = await apiFetch(
      `${API_BASE_URL}/student/${encodeURIComponent(studentReferenceId)}/workspace`,
      { headers: getStudentHeaders() },
    );
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to fetch student workspace',
      );
    }
    return res.json();
  }

  static async getCurrentSessionIdentity(): Promise<{ principalId: string; displayName: string; primaryEmail?: string; roles?: string[]; roleNames?: string[]; effectivePermissions?: string[] }> {
    const res = await apiFetch(`${API_BASE_URL}/auth/me`, { headers: getStudentHeaders() });
    if (!res.ok) throw new Error('يلزم تسجيل الدخول للوصول إلى الحساب');
    const payload = await res.json();
    return payload.data;
  }

  static async getCurrentStudentIdentity(): Promise<{ principalId: string; displayName: string; primaryEmail?: string; roles?: string[]; roleNames?: string[]; effectivePermissions?: string[] }> {
    return this.getCurrentSessionIdentity();
  }

  static async login(email: string, password: string): Promise<void> {
    const res = await apiFetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: getStudentHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ email: email.trim(), password }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body?.data?.authenticated) {
      throw new Error(body?.error?.message || body?.message || 'تعذر تسجيل الدخول بهذه البيانات');
    }
  }

  static async loginStudent(email: string, password: string): Promise<void> {
    return this.login(email, password);
  }

  static async logoutStudent(): Promise<void> {
    const res = await apiFetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: getStudentHeaders(),
    });
    if (!res.ok && res.status !== 401) throw new Error('تعذر تسجيل الخروج');
  }

  static async listMyHydratedStudentSavedItems(): Promise<HydratedStudentSavedItemDto[]> {
    const res = await apiFetch(`${API_BASE_URL}/student/saved-items/hydrated`, { headers: getStudentHeaders() });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error?.message || body?.error || 'تعذر تحميل تفاصيل العناصر المحفوظة');
    }
    const payload = await res.json();
    return Array.isArray(payload?.data) ? payload.data : [];
  }

  static async createMyStudentSavedItem(input: {
    entityType: string; entityId: string; entitySlug?: string | null; displayName?: string | null; metadata?: Record<string, unknown> | null;
  }): Promise<StudentSavedItemDto> {
    const res = await apiFetch(`${API_BASE_URL}/student/saved-items`, {
      method: 'POST', headers: getStudentHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(input),
    });
    if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body?.error?.message || body?.error || 'تعذر حفظ العنصر'); }
    return res.json();
  }

  static async removeMyStudentSavedItem(entityType: string, entityId: string): Promise<void> {
    const res = await apiFetch(`${API_BASE_URL}/student/saved-items/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}`, {
      method: 'DELETE', headers: getStudentHeaders(),
    });
    if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body?.error?.message || body?.error || 'تعذر إزالة العنصر المحفوظ'); }
  }

  static async listMyStudentApplicationTrackers(): Promise<StudentApplicationTrackerDto[]> {
    const res=await apiFetch(`${API_BASE_URL}/student/application-trackers`,{headers:getStudentHeaders()}); if(!res.ok){const b=await res.json().catch(()=>({}));throw new Error(b?.error?.message||b?.error||'تعذر تحميل ملفات التقديم');} return (await res.json()).data ?? [];
  }
  static async createMyStudentApplicationTracker(input:{scholarshipId:string;scholarshipSlug?:string|null;stage?:string;notes?:string|null;deadlineAt?:string|null;checklistLabels?:string[]}):Promise<StudentApplicationTrackerDto>{
    const res=await apiFetch(`${API_BASE_URL}/student/application-trackers`,{method:'POST',headers:getStudentHeaders({'Content-Type':'application/json'}),body:JSON.stringify(input)}); if(!res.ok){const b=await res.json().catch(()=>({}));throw new Error(b?.error?.message||b?.error||'تعذر إنشاء ملف التقديم');} return res.json();
  }
  static async updateMyStudentApplicationTracker(trackerId:string,input:{expectedVersion:number;stage?:string;notes?:string|null;deadlineAt?:string|null}):Promise<StudentApplicationTrackerDto>{
    const res=await apiFetch(`${API_BASE_URL}/student/application-trackers/${encodeURIComponent(trackerId)}`,{method:'PATCH',headers:getStudentHeaders({'Content-Type':'application/json'}),body:JSON.stringify(input)}); if(!res.ok){const b=await res.json().catch(()=>({}));throw new Error(b?.error?.message||b?.error||'تعذر تحديث ملف التقديم');} return res.json();
  }
  static async updateMyStudentApplicationChecklistItem(trackerId:string,itemId:string,completed:boolean,expectedVersion:number):Promise<StudentApplicationTrackerDto>{
    const res=await apiFetch(`${API_BASE_URL}/student/application-trackers/${encodeURIComponent(trackerId)}/checklist/${encodeURIComponent(itemId)}`,{method:'PATCH',headers:getStudentHeaders({'Content-Type':'application/json'}),body:JSON.stringify({completed,expectedVersion})}); if(!res.ok){const b=await res.json().catch(()=>({}));throw new Error(b?.error?.message||b?.error||'تعذر تحديث المهمة');} return res.json();
  }
  static async archiveMyStudentApplicationTracker(trackerId:string,expectedVersion:number):Promise<StudentApplicationTrackerDto>{
    const res=await apiFetch(`${API_BASE_URL}/student/application-trackers/${encodeURIComponent(trackerId)}/archive`,{method:'POST',headers:getStudentHeaders({'Content-Type':'application/json'}),body:JSON.stringify({expectedVersion})}); if(!res.ok){const b=await res.json().catch(()=>({}));throw new Error(b?.error?.message||b?.error||'تعذر أرشفة ملف التقديم');} return res.json();
  }
  static async removeMyStudentApplicationTracker(trackerId:string):Promise<void>{ const res=await apiFetch(`${API_BASE_URL}/student/application-trackers/${encodeURIComponent(trackerId)}`,{method:'DELETE',headers:getStudentHeaders()}); if(!res.ok){const b=await res.json().catch(()=>({}));throw new Error(b?.error?.message||b?.error||'تعذر إزالة ملف التقديم');} }

  static async listMyStudentServiceRequests(): Promise<{ data: StudentServiceRequestDto[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const res = await apiFetch(`${API_BASE_URL}/student/services/requests`, { headers: getStudentHeaders() });
    if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body?.error?.message || body?.error || 'تعذر تحميل طلبات الخدمات'); }
    return res.json();
  }

  static async createMyStudentServiceRequest(input: { serviceId: string; requestParameters?: Record<string, unknown> }): Promise<StudentServiceRequestDto> {
    const res = await apiFetch(`${API_BASE_URL}/student/services/requests`, {
      method: 'POST', headers: getStudentHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(input),
    });
    if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body?.error?.message || body?.error || 'تعذر إنشاء طلب الخدمة'); }
    return res.json();
  }

  static async getMyStudentServiceRequest(requestId: string): Promise<StudentServiceRequestDto> {
    const res = await apiFetch(`${API_BASE_URL}/student/services/requests/${encodeURIComponent(requestId)}`, { headers: getStudentHeaders() });
    if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body?.error?.message || body?.error || 'تعذر تحميل طلب الخدمة'); }
    return res.json();
  }

  static async updateStudentWorkspace(
    studentReferenceId: string,
    workspace: Partial<StudentWorkspaceDto> & { expectedVersion: number },
  ): Promise<StudentWorkspaceDto> {
    const res = await apiFetch(
      `${API_BASE_URL}/student/${encodeURIComponent(studentReferenceId)}/workspace`,
      {
        method: 'PUT',
        headers: getStudentHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(workspace),
      },
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'تعذر حفظ إعدادات مساحة الطالب');
    }
    return res.json();
  }

  static async listMyActiveStudentAssets(mimeTypePrefix = 'image/'): Promise<StudentOwnedAssetPageDto> {
    const params = new URLSearchParams({ mimeTypePrefix, limit: '100' });
    const res = await apiFetch(`${API_BASE_URL}/student/assets?${params}`, { headers: getStudentHeaders() });
    if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.error || 'تعذر تحميل أصول الطالب'); }
    return res.json();
  }

  static async getMyStudentAssetDeliveryGrant(assetId: string): Promise<StudentAssetDeliveryGrantDto> {
    const res = await apiFetch(`${API_BASE_URL}/student/assets/${encodeURIComponent(assetId)}/delivery-grant`, {
      method: 'POST', headers: getStudentHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ expiresInSeconds: 300 }),
    });
    if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.error || 'تعذر إنشاء معاينة آمنة'); }
    return res.json();
  }

  static async updateMyStudentWorkspace(
    workspace: Partial<StudentWorkspaceDto> & { expectedVersion: number },
  ): Promise<StudentWorkspaceDto> {
    const res = await apiFetch(`${API_BASE_URL}/student/workspace`, {
      method: 'PUT', headers: getStudentHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(workspace),
    });
    if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.error || 'تعذر حفظ إعدادات مساحة الطالب'); }
    return res.json();
  }

  static async updateMyStudentPrivacyConsent(input: {
    expectedVersion: number;
    purpose: string;
    privacyPreferences: {
      retainSearchHistory: boolean;
      allowPersonalization: boolean;
      allowProductAnalytics: boolean;
      publicProfileEnabled: boolean;
    };
  }): Promise<StudentPrivacyConsentDecisionDto> {
    const res = await apiFetch(`${API_BASE_URL}/student/privacy-consent`, {
      method: 'PUT', headers: getStudentHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(input),
    });
    if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.error || 'تعذر حفظ موافقة الخصوصية'); }
    return res.json();
  }

  static async createStudentCollection(
    studentReferenceId: string,
    collection: { name: string; description?: string; color?: string },
  ): Promise<StudentSavedCollectionDto> {
    const res = await apiFetch(
      `${API_BASE_URL}/student/${encodeURIComponent(studentReferenceId)}/collections`,
      {
        method: 'POST',
        headers: getStudentHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(collection),
      },
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'تعذر إنشاء المجموعة');
    }
    return res.json();
  }

  static async createMyStudentCollection(collection: { name: string; description?: string; color?: string }): Promise<StudentSavedCollectionDto> {
    const res = await apiFetch(`${API_BASE_URL}/student/collections`, {
      method: 'POST', headers: getStudentHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(collection),
    });
    if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.error || 'تعذر إنشاء المجموعة'); }
    return res.json();
  }

  static async updateMyStudentCollection(collectionId: string, changes: { name?: string; description?: string | null; color?: string | null }): Promise<StudentSavedCollectionDto> {
    const res = await apiFetch(`${API_BASE_URL}/student/collections/${encodeURIComponent(collectionId)}`, { method: 'PATCH', headers: getStudentHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(changes) });
    if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.error || 'تعذر تعديل المجموعة'); }
    return res.json();
  }

  static async deleteMyStudentCollection(collectionId: string): Promise<void> {
    const res = await apiFetch(`${API_BASE_URL}/student/collections/${encodeURIComponent(collectionId)}`, { method: 'DELETE', headers: getStudentHeaders() });
    if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.error || 'تعذر حذف المجموعة'); }
  }

  static async moveMyStudentSavedItem(itemId: string, collectionId: string | null): Promise<StudentSavedItemDto> {
    const res = await apiFetch(`${API_BASE_URL}/student/saved-items/${encodeURIComponent(itemId)}/move`, { method: 'POST', headers: getStudentHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ collectionId }) });
    if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.error || 'تعذر نقل العنصر'); }
    return res.json();
  }

  static async createStudentWorkspaceSnapshot(
    studentReferenceId: string,
    label?: string,
  ): Promise<{ id: string; createdAt: string }> {
    const res = await apiFetch(
      `${API_BASE_URL}/student/${encodeURIComponent(studentReferenceId)}/snapshots`,
      {
        method: 'POST',
        headers: getStudentHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ label }),
      },
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'تعذر حفظ نسخة الإعدادات');
    }
    return res.json();
  }

  static async createMyStudentWorkspaceSnapshot(label?: string): Promise<{ id: string; createdAt: string }> {
    const res = await apiFetch(`${API_BASE_URL}/student/snapshots`, {
      method: 'POST', headers: getStudentHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ label }),
    });
    if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.error || 'تعذر حفظ نسخة الإعدادات'); }
    return res.json();
  }

  static async listMyStudentWorkspaceSnapshots(): Promise<StudentWorkspaceSnapshotDto[]> {
    const res = await apiFetch(`${API_BASE_URL}/student/snapshots`, { headers: getStudentHeaders() });
    if (!res.ok) throw new Error('تعذر تحميل نسخ الإعدادات');
    return (await res.json()).data;
  }

  static async restoreMyStudentWorkspaceSnapshot(snapshotId: string, expectedVersion: number): Promise<StudentWorkspaceDto> {
    const res = await apiFetch(`${API_BASE_URL}/student/snapshots/${encodeURIComponent(snapshotId)}/restore`, { method: 'POST', headers: getStudentHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ expectedVersion }) });
    if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.error || 'تعذر استعادة نسخة الإعدادات'); }
    return res.json();
  }

  static async resetMyStudentDashboardLayout(expectedVersion: number): Promise<StudentWorkspaceDto> {
    const res = await apiFetch(`${API_BASE_URL}/student/dashboard/layout/reset`, { method: 'POST', headers: getStudentHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ expectedVersion }) });
    if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.error || 'تعذر إعادة ضبط التخطيط'); }
    return res.json();
  }

  static async clearMyRecentlyViewed(): Promise<void> {
    const res = await apiFetch(`${API_BASE_URL}/student/recently-viewed`, { method: 'DELETE', headers: getStudentHeaders() });
    if (!res.ok) throw new Error('تعذر مسح العناصر المشاهدة مؤخرًا');
  }

  static async clearStudentSearchHistory(studentReferenceId: string): Promise<void> {
    const res = await apiFetch(
      `${API_BASE_URL}/student/${encodeURIComponent(studentReferenceId)}/search-history`,
      { method: 'DELETE', headers: getStudentHeaders() },
    );
    if (!res.ok) throw new Error('تعذر مسح سجل البحث');
  }

  static async clearMyStudentSearchHistory(): Promise<void> {
    const res = await apiFetch(`${API_BASE_URL}/student/search-history`, { method: 'DELETE', headers: getStudentHeaders() });
    if (!res.ok) throw new Error('تعذر مسح سجل البحث');
  }

  static async saveStudentItem(
    studentReferenceId: string,
    item: {
      entityType: string;
      entityId: string;
      entitySlug?: string | null;
      displayName?: string | null;
      notes?: string | null;
    },
  ): Promise<StudentSavedItemDto> {
    const res = await apiFetch(
      `${API_BASE_URL}/student/${encodeURIComponent(studentReferenceId)}/saved-items`,
      {
        method: 'POST',
        headers: getStudentHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(item),
      },
    );
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to save item',
      );
    }
    return res.json();
  }

  static async getAdminUniversities(
    filters: any,
    signal?: AbortSignal,
  ): Promise<PaginatedResult<any>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value as string);
      }
    });
    const res = await apiFetch(`${API_BASE_URL}/admin/universities?${params.toString()}`, {
      headers: getAdminHeaders(),
      signal,
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to fetch admin universities',
      );
    }
    return res.json();
  }

  static async getAdminUniversityOrganizationUnits(filters: any, signal?: AbortSignal): Promise<PaginatedResult<any>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') params.append(key, String(value));
    });
    const res = await apiFetch(`${API_BASE_URL}/admin/universities/organization-units?${params.toString()}`, { headers: getAdminHeaders(), signal });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error((typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) || 'Failed to fetch university organization units');
    }
    return res.json();
  }

  static async getAdminUniversityById(id: string): Promise<any> {
    const res = await apiFetch(`${API_BASE_URL}/admin/universities/${encodeURIComponent(id)}`, {
      headers: getAdminHeaders(),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to fetch university',
      );
    }
    return res.json();
  }

  static async executeAdminUniversityAction(id: string, action: string): Promise<void> {
    const res = await apiFetch(
      `${API_BASE_URL}/admin/universities/${encodeURIComponent(id)}/${action}`,
      {
        method: 'POST',
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
      },
    );
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          `Failed to execute ${action}`,
      );
    }
  }

  static async getAdminMajors(filters: any, signal?: AbortSignal): Promise<PaginatedResult<any>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value as string);
      }
    });
    const res = await apiFetch(`${API_BASE_URL}/admin/majors?${params.toString()}`, {
      headers: getAdminHeaders(),
      signal,
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to fetch admin majors',
      );
    }
    return res.json();
  }

  static async getAdminNewMajorCandidates(filters: any, signal?: AbortSignal): Promise<PaginatedResult<any>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') params.append(key, String(value));
    });
    const res = await apiFetch(`${API_BASE_URL}/admin/majors/new-candidates?${params.toString()}`, { headers: getAdminHeaders(), signal });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error((typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) || 'Failed to fetch new-major candidates');
    }
    return res.json();
  }

  static async getAdminMajorById(id: string): Promise<any> {
    const res = await apiFetch(`${API_BASE_URL}/admin/majors/${encodeURIComponent(id)}`, {
      headers: getAdminHeaders(),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to fetch major',
      );
    }
    return res.json();
  }

  static async getAdminMajorCollegeFacets(
    degreeLevel?: string,
  ): Promise<{ data: Array<{ name: string; supportedDegrees: string[]; majorCount: number }> }> {
    const params = new URLSearchParams();
    if (degreeLevel) params.set('degreeLevel', degreeLevel);
    const res = await apiFetch(
      `${API_BASE_URL}/admin/majors/facets/colleges?${params.toString()}`,
      { headers: getAdminHeaders() },
    );
    if (!res.ok) throw new Error('Failed to fetch documented college contexts');
    return res.json();
  }

  static async getAdminMajorProfiles(id: string): Promise<{ data: any[] }> {
    const res = await apiFetch(`${API_BASE_URL}/admin/majors/${encodeURIComponent(id)}/profiles`, {
      headers: getAdminHeaders(),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to fetch major profiles',
      );
    }
    return res.json();
  }

  static async getAdminMajorContentSections(id: string): Promise<{ data: any[] }> {
    const res = await apiFetch(
      `${API_BASE_URL}/admin/majors/${encodeURIComponent(id)}/content-sections`,
      {
        headers: getAdminHeaders(),
      },
    );
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to fetch major content sections',
      );
    }
    return res.json();
  }

  static async getAdminMajorAliases(id: string): Promise<{ data: any[] }> {
    const res = await apiFetch(`${API_BASE_URL}/admin/majors/${encodeURIComponent(id)}/aliases`, {
      headers: getAdminHeaders(),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to fetch major aliases',
      );
    }
    return res.json();
  }

  static async getAdminMajorRelationships(id: string): Promise<{ data: any[] }> {
    const res = await apiFetch(
      `${API_BASE_URL}/admin/majors/${encodeURIComponent(id)}/relationships`,
      {
        headers: getAdminHeaders(),
      },
    );
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to fetch major relationships',
      );
    }
    return res.json();
  }

  static async getAdminMajorClassificationMappings(id: string): Promise<{ data: any[] }> {
    const res = await apiFetch(
      `${API_BASE_URL}/admin/majors/${encodeURIComponent(id)}/classification-mappings`,
      {
        headers: getAdminHeaders(),
      },
    );
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to fetch major classification mappings',
      );
    }
    return res.json();
  }

  static async getAdminMajorVersions(id: string): Promise<{ data: any[] }> {
    const res = await apiFetch(`${API_BASE_URL}/admin/majors/${encodeURIComponent(id)}/versions`, {
      headers: getAdminHeaders(),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to fetch major versions',
      );
    }
    return res.json();
  }

  static async getAdminMajorSources(id: string): Promise<{ data: any[] }> {
    const res = await apiFetch(`${API_BASE_URL}/admin/majors/${encodeURIComponent(id)}/sources`, {
      headers: getAdminHeaders(),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to fetch major sources',
      );
    }
    return res.json();
  }

  static async importMajorCatalogFromWorkspace(catalogKind: string): Promise<any> {
    const res = await apiFetch(
      `${API_BASE_URL}/admin/imports/major-catalogs/workspace/${encodeURIComponent(catalogKind)}`,
      {
        method: 'POST',
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
      },
    );
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to import major catalog',
      );
    }
    return res.json();
  }

  static async previewMajorCatalogFromWorkspace(catalogKind: string): Promise<any> {
    const res = await apiFetch(
      `${API_BASE_URL}/admin/imports/major-catalogs/workspace/${encodeURIComponent(catalogKind)}/preview`,
      {
        headers: getAdminHeaders(),
      },
    );
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to preview major catalog',
      );
    }
    return res.json();
  }

  static async previewMajorCatalogText(payload: {
    catalogKind: string;
    dataText: string;
    sourceFileName?: string;
    sourceSystem?: string;
  }): Promise<any> {
    const res = await apiFetch(`${API_BASE_URL}/admin/imports/major-catalogs/preview`, {
      method: 'POST',
      headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to preview major catalog',
      );
    }
    return res.json();
  }

  static async importMajorCatalogFiles(payload: {
    catalogKind: string;
    sourceSystem?: string;
    files: Array<{ dataText: string; sourceFileName?: string; sourceSystem?: string }>;
  }): Promise<any> {
    const res = await apiFetch(`${API_BASE_URL}/admin/imports/major-catalogs/bulk`, {
      method: 'POST',
      headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to import major catalog files',
      );
    }
    return res.json();
  }

  static async previewMajorCatalogFiles(payload: {
    catalogKind: string;
    sourceSystem?: string;
    files: Array<{ dataText: string; sourceFileName?: string; sourceSystem?: string }>;
  }): Promise<any> {
    const res = await apiFetch(`${API_BASE_URL}/admin/imports/major-catalogs/bulk/preview`, {
      method: 'POST',
      headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to preview major catalog files',
      );
    }
    return res.json();
  }

  static async importMajorDetailDossierFromWorkspace(catalogKind: string): Promise<any> {
    const res = await apiFetch(
      `${API_BASE_URL}/admin/imports/major-detail-dossiers/workspace/${encodeURIComponent(catalogKind)}`,
      {
        method: 'POST',
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
      },
    );
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to import major detail dossier',
      );
    }
    return res.json();
  }

  static async previewMajorDetailDossierFromWorkspace(catalogKind: string): Promise<any> {
    const res = await apiFetch(
      `${API_BASE_URL}/admin/imports/major-detail-dossiers/workspace/${encodeURIComponent(catalogKind)}/preview`,
      {
        headers: getAdminHeaders(),
      },
    );
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to preview major detail dossier',
      );
    }
    return res.json();
  }

  static async previewMajorDetailDossierText(payload: {
    catalogKind: string;
    dataText: string;
    sourceFileName?: string;
    sourceSystem?: string;
  }): Promise<any> {
    const res = await apiFetch(`${API_BASE_URL}/admin/imports/major-detail-dossiers/preview`, {
      method: 'POST',
      headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to preview major detail dossier',
      );
    }
    return res.json();
  }

  static async importMajorDetailDossierFiles(payload: {
    catalogKind: string;
    sourceSystem?: string;
    files: Array<{ dataText: string; sourceFileName?: string; sourceSystem?: string }>;
  }): Promise<any> {
    const res = await apiFetch(`${API_BASE_URL}/admin/imports/major-detail-dossiers/bulk`, {
      method: 'POST',
      headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to import major detail dossier files',
      );
    }
    return res.json();
  }

  static async previewMajorDetailDossierFiles(payload: {
    catalogKind: string;
    sourceSystem?: string;
    files: Array<{ dataText: string; sourceFileName?: string; sourceSystem?: string }>;
  }): Promise<any> {
    const res = await apiFetch(`${API_BASE_URL}/admin/imports/major-detail-dossiers/bulk/preview`, {
      method: 'POST',
      headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to preview major detail dossier files',
      );
    }
    return res.json();
  }

  static async executeAdminMajorAction(id: string, action: string): Promise<void> {
    const res = await apiFetch(`${API_BASE_URL}/admin/majors/${encodeURIComponent(id)}/${action}`, {
      method: 'POST',
      headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          `Failed to execute ${action}`,
      );
    }
  }

  static async getAdminInternationalTests(filters: any): Promise<PaginatedResult<any>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value as string);
      }
    });
    const res = await apiFetch(`${API_BASE_URL}/admin/international-tests?${params.toString()}`, {
      headers: getAdminHeaders(),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to fetch admin international tests',
      );
    }
    return res.json();
  }

  static async getAdminInternationalTestById(id: string): Promise<any> {
    const res = await apiFetch(
      `${API_BASE_URL}/admin/international-tests/${encodeURIComponent(id)}`,
      {
        headers: getAdminHeaders(),
      },
    );
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to fetch international test',
      );
    }
    return res.json();
  }

  static async getAdminInternationalTestVersions(id: string): Promise<unknown[]> {
    const res = await apiFetch(
      `${API_BASE_URL}/admin/international-tests/${encodeURIComponent(id)}/import-versions`,
      {
        headers: getAdminHeaders(),
      },
    );
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to fetch international test versions',
      );
    }
    const data: unknown = await res.json();
    return Array.isArray(data) ? data : [];
  }

  static async executeAdminInternationalTestAction(id: string, action: string): Promise<void> {
    const res = await apiFetch(
      `${API_BASE_URL}/admin/international-tests/${encodeURIComponent(id)}/${action}`,
      {
        method: 'POST',
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
      },
    );
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          `Failed to execute ${action}`,
      );
    }
  }

  static async getAdminNativeCourses(
    filters: Partial<CourseFilters> & { status?: NativeCourseStatus } = {},
  ): Promise<PaginatedResult<NativeCourseDto>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value as string);
      }
    });
    params.set('originType', 'NATIVE_MANARATAK_COURSE');
    return adminCourseRequest<PaginatedResult<NativeCourseDto>>(`?${params.toString()}`);
  }

  static getAdminNativeCourseById(id: string): Promise<NativeCourseDto> {
    return adminCourseRequest<NativeCourseDto>(`/${encodeURIComponent(id)}`);
  }

  static createAdminNativeCourse(input: CreateNativeCourseInput): Promise<NativeCourseDto> {
    return adminCourseRequest<NativeCourseDto>('', { method: 'POST', body: JSON.stringify(input) });
  }

  static updateAdminNativeCourse(
    id: string,
    input: UpdateNativeCourseInput,
  ): Promise<NativeCourseDto> {
    return adminCourseRequest<NativeCourseDto>(`/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  static getAdminNativeCourseCurriculum(id: string): Promise<CourseCurriculumSnapshotDto> {
    return adminCourseRequest<CourseCurriculumSnapshotDto>(`/${encodeURIComponent(id)}/curriculum`);
  }

  static getNativeCourseReadiness(id: string): Promise<NativeCourseReadinessDto> {
    return adminCourseRequest<NativeCourseReadinessDto>(`/${encodeURIComponent(id)}/readiness`);
  }

  static createCourseModule(
    courseId: string,
    input: { title: string; description?: string; position: number },
  ): Promise<CourseModuleDto> {
    return adminCourseRequest<CourseModuleDto>(`/${encodeURIComponent(courseId)}/modules`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  static updateCourseModule(
    courseId: string,
    moduleId: string,
    input: Partial<{ title: string; description: string | null; position: number; status: string }>,
  ): Promise<CourseModuleDto> {
    return adminCourseRequest<CourseModuleDto>(
      `/${encodeURIComponent(courseId)}/modules/${encodeURIComponent(moduleId)}`,
      { method: 'PATCH', body: JSON.stringify(input) },
    );
  }

  static deleteCourseModule(courseId: string, moduleId: string): Promise<void> {
    return adminCourseRequest<void>(
      `/${encodeURIComponent(courseId)}/modules/${encodeURIComponent(moduleId)}`,
      { method: 'DELETE' },
    );
  }

  static reorderCourseModules(
    courseId: string,
    positions: Array<{ id: string; position: number }>,
  ): Promise<void> {
    return adminCourseRequest<void>(`/${encodeURIComponent(courseId)}/modules/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ positions }),
    });
  }

  static createCourseLesson(
    courseId: string,
    moduleId: string,
    input: {
      title: string;
      summary?: string;
      lessonType: string;
      position: number;
      estimatedDurationMinutes?: number;
      contentText?: string;
    },
  ): Promise<CourseLessonDto> {
    return adminCourseRequest<CourseLessonDto>(
      `/${encodeURIComponent(courseId)}/modules/${encodeURIComponent(moduleId)}/lessons`,
      { method: 'POST', body: JSON.stringify(input) },
    );
  }

  static updateCourseLesson(
    courseId: string,
    lessonId: string,
    input: Partial<{
      title: string;
      summary: string | null;
      lessonType: string;
      position: number;
      estimatedDurationMinutes: number | null;
      contentText: string | null;
      status: string;
    }>,
  ): Promise<CourseLessonDto> {
    return adminCourseRequest<CourseLessonDto>(
      `/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}`,
      { method: 'PATCH', body: JSON.stringify(input) },
    );
  }

  static deleteCourseLesson(courseId: string, lessonId: string): Promise<void> {
    return adminCourseRequest<void>(
      `/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}`,
      { method: 'DELETE' },
    );
  }

  static reorderCourseLessons(
    courseId: string,
    moduleId: string,
    positions: Array<{ id: string; position: number }>,
  ): Promise<void> {
    return adminCourseRequest<void>(
      `/${encodeURIComponent(courseId)}/modules/${encodeURIComponent(moduleId)}/lessons/reorder`,
      { method: 'PUT', body: JSON.stringify({ positions }) },
    );
  }

  static attachCourseLessonAsset(
    courseId: string,
    lessonId: string,
    input: {
      assetId: string;
      assetReference?: string;
      title?: string;
      assetType: string;
      position: number;
      isRequired?: boolean;
    },
  ): Promise<CourseLessonAssetDto> {
    return adminCourseRequest<CourseLessonAssetDto>(
      `/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}/assets`,
      { method: 'POST', body: JSON.stringify(input) },
    );
  }

  static detachCourseLessonAsset(
    courseId: string,
    lessonId: string,
    assetId: string,
  ): Promise<void> {
    return adminCourseRequest<void>(
      `/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}/assets/${encodeURIComponent(assetId)}`,
      { method: 'DELETE' },
    );
  }

  static createCourseQuiz(
    courseId: string,
    input: {
      title: string;
      moduleId?: string;
      lessonId?: string;
      position: number;
      passingScore?: number;
      maxAttempts?: number;
    },
  ): Promise<CourseQuizDto> {
    return adminCourseRequest<CourseQuizDto>(`/${encodeURIComponent(courseId)}/quizzes`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  static createCourseQuestionBank(
    courseId: string,
    input: { title: string; description?: string },
  ): Promise<CourseQuestionBankDto> {
    return adminCourseRequest<CourseQuestionBankDto>(
      `/${encodeURIComponent(courseId)}/question-banks`,
      { method: 'POST', body: JSON.stringify(input) },
    );
  }

  static createCourseQuestion(
    courseId: string,
    input: {
      quizId?: string;
      questionBankId?: string;
      questionType: string;
      prompt: string;
      choices?: unknown;
      correctAnswer?: unknown;
      explanation?: string;
      points?: number;
      position: number;
    },
  ): Promise<CourseQuestionDto> {
    return adminCourseRequest<CourseQuestionDto>(`/${encodeURIComponent(courseId)}/questions`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  static executeAdminNativeCourseAction(
    id: string,
    action: 'mark-ready' | 'mark-publishable' | 'publish' | 'unpublish' | 'archive',
  ): Promise<void> {
    return adminCourseRequest<void>(`/${encodeURIComponent(id)}/${action}`, { method: 'POST' });
  }

  static getAdminLearningPaths(): Promise<{ data: any[] }> {
    return adminCourseRequest<{ data: any[] }>('/learning-paths');
  }

  static createAdminLearningPath(input: {
    title: string;
    description?: string;
    isStrictlyOrdered?: boolean;
    completionLogic?: 'ALL_REQUIRED' | 'ALL';
    courses: Array<{ courseId: string; position: number; required: boolean; prerequisiteCourseIds: string[] }>;
  }): Promise<any> {
    return adminCourseRequest<any>('/learning-paths', { method: 'POST', body: JSON.stringify(input) });
  }

  static executeAdminLearningPathAction(pathId: string, action: 'mark-publishable' | 'publish' | 'archive'): Promise<any> {
    return adminCourseRequest<any>(`/learning-paths/${encodeURIComponent(pathId)}/${action}`, { method: 'POST' });
  }

  static getAdminCourseRelationships(id: string): Promise<CourseRelationshipReviewModel> {
    return adminCourseRequest<CourseRelationshipReviewModel>(`/${encodeURIComponent(id)}/relationships`);
  }

  static analyzeAdminCourseRelationships(id: string): Promise<any> {
    return adminCourseRequest<any>(`/${encodeURIComponent(id)}/relationships/analyze`, { method: 'POST' });
  }

  static proposeAdminCourseTaxonomyLink(courseId: string, taxonomyNodeId: string, relationshipType: 'PRIMARY' | 'SECONDARY' | 'RELATED' = 'PRIMARY'): Promise<any> {
    return adminCourseRequest<any>(`/${encodeURIComponent(courseId)}/relationships/taxonomy`, {
      method: 'POST',
      body: JSON.stringify({ taxonomyNodeId, relationshipType }),
    });
  }

  static approveAdminCourseTaxonomyLink(courseId: string, linkId: string): Promise<any> {
    return adminCourseRequest<any>(`/${encodeURIComponent(courseId)}/relationships/taxonomy/${encodeURIComponent(linkId)}/approve`, { method: 'POST' });
  }

  static rejectAdminCourseTaxonomyLink(courseId: string, linkId: string): Promise<any> {
    return adminCourseRequest<any>(`/${encodeURIComponent(courseId)}/relationships/taxonomy/${encodeURIComponent(linkId)}/reject`, { method: 'POST' });
  }

  static approveAdminCourseLanguage(courseId: string, languageReferenceId: string): Promise<CourseRelationshipReviewModel> {
    return adminCourseRequest<CourseRelationshipReviewModel>(`/${encodeURIComponent(courseId)}/relationships/language`, {
      method: 'POST',
      body: JSON.stringify({ languageReferenceId }),
    });
  }

  static projectAdminCourseMajors(courseId: string): Promise<{ data: any[] }> {
    return adminCourseRequest<{ data: any[] }>(`/${encodeURIComponent(courseId)}/relationships/majors/project`, { method: 'POST' });
  }

  static proposeAdminCourseMajorProjection(courseId: string, majorId: string, relationshipType: 'PRIMARY' | 'SECONDARY' | 'RELATED' = 'PRIMARY'): Promise<any> {
    return adminCourseRequest<any>(`/${encodeURIComponent(courseId)}/relationships/majors`, {
      method: 'POST',
      body: JSON.stringify({ majorId, relationshipType }),
    });
  }

  static approveAdminCourseMajorProjection(courseId: string, projectionId: string): Promise<any> {
    return adminCourseRequest<any>(`/${encodeURIComponent(courseId)}/relationships/majors/${encodeURIComponent(projectionId)}/approve`, { method: 'POST' });
  }

  static rejectAdminCourseMajorProjection(courseId: string, projectionId: string): Promise<any> {
    return adminCourseRequest<any>(`/${encodeURIComponent(courseId)}/relationships/majors/${encodeURIComponent(projectionId)}/reject`, { method: 'POST' });
  }

  static proposeAdminCourseInternationalTest(courseId: string, internationalTestId: string, relationshipType: 'PREPARATION' | 'PRACTICE' | 'EXAM_READINESS' | 'RELATED'): Promise<any> {
    return adminCourseRequest<any>(`/${encodeURIComponent(courseId)}/relationships/tests`, {
      method: 'POST',
      body: JSON.stringify({ internationalTestId, relationshipType }),
    });
  }

  static approveAdminCourseInternationalTest(courseId: string, relationshipId: string): Promise<any> {
    return adminCourseRequest<any>(`/${encodeURIComponent(courseId)}/relationships/tests/${encodeURIComponent(relationshipId)}/approve`, { method: 'POST' });
  }

  static rejectAdminCourseInternationalTest(courseId: string, relationshipId: string): Promise<any> {
    return adminCourseRequest<any>(`/${encodeURIComponent(courseId)}/relationships/tests/${encodeURIComponent(relationshipId)}/reject`, { method: 'POST' });
  }

  static getAdminCourseEnrollmentPolicy(courseId: string): Promise<CourseEnrollmentPolicyDto | null> {
    return adminCourseRequest<CourseEnrollmentPolicyDto | null>(`/${encodeURIComponent(courseId)}/enrollment-policy`);
  }

  static updateAdminCourseEnrollmentPolicy(courseId: string, input: Partial<Omit<CourseEnrollmentPolicyDto, 'courseId' | 'createdAt' | 'updatedAt'>>): Promise<CourseEnrollmentPolicyDto> {
    return adminCourseRequest<CourseEnrollmentPolicyDto>(`/${encodeURIComponent(courseId)}/enrollment-policy`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  }

  static async getAdminReferenceLanguages(): Promise<AdminReferenceLanguageDto[]> {
    const res = await apiFetch(`${API_BASE_URL}/admin/reference-data/languages?activeOnly=true`, { headers: getAdminHeaders() });
    if (!res.ok) throw new Error(await parseErrorMessage(res, 'Failed to fetch reference languages'));
    const body = await res.json();
    return Array.isArray(body?.data) ? body.data : [];
  }


  static async getAdminScholarships(
    filters: AdminScholarshipFilters,
  ): Promise<PaginatedResult<any>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const res = await apiFetch(`${API_BASE_URL}/admin/scholarships?${params.toString()}`);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to fetch admin scholarships',
      );
    }
    return res.json();
  }

  static async getAdminScholarshipSummary(): Promise<AdminScholarshipSummary> {
    const res = await apiFetch(`${API_BASE_URL}/admin/scholarships/summary`);
    if (!res.ok) throw new Error(await parseErrorMessage(res, 'Failed to fetch scholarship summary'));
    return res.json();
  }

  static async getAdminScholarshipById(id: string): Promise<any> {
    const res = await apiFetch(`${API_BASE_URL}/admin/scholarships/${encodeURIComponent(id)}`);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to fetch scholarship',
      );
    }
    return res.json();
  }

  static async createAdminScholarship(payload: any): Promise<any> {
    const res = await apiFetch(`${API_BASE_URL}/admin/scholarships`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      if (errorData.details && Array.isArray(errorData.details)) {
        const issues = errorData.details.map((d: any) => d.message).join(' | ');
        throw new Error(issues || errorData.error || 'Failed to create scholarship');
      }
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to create scholarship',
      );
    }
    return res.json();
  }

  static async updateAdminScholarship(id: string, payload: any): Promise<any> {
    const res = await apiFetch(`${API_BASE_URL}/admin/scholarships/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to update scholarship',
      );
    }
    return res.json();
  }

  static async executeAdminScholarshipAction(id: string, action: string): Promise<void> {
    const res = await apiFetch(
      `${API_BASE_URL}/admin/scholarships/${encodeURIComponent(id)}/${action}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
    );
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          `Failed to execute ${action}`,
      );
    }
  }

  static async importScholarships(
    dataText: string,
    sourceSystem = 'ADMIN_CONSOLE',
  ): Promise<{ batch: any; records: any[] }> {
    const res = await apiFetch(`${API_BASE_URL}/admin/scholarships/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataText, sourceSystem }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to process import',
      );
    }
    return res.json();
  }

  static async createImportBatch(payload: {
    dataType?: string;
    sourceSystem?: string;
    payloadText?: string;
    dataText?: string;
  }): Promise<{ batch: Record<string, unknown>; records: Record<string, unknown>[] }> {
    let normalizedDataType = payload.dataType || 'SCHOLARSHIPS';
    if (normalizedDataType === 'international-tests' || normalizedDataType === 'tests') {
      normalizedDataType = 'TESTS';
    }

    const dataText = (payload.dataText || payload.payloadText || '').trim();
    if (!dataText) {
      throw new Error('Import text or CSV/JSON content is required. The import client does not fabricate placeholder records.');
    }

    const requestBody = {
      dataType: normalizedDataType,
      sourceSystem: payload.sourceSystem || 'ADMIN_CONSOLE_MANUAL',
      dataText,
    };

    const res = await apiFetch(`${API_BASE_URL}/admin/imports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to create import batch',
      );
    }
    return res.json();
  }

  static async preflightImportBatch(payload: {
    dataType?: string;
    sourceSystem?: string;
    dataText: string;
  }): Promise<any> {
    const res = await apiFetch(`${API_BASE_URL}/admin/imports/preflight`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to preflight import batch',
      );
    }
    return res.json();
  }

  static async getImportOverview(dataType?: string): Promise<any> {
    const suffix = dataType ? `?dataType=${encodeURIComponent(dataType)}` : '';
    const res = await apiFetch(`${API_BASE_URL}/admin/imports/overview${suffix}`);
    if (!res.ok) throw new Error('Failed to fetch import overview');
    return res.json();
  }

  static async getImportOperations(dataType?: string): Promise<any> {
    const suffix = dataType ? `?dataType=${encodeURIComponent(dataType)}` : '';
    const res = await apiFetch(`${API_BASE_URL}/admin/imports/operations${suffix}`);
    if (!res.ok) throw new Error('Failed to fetch import operational diagnostics');
    return res.json();
  }

  static async getImportCapabilities(): Promise<any> {
    const res = await apiFetch(`${API_BASE_URL}/admin/imports/capabilities`);
    if (!res.ok) throw new Error('Failed to fetch import capabilities');
    return res.json();
  }

  static async getImportSources(): Promise<any> {
    const res = await apiFetch(`${API_BASE_URL}/admin/imports/sources`);
    if (!res.ok) throw new Error('Failed to fetch import source registry');
    return res.json();
  }

  static async updateImportSourceStatus(sourceId: string, status: string, reason?: string): Promise<any> {
    const res = await apiFetch(`${API_BASE_URL}/admin/imports/sources/${encodeURIComponent(sourceId)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reason }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to update import source status',
      );
    }
    return res.json();
  }

  static async getImportBatches(dataType?: string): Promise<any[]> {
    const suffix = dataType ? `?dataType=${encodeURIComponent(dataType)}` : '';
    const res = await apiFetch(
      `${API_BASE_URL}/admin/imports/batches${suffix}`,
    );
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to fetch import batches',
      );
    }
    return res.json();
  }

  static async getImportedRecords(params?: {
    batchId?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ data: any[]; total: number; page: number; pageSize: number }> {
    const searchParams = new URLSearchParams();
    if (params?.batchId) searchParams.append('batchId', params.batchId);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.pageSize) searchParams.append('pageSize', params.pageSize.toString());

    const res = await apiFetch(
      `${API_BASE_URL}/admin/scholarships/imported-records?${searchParams.toString()}`,
    );
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to fetch imported records',
      );
    }
    return res.json();
  }

  static async getImportRecords(params?: {
    batchId?: string;
    status?: string;
    dataType?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ data: any[]; total: number; page: number; pageSize: number }> {
    const searchParams = new URLSearchParams();
    if (params?.batchId) searchParams.append('batchId', params.batchId);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.dataType) searchParams.append('dataType', params.dataType);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.pageSize) searchParams.append('pageSize', params.pageSize.toString());

    const res = await apiFetch(`${API_BASE_URL}/admin/imports/records?${searchParams.toString()}`);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to fetch import records',
      );
    }
    return res.json();
  }

  static async promoteImportedRecord(recordId: string): Promise<any> {
    const res = await apiFetch(
      `${API_BASE_URL}/admin/scholarships/imported-records/${encodeURIComponent(recordId)}/promote`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
    );
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to promote imported record',
      );
    }
    return res.json();
  }

  static async promoteImportRecord(recordId: string): Promise<any> {
    const res = await apiFetch(
      `${API_BASE_URL}/admin/imports/records/${encodeURIComponent(recordId)}/promote`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
    );
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to promote import record',
      );
    }
    return res.json();
  }

  static async promoteImportBatch(batchId: string): Promise<any> {
    const res = await apiFetch(
      `${API_BASE_URL}/admin/imports/batches/${encodeURIComponent(batchId)}/promote`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
    );
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
          'Failed to promote import batch',
      );
    }
    return res.json();
  }

  // Imported External Courses API — explicit WP-IC-07 REST contract.
  static async getAdminImportedCourses(params?: Record<string, unknown>): Promise<any> {
    const search = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') search.append(key, String(value));
    });
    const suffix = search.toString() ? `?${search.toString()}` : '';
    const res = await apiFetch(`${API_BASE_URL}/admin/courses/imported${suffix}`);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch imported courses');
    }
    return res.json();
  }

  static async getAdminImportedCourseById(id: string): Promise<any> {
    const res = await apiFetch(`${API_BASE_URL}/admin/courses/imported/${encodeURIComponent(id)}`);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch imported course');
    }
    return res.json();
  }

  static async updateAdminImportedCourse(
    id: string,
    payload: Record<string, unknown>,
  ): Promise<any> {
    const res = await apiFetch(`${API_BASE_URL}/admin/courses/imported/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to update imported course');
    }
    return res.json();
  }

  private static async postImportedCourseAction(id: string, endpoint: string): Promise<any> {
    const res = await apiFetch(
      `${API_BASE_URL}/admin/courses/imported/${encodeURIComponent(id)}/${endpoint}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      },
    );
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed imported-course operation: ${endpoint}`);
    }
    if (res.status === 204) return null;
    return res.json();
  }

  static verifyAdminImportedCourseSource(id: string) {
    return this.postImportedCourseAction(id, 'verify-source');
  }

  static checkAdminImportedCourseLink(id: string) {
    return this.postImportedCourseAction(id, 'check-link');
  }

  static fetchAdminImportedCourseMissing(id: string) {
    return this.postImportedCourseAction(id, 'fetch-missing');
  }

  static markAdminImportedCourseReady(id: string) {
    return this.postImportedCourseAction(id, 'mark-ready');
  }

  static publishAdminImportedCourse(id: string) {
    return this.postImportedCourseAction(id, 'publish');
  }

  static unpublishAdminImportedCourse(id: string) {
    return this.postImportedCourseAction(id, 'unpublish');
  }

  static rejectAdminImportedCourse(id: string) {
    return this.postImportedCourseAction(id, 'reject');
  }

  static archiveAdminImportedCourse(id: string) {
    return this.postImportedCourseAction(id, 'archive');
  }

  // Backward-compatible UI adapter. It maps a closed action enum to explicit
  // REST endpoints; it never constructs an open-ended /:action URL.
  static async executeAdminImportedCourseAction(
    id: string,
    action: string,
    payload?: any,
  ): Promise<any> {
    switch (action) {
      case 'VERIFY_SOURCE':
        return this.verifyAdminImportedCourseSource(id);
      case 'CHECK_LINK':
        return this.checkAdminImportedCourseLink(id);
      case 'FETCH_MISSING_FIELDS':
        return this.fetchAdminImportedCourseMissing(id);
      case 'MARK_READY_TO_PUBLISH':
        return this.markAdminImportedCourseReady(id);
      case 'PUBLISH':
        return this.publishAdminImportedCourse(id);
      case 'UNPUBLISH':
        return this.unpublishAdminImportedCourse(id);
      case 'REJECT':
        return this.rejectAdminImportedCourse(id);
      case 'ARCHIVE':
        return this.archiveAdminImportedCourse(id);
      case 'EDIT':
        return this.updateAdminImportedCourse(id, {
          displayName: payload?.displayName ?? payload?.titleAr,
          directCourseUrl: payload?.directCourseUrl ?? payload?.directUrl,
          providerName: payload?.provider,
          isStudyFree:
            payload?.studyFree === 'Yes' ? true : payload?.studyFree === 'No' ? false : undefined,
          isFreeCertificate:
            payload?.freeCertificate === 'Yes'
              ? true
              : payload?.freeCertificate === 'No'
                ? false
                : undefined,
          certificateType: payload?.certificateType,
          learningLanguageRaw: payload?.language,
          studyLevelRaw: payload?.level,
          studyDurationRaw: payload?.duration,
          category: payload?.category,
          shortCourseTopicsRaw: payload?.shortCourseTopics,
        });
      default:
        throw new Error(`Unsupported imported course action: ${action}`);
    }
  }

  static async getCourseImportOverview(): Promise<any> {
    const res = await apiFetch(`${API_BASE_URL}/admin/imports/courses/overview`);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch course import overview');
    }
    return res.json();
  }

  static async getCourseImportProviders(): Promise<any> {
    const res = await apiFetch(`${API_BASE_URL}/admin/imports/courses/providers`);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch course providers');
    }
    return res.json();
  }

  static async getCourseImportProvider(id: string): Promise<any> {
    const res = await apiFetch(
      `${API_BASE_URL}/admin/imports/courses/providers/${encodeURIComponent(id)}`,
    );
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch course provider');
    }
    return res.json();
  }

  static async preflightCourseImport(payload: Record<string, unknown>): Promise<any> {
    const res = await apiFetch(`${API_BASE_URL}/admin/imports/courses/preflight`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Course import preflight failed');
    }
    return res.json();
  }

  static async createCourseImportBatch(payload: Record<string, unknown>): Promise<any> {
    const res = await apiFetch(`${API_BASE_URL}/admin/imports/courses/batches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to create course import batch');
    }
    return res.json();
  }

  static async getCourseImportBatches(limit = 50): Promise<any[]> {
    const res = await apiFetch(
      `${API_BASE_URL}/admin/imports/courses/batches?limit=${encodeURIComponent(String(limit))}`,
    );
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch course import batches');
    }
    const result = await res.json();
    return Array.isArray(result?.data) ? result.data : [];
  }

  static async getCourseImportBatch(id: string): Promise<any> {
    const res = await apiFetch(
      `${API_BASE_URL}/admin/imports/courses/batches/${encodeURIComponent(id)}`,
    );
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch course import batch');
    }
    return res.json();
  }

  static async getCourseImportBatchRecords(
    id: string,
    params?: Record<string, unknown>,
  ): Promise<any> {
    const search = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') search.append(key, String(value));
    });
    const suffix = search.toString() ? `?${search.toString()}` : '';
    const res = await apiFetch(
      `${API_BASE_URL}/admin/imports/courses/batches/${encodeURIComponent(id)}/records${suffix}`,
    );
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch course import records');
    }
    return res.json();
  }

  static async getCourseImportReviewQueue(params?: Record<string, unknown>): Promise<any> {
    const search = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') search.append(key, String(value));
    });
    const suffix = search.toString() ? `?${search.toString()}` : '';
    const res = await apiFetch(`${API_BASE_URL}/admin/imports/courses/review${suffix}`);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch course import review queue');
    }
    return res.json();
  }

  static async transferCourseImportBatch(
    id: string,
    payload: Record<string, unknown>,
  ): Promise<any> {
    const res = await apiFetch(
      `${API_BASE_URL}/admin/imports/courses/batches/${encodeURIComponent(id)}/transfer`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to transfer course import batch');
    }
    return res.json();
  }

  // Student Services API (Phase 20)
  static async getAdminStudentServices(params?: any): Promise<any[]> {
    const res = await apiFetch(`${API_BASE_URL}/admin/services/student`);
    if (!res.ok) throw new Error('Failed to fetch student services');
    return res.json();
  }

  static async getAdminStudentServiceById(id: string): Promise<any> {
    const res = await apiFetch(`${API_BASE_URL}/admin/services/student/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error('Failed to fetch student service');
    return res.json();
  }

  static async createAdminStudentService(payload: any): Promise<any> {
    const res = await apiFetch(`${API_BASE_URL}/admin/services/student`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to create student service');
    return res.json();
  }

  static async executeAdminStudentServiceAction(
    id: string,
    action: string,
    payload?: any,
  ): Promise<any> {
    const res = await apiFetch(
      `${API_BASE_URL}/admin/services/student/${encodeURIComponent(id)}/${action}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || {}),
      },
    );
    if (!res.ok) throw new Error(`Failed to execute student service action ${action}`);
    return res.json();
  }

  // General Services API (Phase 20)
  static async getAdminGeneralServices(params?: any): Promise<any[]> {
    const res = await apiFetch(`${API_BASE_URL}/admin/services/general`);
    if (!res.ok) throw new Error('Failed to fetch general services');
    return res.json();
  }

  static async getAdminGeneralServiceById(id: string): Promise<any> {
    const res = await apiFetch(`${API_BASE_URL}/admin/services/general/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error('Failed to fetch general service');
    return res.json();
  }

  static async createAdminGeneralService(payload: any): Promise<any> {
    const res = await apiFetch(`${API_BASE_URL}/admin/services/general`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to create general service');
    return res.json();
  }

  static async executeAdminGeneralServiceAction(
    id: string,
    action: string,
    payload?: any,
  ): Promise<any> {
    const res = await apiFetch(
      `${API_BASE_URL}/admin/services/general/${encodeURIComponent(id)}/${action}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || {}),
      },
    );
    if (!res.ok) throw new Error(`Failed to execute general service action ${action}`);
    return res.json();
  }
}

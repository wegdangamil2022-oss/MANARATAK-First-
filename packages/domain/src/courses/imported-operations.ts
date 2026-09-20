import type { ExternalCourseProviderDto } from './provider-registry';
import type { UpdateCourseDto } from './contracts/ICourseRepository';

export type ImportedCourseLinkHealth =
  | 'VERIFIED_DIRECT'
  | 'REDIRECTED_VALID'
  | 'NEEDS_REVIEW'
  | 'BROKEN'
  | 'BLOCKED_DOMAIN'
  | 'NOT_DIRECT_COURSE_PAGE'
  | 'UNKNOWN';

export interface ImportedCourseAdminFilters {
  q?: string;
  providerId?: string;
  status?: string;
  completenessStatus?: string;
  language?: string;
  freeMode?: 'FREE_STUDY' | 'FREE_CERTIFICATE';
  linkHealth?: ImportedCourseLinkHealth;
  page?: number;
  pageSize?: number;
}

export interface ImportedCourseAdminRecord {
  id: string;
  publicId: string;
  slug: string;
  displayName: string;
  canonicalName: string;
  originalSourceTitle?: string | null;
  accessType: string;
  originType: string;
  directCourseUrl: string;
  status: string;
  completenessStatus: string;
  externalProviderId?: string | null;
  providerName?: string | null;
  platformName?: string | null;
  isStudyFree?: boolean | null;
  isFreeCertificate?: boolean | null;
  certificateType?: string | null;
  learningLanguageRaw?: string | null;
  studyLevelRaw?: string | null;
  studyDurationRaw?: string | null;
  shortCourseTopicsRaw?: string | null;
  sourceImportRecordId?: string | null;
  sourceVerified: boolean;
  sourceVerificationReason?: string | null;
  linkHealth: ImportedCourseLinkHealth;
  linkResponseCode?: number | null;
  linkRedirectTarget?: string | null;
  linkCheckedAt?: Date | null;
  missingFields: string[];
  missingFieldsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ImportedCourseAdminDetail extends ImportedCourseAdminRecord {
  provider?: ExternalCourseProviderDto | null;
  sourceIdentity?: {
    id: string;
    providerId: string;
    sourceNativeKey: string;
    identityStrategy: string;
    originalTitle: string;
    languageVersionKey: string;
    currentUrl: string;
    status: string;
  } | null;
  importAnalysis?: {
    id: string;
    importRecordId: string;
    changeState: string;
    requiresReview: boolean;
    fieldDiffs?: Record<string, unknown> | null;
    relationshipProposals?: Record<string, unknown> | null;
    analyzedAt: Date;
  } | null;
  provenance: Array<{
    fieldKey: string;
    importRecordId: string;
    providerId: string;
    sourceUrl?: string | null;
    importedAt: Date;
    reviewedBy?: string | null;
    reviewStatus: string;
  }>;
}

export interface ImportedCourseOverview {
  total: number;
  review: number;
  incomplete: number;
  broken: number;
  needsVerification: number;
  ready: number;
  published: number;
  archived: number;
}

export interface ImportedCoursePage {
  data: ImportedCourseAdminRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  overview: ImportedCourseOverview;
}


export interface CourseImportBatchSummary {
  id: string;
  sourceSystem: string;
  dataType: string;
  batchStatus: string;
  totalRecords: number;
  processedRecords: number;
  failedRecords: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CourseImportOperationsOverview {
  providersTotal: number;
  providersApproved: number;
  batchesTotal: number;
  recordsTotal: number;
  reviewRequired: number;
  transferred: number;
  latestBatch?: {
    id: string;
    sourceSystem: string;
    batchStatus: string;
    totalRecords: number;
    processedRecords: number;
    failedRecords: number;
    createdAt: Date;
  } | null;
}

export interface CourseImportReviewRecord {
  importRecordId: string;
  batchId: string;
  status: string;
  sourceRowNumber?: number | null;
  providerId?: string | null;
  providerName?: string | null;
  courseName?: string | null;
  directCourseUrl?: string | null;
  changeState?: string | null;
  requiresReview: boolean;
  matchedCourseId?: string | null;
  promotedEntityId?: string | null;
  validationErrors?: unknown;
  analyzedAt?: Date | null;
  createdAt: Date;
}

export interface CourseImportReviewPage {
  data: CourseImportReviewRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ImportedCourseVerificationContext {
  courseId: string;
  directCourseUrl: string;
  providerId?: string | null;
  sourceIdentityId?: string | null;
}

export interface ImportedCourseLinkCheckResult {
  state: ImportedCourseLinkHealth;
  responseCode?: number | null;
  redirectTarget?: string | null;
  checkedAt: Date;
  detail?: string | null;
}

export interface IImportedCourseOperationsRepository {
  listImportedCourses(filters: ImportedCourseAdminFilters): Promise<ImportedCoursePage>;
  getImportedCourseById(id: string): Promise<ImportedCourseAdminDetail | null>;
  getOverview(): Promise<ImportedCourseOverview>;
  getVerificationContext(courseId: string): Promise<ImportedCourseVerificationContext | null>;
  recordLinkCheck(
    courseId: string,
    result: ImportedCourseLinkCheckResult,
    checkedUrl: string,
  ): Promise<void>;
  getImportOperationsOverview(): Promise<CourseImportOperationsOverview>;
  listCourseBatches(limit?: number): Promise<CourseImportBatchSummary[]>;
  listProviderCourseBatches(input: {
    providerPublicId: string;
    sourcePrefix?: string;
    limit?: number;
  }): Promise<{ data: CourseImportBatchSummary[]; total: number }>;
  getCourseBatchById(id: string): Promise<CourseImportBatchSummary | null>;
  listReviewQueue(input?: { page?: number; pageSize?: number }): Promise<CourseImportReviewPage>;
  listProviderReviewQueue(
    providerId: string,
    input?: { page?: number; pageSize?: number },
  ): Promise<CourseImportReviewPage>;
  getProviderReviewSummary(providerId: string): Promise<{ reviewRequiredCount: number; changedLinkQueueCount: number }>;
}

export interface IImportedCourseLinkChecker {
  check(input: {
    url: string;
    allowedDomains: string[];
    directCoursePathPatterns?: string[];
  }): Promise<ImportedCourseLinkCheckResult>;
}

export interface ImportedCourseUpdateInput extends UpdateCourseDto {}

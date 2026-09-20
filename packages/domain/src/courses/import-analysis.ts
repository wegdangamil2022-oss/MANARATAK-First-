import { CourseImportChangeState, CourseSourceIdentityStatus } from './provider-registry';

export enum CourseSourceIdentityStrategy {
  EXPLICIT_NATIVE_ID = 'EXPLICIT_NATIVE_ID',
  PROVIDER_URL_KEY = 'PROVIDER_URL_KEY',
  PROVISIONAL_TITLE_LANGUAGE = 'PROVISIONAL_TITLE_LANGUAGE',
}

export enum CourseImportMatchState {
  EXACT_EXISTING = 'EXACT_EXISTING',
  SAME_BATCH_DUPLICATE = 'SAME_BATCH_DUPLICATE',
  CROSS_BATCH_UNCHANGED = 'CROSS_BATCH_UNCHANGED',
  POSSIBLE_COLLISION = 'POSSIBLE_COLLISION',
  AMBIGUOUS = 'AMBIGUOUS',
  NOT_DUPLICATE = 'NOT_DUPLICATE',
}

export interface CourseSourceIdentityDto {
  id: string;
  courseId?: string;
  providerId: string;
  sourceNativeKey: string;
  identityStrategy: CourseSourceIdentityStrategy;
  originalTitle: string;
  normalizedOriginalTitle: string;
  languageVersionKey: string;
  currentUrl: string;
  firstSeenAt: Date;
  lastSeenAt: Date;
  status: CourseSourceIdentityStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CourseImportAnalysisDto {
  id: string;
  importRecordId: string;
  providerCandidateId?: string;
  resolvedProviderId?: string;
  sourceNativeKey?: string;
  normalizedPayload: Record<string, unknown>;
  eligibilityState: string;
  completenessState: string;
  matchState: CourseImportMatchState;
  matchedCourseId?: string;
  changeState: CourseImportChangeState;
  fieldDiffs?: Record<string, unknown>;
  relationshipProposals?: Record<string, unknown>;
  requiresReview: boolean;
  analyzedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface EnsureCourseSourceIdentityInput {
  providerId: string;
  sourceNativeKey: string;
  identityStrategy: CourseSourceIdentityStrategy;
  originalTitle: string;
  normalizedOriginalTitle: string;
  languageVersionKey: string;
  currentUrl: string;
  status?: CourseSourceIdentityStatus;
  observedAt?: Date;
}

export interface InitialCourseSourceUrlInput {
  courseSourceIdentityId: string;
  url: string;
  normalizedUrl: string;
  observedAt?: Date;
}

export interface UpsertCourseImportAnalysisInput {
  importRecordId: string;
  providerCandidateId?: string;
  resolvedProviderId?: string;
  sourceNativeKey?: string;
  normalizedPayload: Record<string, unknown>;
  eligibilityState: string;
  completenessState: string;
  matchState: CourseImportMatchState;
  matchedCourseId?: string;
  changeState: CourseImportChangeState;
  fieldDiffs?: Record<string, unknown>;
  relationshipProposals?: Record<string, unknown>;
  requiresReview: boolean;
  analyzedAt?: Date;
}

export interface ICourseImportAnalysisRepository {
  findAnalysisByImportRecordId(importRecordId: string): Promise<CourseImportAnalysisDto | null>;
  findSourceIdentityByKey(
    providerId: string,
    sourceNativeKey: string,
    languageVersionKey: string,
  ): Promise<CourseSourceIdentityDto | null>;
  findSourceIdentitiesByNormalizedTitle(
    providerId: string,
    normalizedOriginalTitle: string,
    languageVersionKey: string,
  ): Promise<CourseSourceIdentityDto[]>;
  findSourceIdentitiesByNormalizedUrl(
    providerId: string,
    normalizedUrl: string,
    languageVersionKey: string,
  ): Promise<CourseSourceIdentityDto[]>;
  ensureSourceIdentity(input: EnsureCourseSourceIdentityInput): Promise<{
    identity: CourseSourceIdentityDto;
    created: boolean;
  }>;
  touchSourceIdentity(identityId: string, observedAt?: Date): Promise<void>;
  recordInitialUrl(input: InitialCourseSourceUrlInput): Promise<void>;
  findLatestAnalysisForSourceKey(
    providerId: string,
    sourceNativeKey: string,
    languageVersionKey: string,
    excludeImportRecordId?: string,
  ): Promise<CourseImportAnalysisDto | null>;
  upsertAnalysis(input: UpsertCourseImportAnalysisInput): Promise<CourseImportAnalysisDto>;
}

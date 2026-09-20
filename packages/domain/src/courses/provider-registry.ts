export enum ExternalCourseProviderStatus {
  DISCOVERED = 'DISCOVERED',
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  NEEDS_REVIEW = 'NEEDS_REVIEW',
  DISABLED = 'DISABLED',
  ARCHIVED = 'ARCHIVED',
}

export enum ExternalCourseProviderImportStrategy {
  FILE = 'FILE',
  CONNECTOR = 'CONNECTOR',
  OFFICIAL_FEED = 'OFFICIAL_FEED',
  MIXED = 'MIXED',
}

export enum ExternalCourseProviderOperatingScope {
  GLOBAL = 'GLOBAL',
  REGIONAL = 'REGIONAL',
  COUNTRY = 'COUNTRY',
}

export enum CourseSourceIdentityStatus {
  ACTIVE = 'ACTIVE',
  NEEDS_REVIEW = 'NEEDS_REVIEW',
  DISABLED = 'DISABLED',
  ARCHIVED = 'ARCHIVED',
}

export enum CourseSourceUrlVerificationState {
  UNVERIFIED = 'UNVERIFIED',
  VERIFIED = 'VERIFIED',
  REDIRECTED = 'REDIRECTED',
  BROKEN = 'BROKEN',
  REJECTED = 'REJECTED',
}

export enum CourseImportChangeState {
  NEW = 'NEW',
  UNCHANGED = 'UNCHANGED',
  URL_CHANGED = 'URL_CHANGED',
  METADATA_CHANGED = 'METADATA_CHANGED',
  URL_AND_METADATA_CHANGED = 'URL_AND_METADATA_CHANGED',
  AMBIGUOUS_MATCH = 'AMBIGUOUS_MATCH',
  CONFLICT = 'CONFLICT',
  INVALID = 'INVALID',
  INCOMPLETE = 'INCOMPLETE',
  REJECTED = 'REJECTED',
  READY_TO_TRANSFER = 'READY_TO_TRANSFER',
  TRANSFERRED = 'TRANSFERRED',
}

export enum CourseFieldReviewStatus {
  UNREVIEWED = 'UNREVIEWED',
  REVIEWED = 'REVIEWED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface ExternalCourseProviderAliasDto {
  id: string;
  providerId: string;
  alias: string;
  normalizedAlias: string;
  locale?: string;
  source?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExternalCourseProviderDto {
  id: string;
  publicId: string;
  slug: string;
  canonicalName: string;
  normalizedCanonicalName: string;
  displayName: string;
  providerType?: string;
  status: ExternalCourseProviderStatus;
  officialWebsite?: string;
  operatingScope?: ExternalCourseProviderOperatingScope;
  headquartersCountryReferenceId?: string;
  sourceTrustLevel: string;
  importStrategy: ExternalCourseProviderImportStrategy;
  directCoursePathPatterns: string[];
  connectorKey?: string;
  connectorVersion?: string;
  lastVerifiedAt?: Date;
  allowedDomains: string[];
  aliases: ExternalCourseProviderAliasDto[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ExternalCourseProviderAliasSeedInput {
  alias: string;
  locale?: string;
  source?: string;
}

export interface UpsertExternalCourseProviderSeedInput {
  publicId: string;
  slug: string;
  canonicalName: string;
  displayName: string;
  providerType?: string | null;
  status: ExternalCourseProviderStatus;
  officialWebsite?: string | null;
  operatingScope?: ExternalCourseProviderOperatingScope | null;
  headquartersCountryReferenceId?: string | null;
  sourceTrustLevel: string;
  importStrategy: ExternalCourseProviderImportStrategy;
  directCoursePathPatterns?: string[];
  connectorKey?: string | null;
  connectorVersion?: string | null;
  lastVerifiedAt?: Date | null;
  aliases?: ExternalCourseProviderAliasSeedInput[];
  allowedDomains?: string[];
}

export interface IExternalCourseProviderRepository {
  list(): Promise<ExternalCourseProviderDto[]>;
  findById(id: string): Promise<ExternalCourseProviderDto | null>;
  findByPublicId(publicId: string): Promise<ExternalCourseProviderDto | null>;
  resolveByName(name: string): Promise<ExternalCourseProviderDto | null>;
  isDomainApproved(providerId: string, urlOrDomain: string): Promise<boolean>;
  upsertSeedProvider(input: UpsertExternalCourseProviderSeedInput): Promise<ExternalCourseProviderDto>;
}

export const IMPORTED_COURSE_MASTER_COLUMNS = [
  'No.',
  'Platform / University',
  'Course Name',
  'Direct Course URL',
  'Study Free',
  'Free Certificate',
  'Certificate Type',
  'Language',
  'Study Level',
  'Course Duration',
  'Short Course Topics (4)',
] as const;

/**
 * Phase 13 semantic contract for one row from the course master workbook.
 * Parsing XLSX/CSV and source row capture stay in Phase 06/WP-IC-03.
 * `sourceOrder` represents the workbook `No.` column and is never canonical identity.
 */
export interface ImportedCourseMasterRowContract {
  sourceOrder: string | number | null;
  providerLabel: string;
  courseName: string;
  directCourseUrl: string;
  studyFreeRaw: string;
  freeCertificateRaw: string;
  certificateTypeRaw: string;
  languageRaw: string;
  studyLevelRaw: string;
  courseDurationRaw: string;
  shortCourseTopicsRaw: string;
}

export function normalizeExternalCourseProviderName(value: string): string {
  return value
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('en-US')
    .replace(/[\u2010-\u2015\u2212-]/g, ' ')
    .replace(/[._/\\]+/g, ' ')
    .replace(/[^\p{L}\p{N}&+]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeExternalCourseProviderDomain(value: string): string {
  const trimmed = value.trim().toLocaleLowerCase('en-US');
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
    return parsed.hostname.replace(/\.$/, '').toLocaleLowerCase('en-US');
  } catch {
    return trimmed.split('/')[0].replace(/\.$/, '');
  }
}

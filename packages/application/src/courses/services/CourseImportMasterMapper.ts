import {
  CourseAccessType,
  CourseImportCompletenessState,
  CourseOriginType,
  CourseStatus,
  CreateCourseDto,
  UpdateCourseDto,
} from '@manaratak/domain';

export interface CourseImportSemanticRow {
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

export interface CourseImportIdentityView {
  providerId: string;
  providerPublicId: string;
  sourceNativeKey: string;
  identityStrategy: string;
  languageVersionKey: string;
  normalizedTitle: string;
  normalizedUrl: string;
}

export interface CourseImportProvenanceView {
  artifactSha256: string;
  assetId?: string;
  sourceFilename?: string;
  sourceSheetName?: string;
  worksheetRowNumber?: number;
}

export interface CourseImportMappedData {
  row: CourseImportSemanticRow;
  identity: CourseImportIdentityView;
  provenance: CourseImportProvenanceView;
  accessType: CourseAccessType;
  completenessStatus: CourseImportCompletenessState;
  normalizedLanguage?: string;
  normalizedCertificateType?: string;
  normalizedLevel?: string;
  normalizedDuration?: string;
  normalizedTopics: string[];
  canonicalDedupKey: string;
  createData: Omit<CreateCourseDto, 'publicId' | 'slug'>;
}

const LANGUAGE_ALIASES: Readonly<Record<string, string>> = {
  en: 'English',
  eng: 'English',
  english: 'English',
  ar: 'Arabic',
  ara: 'Arabic',
  arabic: 'Arabic',
  de: 'German',
  deu: 'German',
  ger: 'German',
  german: 'German',
  fr: 'French',
  fra: 'French',
  fre: 'French',
  french: 'French',
  es: 'Spanish',
  spa: 'Spanish',
  spanish: 'Spanish',
  pt: 'Portuguese',
  por: 'Portuguese',
  portuguese: 'Portuguese',
  ru: 'Russian',
  rus: 'Russian',
  russian: 'Russian',
  zh: 'Chinese',
  zho: 'Chinese',
  chi: 'Chinese',
  chinese: 'Chinese',
  ja: 'Japanese',
  jpn: 'Japanese',
  japanese: 'Japanese',
  ko: 'Korean',
  kor: 'Korean',
  korean: 'Korean',
  it: 'Italian',
  ita: 'Italian',
  italian: 'Italian',
  tr: 'Turkish',
  tur: 'Turkish',
  turkish: 'Turkish',
  nl: 'Dutch',
  nld: 'Dutch',
  dut: 'Dutch',
  dutch: 'Dutch',
};

const NO_CERTIFICATE = new Set([
  'none',
  'no',
  'no certificate',
  'not available',
  'not offered',
  'n/a',
]);

function object(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.normalize('NFKC').trim().replace(/\s+/g, ' ') : '';
}

function yesNo(value: string, field: string): boolean {
  const normalized = stringValue(value).toLowerCase();
  if (normalized === 'yes') return true;
  if (normalized === 'no') return false;
  throw new Error(`COURSE_IMPORT_${field}_EXPLICIT_YES_NO_REQUIRED`);
}

function httpsUrl(value: string): string {
  const parsed = new URL(value.trim());
  if (parsed.protocol !== 'https:') throw new Error('COURSE_IMPORT_DIRECT_URL_HTTPS_REQUIRED');
  return value.trim();
}

function parseRow(payload: Record<string, unknown>): CourseImportSemanticRow {
  const row = object(payload.semanticRow);
  if (!row) throw new Error('COURSE_IMPORT_ANALYSIS_SEMANTIC_ROW_REQUIRED');
  const providerLabel = stringValue(row.providerLabel);
  const courseName = stringValue(row.courseName);
  const directCourseUrl = stringValue(row.directCourseUrl);
  if (!providerLabel || !courseName || !directCourseUrl) {
    throw new Error('COURSE_IMPORT_SEMANTIC_IDENTITY_FIELDS_REQUIRED');
  }
  const sourceOrder = row.sourceOrder;
  return {
    sourceOrder: typeof sourceOrder === 'string' || typeof sourceOrder === 'number' ? sourceOrder : null,
    providerLabel,
    courseName,
    directCourseUrl,
    studyFreeRaw: stringValue(row.studyFreeRaw),
    freeCertificateRaw: stringValue(row.freeCertificateRaw),
    certificateTypeRaw: stringValue(row.certificateTypeRaw),
    languageRaw: stringValue(row.languageRaw),
    studyLevelRaw: stringValue(row.studyLevelRaw),
    courseDurationRaw: stringValue(row.courseDurationRaw),
    shortCourseTopicsRaw: stringValue(row.shortCourseTopicsRaw),
  };
}

function parseIdentity(payload: Record<string, unknown>): CourseImportIdentityView {
  const value = object(payload.identity);
  if (!value) throw new Error('COURSE_IMPORT_ANALYSIS_IDENTITY_REQUIRED');
  const providerId = stringValue(value.providerId);
  const providerPublicId = stringValue(value.providerPublicId);
  const sourceNativeKey = stringValue(value.sourceNativeKey);
  const identityStrategy = stringValue(value.identityStrategy);
  const languageVersionKey = stringValue(value.languageVersionKey);
  const normalizedTitle = stringValue(value.normalizedTitle);
  const normalizedUrl = stringValue(value.normalizedUrl);
  if (!providerId || !providerPublicId || !sourceNativeKey || !identityStrategy || !normalizedTitle || !normalizedUrl) {
    throw new Error('COURSE_IMPORT_ANALYSIS_IDENTITY_INCOMPLETE');
  }
  return {
    providerId,
    providerPublicId,
    sourceNativeKey,
    identityStrategy,
    languageVersionKey,
    normalizedTitle,
    normalizedUrl,
  };
}

function parseProvenance(payload: Record<string, unknown>): CourseImportProvenanceView {
  const value = object(payload.provenance);
  if (!value) throw new Error('COURSE_IMPORT_PROVENANCE_REQUIRED');
  const artifactSha256 = stringValue(value.artifactSha256).toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(artifactSha256)) {
    throw new Error('COURSE_IMPORT_PROVENANCE_ARTIFACT_HASH_REQUIRED');
  }
  const row = value.worksheetRowNumber;
  return {
    artifactSha256,
    assetId: stringValue(value.assetId) || undefined,
    sourceFilename: stringValue(value.sourceFilename) || undefined,
    sourceSheetName: stringValue(value.sourceSheetName) || undefined,
    worksheetRowNumber: typeof row === 'number' && Number.isInteger(row) && row > 0 ? row : undefined,
  };
}

function normalizeLanguage(value: string): string | undefined {
  const key = stringValue(value).toLowerCase();
  return LANGUAGE_ALIASES[key];
}

function normalizeCertificate(value: string, freeCertificate: boolean): string | undefined {
  const normalized = stringValue(value);
  if (!normalized) return undefined;
  if (!freeCertificate && NO_CERTIFICATE.has(normalized.toLowerCase())) return 'NONE';
  return normalized;
}

function normalizeLevel(value: string): string | undefined {
  const normalized = stringValue(value);
  if (!normalized) return undefined;
  const key = normalized.toLowerCase();
  if (/beginner|introductory|foundation|basic/.test(key)) return 'BEGINNER';
  if (/intermediate/.test(key)) return 'INTERMEDIATE';
  if (/advanced|expert/.test(key)) return 'ADVANCED';
  if (/all levels|not officially specified/.test(key)) return 'NOT_OFFICIALLY_SPECIFIED';
  return undefined;
}

function normalizeDuration(value: string): string | undefined {
  const normalized = stringValue(value);
  return normalized || undefined;
}

function normalizeTopics(value: string): string[] {
  const normalized = stringValue(value);
  if (!normalized) return [];
  return [...new Set(
    normalized.split(/\s*(?:•|\||;)\s*/g).map((item) => item.trim()).filter(Boolean),
  )];
}

export class CourseImportMasterMapper {
  public static map(
    normalizedPayload: Record<string, unknown>,
    canonicalDedupKey: string,
    importRecordId: string,
  ): CourseImportMappedData {
    const row = parseRow(normalizedPayload);
    const identity = parseIdentity(normalizedPayload);
    const provenance = parseProvenance(normalizedPayload);
    const studyFree = yesNo(row.studyFreeRaw, 'STUDY_FREE');
    const freeCertificate = yesNo(row.freeCertificateRaw, 'FREE_CERTIFICATE');

    if (!studyFree) throw new Error('COURSE_IMPORT_NOT_ELIGIBLE_FREE_STUDY');

    const accessType = freeCertificate
      ? CourseAccessType.FREE_STUDY_AND_CERTIFICATE
      : CourseAccessType.FREE_STUDY;
    const normalizedLanguage = normalizeLanguage(row.languageRaw);
    const normalizedCertificateType = normalizeCertificate(row.certificateTypeRaw, freeCertificate);
    const normalizedLevel = normalizeLevel(row.studyLevelRaw);
    const normalizedDuration = normalizeDuration(row.courseDurationRaw);
    const normalizedTopics = normalizeTopics(row.shortCourseTopicsRaw);
    const directCourseUrl = httpsUrl(row.directCourseUrl);

    const missing: string[] = [];
    if (!row.languageRaw) missing.push('languageRaw');
    if (!row.studyLevelRaw) missing.push('studyLevelRaw');
    if (!row.courseDurationRaw) missing.push('courseDurationRaw');
    if (!row.shortCourseTopicsRaw) missing.push('shortCourseTopicsRaw');

    const needsReview: string[] = [];
    if (row.languageRaw && !normalizedLanguage) needsReview.push('languageResolution');
    if (row.studyLevelRaw && !normalizedLevel) needsReview.push('studyLevelNormalization');

    const completenessStatus = missing.length > 0
      ? CourseImportCompletenessState.INCOMPLETE
      : needsReview.length > 0
        ? CourseImportCompletenessState.NEEDS_REVIEW
        : CourseImportCompletenessState.COMPLETE;

    const createData: Omit<CreateCourseDto, 'publicId' | 'slug'> = {
      canonicalName: row.courseName,
      canonicalDedupKey,
      displayName: row.courseName,
      accessType,
      originType: CourseOriginType.EXTERNAL_LINKED_COURSE,
      directCourseUrl,
      status: CourseStatus.IMPORTED,
      completenessStatus,
      externalProviderId: identity.providerId,
      originalSourceTitle: row.courseName,
      isStudyFree: studyFree,
      isFreeCertificate: freeCertificate,
      certificateType: row.certificateTypeRaw || undefined,
      learningLanguageRaw: row.languageRaw || undefined,
      studyLevelRaw: row.studyLevelRaw || undefined,
      studyDurationRaw: row.courseDurationRaw || undefined,
      shortCourseTopicsRaw: row.shortCourseTopicsRaw || undefined,
      platformName: row.providerLabel,
      providerName: row.providerLabel,
      learningLanguage: normalizedLanguage,
      studyDuration: normalizedDuration,
      certificateAvailable: freeCertificate ? true : undefined,
      sourceUrl: directCourseUrl,
      officialSourceUrl: directCourseUrl,
      sourceImportRecordId: importRecordId,
      optionalFields: {
        sourceNativeKey: identity.sourceNativeKey,
        sourceIdentityStrategy: identity.identityStrategy,
        languageVersionKey: identity.languageVersionKey,
        providerPublicId: identity.providerPublicId,
        certificateTypeNormalized: normalizedCertificateType ?? null,
        studyLevelNormalized: normalizedLevel ?? null,
        topicsNormalized: normalizedTopics,
        languageResolutionState: normalizedLanguage ? 'RESOLVED_LABEL' : 'UNRESOLVED',
        normalizationReview: needsReview,
        sourceArtifactHash: provenance.artifactSha256,
        sourceAssetId: provenance.assetId ?? null,
        sourceFilename: provenance.sourceFilename ?? null,
        sourceSheetName: provenance.sourceSheetName ?? null,
        sourceRowNumber: provenance.worksheetRowNumber ?? null,
      },
    };

    return {
      row,
      identity,
      provenance,
      accessType,
      completenessStatus,
      normalizedLanguage,
      normalizedCertificateType,
      normalizedLevel,
      normalizedDuration,
      normalizedTopics,
      canonicalDedupKey,
      createData,
    };
  }

  public static buildMergeUpdate(
    existing: Record<string, unknown>,
    mapped: CourseImportMappedData,
    allowedSemanticFields: ReadonlySet<string>,
    allowUrl: boolean,
  ): UpdateCourseDto {
    const incoming = mapped.createData;
    const update: UpdateCourseDto = {
      completenessStatus: mapped.completenessStatus,
    };

    const setWhenAllowed = (semanticField: string, targetField: keyof UpdateCourseDto, value: unknown) => {
      if (!allowedSemanticFields.has(semanticField)) return;
      if (value === undefined || value === null || value === '') return;
      (update as any)[targetField] = value;
    };

    setWhenAllowed('courseName', 'displayName', incoming.displayName);
    setWhenAllowed('courseName', 'originalSourceTitle', incoming.originalSourceTitle);
    setWhenAllowed('studyFreeRaw', 'isStudyFree', incoming.isStudyFree);
    setWhenAllowed('freeCertificateRaw', 'isFreeCertificate', incoming.isFreeCertificate);
    if (incoming.certificateAvailable === true) {
      setWhenAllowed('freeCertificateRaw', 'certificateAvailable', true);
    }
    setWhenAllowed('certificateTypeRaw', 'certificateType', incoming.certificateType);
    setWhenAllowed('languageRaw', 'learningLanguageRaw', incoming.learningLanguageRaw);
    setWhenAllowed('languageRaw', 'learningLanguage', incoming.learningLanguage);
    setWhenAllowed('studyLevelRaw', 'studyLevelRaw', incoming.studyLevelRaw);
    setWhenAllowed('courseDurationRaw', 'studyDurationRaw', incoming.studyDurationRaw);
    setWhenAllowed('courseDurationRaw', 'studyDuration', incoming.studyDuration);
    setWhenAllowed('shortCourseTopicsRaw', 'shortCourseTopicsRaw', incoming.shortCourseTopicsRaw);

    if (allowUrl) {
      update.directCourseUrl = incoming.directCourseUrl;
      update.sourceUrl = incoming.sourceUrl;
      update.officialSourceUrl = incoming.officialSourceUrl;
    }

    // Stable/provider identity fields are safe to restore when missing, but never changed to another provider.
    if (!existing.externalProviderId) update.externalProviderId = incoming.externalProviderId ?? null;
    if (!existing.platformName && incoming.platformName) update.platformName = incoming.platformName;
    if (!existing.providerName && incoming.providerName) update.providerName = incoming.providerName;

    // Merge optional normalized metadata; repository merges keys and does not erase omitted existing keys.
    update.optionalFields = incoming.optionalFields;

    return update;
  }
}

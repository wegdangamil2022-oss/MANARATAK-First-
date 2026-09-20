import { z } from 'zod';
import { ScholarshipCompletenessState } from './contracts';

export * from './contracts';

export const ScholarshipImportPayloadSchema = z.object({
  scholarshipName: z.string(),
  providerName: z.string().optional(),
  amountMinorUnits: z.string().optional(),
  amountCurrencyCode: z.string().optional(),
  targetCountries: z.any().optional(),
  studyLevels: z.any().optional(),
  applicationDeadline: z.string().optional(),
  isFullyFunded: z.boolean().optional(),
  officialWebsite: z.string().optional(),
  sourceUrl: z.string().optional(),
  description: z.string().optional(),
  fundingCoverage: z.string().optional(),
  coverageDetails: z.string().optional(),
  eligibleMajorsOrFields: z.union([z.string(), z.array(z.string())]).optional(),
  degreeLevel: z.string().optional(),
  applicationLink: z.string().optional(),
  officialSourceUrl: z.string().optional(),
  sponsorName: z.string().optional(),
  studyCountry: z.string().optional(),
  requiredDocuments: z.union([z.string(), z.array(z.string())]).optional(),
  eligibilityCriteria: z.string().optional(),
  studyLanguage: z.string().optional(),
  targetUniversities: z.array(z.string()).optional(),
  targetAcademicPrograms: z.array(z.string()).optional(),
  targetUniversityReferences: z.array(z.object({
    canonicalId: z.string().min(1),
    sourceLabel: z.string().optional(),
  })).optional(),
  targetAcademicProgramReferences: z.array(z.object({
    canonicalId: z.string().min(1),
    sourceLabel: z.string().optional(),
  })).optional(),
  fundingAmount: z.union([z.string(), z.number()]).optional(),
  currency: z.string().optional(),
  duration: z.string().optional(),
  localizedNames: z.record(z.string(), z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

export type ScholarshipImportPayload = z.infer<typeof ScholarshipImportPayloadSchema>;

export interface ScholarshipNameCleaningResult {
  rawSourceTitle: string;
  normalizedSourceTitle: string;
  displayName: string;
  cleanedScholarshipName: string;
  detectedYear: string | null;
  sourceAliases: string[];
  extracted: {
    fundingTypeCode: 'FULLY_FUNDED' | 'PARTIALLY_FUNDED' | null;
    degreeLevelLabels: Array<'BACHELOR' | 'MASTER' | 'DOCTORATE'>;
    removedPhrases: string[];
  };
}

export interface ScholarshipCompletenessAssessment {
  state: ScholarshipCompletenessState;
  missingFields: string[];
  identityMissingFields: string[];
  coreMissingFields: string[];
  optionalMissingFields: string[];
  missingCount: number;
  identityReady: boolean;
}

export type ScholarshipDuplicateState =
  | 'NOT_CHECKED'
  | 'NEW'
  | 'DUPLICATE'
  | 'UPDATE'
  | 'COLLISION_REVIEW';

export interface ScholarshipDuplicateMatch {
  id: string;
  publicId?: string | null;
  displayName?: string | null;
  canonicalDedupKey?: string | null;
  sourceImportRecordId?: string | null;
  countryReferenceId?: string | null;
  countrySourceLabel?: string | null;
  officialSourceUrl?: string | null;
}

export interface ScholarshipDedupeInput {
  cleanedScholarshipName: string;
  providerName?: string | null;
  providerCanonicalPublicId?: string | null;
  year?: string | null;
  countryReferenceId?: string | null;
  countrySourceLabel?: string | null;
  officialSourceUrl?: string | null;
  incomingSourceImportRecordId?: string | null;
}

export interface ScholarshipDedupeAssessment {
  duplicateKey: string;
  providerKey: string;
  yearOrNoYear: string;
  state: ScholarshipDuplicateState;
  matches: ScholarshipDuplicateMatch[];
  requiresReview: boolean;
  reason: string;
}

type ScholarshipCompletenessPayload = Partial<ScholarshipImportPayload> & {
  displayName?: string;
  cleanedScholarshipName?: string;
  providerCanonicalPublicId?: string | null;
  sourceTraceable?: boolean;
  extractedFundingTypeCode?: string | null;
  extractedDegreeLevels?: readonly string[];
};

const FULLY_FUNDED_PATTERNS = [
  /\bfully[\s-]?funded\b/giu,
  /\bfull\s+funding\b/giu,
  /ممولة\s+بالكامل/gu,
  /تمويل\s+كامل/gu,
];
const PARTIALLY_FUNDED_PATTERNS = [
  /\bpartially[\s-]?funded\b/giu,
  /\bpartial\s+funding\b/giu,
  /ممولة\s+جزئي(?:ا|اً)?/gu,
  /تمويل\s+جزئي/gu,
];
const DEGREE_PATTERNS: Array<{
  label: 'BACHELOR' | 'MASTER' | 'DOCTORATE';
  patterns: RegExp[];
}> = [
  {
    label: 'DOCTORATE',
    patterns: [
      /\b(?:for\s+)?(?:ph\.?d\.?|doctorate|doctoral)\b/giu,
      /(?:لدراسة\s+)?الدكتوراه/gu,
      /للدكتوراه/gu,
    ],
  },
  {
    label: 'MASTER',
    patterns: [
      /\b(?:for\s+)?(?:master'?s?|postgraduate\s+master)\b/giu,
      /(?:لدراسة\s+)?الماجستير/gu,
      /للماجستير/gu,
    ],
  },
  {
    label: 'BACHELOR',
    patterns: [
      /\b(?:for\s+)?(?:bachelor'?s?|undergraduate)\b/giu,
      /(?:لدراسة\s+)?البكالوريوس/gu,
      /للبكالوريوس/gu,
    ],
  },
];
const MARKETING_PATTERNS = [
  /\bapply\s+now\b/giu,
  /\bnow\s+open\b/giu,
  /\bapplications?\s+open\b/giu,
  /\bfor\s+international\s+students\b/giu,
  /\binternational\s+students\b/giu,
  /قدم\s+الآن/gu,
  /التقديم\s+مفتوح/gu,
  /للطلبة\s+الدوليين/gu,
  /للطلاب\s+الدوليين/gu,
];

function normalizedText(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ');
}

function meaningful(value: unknown): boolean {
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.some(meaningful);
  if (value && typeof value === 'object') return Object.keys(value).length > 0;
  return false;
}

function metadataValue(payload: ScholarshipCompletenessPayload, key: string): unknown {
  return payload.metadata?.[key];
}

export class ScholarshipCompletenessClassifier {
  /**
   * WP12-5 three-layer policy:
   * A = identity threshold for eventual catalog transfer.
   * B = core completeness fields; missing values require review but never delete staging.
   * C = enrichment-only fields; absence does not downgrade completeness.
   */
  static classify(payload: ScholarshipCompletenessPayload): ScholarshipCompletenessAssessment {
    const identityMissingFields: string[] = [];
    const coreMissingFields: string[] = [];
    const optionalMissingFields: string[] = [];

    if (!meaningful(payload.cleanedScholarshipName || payload.scholarshipName || payload.displayName)) {
      identityMissingFields.push('cleanedScholarshipName');
    }
    if (!meaningful(payload.providerCanonicalPublicId || payload.providerName || payload.sponsorName)) {
      identityMissingFields.push('provider');
    }
    const traceableSource = Boolean(payload.sourceTraceable) || meaningful(
      payload.officialSourceUrl ||
      payload.sourceUrl ||
      payload.officialWebsite ||
      payload.applicationLink,
    );
    if (!traceableSource) identityMissingFields.push('sourceUrl');

    const fundingTypeKnown =
      typeof payload.isFullyFunded === 'boolean' ||
      meaningful(payload.fundingCoverage) ||
      meaningful(payload.extractedFundingTypeCode) ||
      meaningful(metadataValue(payload, 'fundingTypeCode'));
    if (!fundingTypeKnown) coreMissingFields.push('fundingType');

    const benefitsKnown =
      meaningful(payload.coverageDetails) ||
      meaningful(payload.fundingCoverage) ||
      meaningful(metadataValue(payload, 'benefits'));
    if (!benefitsKnown) coreMissingFields.push('benefits');

    const countryKnown =
      meaningful(payload.studyCountry) ||
      meaningful(payload.targetCountries) ||
      meaningful(metadataValue(payload, 'countryReferenceId')) ||
      meaningful(metadataValue(payload, 'countryScope'));
    if (!countryKnown) coreMissingFields.push('countryOrScope');

    const degreeKnown =
      meaningful(payload.degreeLevel) ||
      meaningful(payload.studyLevels) ||
      meaningful(payload.extractedDegreeLevels) ||
      meaningful(metadataValue(payload, 'degreeTargets'));
    if (!degreeKnown) coreMissingFields.push('degreeTargets');

    const eligibilityKnown =
      meaningful(payload.eligibilityCriteria) ||
      meaningful(metadataValue(payload, 'eligibilityItems'));
    if (!eligibilityKnown) coreMissingFields.push('eligibility');

    const documentsOrTestsKnown =
      meaningful(payload.requiredDocuments) ||
      meaningful(metadataValue(payload, 'requiredDocumentItems')) ||
      meaningful(metadataValue(payload, 'internationalTests'));
    if (!documentsOrTestsKnown) coreMissingFields.push('requiredDocumentsOrTests');

    const deadlineKnown =
      meaningful(payload.applicationDeadline) ||
      meaningful(metadataValue(payload, 'deadlineMode')) ||
      meaningful(metadataValue(payload, 'deadlineType'));
    if (!deadlineKnown) coreMissingFields.push('deadlineMode');

    if (!meaningful(payload.eligibleMajorsOrFields)) optionalMissingFields.push('majors');
    if (!meaningful(payload.studyLanguage)) optionalMissingFields.push('studyLanguage');
    if (!meaningful(payload.fundingAmount) && !meaningful(payload.amountMinorUnits)) {
      optionalMissingFields.push('fundingAmount');
    }
    if (!meaningful(payload.currency) && !meaningful(payload.amountCurrencyCode)) {
      optionalMissingFields.push('currency');
    }
    if (!meaningful(payload.duration)) optionalMissingFields.push('duration');
    if (!meaningful(metadataValue(payload, 'seatCount'))) optionalMissingFields.push('seatCount');

    const identityReady = identityMissingFields.length === 0;
    const state = !identityReady
      ? ScholarshipCompletenessState.INCOMPLETE
      : coreMissingFields.length > 0
        ? ScholarshipCompletenessState.NEEDS_REVIEW
        : ScholarshipCompletenessState.COMPLETE;
    const missingFields = [...identityMissingFields, ...coreMissingFields];

    return {
      state,
      missingFields,
      identityMissingFields,
      coreMissingFields,
      optionalMissingFields,
      missingCount: missingFields.length,
      identityReady,
    };
  }
}

export class ScholarshipNamingService {
  static normalize(name: string): string {
    return normalizedText(name);
  }

  static clean(rawTitle: string, aliases: readonly string[] = []): ScholarshipNameCleaningResult {
    const normalizedSourceTitle = normalizedText(rawTitle);
    const detectedYear = normalizedSourceTitle.match(/\b(?:19|20|21)\d{2}\b/u)?.[0] ?? null;
    const removedPhrases: string[] = [];
    const degreeLevelLabels: ScholarshipNameCleaningResult['extracted']['degreeLevelLabels'] = [];

    let cleaned = normalizedSourceTitle;
    let fundingTypeCode: ScholarshipNameCleaningResult['extracted']['fundingTypeCode'] = null;

    const removePatterns = (patterns: readonly RegExp[]) => {
      for (const pattern of patterns) {
        pattern.lastIndex = 0;
        const matches = [...cleaned.matchAll(pattern)].map((match) => normalizedText(match[0]));
        removedPhrases.push(...matches);
        pattern.lastIndex = 0;
        cleaned = cleaned.replace(pattern, ' ');
      }
    };

    if (FULLY_FUNDED_PATTERNS.some((pattern) => {
      pattern.lastIndex = 0;
      return pattern.test(normalizedSourceTitle);
    })) {
      fundingTypeCode = 'FULLY_FUNDED';
      removePatterns(FULLY_FUNDED_PATTERNS);
    } else if (PARTIALLY_FUNDED_PATTERNS.some((pattern) => {
      pattern.lastIndex = 0;
      return pattern.test(normalizedSourceTitle);
    })) {
      fundingTypeCode = 'PARTIALLY_FUNDED';
      removePatterns(PARTIALLY_FUNDED_PATTERNS);
    }

    for (const rule of DEGREE_PATTERNS) {
      const matched = rule.patterns.some((pattern) => {
        pattern.lastIndex = 0;
        return pattern.test(normalizedSourceTitle);
      });
      if (!matched) continue;
      degreeLevelLabels.push(rule.label);
      removePatterns(rule.patterns);
    }

    removePatterns(MARKETING_PATTERNS);

    cleaned = cleaned
      .replace(/[|•·]+/gu, ' ')
      .replace(/\s*[-–—,:;]+\s*/gu, ' ')
      .replace(/\b(?:for|to\s+study)\b(?=\s+(?:19|20|21)\d{2}\b|\s*$)/giu, ' ')
      .replace(/لدراسة(?=\s+(?:19|20|21)\d{2}\b|\s*$)/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (detectedYear && cleaned && !cleaned.includes(detectedYear)) {
      cleaned = `${cleaned} ${detectedYear}`;
    }
    if (!cleaned) cleaned = normalizedSourceTitle;

    const sourceAliases = [...new Set(
      aliases
        .map(normalizedText)
        .filter((alias) => alias.length > 0 && alias !== normalizedSourceTitle),
    )];

    return {
      rawSourceTitle: rawTitle,
      normalizedSourceTitle,
      displayName: cleaned,
      cleanedScholarshipName: cleaned,
      detectedYear,
      sourceAliases,
      extracted: {
        fundingTypeCode,
        degreeLevelLabels: [...new Set(degreeLevelLabels)],
        removedPhrases: [...new Set(removedPhrases)],
      },
    };
  }
}

export class ScholarshipDeduplicationService {
  static generateKey(payload: Pick<ScholarshipImportPayload, 'scholarshipName' | 'providerName'>): string {
    const cleaned = ScholarshipNamingService.clean(payload.scholarshipName);
    return this.buildKey({
      cleanedScholarshipName: cleaned.cleanedScholarshipName,
      providerName: payload.providerName,
      year: cleaned.detectedYear,
    }).duplicateKey;
  }

  static buildKey(input: ScholarshipDedupeInput): Pick<
    ScholarshipDedupeAssessment,
    'duplicateKey' | 'providerKey' | 'yearOrNoYear'
  > {
    const DEDUPE_V2 = 'V2';
    const providerKey = this.providerKey(input.providerCanonicalPublicId, input.providerName);
    const cleanedNameKey = this.keyPart(input.cleanedScholarshipName) || 'UNKNOWN_SCHOLARSHIP';
    const yearOrNoYear = this.year(input.year) ?? 'NO_YEAR';
    const countryKey = this.keyPart(input.countryReferenceId ?? input.countrySourceLabel ?? '') || 'NO_COUNTRY';
    const officialUrlKey = this.officialUrlKey(input.officialSourceUrl) || 'NO_OFFICIAL_URL';
    return {
      providerKey,
      yearOrNoYear,
      duplicateKey: `${DEDUPE_V2}|${providerKey}|${cleanedNameKey}|${yearOrNoYear}|${countryKey}|${officialUrlKey}`,
    };
  }

  static buildLegacyKey(input: ScholarshipDedupeInput): string {
    const providerKey = this.providerKey(input.providerCanonicalPublicId, input.providerName);
    const cleanedNameKey = this.keyPart(input.cleanedScholarshipName) || 'UNKNOWN_SCHOLARSHIP';
    const yearOrNoYear = this.year(input.year) ?? 'NO_YEAR';
    return `${providerKey}|${cleanedNameKey}|${yearOrNoYear}`;
  }

  private static officialUrlKey(value?: string | null): string {
    if (!value?.trim()) return '';
    try {
      const url = new URL(value.trim());
      const host = url.hostname.toLowerCase();
      const path = url.pathname.replace(/\/+$/u, '') || '/';
      return this.keyPart(`${host}${path}`);
    } catch {
      return this.keyPart(value);
    }
  }

  static assess(
    input: ScholarshipDedupeInput,
    matches?: readonly ScholarshipDuplicateMatch[],
  ): ScholarshipDedupeAssessment {
    const key = this.buildKey(input);
    if (matches === undefined) {
      return {
        ...key,
        state: 'NOT_CHECKED',
        matches: [],
        requiresReview: false,
        reason: 'Duplicate lookup was not executed; no NEW/DUPLICATE/UPDATE decision is claimed.',
      };
    }

    const uniqueMatches = [...new Map(matches.map((match) => [match.id, { ...match }])).values()];
    if (uniqueMatches.length === 0) {
      return {
        ...key,
        state: 'NEW',
        matches: [],
        requiresReview: false,
        reason: 'No existing Scholarship matched the approved duplicate key.',
      };
    }
    if (uniqueMatches.length > 1) {
      return {
        ...key,
        state: 'COLLISION_REVIEW',
        matches: uniqueMatches,
        requiresReview: true,
        reason: 'Multiple Scholarships matched the shortened key; split/merge requires explicit review.',
      };
    }

    const match = uniqueMatches[0];
    const sameImportRecord = Boolean(
      input.incomingSourceImportRecordId &&
      match.sourceImportRecordId &&
      input.incomingSourceImportRecordId === match.sourceImportRecordId,
    );
    return {
      ...key,
      state: sameImportRecord ? 'DUPLICATE' : 'UPDATE',
      matches: uniqueMatches,
      requiresReview: !sameImportRecord,
      reason: sameImportRecord
        ? 'The same Phase 6 source record already maps to this duplicate key.'
        : 'An existing Scholarship shares the duplicate key; compare Incoming vs Current before any merge.',
    };
  }

  private static providerKey(canonicalPublicId?: string | null, providerName?: string | null): string {
    const canonical = canonicalPublicId?.normalize('NFKC').trim();
    if (canonical && /^INS-[A-Z0-9]{2,8}-\d+$/i.test(canonical)) return canonical.toUpperCase();
    return this.keyPart(providerName || '') || 'UNKNOWN_PROVIDER';
  }

  private static keyPart(value: string): string {
    return normalizedText(value).toLocaleLowerCase('en-US');
  }

  private static year(value?: string | null): string | null {
    const normalized = value?.normalize('NFKC').trim() ?? '';
    return normalized.match(/\b(?:19|20|21)\d{2}\b/u)?.[0] ?? null;
  }
}

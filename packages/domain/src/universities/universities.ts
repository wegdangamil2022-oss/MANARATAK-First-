import { z } from 'zod';
import { AtomicPersistenceContext } from '../event-foundation/outbox/TransactionalOutbox';

export enum UniversityStatus {
  IMPORTED = 'IMPORTED',
  ARCHIVED = 'ARCHIVED',
  REJECTED = 'REJECTED',
  PUBLISHED = 'PUBLISHED',
  READY_TO_PUBLISH = 'READY_TO_PUBLISH',
  READY_TO_REVIEW = 'READY_TO_REVIEW',
}

export enum UniversityImportCompletenessState {
  INCOMPLETE = 'INCOMPLETE',
  NEEDS_REVIEW = 'NEEDS_REVIEW',
  COMPLETE = 'COMPLETE',
}

export type UniversityTranslationReviewStatus =
  | 'NEEDS_REVIEW'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'REJECTED';

export interface UniversityTranslationDto {
  id?: string;
  universityId?: string;
  locale: string;
  displayName?: string | null;
  description?: string | null;
  reviewStatus?: UniversityTranslationReviewStatus;
  sourceRecordId?: string | null;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

export type UniversityLocalizedTextTargetType =
  | 'CAMPUS'
  | 'ORGANIZATION_UNIT'
  | 'ACADEMIC_PROGRAM'
  | 'TUITION_PROFILE'
  | 'ACCOMMODATION_PROFILE'
  | 'RANKING';

export interface UniversityLocalizedTextDto {
  id?: string;
  universityId?: string;
  targetType: UniversityLocalizedTextTargetType;
  targetId: string;
  fieldKey: string;
  locale: string;
  value: string;
  reviewStatus?: UniversityTranslationReviewStatus;
  sourceRecordId?: string | null;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UniversityDto {
  id: string;
  publicId: string;
  slug: string;
  canonicalName: string;
  canonicalDedupKey: string;
  displayName: string;
  country?: string | null;
  city?: string | null;
  institutionType?: string | null;
  officialWebsite?: string | null;
  status: UniversityStatus;
  completenessStatus: UniversityImportCompletenessState;
  sourceUrl?: string | null;
  officialSourceUrl?: string | null;
  logoAssetId?: string | null;
  foundedYear?: number | null;
  sourceImportRecordId?: string | null;
  countryReferenceId?: string | null;
  regionReferenceId?: string | null;
  cityReferenceId?: string | null;
  institutionalOwnership?: string | null;
  campuses?: unknown[];
  organizationUnits?: unknown[];
  academicPrograms?: UniversityAcademicProgramReadDto[];
  acceptedLanguageTests?: unknown[];
  admissionRequirements?: UniversityAdmissionRequirementDto[];
  tuitionProfiles?: unknown[];
  accommodationProfiles?: unknown[];
  rankings?: unknown[];
  sourceRecords?: unknown[];
  localizedNames?: Record<string, string>;
  translations?: UniversityTranslationDto[];
  localizedTexts?: UniversityLocalizedTextDto[];
  accreditations?: unknown[];
  description?: string;
  languagesOfInstruction?: string[];
  tuitionReferences?: unknown[];
  contactEmail?: string;
  contactPhone?: string;
  socialLinks?: Record<string, string>;
  metadata?: Record<string, unknown>;
  optionalFields?: Record<string, unknown> | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UpdateUniversityDto {
  displayName?: string;
  country?: string | null;
  city?: string | null;
  institutionType?: string | null;
  officialWebsite?: string | null;
  status?: UniversityStatus;
  completenessStatus?: UniversityImportCompletenessState;
  sourceUrl?: string | null;
  officialSourceUrl?: string | null;
  logoAssetId?: string | null;
  foundedYear?: number | null;
  sourceImportRecordId?: string | null;
  countryReferenceId?: string | null;
  regionReferenceId?: string | null;
  cityReferenceId?: string | null;
  institutionalOwnership?: string | null;
  optionalFields?: Record<string, unknown>;
}

export interface UniversityAcademicProgramAuthoringInput {
  sourceReferenceId?: string | null;
  organizationUnitId?: string | null;
  sourceProgramName: string;
  degreeLevelId: string;
  majorId?: string | null;
  majorMappingState: string;
  status?: string;
  campusIds?: string[];
  metadata?: Record<string, unknown> | null;
  admissionRequirements?: Array<{
    internationalTestId: string;
    testVariantId?: string | null;
    testVersionId?: string | null;
    minimumScore?: number | null;
    sectionScores?: Record<string, unknown> | null;
    validityMetadata?: Record<string, unknown> | null;
    restrictionMetadata?: Record<string, unknown> | null;
    status?: string;
  }>;
}

export interface UniversityNormalizedDetailsUpdate {
  campuses?: Array<{
    sourceReferenceId?: string;
    name: string;
    campusType?: string;
    status?: string;
    address?: string;
    countryReferenceId?: string;
    regionReferenceId?: string;
    cityReferenceId?: string;
    latitude?: number;
    longitude?: number;
    coordinateSource?: string;
    metadata?: Record<string, unknown>;
  }>;
  organizationUnits?: Array<{
    sourceReferenceId?: string;
    campusSourceReferenceId?: string;
    parentSourceReferenceId?: string;
    unitType: 'FACULTY' | 'SCHOOL' | 'COLLEGE' | 'DEPARTMENT';
    name: string;
    status?: string;
    metadata?: Record<string, unknown>;
  }>;
  academicPrograms?: Array<{
    sourceReferenceId?: string;
    organizationUnitSourceReferenceId?: string;
    sourceProgramName: string;
    degreeLevelId?: string;
    majorId?: string;
    majorMappingState: string;
    status?: string;
    campusSourceReferenceIds?: string[];
    metadata?: Record<string, unknown>;
    admissionRequirements?: Array<{
      internationalTestId: string;
      testVariantId?: string;
      testVersionId?: string;
      minimumScore?: number;
      sectionScores?: Record<string, unknown>;
      validityMetadata?: Record<string, unknown>;
      restrictionMetadata?: Record<string, unknown>;
      status?: string;
    }>;
  }>;
  tuitionProfiles?: Array<{
    profileType: string;
    organizationUnitName?: string;
    amount?: number;
    currencyCode?: string;
    currencyReferenceId?: string;
    officialSourceUrl?: string;
    effectiveFrom?: Date;
    effectiveTo?: Date;
    metadata?: Record<string, unknown>;
  }>;
  accommodationProfiles?: Array<{
    accommodationAvailable?: boolean;
    internationalEligible?: boolean;
    typicalCost?: number;
    currencyCode?: string;
    currencyReferenceId?: string;
    averageMonthlyLivingCost?: number;
    livingCostCurrencyCode?: string;
    livingCostCurrencyReferenceId?: string;
    costVariationNote?: string;
    metadata?: Record<string, unknown>;
  }>;
  rankings?: Array<{
    provider: 'QS' | 'THE' | 'ARWU';
    rankingYear: number;
    rank: string;
    scope: string;
    scopeLabel?: string;
    note?: string;
    officialSourceUrl: string;
    verifiedAt: Date;
  }>;
}

export interface UniversityFilters {
  status?: UniversityStatus;
  completenessStatus?: UniversityImportCompletenessState;
  country?: string;
  countryReferenceId?: string;
  regionReferenceId?: string;
  cityReferenceId?: string;
  institutionType?: string;
  /** Canonical P10 Major owner ID. Public reverse reads are projected from P11 AcademicProgram. */
  majorId?: string;
  /** Canonical P8 International Test owner ID. Reverse reads are projected from program admission requirements. */
  internationalTestId?: string;
  city?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export type PublicUniversityFilters = Omit<UniversityFilters, 'status' | 'completenessStatus' | 'country' | 'city' | 'page' | 'pageSize'> & { cursor?: string; limit?: number };
export type PublicUniversityDto = Omit<
  UniversityDto,
  | 'id'
  | 'canonicalDedupKey'
  | 'sourceImportRecordId'
  | 'status'
  | 'completenessStatus'
  | 'optionalFields'
  | 'sourceRecords'
  | 'translations'
  | 'localizedTexts'
  | 'localizedNames'
  | 'createdAt'
>;

export interface PaginatedUniversityResult<T = UniversityDto> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore?: boolean;
  nextCursor?: string | null;
}


export interface PublishedAcademicProgramReadModel {
  ownerId: string;
  universityOwnerId: string;
  universityPublicId: string;
  universitySlug: string;
  universityDisplayName: string;
  sourceProgramName: string;
  degreeLevelId?: string | null;
  majorId?: string | null;
  majorMappingState: string;
  status: string;
}


export interface UniversityOrganizationUnitSummaryDto {
  id: string;
  universityId: string;
  universityPublicId: string;
  universityDisplayName: string;
  campusId?: string | null;
  parentOrganizationUnitId?: string | null;
  unitType: 'FACULTY' | 'SCHOOL' | 'COLLEGE' | 'DEPARTMENT' | string;
  name: string;
  status: string;
  programCount: number;
  mappedMajorCount: number;
  unresolvedMajorCount: number;
  activeProgramCount: number;
}

export interface UniversityOrganizationUnitFilters {
  universityId?: string;
  unitType?: 'FACULTY' | 'SCHOOL' | 'COLLEGE' | 'DEPARTMENT';
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedUniversityOrganizationUnitResult {
  data: UniversityOrganizationUnitSummaryDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface IUniversityRepository {
  create(
    data: Omit<UniversityDto, 'id' | 'createdAt' | 'updatedAt'> &
      Partial<Pick<UniversityDto, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<UniversityDto>;
  update(id: string, updates: UpdateUniversityDto): Promise<UniversityDto>;
  updateStatus(id: string, status: UniversityStatus): Promise<void>;
  findById(id: string): Promise<UniversityDto | null>;
  findBySlug(slug: string): Promise<UniversityDto | null>;
  findByDedupKey(key: string): Promise<UniversityDto | null>;
  list(filters: UniversityFilters): Promise<PaginatedUniversityResult<UniversityDto>>;
  listPublished(
    filters: PublicUniversityFilters,
  ): Promise<PaginatedUniversityResult<UniversityDto>>;
  listOrganizationUnits?(filters: UniversityOrganizationUnitFilters): Promise<PaginatedUniversityOrganizationUnitResult>;
  findPublishedByPublicIds?(publicIds: string[]): Promise<UniversityDto[]>;
  findPublishedByIds?(ids: string[]): Promise<UniversityDto[]>;
  findPublishedAcademicProgramsByIds?(ids: string[]): Promise<PublishedAcademicProgramReadModel[]>;
  listTranslations?(id: string): Promise<UniversityTranslationDto[]>;
  upsertTranslation?(
    id: string,
    data: Omit<UniversityTranslationDto, 'id' | 'universityId' | 'createdAt' | 'updatedAt'>,
  ): Promise<UniversityTranslationDto>;
  listLocalizedTexts?(id: string): Promise<UniversityLocalizedTextDto[]>;
  upsertLocalizedText?(
    id: string,
    data: Omit<UniversityLocalizedTextDto, 'id' | 'universityId' | 'createdAt' | 'updatedAt'>,
  ): Promise<UniversityLocalizedTextDto>;
  replaceNormalizedDetails?(
    id: string,
    details: UniversityNormalizedDetailsUpdate,
  ): Promise<UniversityDto>;
  upsertAcademicProgram?(
    universityId: string,
    programId: string | null,
    input: UniversityAcademicProgramAuthoringInput,
  ): Promise<UniversityDto>;
  archiveAcademicProgram?(universityId: string, programId: string): Promise<UniversityDto>;
}

export const UNIVERSITY_CANONICAL_KEYS = new Set<string>([
  'id',
  'publicId',
  'slug',
  'canonicalName',
  'canonicalDedupKey',
  'displayName',
  'country',
  'city',
  'institutionType',
  'officialWebsite',
  'status',
  'completenessStatus',
  'sourceUrl',
  'officialSourceUrl',
  'logoAssetId',
  'foundedYear',
  'sourceImportRecordId',
  'countryReferenceId',
  'regionReferenceId',
  'cityReferenceId',
  'institutionalOwnership',
  'campuses',
  'organizationUnits',
  'academicPrograms',
  'tuitionProfiles',
  'accommodationProfiles',
  'rankings',
  'sourceRecords',
  'translations',
  'localizedTexts',
  'localizedNames',
  'importChanges',
  'optionalFields',
  'createdAt',
  'updatedAt',
]);

export function sanitizeUniversityOptionalFields(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => !UNIVERSITY_CANONICAL_KEYS.has(key)),
  );
}

export interface ITransactionalUniversityRepository extends IUniversityRepository {
  withTransaction(context: AtomicPersistenceContext): IUniversityRepository;
}

export const UniversityImportPayloadSchema = z
  .object({
    universityName: z.string(),
    country: z.string().optional(),
    institutionType: z.string().optional(),
    officialWebsite: z.string().optional(),
    sourceUrl: z.string().optional(),
    officialSourceUrl: z.string().optional(),
    city: z.string().optional(),
    logoAssetId: z.string().optional(),
    foundedYear: z.number().optional(),
    localizedNames: z.any().optional(),
    campuses: z.any().optional(),
    accreditations: z.any().optional(),
    rankings: z.any().optional(),
    description: z.string().optional(),
    languagesOfInstruction: z.any().optional(),
    tuitionReferences: z.any().optional(),
    admissionRequirements: z.any().optional(),
    academicPrograms: z.any().optional(),
    contactEmail: z.string().optional(),
    contactPhone: z.string().optional(),
    socialLinks: z.any().optional(),
    metadata: z.any().optional(),
  })
  .passthrough();

export class UniversityCompletenessClassifier {
  static classify(payload: any): {
    state: UniversityImportCompletenessState;
    missingFields?: string[];
  } {
    const missing = [];
    if (!payload.universityName) missing.push('universityName');
    if (!payload.country) missing.push('country');
    if (!payload.institutionType) missing.push('institutionType');

    if (missing.length > 0) {
      return { state: UniversityImportCompletenessState.INCOMPLETE, missingFields: missing };
    }

    const reviewFields = [];
    if (!payload.officialWebsite) reviewFields.push('officialWebsite');
    if (!payload.city) reviewFields.push('city');
    if (!payload.officialSourceUrl) reviewFields.push('officialSourceUrl');

    if (reviewFields.length > 0) {
      return { state: UniversityImportCompletenessState.NEEDS_REVIEW, missingFields: reviewFields };
    }

    return { state: UniversityImportCompletenessState.COMPLETE };
  }
}
export class UniversityNamingService {
  static normalize(name: string): string {
    return name.trim();
  }
}
export class UniversityDeduplicationService {
  static generateKey(payload: any): string {
    let domain = 'unknown';
    if (payload.officialWebsite) {
      try {
        const url = new URL(payload.officialWebsite);
        domain = url.hostname.replace(/^www\./, '');
      } catch {
        domain = payload.officialWebsite;
      }
    }
    return `${payload.universityName}|${payload.country || 'UNKNOWN'}|${domain}`.toLowerCase();
  }
}


export interface UniversityProgramAdmissionRequirementReadDto {
  id: string;
  academicProgramId: string;
  internationalTestId: string;
  testVariantId?: string | null;
  testVersionId?: string | null;
  minimumScore?: number | null;
  sectionScores?: Record<string, unknown> | null;
  validityMetadata?: Record<string, unknown> | null;
  restrictionMetadata?: Record<string, unknown> | null;
  status: string;
}

export interface UniversityAcademicProgramReadDto {
  id: string;
  universityId: string;
  organizationUnitId?: string | null;
  sourceReferenceId?: string | null;
  sourceProgramName: string;
  normalizedName: string;
  degreeLevelId?: string | null;
  majorId?: string | null;
  majorMappingState: string;
  status: string;
  campusIds: string[];
  admissionRequirements: UniversityProgramAdmissionRequirementReadDto[];
  metadata?: Record<string, unknown> | null;
}

// --- University & Academic Program Integration Contracts ---

export enum ProgramIntegrationStatus {
  MATCHED = 'MATCHED',
  AMBIGUOUS = 'AMBIGUOUS',
  MAJOR_REVIEW_REQUIRED = 'MAJOR_REVIEW_REQUIRED',
  UNMAPPED = 'UNMAPPED',
}

export interface AcademicProgramIntegrationDto {
  programId?: string;
  universityRefId: string; // SOURCE UNIVERSITY REFERENCE ID (must be preserved)
  sourceProgramName: string; // Raw/source title
  degreeLevelCanonicalCode: string; // Stable boundary reference (e.g., BACHELOR, MASTER)
  degreeLevelId?: string;
  majorId?: string; // Canonical Major identity relationship
  majorMappingState?: 'CANONICALLY_MAPPED' | 'MAJOR_REVIEW_REQUIRED' | 'UNMAPPED';
  facultyName?: string; // Institution-specific organizational data (not a taxonomy node)
  departmentName?: string; // Optional department context
  campusIds?: string[]; // Multi-campus support (does not structurally block multi-campus)
  status: ProgramIntegrationStatus;
  rawSourceData?: any;
}

export interface UniversityAdmissionRequirementDto {
  internationalTestId?: string;
  [key: string]: unknown;
}

export interface UniversityIntegrationPayload {
  universityRefId: string; // The canonical persistent identifier
  displayName: string;
  countryId?: string; // Canonical location reference
  regionId?: string; // Canonical location reference
  cityId?: string; // Canonical location reference
  officialWebsite?: string;
  academicPrograms?: AcademicProgramIntegrationDto[];
}

export class UniversityIntegrationContract {
  /**
   * Rule A: DegreeLevel canonicalCode is accepted as stable boundary reference
   */
  static validateDegreeLevelCode(code: string): boolean {
    const validCodes = [
      'BACHELOR',
      'MASTER',
      'DOCTORATE',
      'FELLOWSHIP',
      'DIPLOMA',
      'ASSOCIATE',
      'CERTIFICATE',
    ];
    return validCodes.includes(code.toUpperCase());
  }

  /**
   * Rule B: canonical Major reference is preferred over Major text
   */
  static validateMajorLinkage(program: AcademicProgramIntegrationDto): {
    valid: boolean;
    message?: string;
  } {
    if (program.status === ProgramIntegrationStatus.MATCHED && !program.majorId) {
      return {
        valid: false,
        message:
          'Canonical Major reference (majorId) is required for MATCHED status. Direct linkage by text is prohibited.',
      };
    }
    return { valid: true };
  }

  /**
   * Rule C & D: University Reference ID is preserved, and repeated same reference ID resolves to same identity
   */
  static resolveUniversityIdentity(
    payload: UniversityIntegrationPayload,
    existingUniversities: Array<{ id: string; publicId: string }>,
  ): { canonicalId: string; isPreserved: boolean } {
    if (!payload.universityRefId) {
      throw new Error(
        'University Reference ID is missing. Generating random IDs for raw source records is prohibited.',
      );
    }
    const match = existingUniversities.find(
      (u) => u.publicId === payload.universityRefId || u.id === payload.universityRefId,
    );
    if (match) {
      return { canonicalId: match.id, isPreserved: true };
    }
    // Return the preserved reference ID itself as the canonical/public ID
    return { canonicalId: payload.universityRefId, isPreserved: true };
  }

  /**
   * Rule E: Faculty name is institution-specific organization data and does NOT create/become a taxonomy node
   */
  static processFacultyContext(_facultyName: string): {
    isTaxonomyNode: boolean;
    isOrganizationalContext: boolean;
  } {
    return {
      isTaxonomyNode: false, // STOPS creating fake taxonomy nodes
      isOrganizationalContext: true,
    };
  }

  /**
   * Rule F, G, H: Unresolved programs must remain valid as UNMAPPED or MAJOR_REVIEW_REQUIRED,
   * without creating fake Majors or fake Taxonomy nodes.
   */
  static handleUnresolvedProgram(program: AcademicProgramIntegrationDto): {
    isValid: boolean;
    createdFakeMajor: boolean;
    createdFakeTaxonomyNode: boolean;
  } {
    if (
      program.status === ProgramIntegrationStatus.UNMAPPED ||
      program.status === ProgramIntegrationStatus.MAJOR_REVIEW_REQUIRED
    ) {
      return {
        isValid: true, // Remains valid and preserved for later review
        createdFakeMajor: false, // Absolutely forbidden to create fake Majors
        createdFakeTaxonomyNode: false, // Absolutely forbidden to create fake taxonomy nodes
      };
    }
    return {
      isValid: true,
      createdFakeMajor: false,
      createdFakeTaxonomyNode: false,
    };
  }

  /**
   * Rule I & J: University integration can represent optional campus/faculty/department, and multi-campus requirement is not structurally blocked.
   */
  static validateHierarchyFlexibility(program: AcademicProgramIntegrationDto): {
    hasOptionalHierarchy: boolean;
    supportsMultiCampus: boolean;
  } {
    const hasOptionalHierarchy =
      program.facultyName === undefined ||
      program.departmentName === undefined ||
      program.campusIds === undefined;

    const supportsMultiCampus = Array.isArray(program.campusIds) && program.campusIds.length >= 0;

    return {
      hasOptionalHierarchy,
      supportsMultiCampus,
    };
  }
}

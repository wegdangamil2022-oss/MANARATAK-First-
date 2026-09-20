import { z } from 'zod';
import { MajorImportCompletenessState, MajorStatus } from './enums';
import { AcademicTaxonomyNodeDto } from '../academic-taxonomy/contracts';
import { CanonicalDegreeLevelCode, DegreeLevelDto } from '../degree-level/DegreeLevel';

export type MajorLifecycleStatus = MajorStatus;

/** Phase 10 compatibility subset; Phase 8 DegreeLevel remains the SSoT. */
export type MajorLevel = Extract<CanonicalDegreeLevelCode, 'BACHELOR' | 'MASTER' | 'DOCTORATE' | 'FELLOWSHIP'>;

export type MajorLevelInput = 'Bachelor' | 'Master' | 'Doctorate' | 'Fellowship' | MajorLevel | string;

export type MajorProfileType =
  | 'ACADEMIC'
  | 'TAUGHT'
  | 'RESEARCH'
  | 'PROFESSIONAL'
  | 'EXECUTIVE'
  | 'PRACTICE_BASED'
  | 'MIXED'
  | 'PROJECT_BASED';

export type MajorRelationshipType =
  | 'SIMILAR'
  | 'PARENT'
  | 'CHILD'
  | 'CROSS_LISTED'
  | 'BACHELOR_TO_MASTER'
  | 'MASTER_TO_DOCTORATE'
  | 'MAJOR_TO_FELLOWSHIP';

export type MajorContentSectionStatus = 'DRAFT' | 'NEEDS_REVIEW' | 'APPROVED' | 'PUBLISHED' | 'SUPERSEDED';

export interface MajorContentSectionDto {
  id?: string;
  profileId?: string;
  versionId?: string;
  sectionKey: string;
  title?: string;
  locale?: string;
  content: string;
  sourceSectionPath?: string;
  reviewStatus?: MajorContentSectionStatus;
  metadata?: Record<string, unknown>;
}

export interface MajorAliasDto {
  id?: string;
  majorId?: string;
  locale?: string;
  alias: string;
  normalizedAlias?: string;
  aliasType?: 'ALIAS' | 'SYNONYM' | 'HISTORICAL_NAME' | 'TRANSLATION';
  sourceId?: string;
}

export interface MajorClassificationMappingDto {
  id?: string;
  majorId?: string;
  profileId?: string;
  taxonomyNodeId: string;
  relationshipType: 'PRIMARY' | 'SECONDARY' | 'RELATED' | 'LEGACY';
  standardType?: string;
  standardCode?: string;
  confidence?: number;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface MajorRelationshipDto {
  id?: string;
  sourceMajorId?: string;
  targetMajorId?: string;
  sourceProfileId?: string;
  targetProfileId?: string;
  relationshipType: MajorRelationshipType;
  confidence?: number;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface MajorSourceDto {
  id?: string;
  majorId?: string;
  profileId?: string;
  sourceType: 'CATALOG_FILE' | 'DETAIL_DOSSIER' | 'OFFICIAL_SOURCE' | 'ADMIN_ENTRY';
  sourceName: string;
  sourceLocale?: string;
  sourceUri?: string;
  sourceHash?: string;
  importedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface MajorLevelProfileDto {
  id?: string;
  majorId?: string;
  level: MajorLevel;
  degreeLevelId?: string | null;
  degreeLevel?: DegreeLevelDto | null;
  code?: string;
  profileType?: MajorProfileType;
  displayName?: string;
  localizedNameAr?: string;
  localizedNameEn?: string;
  collegeContext?: string;
  academicFieldId?: string;
  disciplineId?: string;
  academicField?: AcademicTaxonomyNodeDto | null;
  discipline?: AcademicTaxonomyNodeDto | null;
  currentPublishedVersionId?: string;
  status?: MajorLifecycleStatus;
  completenessStatus?: MajorImportCompletenessState;
  metadata?: Record<string, unknown>;
  contentSections?: MajorContentSectionDto[];
  classificationMappings?: MajorClassificationMappingDto[];
}

export interface MajorVersionDto {
  id?: string;
  majorId?: string;
  profileId?: string;
  versionNumber: number;
  status: MajorContentSectionStatus;
  sourceImportRecordId?: string;
  sourceFileName?: string;
  sourceUri?: string;
  sourceHash?: string;
  importedAt?: Date;
  publishedAt?: Date;
  approvedBy?: string;
  supersededAt?: Date;
  changeSummary?: Record<string, unknown>;
  rawContentBlocks?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export type MajorPhaseLinkTargetType =
  | 'ACADEMIC_PROGRAM'
  | 'SCHOLARSHIP'
  | 'COURSE'
  | 'CAREER'
  | 'JOB'
  | 'TAXONOMY_NODE';

export type MajorPhaseLinkSource =
  | 'MAJOR_IDENTITY'
  | 'MAJOR_LEVEL_PROFILE'
  | 'TEXT_MATCH'
  | 'TAXONOMY_MAPPING';

export interface MajorPhaseLinkDto {
  targetType: MajorPhaseLinkTargetType;
  label: string;
  href: string;
  query: Record<string, string>;
  phase: number;
  relationship: string;
  source: MajorPhaseLinkSource;
  metadata?: Record<string, unknown>;
}

export interface MajorPhaseLinkSummaryDto {
  majorId?: string;
  publicId?: string;
  slug?: string;
  displayName: string;
  degreeLevel?: MajorLevelInput;
  academicFieldOrDiscipline?: string | null;
  collegeOrFaculty?: string | null;
  links: MajorPhaseLinkDto[];
}

export interface MajorDto {
  id: string;
  publicId: string;
  slug: string;
  canonicalName: string;
  canonicalDedupKey: string;
  displayName: string;
  localizedNameAr?: string | null;
  localizedNameEn?: string | null;
  status: MajorLifecycleStatus;
  completenessStatus: MajorImportCompletenessState;
  facultyName?: string | null;
  degreeLevel?: MajorLevelInput;
  sourceClassificationSystem?: string;
  academicFieldOrDiscipline?: string;
  collegeOrFaculty?: string;
  classificationCode?: string;
  sourceUrl?: string | null;
  officialSourceUrl?: string | null;
  sourceImportRecordId?: string;
  academicFieldId?: string | null;
  disciplineId?: string | null;
  academicField?: AcademicTaxonomyNodeDto | null;
  discipline?: AcademicTaxonomyNodeDto | null;
  currentPublishedVersionId?: string | null;
  optionalFields?: Record<string, unknown> | null;
  profiles?: MajorLevelProfileDto[];
  versions?: MajorVersionDto[];
  aliases?: MajorAliasDto[];
  relationships?: MajorRelationshipDto[];
  classificationMappings?: MajorClassificationMappingDto[];
  sources?: MajorSourceDto[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MajorSourceIdentityInput {
  sourceImportRecordId?: string | null;
  sourceUrl?: string | null;
  officialSourceUrl?: string | null;
  sources?: Array<Pick<MajorSourceDto, 'sourceName' | 'sourceUri'>>;
}

/** The single source-identity predicate used by import completeness and publication. */
export function hasMajorSourceIdentity(input: MajorSourceIdentityInput): boolean {
  return Boolean(
    input.sourceImportRecordId?.trim() ||
    input.officialSourceUrl?.trim() ||
    input.sourceUrl?.trim() ||
    input.sources?.some(source => source.sourceName?.trim() || source.sourceUri?.trim())
  );
}

export type MajorSourceIdentityPrefix = 'MJR' | 'MAS' | 'DOC' | 'FEL';

export function resolveMajorSourceIdentity(
  classificationCode: string | null | undefined,
  allowedPrefixes: readonly MajorSourceIdentityPrefix[],
): string | undefined {
  const normalized = classificationCode?.trim().toUpperCase();
  if (!normalized || !/^(MJR|MAS|DOC|FEL)-\d+$/.test(normalized)) return undefined;
  return allowedPrefixes.some(prefix => normalized.startsWith(`${prefix}-`)) ? normalized : undefined;
}

export interface FellowshipDefinitionDto {
  id: string;
  publicId: string;
  slug: string;
  canonicalName: string;
  canonicalDedupKey: string;
  displayName: string;
  localizedNameAr?: string | null;
  localizedNameEn?: string | null;
  fellowshipType: string;
  professionalDomain?: string | null;
  status: MajorLifecycleStatus;
  completenessStatus: MajorImportCompletenessState;
  linkedMajorId?: string | null;
  linkedProfileId?: string | null;
  optionalFields?: Record<string, unknown> | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type PublicMajorDto = Omit<
  MajorDto,
  'id' | 'canonicalDedupKey' | 'sourceImportRecordId' | 'status' | 'completenessStatus' | 'optionalFields' | 'createdAt'
> & {
  contentSections?: Array<Pick<MajorContentSectionDto, 'sectionKey' | 'title' | 'content' | 'reviewStatus' | 'metadata'>>;
  phaseLinks?: MajorPhaseLinkDto[];
};

export class MajorPhaseLinkingService {
  public static buildSummary(major: MajorDto | PublicMajorDto): MajorPhaseLinkSummaryDto {
    return {
      majorId: 'id' in major ? major.id : undefined,
      publicId: major.publicId,
      slug: major.slug,
      displayName: major.displayName,
      degreeLevel: major.degreeLevel,
      academicFieldOrDiscipline: major.academicFieldOrDiscipline,
      collegeOrFaculty: major.collegeOrFaculty,
      links: this.buildLinks(major),
    };
  }

  public static buildLinks(major: MajorDto | PublicMajorDto): MajorPhaseLinkDto[] {
    const identityQuery = this.buildIdentityQuery(major);
    const degreeQuery = this.buildDegreeAwareQuery(major);
    const taxonomyQuery = this.buildTaxonomyQuery(major);

    const links: MajorPhaseLinkDto[] = [
      {
        targetType: 'ACADEMIC_PROGRAM',
        label: 'Programs that offer this major',
        href: this.withQuery('/universities', degreeQuery),
        query: degreeQuery,
        phase: 11,
        relationship: 'UNIVERSITIES_BY_MAJOR_ACADEMIC_PROGRAM',
        source: 'MAJOR_LEVEL_PROFILE',
        metadata: this.buildCommonMetadata(major),
      },
      {
        targetType: 'SCHOLARSHIP',
        label: 'Scholarships that accept this major',
        href: this.withQuery('/scholarships', degreeQuery),
        query: degreeQuery,
        phase: 12,
        relationship: 'SCHOLARSHIPS_BY_ELIGIBLE_MAJOR',
        source: 'MAJOR_LEVEL_PROFILE',
        metadata: this.buildCommonMetadata(major),
      },
      {
        targetType: 'COURSE',
        label: 'Courses related to this major',
        href: this.withQuery('/courses', identityQuery),
        query: identityQuery,
        phase: 13,
        relationship: 'COURSES_BY_RELATED_MAJOR',
        source: 'MAJOR_IDENTITY',
        metadata: this.buildCommonMetadata(major),
      },
      {
        targetType: 'CAREER',
        label: 'Career paths for this major',
        href: this.withQuery('/careers', identityQuery),
        query: identityQuery,
        phase: 21,
        relationship: 'CAREERS_BY_MAJOR_REFERENCE',
        source: 'MAJOR_IDENTITY',
        metadata: this.buildCommonMetadata(major),
      },
      {
        targetType: 'JOB',
        label: 'Jobs connected to this major',
        href: this.withQuery('/jobs', identityQuery),
        query: identityQuery,
        phase: 21,
        relationship: 'JOBS_BY_MAJOR_REFERENCE',
        source: 'MAJOR_IDENTITY',
        metadata: this.buildCommonMetadata(major),
      },
    ];

    if (Object.keys(taxonomyQuery).length > 0) {
      links.unshift({
        targetType: 'TAXONOMY_NODE',
        label: 'Academic taxonomy reference',
        href: this.withQuery('/academic-taxonomy', taxonomyQuery),
        query: taxonomyQuery,
        phase: 8,
        relationship: 'MAJOR_TO_ACADEMIC_TAXONOMY',
        source: 'TAXONOMY_MAPPING',
        metadata: this.buildCommonMetadata(major),
      });
    }

    return links;
  }

  private static buildIdentityQuery(major: MajorDto | PublicMajorDto): Record<string, string> {
    const ownerId = 'id' in major ? major.id : undefined;
    return {
      ...(ownerId ? { majorId: ownerId } : {}),
      ...(major.publicId ? { majorPublicId: major.publicId } : {}),
      ...(major.slug ? { majorSlug: major.slug } : {}),
    };
  }

  private static buildDegreeAwareQuery(major: MajorDto | PublicMajorDto): Record<string, string> {
    // P4 reverse reads are keyed by canonical Major owner identity. Legacy degree text is display-only.
    return this.buildIdentityQuery(major);
  }

  private static buildTaxonomyQuery(major: MajorDto | PublicMajorDto): Record<string, string> {
    return {
      ...(major.academicFieldId ? { academicFieldId: major.academicFieldId } : {}),
      ...(major.disciplineId ? { disciplineId: major.disciplineId } : {}),
    };
  }

  private static buildCommonMetadata(major: MajorDto | PublicMajorDto): Record<string, unknown> {
    return {
      majorPublicId: major.publicId,
      majorSlug: major.slug,
      majorName: major.displayName,
      degreeLevel: major.degreeLevel,
      academicFieldId: major.academicFieldId,
      disciplineId: major.disciplineId,
      currentPublishedVersionId: major.currentPublishedVersionId,
    };
  }

  private static withQuery(path: string, query: Record<string, string>): string {
    const params = new URLSearchParams(query);
    const serialized = params.toString();
    return serialized ? `${path}?${serialized}` : path;
  }
}

export interface MajorFilters {
  status?: MajorLifecycleStatus;
  completenessStatus?: MajorImportCompletenessState;
  degreeLevel?: string;
  academicFieldOrDiscipline?: string;
  collegeOrFaculty?: string;
  academicFieldId?: string;
  disciplineId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export type PublicMajorFilters = Omit<MajorFilters, 'status' | 'completenessStatus' | 'page' | 'pageSize'> & { cursor?: string; limit?: number };

export interface PaginatedMajorResult<T = MajorDto> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore?: boolean;
  nextCursor?: string | null;
}

export interface UpdateMajorDto {
  displayName?: string;
  localizedNameAr?: string | null;
  localizedNameEn?: string | null;
  status?: MajorLifecycleStatus;
  completenessStatus?: MajorImportCompletenessState;
  /** @deprecated Compatibility input only. New writes identify DegreeLevel through a level profile degreeLevelId. */
  degreeLevel?: MajorLevelInput;
  sourceClassificationSystem?: string;
  /** @deprecated Compatibility text; use academicFieldId or disciplineId for canonical linkage. */
  academicFieldOrDiscipline?: string | null;
  /** @deprecated Display context only; never a taxonomy identity. */
  collegeOrFaculty?: string | null;
  classificationCode?: string | null;
  sourceUrl?: string | null;
  officialSourceUrl?: string | null;
  academicFieldId?: string | null;
  disciplineId?: string | null;
  currentPublishedVersionId?: string | null;
  optionalFields?: Record<string, unknown>;
}

export interface TaxonomyMappedMajorDto {
  id: string;
  relationshipType: MajorClassificationMappingDto['relationshipType'];
  major?: Pick<MajorDto, 'id' | 'canonicalName'>;
  profile?: Pick<MajorLevelProfileDto, 'id' | 'displayName' | 'level'>;
}

export interface IMajorRepository {
  create(data: Omit<MajorDto, 'id' | 'createdAt' | 'updatedAt'> & Partial<Pick<MajorDto, 'id' | 'createdAt' | 'updatedAt'>>): Promise<MajorDto>;
  update(id: string, updates: UpdateMajorDto): Promise<MajorDto>;
  findById(id: string): Promise<MajorDto | null>;
  findByPublicId?(publicId: string): Promise<MajorDto | null>;
  findPublishedByIds?(ids: string[]): Promise<MajorDto[]>;
  findBySlug(slug: string): Promise<MajorDto | null>;
  findByDedupKey(key: string): Promise<MajorDto | null>;
  updateStatus(id: string, status: MajorLifecycleStatus): Promise<void>;
  updateImportLink?(id: string, sourceImportRecordId: string): Promise<void>;
  list(filters: MajorFilters): Promise<PaginatedMajorResult<MajorDto>>;
  listPublished(filters: PublicMajorFilters): Promise<PaginatedMajorResult<MajorDto>>;
  createVersion?(data: Omit<MajorVersionDto, 'id' | 'createdAt' | 'updatedAt'>): Promise<MajorVersionDto>;
  /** Serializes version-number allocation for one Major inside the active transaction. */
  acquireVersionAllocationLock?(majorId: string): Promise<void>;
  listVersions?(majorId: string): Promise<MajorVersionDto[]>;
  createLevelProfile?(data: Omit<MajorLevelProfileDto, 'id' | 'createdAt' | 'updatedAt'>): Promise<MajorLevelProfileDto>;
  findLevelProfile?(majorId: string, level: MajorLevel, code?: string): Promise<MajorLevelProfileDto | null>;
  listLevelProfiles?(majorId: string): Promise<MajorLevelProfileDto[]>;
  createContentSections?(data: Array<Omit<MajorContentSectionDto, 'id'>>): Promise<{ count: number }>;
  listContentSections?(majorId: string): Promise<MajorContentSectionDto[]>;
  createAliases?(data: Array<Omit<MajorAliasDto, 'id'>>): Promise<{ count: number }>;
  listAliases?(majorId: string): Promise<MajorAliasDto[]>;
  createRelationships?(data: Array<Omit<MajorRelationshipDto, 'id'>>): Promise<{ count: number }>;
  listRelationships?(majorId: string): Promise<MajorRelationshipDto[]>;
  createClassificationMappings?(data: Array<Omit<MajorClassificationMappingDto, 'id'>>): Promise<{ count: number }>;
  listClassificationMappings?(majorId: string): Promise<MajorClassificationMappingDto[]>;
  createSource?(data: Omit<MajorSourceDto, 'id' | 'createdAt' | 'updatedAt'>): Promise<MajorSourceDto>;
  listSources?(majorId: string): Promise<MajorSourceDto[]>;
  listByTaxonomyNode?(taxonomyNodeId: string): Promise<TaxonomyMappedMajorDto[]>;
  /** Allocate the next profile code under the active transaction; floor protects immutable source-catalog ranges. */
  allocateNextProfileCode?(prefix: MajorSourceIdentityPrefix, floor?: number): Promise<string>;
}

export interface ITransactionalMajorRepository extends IMajorRepository {
  withTransaction(context: import('../event-foundation/outbox/TransactionalOutbox').AtomicPersistenceContext): IMajorRepository;
}

export interface IFellowshipDefinitionRepository {
  create(data: Omit<FellowshipDefinitionDto, 'id' | 'createdAt' | 'updatedAt'> & Partial<Pick<FellowshipDefinitionDto, 'id' | 'createdAt' | 'updatedAt'>>): Promise<FellowshipDefinitionDto>;
  update(id: string, updates: Partial<Pick<FellowshipDefinitionDto, 'displayName' | 'localizedNameAr' | 'localizedNameEn' | 'status' | 'completenessStatus' | 'professionalDomain' | 'linkedMajorId' | 'linkedProfileId' | 'optionalFields'>>): Promise<FellowshipDefinitionDto>;
  findByDedupKey(key: string): Promise<FellowshipDefinitionDto | null>;
}

export const MajorImportPayloadSchema = z.object({
  canonicalMajorName: z.string(),
  degreeLevel: z.string().optional(),
  degreeLevelId: z.string().optional(),
  sourceClassificationSystem: z.string().optional(),
  academicFieldOrDiscipline: z.string().optional(),
  collegeOrFaculty: z.string().optional(),
  classificationCode: z.string().optional(),
  sourceUrl: z.union([z.string().url(), z.literal('')]).optional(),
  officialSourceUrl: z.union([z.string().url(), z.literal('')]).optional(),
  sourceImportRecordId: z.string().min(1).optional(),
  facultyName: z.string().optional(),
  description: z.string().optional(),
  localizedNames: z.record(z.string(), z.string()).optional(),
  aliases: z.union([z.string(), z.array(z.string())]).optional(),
  synonyms: z.union([z.string(), z.array(z.string())]).optional(),
  equivalencyMappings: z.array(z.record(z.string(), z.unknown())).optional(),
  degreeLevelMappings: z.array(z.record(z.string(), z.unknown())).optional(),
  relatedMajors: z.union([z.string(), z.array(z.string())]).optional(),
  studentFriendlySummary: z.string().optional(),
  acquiredSkills: z.array(z.string()).optional(),
  careerOutcomes: z.array(z.string()).optional(),
  typicalCourses: z.array(z.string()).optional(),
  academicFieldId: z.string().optional(),
  disciplineId: z.string().optional(),
  criticalUnresolvedMappings: z.array(z.string()).optional(),
  contentBlocks: z.array(z.record(z.string(), z.unknown())).optional(),
  sourceImportMode: z.enum(['CATALOG_IDENTITY_ONLY', 'DETAIL_DOSSIER']).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

export type MajorImportPayload = z.infer<typeof MajorImportPayloadSchema>;

export class MajorCompletenessClassifier {
  static classify(payload: MajorImportPayload): { state: MajorImportCompletenessState, missingFields?: string[] } {
    const missing: string[] = [];
    if (!payload.canonicalMajorName) missing.push('canonicalMajorName');
    if (missing.length > 0) return { state: MajorImportCompletenessState.INCOMPLETE, missingFields: missing };

    const reviewFields: string[] = [];
    if (!payload.degreeLevelId) reviewFields.push('degreeLevelId');
    if (!payload.academicFieldId && !payload.disciplineId) reviewFields.push('GAP_TAXONOMY_TRUE');
    if (!hasMajorSourceIdentity(payload)) reviewFields.push('sourceIdentity');
    if (payload.criticalUnresolvedMappings?.length) reviewFields.push('criticalUnresolvedMappings');

    if (reviewFields.length > 0) {
      return { state: MajorImportCompletenessState.NEEDS_REVIEW, missingFields: reviewFields };
    }

    return { state: MajorImportCompletenessState.COMPLETE };
  }
}
export class MajorNamingService {
  static normalize(name: string): string { return name.trim(); }

  static normalizeArabic(value: string): string {
    return value
      .trim()
      .normalize('NFKD')
      .replace(/[\u064B-\u065F\u0670]/g, '')
      .replace(/\u0640/g, '')
      .replace(/[إأآا]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ؤ/g, 'و')
      .replace(/ئ/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  static normalizeEnglish(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  static normalizeSearchText(value: string | undefined): string {
    const raw = value?.trim();
    if (!raw) {
      return 'unknown';
    }

    const normalized = /[\u0600-\u06FF]/.test(raw)
      ? this.normalizeArabic(raw)
      : this.normalizeEnglish(raw);

    return normalized || 'unknown';
  }

  static normalizeForKey(value: string | undefined): string {
    return this.normalizeSearchText(value)
      .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-')
      .replace(/(^-|-$)+/g, '') || 'unknown';
  }
}
export class MajorDeduplicationService {
  static generateKey(payload: MajorImportPayload): string {
    const concept = MajorNamingService.normalizeForKey(
      payload.canonicalMajorName
        || payload.localizedNames?.en
        || payload.localizedNames?.ar
    );
    const primaryDiscipline = MajorNamingService.normalizeForKey(
      payload.disciplineId
        || payload.academicFieldId
        || payload.academicFieldOrDiscipline
    );
    const classificationContext = MajorNamingService.normalizeForKey(
      typeof payload.metadata?.classificationContext === 'string'
        ? payload.metadata.classificationContext
        : undefined
    );

    return [concept, primaryDiscipline, classificationContext].join('|');
  }

  static generateProfileKey(payload: MajorImportPayload): string {
    const majorKey = this.generateKey(payload);
    const degree = MajorNamingService.normalizeForKey(payload.degreeLevel);
    const profileType = MajorNamingService.normalizeForKey(
      typeof payload.metadata?.profileType === 'string'
        ? payload.metadata.profileType
        : undefined
    );
    return `${majorKey}|${degree}|${profileType}`;
  }

  static generateCrossListingContext(payload: MajorImportPayload): string | undefined {
    const college = MajorNamingService.normalizeForKey(payload.collegeOrFaculty || payload.facultyName);
    return college === 'unknown' ? undefined : college;
  }
}

export class FellowshipDeduplicationService {
  static generateKey(payload: MajorImportPayload): string {
    const name = MajorNamingService.normalizeForKey(
      payload.canonicalMajorName
        || payload.localizedNames?.en
        || payload.localizedNames?.ar
    );
    const fellowshipType = MajorNamingService.normalizeForKey(
      typeof payload.fellowshipType === 'string' ? payload.fellowshipType : undefined
    );
    const professionalDomain = MajorNamingService.normalizeForKey(
      typeof payload.professionalDomain === 'string'
        ? payload.professionalDomain
        : payload.academicFieldOrDiscipline
    );

    return [name, fellowshipType, professionalDomain].join('|');
  }
}

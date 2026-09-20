import { Prisma, PrismaClient } from '@prisma/client';
import {
  IMajorRepository,
  ITransactionalMajorRepository,
  AtomicPersistenceContext,
  MajorAliasDto,
  MajorClassificationMappingDto,
  MajorContentSectionDto,
  MajorDto,
  MajorFilters,
  MajorLevel,
  MajorLevelProfileDto,
  MajorLifecycleStatus,
  MajorRelationshipDto,
  MajorSourceDto,
  MajorStatus,
  MajorSourceIdentityPrefix,
  MajorVersionDto,
  PaginatedMajorResult,
  PublicMajorFilters,
  UpdateMajorDto,
  AcademicTaxonomyNodeDto,
  DegreeLevelDto,
  TaxonomyMappedMajorDto,
} from '@manaratak/domain';

import { queryStableCursorPage } from '../api-foundation/StableCursor';

const MAJOR_INCLUDE = {
  academicField: true,
  discipline: true,
  classificationMappings: true,
  levelProfiles: {
    include: {
      degreeLevel: true,
      academicField: true,
      discipline: true,
      classificationMappings: true,
    }
  }
};

export const MAJOR_OPTIONAL_FIELDS_RESERVED_KEYS = new Set([
  'id', 'publicId', 'code', 'slug', 'canonicalName', 'canonicalDedupKey',
  'displayName', 'localizedNameAr', 'localizedNameEn', 'status', 'completenessStatus', 'facultyName',
  'academicFieldId', 'disciplineId', 'currentPublishedVersionId',
  'academicField', 'discipline', 'classificationMappings', 'profiles',
  'versions', 'aliases', 'relationships', 'sources', 'createdAt', 'updatedAt'
]);

interface MajorTransactionContext extends AtomicPersistenceContext {
  readonly transactionClient: Prisma.TransactionClient;
}

export class PrismaMajorRepository implements ITransactionalMajorRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly legacyOptionalFieldFiltersEnabled = false,
  ) {}

  withTransaction(context: AtomicPersistenceContext): IMajorRepository {
    const transactionClient = (context as Partial<MajorTransactionContext>).transactionClient;
    if (!context.boundaryId || !transactionClient) throw new Error('MAJOR_ATOMIC_TRANSACTION_CONTEXT_REQUIRED');
    return new PrismaMajorRepository(
      transactionClient as unknown as PrismaClient,
      this.legacyOptionalFieldFiltersEnabled,
    );
  }

  async findById(id: string): Promise<MajorDto | null> {
    let record = await this.prisma.major.findUnique({
      where: { id },
      include: MAJOR_INCLUDE
    });
    if (!record) {
      const profile = await this.prisma.majorLevelProfile.findUnique({
        where: { id },
        select: { majorId: true }
      });
      if (profile) {
        record = await this.prisma.major.findUnique({
          where: { id: profile.majorId },
          include: MAJOR_INCLUDE
        });
      }
    }
    return record ? this.mapToDto(record) : null;
  }

  async findByPublicId(publicId: string): Promise<MajorDto | null> {
    const record = await this.prisma.major.findUnique({
      where: { publicId },
      include: MAJOR_INCLUDE
    });
    return record ? this.mapToDto(record) : null;
  }

  async findPublishedByIds(ids: string[]): Promise<MajorDto[]> {
    if (!ids.length) return [];
    const records = await this.prisma.major.findMany({
      where: { id: { in: [...new Set(ids)] }, status: MajorStatus.PUBLISHED },
      include: MAJOR_INCLUDE,
    });
    return records.map((record) => this.mapToDto(record));
  }

  async findBySlug(slug: string): Promise<MajorDto | null> {
    const record = await this.prisma.major.findUnique({
      where: { slug },
      include: MAJOR_INCLUDE
    });
    return record ? this.mapToDto(record) : null;
  }

  async findByDedupKey(key: string): Promise<MajorDto | null> {
    const record = await this.prisma.major.findUnique({
      where: { canonicalDedupKey: key },
      include: MAJOR_INCLUDE
    });
    return record ? this.mapToDto(record) : null;
  }

  async create(data: Omit<MajorDto, 'id' | 'createdAt' | 'updatedAt'> & Partial<Pick<MajorDto, 'id' | 'createdAt' | 'updatedAt'>>): Promise<MajorDto> {
    const {
      id: _id, createdAt: _createdAt, updatedAt: _updatedAt,
      publicId, slug, canonicalName, canonicalDedupKey, displayName, localizedNameAr, localizedNameEn, status,
      completenessStatus, facultyName, academicFieldId, disciplineId, currentPublishedVersionId,
      optionalFields, profiles: _profiles, versions: _versions, aliases: _aliases,
      relationships: _relationships, classificationMappings: _classificationMappings,
      sources: _sources,
      ...rest
    } = data;
    
    const safeOptionalFields = {
      ...this.sanitizeOptionalFields(optionalFields),
      ...rest
    };

    const record = await this.prisma.major.create({
      data: {
        publicId, slug, canonicalName, canonicalDedupKey, displayName, localizedNameAr, localizedNameEn, status,
        completenessStatus, facultyName,
        academicFieldId,
        disciplineId,
        currentPublishedVersionId,
        optionalFields: safeOptionalFields as Prisma.InputJsonObject
      },
      include: MAJOR_INCLUDE
    });
    return this.mapToDto(record);
  }

  async update(id: string, updates: UpdateMajorDto): Promise<MajorDto> {
    const {
      displayName, localizedNameAr, localizedNameEn, status, completenessStatus, academicFieldId, disciplineId,
      currentPublishedVersionId, optionalFields,
      ...rest
    } = updates;
    
    const resolvedId = await this.resolveMajorId(id);
    const existing = await this.prisma.major.findUnique({ where: { id: resolvedId }});
    const existingOptional = this.sanitizeOptionalFields(existing?.optionalFields);

    const safeOptionalFields = {
      ...existingOptional,
      ...this.sanitizeOptionalFields(optionalFields),
      ...rest
    };

    const record = await this.prisma.major.update({
      where: { id: resolvedId },
      data: {
        displayName: displayName !== undefined ? displayName : undefined,
        localizedNameAr: localizedNameAr !== undefined ? localizedNameAr : undefined,
        localizedNameEn: localizedNameEn !== undefined ? localizedNameEn : undefined,
        status: status !== undefined ? status : undefined,
        completenessStatus: completenessStatus !== undefined ? completenessStatus : undefined,
        academicFieldId: academicFieldId !== undefined ? academicFieldId : undefined,
        disciplineId: disciplineId !== undefined ? disciplineId : undefined,
        currentPublishedVersionId: currentPublishedVersionId !== undefined ? currentPublishedVersionId : undefined,
        optionalFields: safeOptionalFields as Prisma.InputJsonObject
      },
      include: MAJOR_INCLUDE
    });
    return this.mapToDto(record);
  }

  async updateStatus(id: string, status: MajorLifecycleStatus): Promise<void> {
    const resolvedId = await this.resolveMajorId(id);
    await this.prisma.major.update({
      where: { id: resolvedId },
      data: { status }
    });
  }

  async updateImportLink(id: string, sourceImportRecordId: string): Promise<void> {
    const resolvedId = await this.resolveMajorId(id);
    const existing = await this.prisma.major.findUnique({ where: { id: resolvedId }});
    const existingOptional = this.sanitizeOptionalFields(existing?.optionalFields);

    await this.prisma.major.update({
      where: { id: resolvedId },
      data: {
        optionalFields: {
          ...existingOptional,
          sourceImportRecordId,
        } as Prisma.InputJsonObject,
      },
    });
  }

  async list(filters: MajorFilters): Promise<PaginatedMajorResult<MajorDto>> {
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize || 50));
    
    const where: Prisma.MajorWhereInput = {};
    if (filters.status) where.status = filters.status;
    if (filters.completenessStatus) where.completenessStatus = filters.completenessStatus;
    if (filters.academicFieldId) where.academicFieldId = filters.academicFieldId;
    if (filters.disciplineId) where.disciplineId = filters.disciplineId;
    if (filters.search) {
      where.OR = [
        { displayName: { contains: filters.search, mode: 'insensitive' } },
        { canonicalName: { contains: filters.search, mode: 'insensitive' } },
        { slug: { contains: filters.search, mode: 'insensitive' } },
        { facultyName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const and: Prisma.MajorWhereInput[] = [];
    if (filters.degreeLevel) {
      and.push(this.withLegacyOptionalFallback(
        { levelProfiles: { some: { degreeLevel: { is: { canonicalCode: filters.degreeLevel.toUpperCase() as any } } } } },
        { optionalFields: { path: ['degreeLevel'], equals: filters.degreeLevel } },
      ));
    }
    if (filters.academicFieldOrDiscipline) {
      and.push(this.withLegacyOptionalFallback(
        {
          OR: [
            { academicField: { is: { canonicalName: { contains: filters.academicFieldOrDiscipline, mode: 'insensitive' } } } },
            { discipline: { is: { canonicalName: { contains: filters.academicFieldOrDiscipline, mode: 'insensitive' } } } },
          ],
        },
        { optionalFields: { path: ['academicFieldOrDiscipline'], string_contains: filters.academicFieldOrDiscipline } },
      ));
    }
    if (filters.collegeOrFaculty) {
      and.push(this.withLegacyOptionalFallback(
        { facultyName: { contains: filters.collegeOrFaculty, mode: 'insensitive' } },
        { optionalFields: { path: ['collegeOrFaculty'], string_contains: filters.collegeOrFaculty } },
      ));
    }
    if (and.length > 0) where.AND = and;
    
    const [data, total] = await Promise.all([
      this.prisma.major.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: MAJOR_INCLUDE,
      }),
      this.prisma.major.count({ where })
    ]);
    
    return {
      data: data.map((record) => this.mapToDto(record)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  async listPublished(filters: PublicMajorFilters): Promise<PaginatedMajorResult<MajorDto>> {
    const where: Prisma.MajorWhereInput = { status: MajorStatus.PUBLISHED };
    const and: Prisma.MajorWhereInput[] = [];
    if (filters.degreeLevel) and.push(this.withLegacyOptionalFallback(
      { levelProfiles: { some: { degreeLevel: { is: { canonicalCode: filters.degreeLevel.toUpperCase() as any } } } } },
      { optionalFields: { path: ['degreeLevel'], equals: filters.degreeLevel } },
    ));
    if (filters.academicFieldOrDiscipline) and.push(this.withLegacyOptionalFallback(
      { OR: [
        { academicField: { is: { canonicalName: { contains: filters.academicFieldOrDiscipline, mode: 'insensitive' } } } },
        { discipline: { is: { canonicalName: { contains: filters.academicFieldOrDiscipline, mode: 'insensitive' } } } },
      ] },
      { optionalFields: { path: ['academicFieldOrDiscipline'], string_contains: filters.academicFieldOrDiscipline } },
    ));
    if (filters.collegeOrFaculty) and.push(this.withLegacyOptionalFallback(
      { facultyName: { contains: filters.collegeOrFaculty, mode: 'insensitive' } },
      { optionalFields: { path: ['collegeOrFaculty'], string_contains: filters.collegeOrFaculty } },
    ));
    if (filters.academicFieldId) where.academicFieldId = filters.academicFieldId;
    if (filters.disciplineId) where.disciplineId = filters.disciplineId;
    if (filters.search) where.OR = [
      { displayName: { contains: filters.search, mode: 'insensitive' } },
      { canonicalName: { contains: filters.search, mode: 'insensitive' } },
      { slug: { contains: filters.search, mode: 'insensitive' } },
    ];
    if (and.length) where.AND = and;
    return queryStableCursorPage({
      delegate: this.prisma.major as any, where, include: MAJOR_INCLUDE,
      cursor: filters.cursor, limit: filters.limit, map: (record: any) => this.mapToDto(record),
    });
  }

  async createVersion(data: Omit<MajorVersionDto, 'id' | 'createdAt' | 'updatedAt'>): Promise<MajorVersionDto> {
    const record = await this.prisma.majorVersion.create({
      data: {
        majorId: data.majorId ?? '',
        profileId: data.profileId,
        versionNumber: data.versionNumber,
        status: data.status,
        sourceImportRecordId: data.sourceImportRecordId,
        sourceFileName: data.sourceFileName,
        sourceUri: data.sourceUri,
        sourceHash: data.sourceHash,
        importedAt: data.importedAt,
        publishedAt: data.publishedAt,
        approvedBy: data.approvedBy,
        supersededAt: data.supersededAt,
        changeSummary: data.changeSummary as Prisma.InputJsonObject | undefined,
        rawContentBlocks: data.rawContentBlocks as Prisma.InputJsonObject | undefined,
        metadata: data.metadata as Prisma.InputJsonObject | undefined,
      },
    });

    return this.mapVersionToDto(record);
  }

  async acquireVersionAllocationLock(majorId: string): Promise<void> {
    await this.prisma.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${majorId}, 0))`;
  }

  async listVersions(idOrProfileId: string): Promise<MajorVersionDto[]> {
    const majorId = await this.resolveMajorId(idOrProfileId);
    const records = await this.prisma.majorVersion.findMany({
      where: { majorId },
      orderBy: [{ versionNumber: 'desc' }, { createdAt: 'desc' }],
    });

    return records.map((record) => this.mapVersionToDto(record));
  }

  async createLevelProfile(data: Omit<MajorLevelProfileDto, 'id' | 'createdAt' | 'updatedAt'>): Promise<MajorLevelProfileDto> {
    const record = await this.prisma.majorLevelProfile.create({
      data: {
        majorId: data.majorId ?? '',
        level: data.level,
        degreeLevelId: data.degreeLevelId,
        code: data.code,
        profileType: data.profileType,
        displayName: data.displayName,
        localizedNameAr: data.localizedNameAr,
        localizedNameEn: data.localizedNameEn,
        collegeContext: data.collegeContext,
        academicFieldId: data.academicFieldId,
        disciplineId: data.disciplineId,
        currentPublishedVersionId: data.currentPublishedVersionId,
        status: data.status,
        completenessStatus: data.completenessStatus,
        metadata: data.metadata as Prisma.InputJsonObject | undefined,
      },
      include: {
        degreeLevel: true,
        academicField: true,
        discipline: true,
        classificationMappings: true,
      }
    });

    return this.mapLevelProfileToDto(record);
  }

  async findLevelProfile(majorId: string, level: MajorLevel, code?: string): Promise<MajorLevelProfileDto | null> {
    const record = await this.prisma.majorLevelProfile.findFirst({
      where: {
        majorId,
        level,
        code: code ?? null,
      },
      include: {
        degreeLevel: true,
        academicField: true,
        discipline: true,
        classificationMappings: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return record ? this.mapLevelProfileToDto(record) : null;
  }

  async listLevelProfiles(idOrProfileId: string): Promise<MajorLevelProfileDto[]> {
    const majorId = await this.resolveMajorId(idOrProfileId);
    const records = await this.prisma.majorLevelProfile.findMany({
      where: { majorId },
      include: {
        degreeLevel: true,
        academicField: true,
        discipline: true,
        classificationMappings: true,
      },
      orderBy: [{ level: 'asc' }, { createdAt: 'desc' }],
    });

    return records.map((record) => this.mapLevelProfileToDto(record));
  }

  async allocateNextProfileCode(prefix: MajorSourceIdentityPrefix, floor = 0): Promise<string> {
    await this.prisma.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`major-profile-code:${prefix}`}, 0))`;
    const profiles = await this.prisma.majorLevelProfile.findMany({
      where: { code: { startsWith: `${prefix}-` } },
      select: { code: true },
    });
    let max = floor;
    for (const profile of profiles) {
      const match = profile.code?.match(new RegExp(`^${prefix}-(\\d+)$`));
      if (match) max = Math.max(max, Number(match[1]));
    }
    return `${prefix}-${String(max + 1).padStart(4, '0')}`;
  }

  async listByTaxonomyNode(taxonomyNodeId: string): Promise<TaxonomyMappedMajorDto[]> {
    const records = await this.prisma.majorClassificationMapping.findMany({
      where: { taxonomyNodeId },
      include: {
        major: { select: { id: true, canonicalName: true } },
        profile: { select: { id: true, displayName: true, level: true } },
      },
      orderBy: [{ relationshipType: 'asc' }, { createdAt: 'asc' }],
    });

    return records.map((record) => ({
      id: record.id,
      relationshipType: record.relationshipType as TaxonomyMappedMajorDto['relationshipType'],
      major: record.major ?? undefined,
      profile: record.profile
        ? {
            id: record.profile.id,
            displayName: record.profile.displayName ?? record.profile.level,
            level: record.profile.level as MajorLevel,
          }
        : undefined,
    }));
  }

  async createContentSections(data: Array<Omit<MajorContentSectionDto, 'id'>>): Promise<{ count: number }> {
    if (data.length === 0) {
      return { count: 0 };
    }

    const result = await this.prisma.majorContentSection.createMany({
      data: data.map((section) => ({
        profileId: section.profileId,
        versionId: section.versionId,
        sectionKey: section.sectionKey,
        title: section.title,
        locale: section.locale,
        content: section.content,
        sourceSectionPath: section.sourceSectionPath,
        reviewStatus: section.reviewStatus,
        metadata: section.metadata as Prisma.InputJsonObject | undefined,
      })),
      skipDuplicates: true,
    });

    return { count: result.count };
  }

  async listContentSections(idOrProfileId: string): Promise<MajorContentSectionDto[]> {
    const majorId = await this.resolveMajorId(idOrProfileId);
    const records = await this.prisma.majorContentSection.findMany({
      where: {
        OR: [
          { profile: { majorId } },
          { version: { majorId } },
        ],
      },
      orderBy: [{ profileId: 'asc' }, { sectionKey: 'asc' }, { createdAt: 'asc' }],
    });

    return records.map((record) => this.mapContentSectionToDto(record));
  }

  async createAliases(data: Array<Omit<MajorAliasDto, 'id'>>): Promise<{ count: number }> {
    if (data.length === 0) {
      return { count: 0 };
    }

    const result = await this.prisma.majorAlias.createMany({
      data: data.map((alias) => ({
        majorId: alias.majorId ?? '',
        locale: alias.locale,
        alias: alias.alias,
        normalizedAlias: alias.normalizedAlias ?? alias.alias.trim().toLowerCase(),
        aliasType: alias.aliasType ?? 'ALIAS',
        sourceId: alias.sourceId,
      })),
      skipDuplicates: true,
    });

    return { count: result.count };
  }

  async listAliases(idOrProfileId: string): Promise<MajorAliasDto[]> {
    const majorId = await this.resolveMajorId(idOrProfileId);
    const records = await this.prisma.majorAlias.findMany({
      where: { majorId },
      orderBy: [{ aliasType: 'asc' }, { locale: 'asc' }, { alias: 'asc' }],
    });

    return records.map((record) => ({
      ...record,
      locale: record.locale ?? undefined,
      aliasType: record.aliasType as MajorAliasDto['aliasType'],
      sourceId: record.sourceId ?? undefined,
    }));
  }

  async createRelationships(data: Array<Omit<MajorRelationshipDto, 'id'>>): Promise<{ count: number }> {
    if (data.length === 0) {
      return { count: 0 };
    }

    this.assertRelationshipInvariants(data);
    const result = await this.prisma.majorRelationship.createMany({
      data: data.map((relationship) => ({
        sourceMajorId: relationship.sourceMajorId,
        targetMajorId: relationship.targetMajorId,
        sourceProfileId: relationship.sourceProfileId,
        targetProfileId: relationship.targetProfileId,
        relationshipType: relationship.relationshipType,
        confidence: relationship.confidence,
        notes: relationship.notes,
        metadata: relationship.metadata as Prisma.InputJsonObject | undefined,
      })),
      skipDuplicates: true,
    });

    return { count: result.count };
  }

  async listRelationships(idOrProfileId: string): Promise<MajorRelationshipDto[]> {
    const majorId = await this.resolveMajorId(idOrProfileId);
    const records = await this.prisma.majorRelationship.findMany({
      where: {
        OR: [
          { sourceMajorId: majorId },
          { targetMajorId: majorId },
          { sourceProfile: { majorId } },
          { targetProfile: { majorId } },
        ],
      },
      orderBy: [{ relationshipType: 'asc' }, { createdAt: 'asc' }],
    });

    return records.map((record) => ({
      ...record,
      sourceMajorId: record.sourceMajorId ?? undefined,
      targetMajorId: record.targetMajorId ?? undefined,
      sourceProfileId: record.sourceProfileId ?? undefined,
      targetProfileId: record.targetProfileId ?? undefined,
      relationshipType: record.relationshipType as MajorRelationshipDto['relationshipType'],
      confidence: record.confidence ?? undefined,
      notes: record.notes ?? undefined,
      metadata: this.asRecord(record.metadata),
    }));
  }

  async createClassificationMappings(data: Array<Omit<MajorClassificationMappingDto, 'id'>>): Promise<{ count: number }> {
    if (data.length === 0) {
      return { count: 0 };
    }

    this.assertClassificationMappingInvariants(data);
    const result = await this.prisma.majorClassificationMapping.createMany({
      data: data.map((mapping) => ({
        majorId: mapping.majorId,
        profileId: mapping.profileId,
        taxonomyNodeId: mapping.taxonomyNodeId,
        relationshipType: mapping.relationshipType,
        standardType: mapping.standardType,
        standardCode: mapping.standardCode,
        confidence: mapping.confidence,
        notes: mapping.notes,
        metadata: mapping.metadata as Prisma.InputJsonObject | undefined,
      })),
      skipDuplicates: true,
    });

    return { count: result.count };
  }

  async listClassificationMappings(idOrProfileId: string): Promise<MajorClassificationMappingDto[]> {
    const majorId = await this.resolveMajorId(idOrProfileId);
    const records = await this.prisma.majorClassificationMapping.findMany({
      where: {
        OR: [
          { majorId },
          { profile: { majorId } },
        ],
      },
      orderBy: [{ relationshipType: 'asc' }, { createdAt: 'asc' }],
    });

    return records.map((record) => this.mapClassificationMappingToDto(record));
  }

  async createSource(data: Omit<MajorSourceDto, 'id' | 'createdAt' | 'updatedAt'>): Promise<MajorSourceDto> {
    this.assertHasOwner(data.majorId, data.profileId, 'MajorSource');
    const record = await this.prisma.majorSource.create({
      data: {
        majorId: data.majorId,
        profileId: data.profileId,
        sourceType: data.sourceType,
        sourceName: data.sourceName,
        sourceLocale: data.sourceLocale,
        sourceUri: data.sourceUri,
        sourceHash: data.sourceHash,
        importedAt: data.importedAt,
        metadata: data.metadata as Prisma.InputJsonObject | undefined,
      },
    });

    return this.mapSourceToDto(record);
  }

  async listSources(idOrProfileId: string): Promise<MajorSourceDto[]> {
    const majorId = await this.resolveMajorId(idOrProfileId);
    const records = await this.prisma.majorSource.findMany({
      where: { majorId },
      orderBy: [{ importedAt: 'desc' }, { createdAt: 'desc' }],
    });

    return records.map((record) => this.mapSourceToDto(record));
  }

  private async resolveMajorId(id: string): Promise<string> {
    const majorCount = await this.prisma.major.count({ where: { id } });
    if (majorCount > 0) {
      return id;
    }
    const profile = await this.prisma.majorLevelProfile.findUnique({
      where: { id },
      select: { majorId: true }
    });
    if (profile) {
      return profile.majorId;
    }
    return id;
  }

  private mapToDto(record: any): MajorDto {
    const { optionalFields, levelProfiles, academicField, discipline, classificationMappings, ...rest } = record;
    const safeOptionalFields = this.sanitizeOptionalFields(optionalFields);
    return {
      ...safeOptionalFields,
      ...rest,
      optionalFields: safeOptionalFields,
      academicField: academicField ? this.mapNodeToDto(academicField) : null,
      discipline: discipline ? this.mapNodeToDto(discipline) : null,
      classificationMappings: classificationMappings ? classificationMappings.map((m: any) => this.mapClassificationMappingToDto(m)) : undefined,
      profiles: levelProfiles ? levelProfiles.map((p: any) => this.mapLevelProfileToDto(p)) : undefined,
    } as MajorDto;
  }

  private asRecord(value: Prisma.JsonValue | Record<string, unknown> | null | undefined): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return {};
  }

  private sanitizeOptionalFields(value: Prisma.JsonValue | Record<string, unknown> | null | undefined): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(this.asRecord(value)).filter(([key]) => !MAJOR_OPTIONAL_FIELDS_RESERVED_KEYS.has(key))
    );
  }

  private withLegacyOptionalFallback(
    canonical: Prisma.MajorWhereInput,
    legacy: Prisma.MajorWhereInput,
  ): Prisma.MajorWhereInput {
    return this.legacyOptionalFieldFiltersEnabled ? { OR: [canonical, legacy] } : canonical;
  }

  private assertHasOwner(majorId: string | undefined, profileId: string | undefined, subject: string): void {
    if (!majorId && !profileId) {
      throw new Error(`${subject} must have a Major or MajorLevelProfile owner`);
    }
  }

  private assertClassificationMappingInvariants(data: Array<Omit<MajorClassificationMappingDto, 'id'>>): void {
    const semanticKeys = new Set<string>();
    for (const mapping of data) {
      this.assertHasOwner(mapping.majorId, mapping.profileId, 'MajorClassificationMapping');
      if (!mapping.taxonomyNodeId?.trim()) throw new Error('MajorClassificationMapping requires taxonomyNodeId');
      const key = [mapping.majorId ?? '', mapping.profileId ?? '', mapping.taxonomyNodeId, mapping.relationshipType].join('|');
      if (semanticKeys.has(key)) throw new Error(`Duplicate semantic MajorClassificationMapping: ${key}`);
      semanticKeys.add(key);
    }
  }

  private assertRelationshipInvariants(data: Array<Omit<MajorRelationshipDto, 'id'>>): void {
    const semanticKeys = new Set<string>();
    for (const relationship of data) {
      this.assertHasOwner(relationship.sourceMajorId, relationship.sourceProfileId, 'MajorRelationship source');
      this.assertHasOwner(relationship.targetMajorId, relationship.targetProfileId, 'MajorRelationship target');
      const source = relationship.sourceMajorId ?? relationship.sourceProfileId!;
      const target = relationship.targetMajorId ?? relationship.targetProfileId!;
      if (source === target) throw new Error('MajorRelationship cannot target itself');
      const key = [source, target, relationship.relationshipType].join('|');
      if (semanticKeys.has(key)) throw new Error(`Duplicate semantic MajorRelationship: ${key}`);
      semanticKeys.add(key);
    }
  }

  private mapVersionToDto(record: Prisma.MajorVersionGetPayload<Record<string, never>>): MajorVersionDto {
    return {
      ...record,
      profileId: record.profileId ?? undefined,
      sourceImportRecordId: record.sourceImportRecordId ?? undefined,
      sourceFileName: record.sourceFileName ?? undefined,
      sourceUri: record.sourceUri ?? undefined,
      sourceHash: record.sourceHash ?? undefined,
      importedAt: record.importedAt ?? undefined,
      publishedAt: record.publishedAt ?? undefined,
      approvedBy: record.approvedBy ?? undefined,
      supersededAt: record.supersededAt ?? undefined,
      status: record.status as MajorVersionDto['status'],
      changeSummary: this.asRecord(record.changeSummary),
      rawContentBlocks: this.asRecord(record.rawContentBlocks),
      metadata: this.asRecord(record.metadata),
    };
  }

  private mapLevelProfileToDto(record: any): MajorLevelProfileDto {
    const { degreeLevel, academicField, discipline, classificationMappings, ...rest } = record;
    return {
      ...rest,
      level: record.level as MajorLevelProfileDto['level'],
      degreeLevelId: record.degreeLevelId ?? undefined,
      code: record.code ?? undefined,
      profileType: record.profileType as MajorLevelProfileDto['profileType'],
      displayName: record.displayName ?? undefined,
      localizedNameAr: record.localizedNameAr ?? undefined,
      localizedNameEn: record.localizedNameEn ?? undefined,
      collegeContext: record.collegeContext ?? undefined,
      academicFieldId: record.academicFieldId ?? undefined,
      disciplineId: record.disciplineId ?? undefined,
      currentPublishedVersionId: record.currentPublishedVersionId ?? undefined,
      status: record.status as MajorLevelProfileDto['status'],
      completenessStatus: record.completenessStatus as MajorLevelProfileDto['completenessStatus'],
      metadata: this.asRecord(record.metadata),
      degreeLevel: degreeLevel ? this.mapDegreeLevelToDto(degreeLevel) : null,
      academicField: academicField ? this.mapNodeToDto(academicField) : null,
      discipline: discipline ? this.mapNodeToDto(discipline) : null,
      classificationMappings: classificationMappings ? classificationMappings.map((m: any) => this.mapClassificationMappingToDto(m)) : undefined,
    };
  }

  private mapContentSectionToDto(record: Prisma.MajorContentSectionGetPayload<Record<string, never>>): MajorContentSectionDto {
    return {
      ...record,
      profileId: record.profileId ?? undefined,
      versionId: record.versionId ?? undefined,
      title: record.title ?? undefined,
      locale: record.locale ?? undefined,
      sourceSectionPath: record.sourceSectionPath ?? undefined,
      reviewStatus: record.reviewStatus as MajorContentSectionDto['reviewStatus'],
      metadata: this.asRecord(record.metadata),
    };
  }

  private mapSourceToDto(record: Prisma.MajorSourceGetPayload<Record<string, never>>): MajorSourceDto {
    return {
      ...record,
      majorId: record.majorId ?? undefined,
      profileId: record.profileId ?? undefined,
      sourceLocale: record.sourceLocale ?? undefined,
      sourceUri: record.sourceUri ?? undefined,
      sourceHash: record.sourceHash ?? undefined,
      importedAt: record.importedAt ?? undefined,
      sourceType: record.sourceType as MajorSourceDto['sourceType'],
      metadata: this.asRecord(record.metadata),
    };
  }

  private mapNodeToDto(node: any): AcademicTaxonomyNodeDto | null {
    if (!node) return null;
    return {
      nodeId: node.id,
      nodeType: node.nodeType,
      canonicalCode: node.canonicalCode,
      canonicalName: node.canonicalName,
      description: node.description ?? undefined,
      status: node.status,
      standardType: node.standardType,
      standardCode: node.standardCode ?? undefined,
      localizedNames: node.localizedNames ? (node.localizedNames as any) : undefined,
      metadata: node.metadata ? (node.metadata as any) : undefined,
      createdAt: node.createdAt,
      updatedAt: node.updatedAt,
    };
  }

  private mapDegreeLevelToDto(dl: any): DegreeLevelDto | null {
    if (!dl) return null;
    return {
      id: dl.id,
      canonicalCode: dl.canonicalCode,
      nameEn: dl.nameEn,
      nameAr: dl.nameAr,
      displayRank: dl.displayRank,
      status: dl.status,
      aliases: dl.aliases ? (dl.aliases as any) : undefined,
      metadata: dl.metadata ? (dl.metadata as any) : undefined,
      createdAt: dl.createdAt,
      updatedAt: dl.updatedAt,
    };
  }

  private mapClassificationMappingToDto(record: any): MajorClassificationMappingDto {
    return {
      id: record.id,
      majorId: record.majorId ?? undefined,
      profileId: record.profileId ?? undefined,
      taxonomyNodeId: record.taxonomyNodeId,
      relationshipType: record.relationshipType as MajorClassificationMappingDto['relationshipType'],
      standardType: record.standardType ?? undefined,
      standardCode: record.standardCode ?? undefined,
      confidence: record.confidence ?? undefined,
      notes: record.notes ?? undefined,
      metadata: this.asRecord(record.metadata),
    };
  }
}

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
  MajorImportCompletenessState,
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
  ReviewedMajorClassificationInput,
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
    private readonly transactionBound = false,
  ) {}

  withTransaction(context: AtomicPersistenceContext): IMajorRepository {
    const transactionClient = (context as Partial<MajorTransactionContext>).transactionClient;
    if (!context.boundaryId || !transactionClient) throw new Error('MAJOR_ATOMIC_TRANSACTION_CONTEXT_REQUIRED');
    return new PrismaMajorRepository(
      transactionClient as unknown as PrismaClient,
      this.legacyOptionalFieldFiltersEnabled,
      true,
    );
  }

  async findById(id: string): Promise<MajorDto | null> {
    let record = await this.prisma.major.findUnique({
      where: { id },
      include: MAJOR_INCLUDE
    });
    if (!record) {
      const profile = await this.prisma.majorLevelProfile.findFirst({
        where: {
          OR: [
            { id },
            { code: id },
          ]
        },
        select: { majorId: true }
      });
      if (profile) {
        record = await this.prisma.major.findUnique({
          where: { id: profile.majorId },
          include: MAJOR_INCLUDE
        });
      }
    }
    if (!record) {
      record = await this.prisma.major.findUnique({
        where: { publicId: id },
        include: MAJOR_INCLUDE
      });
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
    if (!this.transactionBound) throw new Error('MAJOR_TRANSACTIONAL_PERSISTENCE_REQUIRED');
    const majorId = await this.resolveMajorId(id);
    await this.acquireVersionAllocationLock(majorId);
    const profiles = await this.prisma.majorLevelProfile.findMany({ where: { majorId } });
    const profile = profiles.find(item => item.id === id || item.code === id)
      ?? (profiles.length === 1 ? profiles[0] : undefined);
    if (profiles.length && !profile) throw new Error('TARGET_MAJOR_PROFILE_REQUIRED');
    if (profile) {
      let versionId: string | null = null;
      if (status === MajorStatus.PUBLISHED) {
        if (profile.status !== MajorStatus.READY_TO_PUBLISH) throw new Error('MAJOR_INVALID_PUBLICATION_STATUS');
        const version = await this.prisma.majorVersion.findFirst({
          where: { majorId, profileId: profile.id, status: { notIn: ['ARCHIVED', 'SUPERSEDED'] } },
          orderBy: { versionNumber: 'desc' },
        });
        if (!version || !await this.prisma.majorContentSection.count({ where: { profileId: profile.id, versionId: version.id } })) {
          throw new Error('MAJOR_PUBLICATION_CONTENT_MISSING');
        }
        const unreviewed = await this.prisma.majorContentSection.count({ where: {
          profileId: profile.id, versionId: version.id, reviewStatus: { notIn: ['APPROVED', 'PUBLISHED'] },
        } });
        if (unreviewed) throw new Error('MAJOR_PUBLICATION_CONTENT_REVIEW_REQUIRED');
        versionId = version.id;
        await this.prisma.majorVersion.update({ where: { id: version.id }, data: { status: 'PUBLISHED', publishedAt: new Date() } });
      }
      await this.prisma.majorLevelProfile.update({ where: { id: profile.id }, data: { status, currentPublishedVersionId: versionId } });
      const published = await this.prisma.majorLevelProfile.findFirst({ where: { majorId, status: MajorStatus.PUBLISHED, currentPublishedVersionId: { not: null } } });
      await this.prisma.major.update({ where: { id: majorId }, data: {
        status: published ? MajorStatus.PUBLISHED : status,
        currentPublishedVersionId: published?.currentPublishedVersionId ?? null,
      } });
      return;
    }
    await this.prisma.major.update({ where: { id: majorId }, data: { status } });
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

    if (filters.academicFieldId) where.academicFieldId = filters.academicFieldId;
    if (filters.disciplineId) where.disciplineId = filters.disciplineId;
    if (filters.search) {
      where.OR = [
        { displayName: { contains: filters.search, mode: 'insensitive' } },
        { canonicalName: { contains: filters.search, mode: 'insensitive' } },
        { localizedNameAr: { contains: filters.search, mode: 'insensitive' } },
        { localizedNameEn: { contains: filters.search, mode: 'insensitive' } },
        { levelProfiles: { some: { OR: [
          { localizedNameAr: { contains: filters.search, mode: 'insensitive' } },
          { localizedNameEn: { contains: filters.search, mode: 'insensitive' } },
          { code: { contains: filters.search, mode: 'insensitive' } },
        ] } } },
        { slug: { contains: filters.search, mode: 'insensitive' } },
        { facultyName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const and: Prisma.MajorWhereInput[] = [];
    if (filters.taxonomyNodeId) and.push(this.taxonomyGraphFilter(filters.taxonomyNodeId));
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
    
    const profileWhere: Prisma.MajorLevelProfileWhereInput = {
      major: { is: where },
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.completenessStatus ? { completenessStatus: filters.completenessStatus } : {}),
      ...(filters.degreeLevel ? { level: filters.degreeLevel.toUpperCase() } : {}),
    };
    const legacyWhere: Prisma.MajorWhereInput = { ...where, levelProfiles: { none: {} },
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.completenessStatus ? { completenessStatus: filters.completenessStatus } : {}),
    };
    if (filters.degreeLevel) legacyWhere.AND = [...and, { optionalFields: { path: ['degreeLevel'], equals: filters.degreeLevel } }];
    const [data, profileTotal, legacy, legacyTotal] = await Promise.all([
      this.prisma.majorLevelProfile.findMany({
        where: profileWhere, take: page * pageSize,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: { major: { include: MAJOR_INCLUDE } },
      }),
      this.prisma.majorLevelProfile.count({ where: profileWhere }),
      this.prisma.major.findMany({ where: legacyWhere, take: page * pageSize, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], include: MAJOR_INCLUDE }),
      this.prisma.major.count({ where: legacyWhere }),
    ]);
    const total = profileTotal + legacyTotal;
    const rows = data.map(record => ({ ...this.mapToDto(record.major),
        profileId: record.id, createdAt: record.createdAt, updatedAt: record.updatedAt, status: record.status as MajorLifecycleStatus,
        completenessStatus: record.completenessStatus as MajorImportCompletenessState,
        degreeLevel: record.level, classificationCode: record.code ?? undefined,
        publicId: record.code || record.major.publicId,
        displayName: record.localizedNameAr || record.displayName || record.major.localizedNameAr || record.major.displayName,
        nameAr: record.localizedNameAr || record.major.localizedNameAr,
        nameEn: record.localizedNameEn || record.major.localizedNameEn || record.major.canonicalName,
      }));
    const merged = [...rows, ...legacy.map(record => ({ ...this.mapToDto(record), createdAt: record.createdAt, profileId: undefined, nameAr: record.localizedNameAr, nameEn: record.localizedNameEn || record.canonicalName }))]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() || (b.profileId || b.id).localeCompare(a.profileId || a.id));
    return { data: merged.slice((page - 1) * pageSize, page * pageSize), total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async listPublished(filters: PublicMajorFilters): Promise<PaginatedMajorResult<MajorDto>> {
    const where: Prisma.MajorWhereInput = {};
    const and: Prisma.MajorWhereInput[] = [];
    if (filters.taxonomyNodeId) and.push(this.taxonomyGraphFilter(filters.taxonomyNodeId));
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
    const profileWhere: Prisma.MajorLevelProfileWhereInput = {
      status: MajorStatus.PUBLISHED, currentPublishedVersionId: { not: null }, major: { is: where },
      ...(filters.degreeLevel ? { level: filters.degreeLevel.toUpperCase() } : {}),
    };
    return queryStableCursorPage({
      delegate: this.prisma.majorLevelProfile as any, where: profileWhere,
      include: { major: { include: MAJOR_INCLUDE } },
      cursor: filters.cursor, limit: filters.limit,
      map: (record: any) => {
        const major = this.mapToDto(record.major);
        const profile = major.profiles?.find(item => item.id === record.id);
        return { ...major, profiles: profile ? [profile] : [],
          publicId: record.code || major.publicId, degreeLevel: record.level,
          currentPublishedVersionId: record.currentPublishedVersionId,
          displayName: record.localizedNameAr || record.displayName || major.localizedNameAr || major.displayName,
          localizedNameAr: record.localizedNameAr || major.localizedNameAr,
          localizedNameEn: record.localizedNameEn || major.localizedNameEn,
          classificationCode: record.code || major.classificationCode,
          optionalFields: { ...major.optionalFields, degreeLevel: record.level, classificationCode: record.code },
        };
      },
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
    await this.prisma.$queryRaw`
      SELECT pg_advisory_xact_lock(hashtextextended(${majorId}, 0))::text AS lock_result
    `;
  }

  async listVersions(idOrProfileId: string, options?: { profileId?: string }): Promise<MajorVersionDto[]> {
    const resolvedProfile = await this.resolveProfile(idOrProfileId, options?.profileId);
    if (options?.profileId && !resolvedProfile) return [];
    if (options?.profileId && resolvedProfile) {
      const records = await this.prisma.majorVersion.findMany({
        where: { profileId: resolvedProfile.id },
        orderBy: [{ versionNumber: 'desc' }, { createdAt: 'desc' }],
      });
      return records.map((record) => this.mapVersionToDto(record));
    }
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

  async listContentSections(
    idOrProfileId: string,
    options?: { profileId?: string; versionId?: string; publishedOnly?: boolean }
  ): Promise<MajorContentSectionDto[]> {
    const resolvedProfile = await this.resolveProfile(idOrProfileId, options?.profileId);

    if (resolvedProfile) {
      const profileId = resolvedProfile.id;
      let targetVersionId = options?.versionId;
      if (options?.publishedOnly && (!resolvedProfile.currentPublishedVersionId ||
        (targetVersionId && targetVersionId !== resolvedProfile.currentPublishedVersionId))) return [];

      if (!targetVersionId) {
        if (options?.publishedOnly) {
          if (!resolvedProfile.currentPublishedVersionId) {
            // Draft not published: do not leak drafts on public pages
            return [];
          }
          targetVersionId = resolvedProfile.currentPublishedVersionId;
        } else {
          // Admin view: fetch latest working version for THIS profile
          const latestVersion = await this.prisma.majorVersion.findFirst({
            where: { profileId },
            orderBy: [{ versionNumber: 'desc' }, { createdAt: 'desc' }],
            select: { id: true }
          });
          targetVersionId = latestVersion?.id;
        }
      }

      if (targetVersionId) {
        const records = await this.prisma.majorContentSection.findMany({
          where: {
            profileId,
            versionId: targetVersionId,
          },
          orderBy: [{ sectionKey: 'asc' }, { createdAt: 'asc' }],
        });
        return records.map((record) => this.mapContentSectionToDto(record));
      }

      const records = await this.prisma.majorContentSection.findMany({
        where: { profileId },
        orderBy: [{ sectionKey: 'asc' }, { createdAt: 'asc' }],
      });
      return records.map((record) => this.mapContentSectionToDto(record));
    }

    return [];
  }

  async updateContentSections(
    profileId: string,
    versionId: string,
    sections: Array<{ id?: string; sectionKey: string; title?: string; content: string; reviewStatus?: string }>
  ): Promise<{ count: number; sections: MajorContentSectionDto[] }> {
    if (!this.transactionBound) throw new Error('MAJOR_CONTENT_TRANSACTION_REQUIRED');
    const version = await this.prisma.majorVersion.findUnique({
      where: { id: versionId },
      include: { profile: true }
    });
    if (!version) {
      throw new Error(`Version with id ${versionId} not found`);
    }
    if (version.profileId !== profileId || version.profile?.majorId !== version.majorId) {
      throw new Error('MAJOR_CONTENT_FOREIGN_VERSION');
    }
    if (version.publishedAt || ['PUBLISHED', 'ARCHIVED', 'SUPERSEDED'].includes(version.status)
      || ['PUBLISHED', 'ARCHIVED'].includes(version.profile.status)) {
      throw new Error('MAJOR_CONTENT_PUBLISHED_VERSION_IMMUTABLE');
    }
    const sectionKeys = new Set<string>();
    for (const sec of sections) {
      if (!sec.sectionKey.trim() || sectionKeys.has(sec.sectionKey)) throw new Error('MAJOR_CONTENT_DUPLICATE_OR_EMPTY_SECTION_KEY');
      if (sec.reviewStatus && !['NEEDS_REVIEW', 'COMPLETE', 'INCOMPLETE'].includes(sec.reviewStatus)) {
        throw new Error('MAJOR_CONTENT_INVALID_REVIEW_STATUS');
      }
      sectionKeys.add(sec.sectionKey);
      if (sec.id) {
        const existing = await this.prisma.majorContentSection.findUnique({
          where: { id: sec.id },
          select: { profileId: true, versionId: true, sectionKey: true },
        });
        if (!existing || existing.profileId !== profileId || existing.versionId !== versionId || existing.sectionKey !== sec.sectionKey) {
          throw new Error('MAJOR_CONTENT_FOREIGN_SECTION');
        }
      }
    }

    for (const sec of sections) {
      if (sec.id) {
        await this.prisma.majorContentSection.update({
          where: { id: sec.id },
          data: {
            title: sec.title,
            content: sec.content,
            reviewStatus: sec.reviewStatus || 'NEEDS_REVIEW',
            updatedAt: new Date(),
          }
        });
      } else {
        await this.prisma.majorContentSection.upsert({
          where: {
            profileId_versionId_sectionKey_locale: {
              profileId,
              versionId,
              sectionKey: sec.sectionKey,
              locale: 'ar',
            }
          },
          update: {
            title: sec.title,
            content: sec.content,
            reviewStatus: sec.reviewStatus || 'NEEDS_REVIEW',
            updatedAt: new Date(),
          },
          create: {
            profileId,
            versionId,
            sectionKey: sec.sectionKey,
            title: sec.title,
            content: sec.content,
            locale: 'ar',
            reviewStatus: sec.reviewStatus || 'NEEDS_REVIEW',
          }
        });
      }
    }

    await this.prisma.majorVersion.update({
      where: { id: versionId },
      data: { updatedAt: new Date() }
    });
    await this.prisma.majorLevelProfile.update({
      where: { id: profileId },
      data: { updatedAt: new Date() }
    });

    const updated = await this.prisma.majorContentSection.findMany({
      where: { profileId, versionId },
      orderBy: [{ sectionKey: 'asc' }],
    });

    return {
      count: sections.length,
      sections: updated.map(s => this.mapContentSectionToDto(s))
    };
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

  async addReviewedClassificationMapping(majorId: string, input: ReviewedMajorClassificationInput): Promise<MajorClassificationMappingDto> {
    if (!this.transactionBound) throw new Error('MAJOR_GRAPH_TRANSACTION_REQUIRED');
    if (!input.reason.trim() || !input.evidenceReference.trim()) throw new Error('MAJOR_GRAPH_REVIEW_EVIDENCE_REQUIRED');
    await this.prisma.$queryRaw(Prisma.sql`SELECT "id" FROM "Major" WHERE "id" = ${majorId} FOR UPDATE`);
    const owner = await this.prisma.major.findUnique({ where: { id: majorId }, select: { id: true, status: true } });
    if (!owner) throw new Error('MAJOR_GRAPH_OWNER_NOT_FOUND');
    if (['PUBLISHED', 'ARCHIVED', 'REJECTED', 'SUPERSEDED', 'MERGED'].includes(owner.status)) throw new Error('MAJOR_GRAPH_OWNER_IMMUTABLE');
    if (input.profileId) {
      await this.prisma.$queryRaw(Prisma.sql`SELECT "id" FROM "MajorLevelProfile" WHERE "id" = ${input.profileId} FOR SHARE`);
      const profile = await this.prisma.majorLevelProfile.findUnique({ where: { id: input.profileId }, select: { majorId: true, status: true } });
      if (!profile || profile.majorId !== majorId) throw new Error('MAJOR_GRAPH_FOREIGN_PROFILE_OWNER');
      if (['PUBLISHED', 'ARCHIVED', 'REJECTED', 'SUPERSEDED', 'MERGED'].includes(profile.status)) throw new Error('MAJOR_GRAPH_OWNER_IMMUTABLE');
    }
    await this.prisma.$queryRaw(Prisma.sql`SELECT "id" FROM "AcademicTaxonomyNode" WHERE "id" = ${input.taxonomyNodeId} FOR SHARE`);
    const node = await this.prisma.academicTaxonomyNode.findUnique({ where: { id: input.taxonomyNodeId }, select: { id: true, status: true, standardType: true, standardCode: true } });
    if (!node || node.status !== 'ACTIVE') throw new Error('MAJOR_CANONICAL_TAXONOMY_REFERENCE_NOT_ACTIVE');
    const mappingOwner = { majorId, profileId: input.profileId ?? null };
    const duplicateOwner = input.profileId ? { profileId: input.profileId } : { majorId, profileId: null };
    const duplicate = await this.prisma.majorClassificationMapping.findFirst({ where: { ...duplicateOwner, taxonomyNodeId: node.id, relationshipType: input.relationshipType } });
    if (duplicate) throw new Error('MAJOR_GRAPH_DUPLICATE_MAPPING');
    const record = await this.prisma.majorClassificationMapping.create({ data: {
      ...mappingOwner, taxonomyNodeId: node.id, relationshipType: input.relationshipType,
      standardType: node.standardType, standardCode: node.standardCode,
      notes: input.reason.trim(), metadata: { source: 'ADMIN_REVIEW', evidenceReference: input.evidenceReference.trim() },
    } });
    return this.mapClassificationMappingToDto(record);
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
    const profile = await this.prisma.majorLevelProfile.findFirst({
      where: {
        OR: [
          { id },
          { code: id },
        ]
      },
      select: { majorId: true }
    });
    if (profile) {
      return profile.majorId;
    }
    const majorByPublicId = await this.prisma.major.findUnique({
      where: { publicId: id },
      select: { id: true }
    });
    if (majorByPublicId) {
      return majorByPublicId.id;
    }
    return id;
  }

  private async resolveProfile(idOrProfileId: string, optionsProfileId?: string): Promise<{ id: string; majorId: string; level: string; code: string | null; currentPublishedVersionId: string | null } | null> {
    if (optionsProfileId) {
      const majorId = await this.resolveMajorId(idOrProfileId);
      const p = await this.prisma.majorLevelProfile.findFirst({
        where: {
          majorId,
          OR: [
            { id: optionsProfileId },
            { code: optionsProfileId },
          ]
        },
        select: { id: true, majorId: true, level: true, code: true, currentPublishedVersionId: true }
      });
      return p;
    }

    const directProfile = await this.prisma.majorLevelProfile.findFirst({
      where: {
        OR: [
          { id: idOrProfileId },
          { code: idOrProfileId },
        ]
      },
      select: { id: true, majorId: true, level: true, code: true, currentPublishedVersionId: true }
    });
    if (directProfile) return directProfile;

    const majorId = await this.resolveMajorId(idOrProfileId);
    const profiles = await this.prisma.majorLevelProfile.findMany({
      where: { majorId },
      orderBy: [{ level: 'asc' }, { createdAt: 'desc' }],
      select: { id: true, majorId: true, level: true, code: true, currentPublishedVersionId: true }
    });
    if (profiles.length > 0) {
      return profiles[0];
    }
    return null;
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

  private taxonomyGraphFilter(taxonomyNodeId: string): Prisma.MajorWhereInput {
    return { OR: [
      { academicFieldId: taxonomyNodeId }, { disciplineId: taxonomyNodeId },
      { classificationMappings: { some: { taxonomyNodeId } } },
      { levelProfiles: { some: { OR: [
        { academicFieldId: taxonomyNodeId }, { disciplineId: taxonomyNodeId },
        { classificationMappings: { some: { taxonomyNodeId } } },
      ] } } },
    ] };
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

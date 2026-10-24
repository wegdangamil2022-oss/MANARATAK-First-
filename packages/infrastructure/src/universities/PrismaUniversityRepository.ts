import {publicProgramMajorVersionProofSql} from './PublicProgramMajorProofSql';
import {publicUniversityEligibility,publicUniversityGeographySql,publicUniversityGeographySelect,isPublicUniversityGeography} from './UniversityPublicEligibility';
import { universityTranslationSourceSelect, universityTranslationSourceStatus } from './UniversityTranslationSourceEvidence';
import {publicProgramTestMatchSql} from './PublicProgramTestSql';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  AtomicPersistenceContext,
  ITransactionalUniversityRepository,
  IUniversityRepository,
  PaginatedUniversityResult,
  type PublishedAcademicProgramReadModel,
  PaginatedUniversityOrganizationUnitResult,
  PublicUniversityFilters,
  sanitizeUniversityOptionalFields,
  UniversityDto,
  UniversityFilters,
  UniversityOrganizationUnitFilters,
  UniversityStatus,
  UniversityNormalizedDetailsUpdate,
  UniversityAcademicProgramAuthoringInput,
  UniversityTranslationDto,
  UniversityTranslationReviewStatus,
  UniversityLocalizedTextDto,
  UniversityLocalizedTextTargetType,
  UpdateUniversityDto,
  MajorStatus,
  UniversityPublicationReadinessPolicy,
  isPublicUniversityProgram,
} from '@manaratak/domain';
import { lockUniversityPublicationReferences } from './UniversityPublicationReferenceLocks';
import { UniversityCanonicalRelationshipValidator } from './UniversityCanonicalRelationshipValidator';

import {
  decodeStableCursor,
  encodeStableCursor,
  boundedCursorLimit,
  queryStableCursorPage } from '../api-foundation/StableCursor';

const universityDetails = {
  campuses: true,
  organizationUnits: true,
  academicPrograms: { include: { campuses: true, major: { select: { status: true, levelProfiles: { select: { id: true, degreeLevelId: true, status: true, currentPublishedVersionId: true, currentPublishedVersion: { select: { id: true, majorId: true, profileId: true, status: true } } } } } }, degreeLevel: { select: { canonicalCode: true, nameAr: true, nameEn: true } }, admissionRequirements: { include: { internationalTest: { select: { displayName: true, canonicalName: true, slug: true, status: true, isPubliclyVisible:true,
              currentPublishedVersion: { include: { scoreScales: true } },
            },
          },
          testVariant: { select: { testId: true, isActive: true } },
          testVersion: { include: { scoreScales: true } } } } } },
  tuitionProfiles: true,
  accommodationProfiles: true,
  rankings: true,
  sourceRecords: true,
  translations: true,
  localizedTexts: true,
} satisfies Prisma.UniversityInclude;

type UniversityRecord = Prisma.UniversityGetPayload<{ include: typeof universityDetails }>;

interface UniversityTransactionContext extends AtomicPersistenceContext {
  readonly transactionClient: Prisma.TransactionClient;
}

function parseUniversityTranslationReviewStatus(value: string): UniversityTranslationReviewStatus {
  switch (value) {
    case 'NEEDS_REVIEW':
    case 'APPROVED':
    case 'PUBLISHED':
    case 'REJECTED':
      return value;
    default:
      throw new Error(`UNIVERSITY_TRANSLATION_REVIEW_STATUS_INVALID:${value}`);
  }
}

function parseUniversityLocalizedTextTargetType(value: string): UniversityLocalizedTextTargetType {
  switch (value) {
    case 'CAMPUS':
    case 'ORGANIZATION_UNIT':
    case 'ACADEMIC_PROGRAM':
    case 'TUITION_PROFILE':
    case 'ACCOMMODATION_PROFILE':
    case 'RANKING':
      return value;
    default:
      throw new Error(`UNIVERSITY_LOCALIZED_TEXT_TARGET_TYPE_INVALID:${value}`);
  }
}

function asMetadata(value: Prisma.JsonValue | null): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

export class PrismaUniversityRepository implements ITransactionalUniversityRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly legacyCountryTextFiltersEnabled = false,
    private readonly transactionBound = false,
  ) {}

  withTransaction(context: AtomicPersistenceContext): IUniversityRepository {
    const transactionClient = (context as Partial<UniversityTransactionContext>).transactionClient;
    if (!context.boundaryId || !transactionClient)
      throw new Error('UNIVERSITY_ATOMIC_TRANSACTION_CONTEXT_REQUIRED');
    return new PrismaUniversityRepository(
      transactionClient as unknown as PrismaClient,
      this.legacyCountryTextFiltersEnabled,
      true,
    );
  }

  private async readSnapshot<T>(work:(repository:PrismaUniversityRepository)=>Promise<T>):Promise<T> {
    return this.prisma.$transaction(
      transaction=>work(new PrismaUniversityRepository(transaction as unknown as PrismaClient,this.legacyCountryTextFiltersEnabled,true)),
      {isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead},
    );
  }

  async lockForRevision(id: string, expectedRevision: number): Promise<void> {
    if (!this.transactionBound) throw new Error('UNIVERSITY_TRANSACTIONAL_PERSISTENCE_REQUIRED');
    const rows = await this.prisma.$queryRaw<Array<{ revision: bigint; status: string }>>`
      SELECT floor(extract(epoch FROM "updatedAt") * 1000)::bigint AS revision, status
      FROM "University" WHERE id = ${id} FOR UPDATE`;
    if (!rows.length) throw new Error('UNIVERSITY_NOT_FOUND');
    if (Number(rows[0].revision) !== expectedRevision) throw new Error('UNIVERSITY_STALE_REVISION');
    if (['ARCHIVED', 'REJECTED'].includes(rows[0].status))
      throw new Error('UNIVERSITY_INACTIVE_IMMUTABLE');
  }

  async advanceRevision(id: string, expectedRevision: number): Promise<number> {
    if (!this.transactionBound) throw new Error('UNIVERSITY_TRANSACTIONAL_PERSISTENCE_REQUIRED');
    const rows = await this.prisma.$queryRaw<Array<{ revision: bigint }>>`
      UPDATE "University"
      SET "updatedAt" = GREATEST(clock_timestamp(), to_timestamp(${expectedRevision} / 1000.0) + interval '1 millisecond')
      WHERE id = ${id}
      RETURNING floor(extract(epoch FROM "updatedAt") * 1000)::bigint AS revision`;
    if (!rows.length) throw new Error('UNIVERSITY_NOT_FOUND');
    return Number(rows[0].revision);
  }

  async findById(id: string): Promise<UniversityDto | null> {
    const record = await this.prisma.university.findUnique({
      where: { id },
      include: universityDetails,
    });
    return record ? this.mapToDto(record) : null;
  }

  async findBySlug(slug: string): Promise<UniversityDto | null> {
    const record = await this.prisma.university.findUnique({
      where: { slug },
      include: universityDetails,
    });
    return record ? this.mapToDto(record) : null;
  }

  async findPublishedBySlug(slug: string): Promise<UniversityDto | null> {
    if(!this.transactionBound)return this.readSnapshot(repository=>repository.findPublishedBySlug(slug));
    const record=await this.prisma.university.findFirst({where:{slug,...publicUniversityEligibility()},include:universityDetails});
    return record?this.mapToDto(record):null;
  }

  async findByDedupKey(key: string): Promise<UniversityDto | null> {
    const record = await this.prisma.university.findUnique({
      where: { canonicalDedupKey: key },
      include: universityDetails,
    });
    return record ? this.mapToDto(record) : null;
  }

  async create(
    data: Omit<UniversityDto, 'id' | 'createdAt' | 'updatedAt'> &
      Partial<Pick<UniversityDto, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<UniversityDto> {
    const {
      publicId,
      slug,
      canonicalName,
      canonicalDedupKey,
      displayName,
      country,
      city,
      institutionType,
      officialWebsite,
      status,
      completenessStatus,
      sourceUrl,
      officialSourceUrl,
      logoAssetId,
      foundedYear,
      sourceImportRecordId,
      optionalFields,
      countryReferenceId,
      regionReferenceId,
      cityReferenceId,
      institutionalOwnership,
    } = data;

    const safeOptionalFields = sanitizeUniversityOptionalFields(optionalFields);
    await new UniversityCanonicalRelationshipValidator(this.prisma).validateCampus({
      countryReferenceId: countryReferenceId ?? undefined,
      regionReferenceId: regionReferenceId ?? undefined,
      cityReferenceId: cityReferenceId ?? undefined,
    });

    const record = await this.prisma.university.create({
      data: {
        id: data.id,
        publicId,
        slug,
        canonicalName,
        canonicalDedupKey,
        displayName,
        country,
        city,
        institutionType,
        officialWebsite,
        status,
        completenessStatus,
        sourceUrl,
        officialSourceUrl,
        logoAssetId,
        foundedYear,
        sourceImportRecordId,
        countryReferenceId,
        regionReferenceId,
        cityReferenceId,
        institutionalOwnership,
        optionalFields: safeOptionalFields as Prisma.InputJsonObject,
      },
      include: universityDetails,
    });
    return this.mapToDto(record);
  }

  async update(id: string, updates: UpdateUniversityDto): Promise<UniversityDto> {
    const {
      displayName,
      country,
      city,
      institutionType,
      officialWebsite,
      status,
      completenessStatus,
      sourceUrl,
      officialSourceUrl,
      logoAssetId,
      foundedYear,
      sourceImportRecordId,
      optionalFields,
      countryReferenceId,
      regionReferenceId,
      cityReferenceId,
      institutionalOwnership,
    } = updates;

    const existing = await this.prisma.university.findUnique({ where: { id } });
    await new UniversityCanonicalRelationshipValidator(this.prisma).validateCampus({
      countryReferenceId: countryReferenceId === undefined ? (existing?.countryReferenceId ?? undefined)
          : (countryReferenceId ?? undefined),
      regionReferenceId: regionReferenceId === undefined ? (existing?.regionReferenceId ?? undefined)
          : (regionReferenceId ?? undefined),
      cityReferenceId: cityReferenceId === undefined ? (existing?.cityReferenceId ?? undefined)
          : (cityReferenceId ?? undefined),
    });
    const existingOptional = sanitizeUniversityOptionalFields(existing?.optionalFields);

    const safeOptionalFields = {
      ...existingOptional,
      ...sanitizeUniversityOptionalFields(optionalFields),
    };

    const record = await this.prisma.university.update({
      where: { id },
      data: {
        displayName: displayName !== undefined ? displayName : undefined,
        country: country !== undefined ? country : undefined,
        city: city !== undefined ? city : undefined,
        institutionType: institutionType !== undefined ? institutionType : undefined,
        officialWebsite: officialWebsite !== undefined ? officialWebsite : undefined,
        status: status !== undefined ? status : undefined,
        completenessStatus: completenessStatus !== undefined ? completenessStatus : undefined,
        sourceUrl: sourceUrl !== undefined ? sourceUrl : undefined,
        officialSourceUrl: officialSourceUrl !== undefined ? officialSourceUrl : undefined,
        logoAssetId: logoAssetId !== undefined ? logoAssetId : undefined,
        foundedYear: foundedYear !== undefined ? foundedYear : undefined,
        sourceImportRecordId: sourceImportRecordId !== undefined ? sourceImportRecordId : undefined,
        countryReferenceId: countryReferenceId !== undefined ? countryReferenceId : undefined,
        regionReferenceId: regionReferenceId !== undefined ? regionReferenceId : undefined,
        cityReferenceId: cityReferenceId !== undefined ? cityReferenceId : undefined,
        institutionalOwnership:
          institutionalOwnership !== undefined ? institutionalOwnership : undefined,
        optionalFields: safeOptionalFields as Prisma.InputJsonObject,
      },
      include: universityDetails,
    });
    return this.mapToDto(record);
  }

  async updateStatus(id: string, status: UniversityStatus): Promise<void> {
    if (status === UniversityStatus.READY_TO_PUBLISH || status === UniversityStatus.PUBLISHED) {
      if (!this.transactionBound) throw new Error('UNIVERSITY_TRANSACTIONAL_PERSISTENCE_REQUIRED');
      await lockUniversityPublicationReferences(this.prisma, id);
      const record = await this.prisma.university.findUnique({where: {id}, include: universityDetails});
      if (!record) throw new Error('UNIVERSITY_NOT_FOUND');
      const current = this.mapToDto(record);
      const expected = status === UniversityStatus.PUBLISHED ? UniversityStatus.READY_TO_PUBLISH : UniversityStatus.READY_TO_REVIEW;
      if (current.status !== expected) throw new Error('UNIVERSITY_INVALID_PUBLISHABLE_TRANSITION');
      const validator = new UniversityCanonicalRelationshipValidator(this.prisma);
      await validator.validateCampus({countryReferenceId: current.countryReferenceId ?? undefined, regionReferenceId: current.regionReferenceId ?? undefined, cityReferenceId: current.cityReferenceId ?? undefined});
      for (const campus of record.campuses) {
        if (campus.status === 'ACTIVE') await validator.validateCampus({countryReferenceId: campus.countryReferenceId ?? undefined, regionReferenceId: campus.regionReferenceId ?? undefined, cityReferenceId: campus.cityReferenceId ?? undefined});
      }
      for (const program of current.academicPrograms ?? []) {
        if (program.status === 'ACTIVE') await validator.validateProgram(program.degreeLevelId!, program.majorId ?? undefined, program.majorMappingState);
      }
      const readiness = new UniversityPublicationReadinessPolicy().evaluate({...current, status: UniversityStatus.READY_TO_PUBLISH});
      if (readiness.blockingIssues.length) throw new Error(readiness.blockingIssues.map(issue => issue.code).join(','));
    }
    await this.prisma.university.update({
      where: { id },
      data: { status },
    });
  }

  async list(filters: UniversityFilters): Promise<PaginatedUniversityResult<UniversityDto>> {
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize || 50));

    const where: Prisma.UniversityWhereInput = {};
    if (filters.status) where.status = filters.status;
    if (filters.completenessStatus) where.completenessStatus = filters.completenessStatus;
    if (filters.countryReferenceId) where.countryReferenceId = filters.countryReferenceId;
    else if (filters.country && this.legacyCountryTextFiltersEnabled) where.country = filters.country;
    if (filters.regionReferenceId) where.regionReferenceId = filters.regionReferenceId;
    if (filters.cityReferenceId) where.cityReferenceId = filters.cityReferenceId;
    if (filters.institutionType) where.institutionType = {equals:filters.institutionType,mode:'insensitive'};
    if (filters.majorId || filters.internationalTestId) {
      where.academicPrograms = {
        some: {
          ...(filters.majorId ? {
            status: 'ACTIVE',
            majorId: filters.majorId,
            degreeLevelId: { not: null },
            majorMappingState: 'CANONICALLY_MAPPED',
            major: { is: { status: MajorStatus.PUBLISHED } },
          } : {}),
          ...(filters.internationalTestId ? {
            admissionRequirements: { some: { internationalTestId: filters.internationalTestId } },
          } : {}),
        },
      };
    }
    if (filters.city && this.legacyCountryTextFiltersEnabled) where.city = filters.city;
    if (filters.search) {
      where.OR = [
        { displayName: { contains: filters.search, mode: 'insensitive' } },
        { canonicalName: { contains: filters.search, mode: 'insensitive' } },
        { slug: { contains: filters.search, mode: 'insensitive' } },
        { city: { contains: filters.search, mode: 'insensitive' } },
        { country: { contains: filters.search, mode: 'insensitive' } },
        { publicId: { contains: filters.search, mode: 'insensitive' } },
        { translations: { some: { displayName: { contains: filters.search, mode: 'insensitive' } } } },
      ];
    }

    if (filters.countOnly) {
      const total = await this.prisma.university.count({ where });
      return { data: [], total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }
    const [data, total] = await Promise.all([
      this.prisma.university.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: filters.sort==='NAME_ASC'?[{displayName:'asc'},{id:'asc'}]:filters.sort==='UPDATED_DESC'?[{updatedAt:'desc'},{id:'asc'}]:[{createdAt:'desc'},{id:'asc'}],
        include: universityDetails,
      }),
      this.prisma.university.count({ where }),
    ]);

    return {
      data: data.map((d) => this.mapToDto(d)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async listOrganizationUnits(
    filters: UniversityOrganizationUnitFilters,
  ): Promise<PaginatedUniversityOrganizationUnitResult> {
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize || 50));
    const where: Prisma.UniversityOrganizationUnitWhereInput = {};
    if (filters.universityId) where.universityId = filters.universityId;
    if (filters.unitType) where.unitType = filters.unitType;
    else where.unitType = { in: ['FACULTY', 'COLLEGE', 'SCHOOL'] };
    if (filters.status) where.status = filters.status;
    if (filters.search?.trim()) {
      where.OR = [
        { name: { contains: filters.search.trim(), mode: 'insensitive' } },
        { university: { is: { displayName: { contains: filters.search.trim(), mode: 'insensitive' } } } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.universityOrganizationUnit.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ university: { displayName: 'asc' } }, { name: 'asc' }],
        include: {
          university: { select: { id: true, publicId: true, displayName: true } },
          programs: { select: { majorId: true, majorMappingState: true, status: true } },
        },
      }),
      this.prisma.universityOrganizationUnit.count({ where }),
    ]);

    return {
      data: rows.map((row) => ({
        id: row.id,
        universityId: row.universityId,
        universityPublicId: row.university.publicId,
        universityDisplayName: row.university.displayName,
        campusId: row.campusId,
        parentOrganizationUnitId: row.parentOrganizationUnitId,
        unitType: row.unitType,
        name: row.name,
        status: row.status,
        programCount: row.programs.length,
        mappedMajorCount: row.programs.filter(
          (program) => program.status !== 'INACTIVE' && program.status !== 'ARCHIVED' && Boolean(program.majorId) && program.majorMappingState === 'CANONICALLY_MAPPED').length,
        unresolvedMajorCount: row.programs.filter(
          (program) => program.status !== 'INACTIVE' && program.status !== 'ARCHIVED' && (!program.majorId || program.majorMappingState !== 'CANONICALLY_MAPPED')).length,
        activeProgramCount: row.programs.filter((program) => program.status === 'ACTIVE').length,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async listPublished(
    filters: PublicUniversityFilters,
  ): Promise<PaginatedUniversityResult<UniversityDto>> {
    if(!this.transactionBound)return this.readSnapshot(repository=>repository.listPublished(filters));
    if (filters.majorId || filters.internationalTestId)
      return this.listPublishedAcademicUniversityPage(filters);
    const where: Prisma.UniversityWhereInput = publicUniversityEligibility();
    if (filters.countryReferenceId) where.countryReferenceId = filters.countryReferenceId;
    if (filters.regionReferenceId) where.regionReferenceId = filters.regionReferenceId;
    if (filters.cityReferenceId) where.cityReferenceId = filters.cityReferenceId;
    if (filters.institutionType) where.institutionType = filters.institutionType;
    if (filters.majorId || filters.internationalTestId) {
      where.academicPrograms = { some: {
        ...(filters.majorId ? { status: 'ACTIVE', majorId: filters.majorId, degreeLevelId: { not: null }, majorMappingState: 'CANONICALLY_MAPPED', major: { is: { status: MajorStatus.PUBLISHED } } } : {}),
        ...(filters.internationalTestId ? { admissionRequirements: { some: { internationalTestId: filters.internationalTestId } } } : {}),
      } };
    }
    if (filters.search) where.OR = [
      { displayName: { contains: filters.search, mode: 'insensitive' } },
      { canonicalName: { contains: filters.search, mode: 'insensitive' } },
      { slug: { contains: filters.search, mode: 'insensitive' } },
    ];
    return queryStableCursorPage({
      delegate: this.prisma.university as any, where, include: universityDetails,
      cursor: filters.cursor, limit: filters.limit, map: (record: any) => this.mapToDto(record),
    });
  }

  private async listPublishedAcademicUniversityPage(
    filters: PublicUniversityFilters,
  ): Promise<PaginatedUniversityResult<UniversityDto>> {
    const limit = boundedCursorLimit(filters.limit),
      after = decodeStableCursor(filters.cursor);
    const conditions = [Prisma.sql`u.status='PUBLISHED'`,publicUniversityGeographySql()];
    if (filters.countryReferenceId)
      conditions.push(Prisma.sql`u."countryReferenceId"=${filters.countryReferenceId}`);
    if (filters.regionReferenceId)
      conditions.push(Prisma.sql`u."regionReferenceId"=${filters.regionReferenceId}`);
    if (filters.cityReferenceId)
      conditions.push(Prisma.sql`u."cityReferenceId"=${filters.cityReferenceId}`);
    if (filters.institutionType)
      conditions.push(Prisma.sql`u."institutionType"=${filters.institutionType}`);
    if (filters.search) {
      const pattern = `%${filters.search}%`;
      conditions.push(
        Prisma.sql`(u."displayName" ILIKE ${pattern} OR u."canonicalName" ILIKE ${pattern} OR u.slug ILIKE ${pattern})`,
      );
    }
    const programConditions = [
      Prisma.sql`p."universityId"=u.id`,
      Prisma.sql`p.status='ACTIVE'`,
      Prisma.sql`p."majorMappingState"='CANONICALLY_MAPPED'`,
      Prisma.sql`m.status='PUBLISHED'`,
      publicProgramMajorVersionProofSql(),
    ];
    if (filters.majorId) programConditions.push(Prisma.sql`p."majorId"=${filters.majorId}`);
    if(filters.internationalTestId)programConditions.push(publicProgramTestMatchSql(filters.internationalTestId));
    conditions.push(
      Prisma.sql`EXISTS (SELECT 1 FROM "UniversityAcademicProgram" p JOIN "Major" m ON m.id=p."majorId" WHERE ${Prisma.join(programConditions, ' AND ')})`,
    );
    const base = Prisma.sql`FROM "University" u WHERE ${Prisma.join(conditions, ' AND ')}`;
    const [selected, counts] = await Promise.all([
      this.prisma.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`SELECT u.id ${base} ${after ? Prisma.sql`AND u.id>${after}` : Prisma.empty} ORDER BY u.id ASC LIMIT ${limit + 1}`,
      ),
      this.prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`SELECT count(*) AS total ${base}`),
    ]);
    const ids = selected.slice(0, limit).map((row) => row.id);
    const rows = ids.length
      ? await this.prisma.university.findMany({
          where: { id: { in: ids }, ...publicUniversityEligibility() },
          include: universityDetails,
        })
      : [];
    const byId = new Map(rows.map((row) => [row.id, row])),
      total = Number(counts[0]?.total);
    if (!Number.isSafeInteger(total)) throw new Error('PUBLIC_UNIVERSITY_TOTAL_INVALID');
    return {
      data: ids.flatMap((id) => {
        const row = byId.get(id);
        return row ? [this.mapToDto(row)] : [];
      }),
      total,
      page: 1,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
      hasMore: selected.length > limit,
      nextCursor: selected.length > limit ? encodeStableCursor(ids.at(-1)!) : null,
    };
  }

  async readProgramIntegrityReference(id:string){const row=await this.prisma.universityAcademicProgram.findUnique({where:{id},include:{university:{select:publicUniversityGeographySelect},major:{select:{status:true,levelProfiles:{select:{id:true,degreeLevelId:true,status:true,currentPublishedVersionId:true,currentPublishedVersion:{select:{id:true,majorId:true,profileId:true,status:true}}}}}}}});return row?{id:row.id,universityId:row.universityId,publiclyEligible:isPublicUniversityGeography(row.university)&&isPublicUniversityProgram(row)}:null;}

  async listPublishedMajorGraph(filters:{countryReferenceId:string;cursor?:string;limit?:number}):Promise<{data:Array<{ownerId:string}>;total:number;hasMore:boolean;nextCursor:string|null}> {
    if(!this.transactionBound)return this.readSnapshot(repository=>repository.listPublishedMajorGraph(filters));
    const limit=boundedCursorLimit(filters.limit,12,50),after=decodeStableCursor(filters.cursor);
    const base=Prisma.sql`FROM "UniversityAcademicProgram" p JOIN "University" u ON u.id=p."universityId" JOIN "Major" m ON m.id=p."majorId"
      WHERE u."countryReferenceId"=${filters.countryReferenceId} AND p.status='ACTIVE' AND p."majorMappingState"='CANONICALLY_MAPPED' AND u.status='PUBLISHED' AND m.status='PUBLISHED'
      AND ${publicUniversityGeographySql()} AND ${publicProgramMajorVersionProofSql()}`;
    const [rows,counts]=await Promise.all([
      this.prisma.$queryRaw<Array<{ownerId:string}>>(Prisma.sql`SELECT DISTINCT m.id AS "ownerId" ${base} ${after?Prisma.sql`AND m.id>${after}`:Prisma.empty} ORDER BY m.id LIMIT ${limit+1}`),
      this.prisma.$queryRaw<Array<{total:bigint}>>(Prisma.sql`SELECT count(DISTINCT m.id) AS total ${base}`),
    ]);
    const total=Number(counts[0]?.total??0),data=rows.slice(0,limit);if(!Number.isSafeInteger(total))throw new Error('PUBLIC_MAJOR_TOTAL_INVALID');
    return {data,total,hasMore:rows.length>limit,nextCursor:rows.length>limit?encodeStableCursor(data.at(-1)!.ownerId):null};
  }

  /** Owner-side country/major/program relationship page; independent of university paging. */
  async listPublishedProgramGraph(filters: {
    countryReferenceId?: string;
    universityId?: string;
    majorId?: string;
    degreeLevelId?: string;
    cursor?: string;
    limit?: number;
  }):Promise<{data:PublishedAcademicProgramReadModel[];total:number;majorTotal:number;hasMore:boolean;nextCursor:string|null}> {
    if(!this.transactionBound)return this.readSnapshot(repository=>repository.listPublishedProgramGraph(filters));
    const limit = boundedCursorLimit(filters.limit, 12, 50),
      after = decodeStableCursor(filters.cursor);
    const conditions = [
      Prisma.sql`p.status='ACTIVE'`,
      Prisma.sql`p."majorMappingState"='CANONICALLY_MAPPED'`,
      Prisma.sql`u.status='PUBLISHED'`,
      publicUniversityGeographySql(),
      Prisma.sql`m.status='PUBLISHED'`,
      publicProgramMajorVersionProofSql(),
    ];
    if (filters.countryReferenceId)
      conditions.push(Prisma.sql`u."countryReferenceId"=${filters.countryReferenceId}`);
    if (filters.universityId) conditions.push(Prisma.sql`p."universityId"=${filters.universityId}`);
    if (filters.majorId) conditions.push(Prisma.sql`p."majorId"=${filters.majorId}`);
    if (filters.degreeLevelId)
      conditions.push(Prisma.sql`p."degreeLevelId"=${filters.degreeLevelId}`);
    const base = Prisma.sql`FROM "UniversityAcademicProgram" p JOIN "University" u ON u.id=p."universityId" JOIN "Major" m ON m.id=p."majorId" WHERE ${Prisma.join(conditions, ' AND ')}`;
    const [rows, counts] = await Promise.all([
      this.prisma.$queryRaw<
        Array<import('@manaratak/domain').PublishedAcademicProgramReadModel>
      >(Prisma.sql`
        SELECT p.id AS "ownerId", p."sourceProgramName", p."degreeLevelId", p."majorId", p."majorMappingState", p.status,
          u.id AS "universityOwnerId", u."publicId" AS "universityPublicId", u.slug AS "universitySlug", u."displayName" AS "universityDisplayName",
          (SELECT jsonb_object_agg(lt.locale,lt.value) FROM "UniversityLocalizedText" lt WHERE lt."universityId"=u.id AND lt."targetType"='ACADEMIC_PROGRAM' AND lt."targetId"=p.id AND lt."fieldKey"='sourceProgramName' AND lt."reviewStatus"='PUBLISHED') AS "localizedNames",
          (SELECT jsonb_object_agg(ut.locale,ut."displayName") FROM "UniversityTranslation" ut WHERE ut."universityId"=u.id AND ut."reviewStatus"='PUBLISHED' AND ut."displayName" IS NOT NULL) AS "universityLocalizedNames"
        ${base} ${after ? Prisma.sql`AND p.id>${after}` : Prisma.empty} ORDER BY p.id ASC LIMIT ${limit + 1}`),
      this.prisma.$queryRaw<Array<{ total: bigint; majorTotal: bigint }>>(
        Prisma.sql`SELECT count(*) AS total, count(DISTINCT p."majorId") AS "majorTotal" ${base}`,
      ),
    ]);
    const data = rows.slice(0, limit),
      total = Number(counts[0]?.total),
      majorTotal = Number(counts[0]?.majorTotal);
    if (!Number.isSafeInteger(total) || !Number.isSafeInteger(majorTotal))
      throw new Error('PUBLIC_PROGRAM_TOTAL_INVALID');
    return {
      data,
      total,
      majorTotal,
      hasMore: rows.length > limit,
      nextCursor: rows.length > limit ? encodeStableCursor(data.at(-1)!.ownerId) : null,
    };
  }

  async findPublishedByPublicIds(publicIds: string[]): Promise<UniversityDto[]> {
    if (!publicIds.length) return [];
    const rows = await this.prisma.university.findMany({
      where: { publicId: { in: [...new Set(publicIds)] }, ...publicUniversityEligibility() },
      include: universityDetails,
    });
    return rows.map((row) => this.mapToDto(row));
  }

  async findPublishedByIds(ids: string[]): Promise<UniversityDto[]> {
    if (!ids.length) return [];
    const rows = await this.prisma.university.findMany({
      where: { id: { in: [...new Set(ids)] }, ...publicUniversityEligibility() },
      include: universityDetails,
    });
    return rows.map((row) => this.mapToDto(row));
  }

  async findPublishedAcademicProgramsByIds(ids: string[]) {
    if (!ids.length) return [];
    const rows = await this.prisma.universityAcademicProgram.findMany({
      where: {
        id: { in: [...new Set(ids)] },
        status: 'ACTIVE',
        majorMappingState: 'CANONICALLY_MAPPED',
        majorId: { not: null },
        degreeLevelId: { not: null },
        major: { is: { status: MajorStatus.PUBLISHED } },
        university: { is: publicUniversityEligibility() },
      },
      select: {
        id: true,
        sourceProgramName: true,
        degreeLevelId: true,
        majorId: true,
        majorMappingState: true,
        status: true,
        major: {
          select: {
            status: true,
            levelProfiles: {
              select: { id: true, degreeLevelId: true, status: true, currentPublishedVersionId: true, currentPublishedVersion: { select: { id: true, majorId: true, profileId: true, status: true } } },
            },
          },
        },
        university: {
          select: { id: true, publicId: true, slug: true, displayName: true,
            status: true, canonicalName: true, officialWebsite: true, sourceUrl: true,
            officialSourceUrl: true, optionalFields: true,
            sourceRecords: {select:{id:true,sourceHash:true,sourceUri:true,sourceLocale:true}},
            translations: {where:{reviewStatus:'PUBLISHED'},select:{locale:true,displayName:true,description:true,metadata:true}},
            localizedTexts: {where:{targetType:'ACADEMIC_PROGRAM',targetId:{in:[...new Set(ids)]},fieldKey:'sourceProgramName',reviewStatus:'PUBLISHED'},select:{targetId:true,locale:true,value:true}},
          },
        },
      },
    });
    return rows.filter(isPublicUniversityProgram).map((row) => ({
      ownerId: row.id,
      universityOwnerId: row.university.id,
      universityPublicId: row.university.publicId,
      universitySlug: row.university.slug,
      universityDisplayName: row.university.displayName,
      universityLocalizedNames: Object.fromEntries((row.university.translations??[]).filter(text=>text.displayName && universityTranslationSourceStatus(row.university, text) === 'CURRENT').map(text=>[text.locale,text.displayName!])),
      localizedNames: Object.fromEntries((row.university.localizedTexts??[]).filter(text=>text.targetId===row.id).map(text=>[text.locale,text.value])),
      sourceProgramName: row.sourceProgramName,
      degreeLevelId: row.degreeLevelId,
      majorId: row.majorId,
      majorMappingState: row.majorMappingState,
      status: row.status,
    }));
  }

  async listTranslations(id: string): Promise<UniversityTranslationDto[]> {
    const owner = await this.prisma.university.findUniqueOrThrow({ where: { id }, select: universityTranslationSourceSelect });
    const records = await this.prisma.universityTranslation.findMany({
      where: { universityId: id },
      orderBy: { locale: 'asc' },
    });
    return records.map((record) => ({
      id: record.id,
      universityId: record.universityId,
      locale: record.locale,
      displayName: record.displayName,
      description: record.description,
      reviewStatus: parseUniversityTranslationReviewStatus(record.reviewStatus),
      publicationSourceStatus: universityTranslationSourceStatus(owner, record),
      sourceRecordId: record.sourceRecordId,
      metadata: asMetadata(record.metadata),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }));
  }

  async upsertTranslation(
    id: string,
    data: Omit<UniversityTranslationDto, 'id' | 'universityId' | 'createdAt' | 'updatedAt'>,
  ): Promise<UniversityTranslationDto> {
    // This is the authoring port. Only the governed handover may publish or carry proof.
    if (data.reviewStatus && data.reviewStatus !== 'NEEDS_REVIEW') {
      throw new Error('TRANSLATION_OWNER_REVIEW_WORKFLOW_REQUIRED');
    }
    const metadata = { ...(data.metadata ?? {}) };
    for (const key of ['publishedTranslationEvidence', 'publishedTranslationApprovalId',
      'pendingTranslationFields', 'translationFieldEvidence', 'translationImport']) delete metadata[key];
    await this.prisma.university.findUniqueOrThrow({ where: { id }, select: { id: true } });
    await this.assertSourceRecordOwnedByUniversity(id, data.sourceRecordId);
    const record = await this.prisma.universityTranslation.upsert({
      where: { universityId_locale: { universityId: id, locale: data.locale } },
      create: {
        universityId: id,
        locale: data.locale,
        displayName: data.displayName,
        description: data.description,
        reviewStatus: 'NEEDS_REVIEW',
        sourceRecordId: data.sourceRecordId,
        metadata: metadata as Prisma.InputJsonObject,
      },
      update: {
        displayName: data.displayName,
        description: data.description,
        reviewStatus: 'NEEDS_REVIEW',
        sourceRecordId: data.sourceRecordId,
        metadata: metadata as Prisma.InputJsonObject,
      },
    });
    return {
      id: record.id,
      universityId: record.universityId,
      locale: record.locale,
      displayName: record.displayName,
      description: record.description,
      reviewStatus: parseUniversityTranslationReviewStatus(record.reviewStatus),
      sourceRecordId: record.sourceRecordId,
      metadata: asMetadata(record.metadata),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  async listLocalizedTexts(id: string): Promise<UniversityLocalizedTextDto[]> {
    await this.prisma.university.findUniqueOrThrow({ where: { id }, select: { id: true } });
    const records = await this.prisma.universityLocalizedText.findMany({
      where: { universityId: id },
      orderBy: [{ targetType: 'asc' }, { targetId: 'asc' }, { fieldKey: 'asc' }, { locale: 'asc' }],
    });
    return records.map((record) => ({
      id: record.id,
      universityId: record.universityId,
      targetType: parseUniversityLocalizedTextTargetType(record.targetType),
      targetId: record.targetId,
      fieldKey: record.fieldKey,
      locale: record.locale,
      value: record.value,
      reviewStatus: parseUniversityTranslationReviewStatus(record.reviewStatus),
      sourceRecordId: record.sourceRecordId,
      metadata: asMetadata(record.metadata),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }));
  }

  async upsertLocalizedText(
    id: string,
    data: Omit<UniversityLocalizedTextDto, 'id' | 'universityId' | 'createdAt' | 'updatedAt'>,
  ): Promise<UniversityLocalizedTextDto> {
    await this.assertLocalizedTextTargetOwnedByUniversity(id, data.targetType, data.targetId);
    await this.assertSourceRecordOwnedByUniversity(id, data.sourceRecordId);
    const identity = {
      universityId: id,
      targetType: data.targetType,
      targetId: data.targetId,
      fieldKey: data.fieldKey,
      locale: data.locale,
    };
    const record = await this.prisma.universityLocalizedText.upsert({
      where: { universityId_targetType_targetId_fieldKey_locale: identity },
      create: {
        ...identity,
        value: data.value,
        reviewStatus: data.reviewStatus ?? 'NEEDS_REVIEW',
        sourceRecordId: data.sourceRecordId,
        metadata: data.metadata as Prisma.InputJsonObject | undefined,
      },
      update: {
        value: data.value,
        reviewStatus: data.reviewStatus,
        sourceRecordId: data.sourceRecordId,
        metadata: data.metadata as Prisma.InputJsonObject | undefined,
      },
    });
    return {
      id: record.id,
      universityId: record.universityId,
      targetType: parseUniversityLocalizedTextTargetType(record.targetType),
      targetId: record.targetId,
      fieldKey: record.fieldKey,
      locale: record.locale,
      value: record.value,
      reviewStatus: parseUniversityTranslationReviewStatus(record.reviewStatus),
      sourceRecordId: record.sourceRecordId,
      metadata: asMetadata(record.metadata),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  async upsertAcademicProgram(
    universityId: string,
    programId: string | null,
    input: UniversityAcademicProgramAuthoringInput,
  ): Promise<UniversityDto> {
    await this.prisma.university.findUniqueOrThrow({ where: { id: universityId }, select: { id: true } });
    await new UniversityCanonicalRelationshipValidator(this.prisma).validateProgramAuthoring(universityId, input);

    if (programId) {
      const existing = await this.prisma.universityAcademicProgram.findFirst({
        where: { id: programId, universityId },
        select: { id: true, sourceReferenceId: true, status: true },
      });
      if (!existing) throw new Error('UNIVERSITY_ACADEMIC_PROGRAM_NOT_FOUND');
      if (existing.status === 'ARCHIVED') throw new Error('UNIVERSITY_PROGRAM_ARCHIVED_IMMUTABLE');
      if (existing.sourceReferenceId && input.sourceReferenceId !== existing.sourceReferenceId)
        throw new Error('UNIVERSITY_PROGRAM_SOURCE_ID_IMMUTABLE');
    }

    const normalizedName = input.sourceProgramName.trim().toLocaleLowerCase();
    const duplicate = await this.prisma.universityAcademicProgram.findFirst({
      where: { universityId, normalizedName, degreeLevelId: input.degreeLevelId,
        organizationUnitId: input.organizationUnitId ?? null, status: { not: 'ARCHIVED' },
        ...(programId ? { id: { not: programId } } : {}) },
      select: { id: true },
    });
    if (duplicate) throw new Error('UNIVERSITY_ACADEMIC_PROGRAM_DUPLICATE');
    if (input.sourceReferenceId && !programId) {
      const sourceDuplicate = await this.prisma.universityAcademicProgram.findFirst({
        where: { universityId, sourceReferenceId: input.sourceReferenceId },
        select: { id: true },
      });
      if (sourceDuplicate) throw new Error('UNIVERSITY_ACADEMIC_PROGRAM_SOURCE_DUPLICATE');
    }
    const data = {
      sourceReferenceId: input.sourceReferenceId ?? null,
      organizationUnitId: input.organizationUnitId ?? null,
      sourceProgramName: input.sourceProgramName.trim(),
      normalizedName,
      degreeLevelId: input.degreeLevelId,
      majorId: input.majorId ?? null,
      majorMappingState: input.majorMappingState,
      status: input.status ?? 'DRAFT',
      metadata: (input.metadata ?? undefined) as Prisma.InputJsonObject | undefined,
    };

    const program = programId
      ? await this.prisma.universityAcademicProgram.update({ where: { id: programId }, data })
      : await this.prisma.universityAcademicProgram.create({ data: { universityId, ...data } as Prisma.UniversityAcademicProgramUncheckedCreateInput });

    await this.prisma.universityProgramCampus.deleteMany({ where: { academicProgramId: program.id } });
    const campusIds = [...new Set(input.campusIds ?? [])];
    if (campusIds.length) {
      await this.prisma.universityProgramCampus.createMany({
        data: campusIds.map((campusId) => ({ academicProgramId: program.id, campusId })),
        skipDuplicates: true,
      });
    }

    await this.prisma.universityProgramAdmissionRequirement.deleteMany({ where: { academicProgramId: program.id } });
    for (const requirement of input.admissionRequirements ?? []) {
      await this.prisma.universityProgramAdmissionRequirement.create({
        data: {
          academicProgramId: program.id,
          internationalTestId: requirement.internationalTestId,
          testVariantId: requirement.testVariantId ?? undefined,
          testVersionId: requirement.testVersionId ?? undefined,
          minimumScore: requirement.minimumScore ?? undefined,
          sectionScores: (requirement.sectionScores ?? undefined) as Prisma.InputJsonObject | undefined,
          validityMetadata: (requirement.validityMetadata ?? undefined) as Prisma.InputJsonObject | undefined,
          restrictionMetadata: (requirement.restrictionMetadata ?? undefined) as Prisma.InputJsonObject | undefined,
          status: requirement.status ?? 'REVIEW_REQUIRED',
        },
      });
    }

    const updated = await this.prisma.university.findUniqueOrThrow({
      where: { id: universityId },
      include: universityDetails,
    });
    return this.mapToDto(updated);
  }

  async archiveAcademicProgram(universityId: string, programId: string): Promise<UniversityDto> {
    const existing = await this.prisma.universityAcademicProgram.findFirst({
      where: { id: programId, universityId },
      select: { id: true },
    });
    if (!existing) throw new Error('UNIVERSITY_ACADEMIC_PROGRAM_NOT_FOUND');
    await this.prisma.universityAcademicProgram.update({
      where: { id: programId },
      data: { status: 'ARCHIVED' },
    });
    const updated = await this.prisma.university.findUniqueOrThrow({
      where: { id: universityId },
      include: universityDetails,
    });
    return this.mapToDto(updated);
  }

  async replaceNormalizedDetails(
    id: string,
    details: UniversityNormalizedDetailsUpdate,
  ): Promise<UniversityDto> {
    await this.prisma.university.findUniqueOrThrow({ where: { id }, select: { id: true } });
    for (const [kind, rows] of [['CAMPUS', details.campuses], ['ORGANIZATION_UNIT', details.organizationUnits]] as const) {
      for (const row of rows ?? []) {
        if (row.status && !['ACTIVE','ARCHIVED'].includes(row.status)) throw new Error('UNIVERSITY_STRUCTURE_STATUS_INVALID');
        if (row.status !== 'ARCHIVED') continue;
        const where = {universityId:id,...(row.id ? {id:row.id} : {sourceReferenceId:row.sourceReferenceId ?? ''})};
        const existing = kind === 'CAMPUS'
          ? await this.prisma.universityCampus.findFirst({where,select:{id:true}})
          : await this.prisma.universityOrganizationUnit.findFirst({where,select:{id:true}});
        if (!existing) throw new Error('UNIVERSITY_DETAIL_OWNERSHIP_MISMATCH');
        const used = kind === 'CAMPUS'
          ? await this.prisma.universityProgramCampus.count({where:{campusId:existing.id}}) + await this.prisma.universityOrganizationUnit.count({where:{campusId:existing.id}})
          : await this.prisma.universityAcademicProgram.count({where:{organizationUnitId:existing.id}}) + await this.prisma.universityOrganizationUnit.count({where:{parentOrganizationUnitId:existing.id}});
        if (used) throw new Error('UNIVERSITY_STRUCTURE_HAS_DEPENDENTS');
      }
    }
    await new UniversityCanonicalRelationshipValidator(this.prisma).validate(details);

    // A section write is an upsert, never a destructive replacement of unmentioned children.
    // Archived programs retain their canonical IDs and external references.

    const retainedCampuses = await this.prisma.universityCampus.findMany({
      where: { universityId: id },
      select: { id: true, sourceReferenceId: true },
    });
    const campusIds = new Map<string, string>();
    for (const campus of retainedCampuses) {
      campusIds.set(campus.id, campus.id);
      if (campus.sourceReferenceId) campusIds.set(campus.sourceReferenceId, campus.id);
    }
    for (const campus of details.campuses ?? []) {
      const { id: rowId } = campus;
      const match = !rowId && campus.sourceReferenceId
        ? await this.prisma.universityCampus.findFirst({ where: { universityId: id, sourceReferenceId: campus.sourceReferenceId }, select: { id: true } })
        : null;
      const targetId = rowId ?? match?.id;
      if (rowId && !(await this.prisma.universityCampus.findFirst({ where: { id: rowId, universityId: id }, select: { id: true } }))) throw new Error('UNIVERSITY_DETAIL_OWNERSHIP_MISMATCH');
      const data = {
          universityId: id,
          sourceReferenceId: campus.sourceReferenceId,
          name: campus.name,
          campusType: campus.campusType,
          status: campus.status ?? 'ACTIVE',
          address: campus.address,
          countryReferenceId: campus.countryReferenceId,
          regionReferenceId: campus.regionReferenceId,
          cityReferenceId: campus.cityReferenceId,
          latitude: campus.latitude,
          longitude: campus.longitude,
          coordinateSource: campus.coordinateSource,
          metadata: campus.metadata as Prisma.InputJsonObject | undefined,
        };
      const created = targetId
        ? await this.prisma.universityCampus.update({ where: { id: targetId }, data })
        : await this.prisma.universityCampus.create({ data });
      if (campus.sourceReferenceId) campusIds.set(campus.sourceReferenceId, created.id);
      campusIds.set(created.id, created.id);
    }

    const retainedUnits = await this.prisma.universityOrganizationUnit.findMany({
      where: { universityId: id },
      select: { id: true, sourceReferenceId: true },
    });
    const unitIds = new Map<string, string>();
    for (const unit of retainedUnits) {
      unitIds.set(unit.id, unit.id);
      if (unit.sourceReferenceId) unitIds.set(unit.sourceReferenceId, unit.id);
    }
    for (const unit of details.organizationUnits ?? []) {
      const match = !unit.id && unit.sourceReferenceId
        ? await this.prisma.universityOrganizationUnit.findFirst({ where: { universityId: id, sourceReferenceId: unit.sourceReferenceId }, select: { id: true } })
        : null;
      const campusId = unit.campusSourceReferenceId
        ? campusIds.get(unit.campusSourceReferenceId)
        : undefined;
      if (unit.campusSourceReferenceId && !campusId)
        throw new Error(`UNIVERSITY_CAMPUS_REFERENCE_NOT_FOUND:${unit.campusSourceReferenceId}`);
      if (campusId && !await this.prisma.universityCampus.findFirst({where:{id:campusId,universityId:id,status:'ACTIVE'},select:{id:true}})) throw new Error('UNIVERSITY_ORGANIZATION_CAMPUS_NOT_ACTIVE');
      const { id: rowId } = unit;
      const targetId = rowId ?? match?.id;
      if (rowId && !(await this.prisma.universityOrganizationUnit.findFirst({ where: { id: rowId, universityId: id }, select: { id: true } }))) throw new Error('UNIVERSITY_DETAIL_OWNERSHIP_MISMATCH');
      const data = {
          universityId: id,
          sourceReferenceId: unit.sourceReferenceId,
          campusId: unit.campusSourceReferenceId === undefined ? undefined : (campusId ?? null),
          unitType: unit.unitType,
          name: unit.name,
          normalizedName: unit.name.trim().toLocaleLowerCase(),
          status: unit.status ?? 'ACTIVE',
          parentOrganizationUnitId: unit.parentSourceReferenceId === undefined ? undefined : null,
          metadata: unit.metadata as Prisma.InputJsonObject | undefined,
        };
      const created = targetId
        ? await this.prisma.universityOrganizationUnit.update({ where: { id: targetId }, data })
        : await this.prisma.universityOrganizationUnit.create({ data });
      if (unit.sourceReferenceId) unitIds.set(unit.sourceReferenceId, created.id);
      unitIds.set(created.id, created.id);
    }
    for (const unit of details.organizationUnits ?? []) {
      if (!unit.parentSourceReferenceId) continue;
      const unitKey = unit.id ?? unit.sourceReferenceId;
      const unitId = unitKey ? unitIds.get(unitKey) : undefined;
      const parentId = unitIds.get(unit.parentSourceReferenceId);
      if (!unitId || !parentId) throw new Error('UNIVERSITY_ORGANIZATION_REFERENCE_NOT_FOUND');
      await this.prisma.universityOrganizationUnit.update({
        where: { id: unitId },
        data: { parentOrganizationUnitId: parentId },
      });
    }

    if (details.organizationUnits !== undefined) {
      const nodes = await this.prisma.universityOrganizationUnit.findMany({
        where: { universityId: id },
        select: { id: true, parentOrganizationUnitId: true, campusId: true, unitType: true, status: true },
      });
      const owners = new Map(nodes.map((node) => [node.id, node]));
      for (const node of nodes) {
        const seen = new Set<string>([node.id]);
        let cursor = node;
        while (cursor.parentOrganizationUnitId) {
          const parent = owners.get(cursor.parentOrganizationUnitId);
          if (!parent) throw new Error('UNIVERSITY_ORGANIZATION_CROSS_OWNER_PARENT');
          if (seen.has(parent.id)) throw new Error('UNIVERSITY_ORGANIZATION_HIERARCHY_CYCLE');
          if (parent.status === 'ARCHIVED') throw new Error('UNIVERSITY_ORGANIZATION_PARENT_NOT_ACTIVE');
          if (parent.unitType === 'DEPARTMENT') throw new Error('UNIVERSITY_DEPARTMENT_CANNOT_BE_PARENT');
          if (cursor.campusId && parent.campusId && cursor.campusId !== parent.campusId)
            throw new Error('UNIVERSITY_ORGANIZATION_CAMPUS_MISMATCH');
          seen.add(parent.id);
          cursor = parent;
        }
      }
    }

    for (const program of details.academicPrograms ?? []) {
      if (!program.sourceReferenceId) throw new Error('UNIVERSITY_PROGRAM_STABLE_SOURCE_ID_REQUIRED');
      const organizationUnitId = program.organizationUnitSourceReferenceId
        ? unitIds.get(program.organizationUnitSourceReferenceId)
        : undefined;
      if (program.organizationUnitSourceReferenceId && !organizationUnitId)
        throw new Error(`UNIVERSITY_ORGANIZATION_REFERENCE_NOT_FOUND:${program.organizationUnitSourceReferenceId}`);
      const prior = await this.prisma.universityAcademicProgram.findFirst({
        where: { universityId: id, sourceReferenceId: program.sourceReferenceId }, select: { id: true },
      });
      const programData = {
          universityId: id,
          sourceReferenceId: program.sourceReferenceId,
          organizationUnitId,
          sourceProgramName: program.sourceProgramName,
          normalizedName: program.sourceProgramName.trim().toLocaleLowerCase(),
          degreeLevelId: program.degreeLevelId,
          majorId: program.majorId,
          majorMappingState: program.majorMappingState,
          status: program.status ?? 'DRAFT',
          metadata: program.metadata as Prisma.InputJsonObject | undefined,
      };
      const created = prior
        ? await this.prisma.universityAcademicProgram.update({ where: { id: prior.id }, data: programData })
        : await this.prisma.universityAcademicProgram.create({
            data: programData as Prisma.UniversityAcademicProgramUncheckedCreateInput,
          });
      if (prior) {
        await this.prisma.universityProgramCampus.deleteMany({ where: { academicProgramId: created.id } });
        await this.prisma.universityProgramAdmissionRequirement.deleteMany({ where: { academicProgramId: created.id } });
      }
      for (const campusReference of program.campusSourceReferenceIds ?? []) {
        const campusId = campusIds.get(campusReference);
        if (!campusId) throw new Error(`UNIVERSITY_CAMPUS_REFERENCE_NOT_FOUND:${campusReference}`);
        await this.prisma.universityProgramCampus.create({
          data: { academicProgramId: created.id, campusId },
        });
      }
      for (const requirement of program.admissionRequirements ?? []) {
        await this.prisma.universityProgramAdmissionRequirement.create({
          data: {
            academicProgramId: created.id,
            internationalTestId: requirement.internationalTestId,
            testVariantId: requirement.testVariantId,
            testVersionId: requirement.testVersionId,
            minimumScore: requirement.minimumScore,
            sectionScores: requirement.sectionScores as Prisma.InputJsonObject | undefined,
            validityMetadata: requirement.validityMetadata as Prisma.InputJsonObject | undefined,
            restrictionMetadata: requirement.restrictionMetadata as
              Prisma.InputJsonObject | undefined,
            status: requirement.status ?? 'REVIEW_REQUIRED',
          },
        });
      }
    }

    for (const row of details.tuitionProfiles ?? []) {
      if (!row.id) continue;
      if (!(await this.prisma.universityTuitionProfile.findFirst({ where: { id: row.id, universityId: id }, select: { id: true } }))) throw new Error('UNIVERSITY_DETAIL_OWNERSHIP_MISMATCH');
      const { id: rowId, ...fields } = row;
      await this.prisma.universityTuitionProfile.update({ where: { id: rowId }, data: { ...fields, metadata: fields.metadata as Prisma.InputJsonObject | undefined } });
    }
    if (details.tuitionProfiles?.length)
      await this.prisma.universityTuitionProfile.createMany({
        data: details.tuitionProfiles.filter((row) => !row.id).map(
          (item) =>
            ({
              universityId: id,
              profileType: item.profileType,
              organizationUnitName: item.organizationUnitName,
              amount: item.amount,
              currencyCode: item.currencyCode,
              currencyReferenceId: item.currencyReferenceId,
              officialSourceUrl: item.officialSourceUrl,
              effectiveFrom: item.effectiveFrom,
              effectiveTo: item.effectiveTo,
              metadata: item.metadata as Prisma.InputJsonObject | undefined,
            }) as Prisma.UniversityTuitionProfileUncheckedCreateInput,
        ),
      });
    for (const row of details.accommodationProfiles ?? []) {
      if (!row.id) continue;
      if (!(await this.prisma.universityAccommodationProfile.findFirst({ where: { id: row.id, universityId: id }, select: { id: true } }))) throw new Error('UNIVERSITY_DETAIL_OWNERSHIP_MISMATCH');
      const { id: rowId, ...fields } = row;
      await this.prisma.universityAccommodationProfile.update({ where: { id: rowId }, data: { ...fields, metadata: fields.metadata as Prisma.InputJsonObject | undefined } });
    }
    if (details.accommodationProfiles?.length)
      await this.prisma.universityAccommodationProfile.createMany({
        data: details.accommodationProfiles.filter((row) => !row.id).map((item) => ({
          universityId: id,
          ...item,
          metadata: item.metadata as Prisma.InputJsonObject | undefined,
        })),
      });
    for (const row of details.rankings ?? []) {
      if (!row.id) continue;
      if (!(await this.prisma.universityRanking.findFirst({ where: { id: row.id, universityId: id }, select: { id: true } }))) throw new Error('UNIVERSITY_DETAIL_OWNERSHIP_MISMATCH');
      const { id: rowId, ...fields } = row;
      await this.prisma.universityRanking.update({ where: { id: rowId }, data: { ...fields } });
    }
    if (details.rankings?.length)
      await this.prisma.universityRanking.createMany({
        data: details.rankings.filter((row) => !row.id).map((item) => ({ universityId: id, ...item })),
      });

    const updated = await this.prisma.university.findUniqueOrThrow({
      where: { id },
      include: universityDetails,
    });
    return this.mapToDto(updated);
  }

  private mapToDto(record: UniversityRecord): UniversityDto {
    const { optionalFields, translations = [], localizedTexts = [], ...rest } = record;
    const safeOptionalFields = sanitizeUniversityOptionalFields(optionalFields);
    const localizedNames = Object.fromEntries(
      translations
        .filter((translation) => translation.reviewStatus === 'PUBLISHED' && universityTranslationSourceStatus(record, translation) === 'CURRENT' && Boolean(translation.displayName))
        .map((translation) => [translation.locale, translation.displayName as string]),
    );
    return {
      ...safeOptionalFields,
      ...rest,
      academicPrograms: (rest.academicPrograms ?? []).map((program) => ({
        id: program.id,
        universityId: program.universityId,
        organizationUnitId: program.organizationUnitId,
        sourceReferenceId: program.sourceReferenceId,
        sourceProgramName: program.sourceProgramName,
        normalizedName: program.normalizedName,
        degreeLevelId: program.degreeLevelId,
        degreeLevel: program.degreeLevel,
        majorId: program.majorId,
        major: program.major ? {
          status: program.major.status,
          levelProfiles: program.major.levelProfiles.map((profile) => ({
            id: profile.id,
            currentPublishedVersion: profile.currentPublishedVersion,
            degreeLevelId: profile.degreeLevelId,
            status: profile.status,
            currentPublishedVersionId: profile.currentPublishedVersionId,
          })),
        } : null,
        majorMappingState: program.majorMappingState,
        status: program.status,
        campusIds: (program.campuses ?? []).map((link) => link.campusId),
        admissionRequirements: (program.admissionRequirements ?? []).map((requirement) => ({
          id: requirement.id,
          academicProgramId: requirement.academicProgramId,
          internationalTestId: requirement.internationalTestId,
          internationalTest: requirement.internationalTest,
          testVariant: requirement.testVariant,
          testVersion: requirement.testVersion,
          testVariantId: requirement.testVariantId,
          testVersionId: requirement.testVersionId,
          minimumScore: requirement.minimumScore,
          sectionScores: asMetadata(requirement.sectionScores),
          validityMetadata: asMetadata(requirement.validityMetadata),
          restrictionMetadata: asMetadata(requirement.restrictionMetadata),
          status: requirement.status,
        })),
        metadata: asMetadata(program.metadata) ?? null,
      })),
      status: rest.status as UniversityStatus,
      completenessStatus: rest.completenessStatus as UniversityDto['completenessStatus'],
      localizedNames,
      translations: translations.map((translation) => ({
        id: translation.id,
        universityId: translation.universityId,
        locale: translation.locale,
        displayName: translation.displayName,
        description: translation.description,
        reviewStatus: parseUniversityTranslationReviewStatus(translation.reviewStatus),
        publicationSourceStatus: universityTranslationSourceStatus(record, translation),
        sourceRecordId: translation.sourceRecordId,
        metadata: asMetadata(translation.metadata),
        createdAt: translation.createdAt,
        updatedAt: translation.updatedAt,
      })),
      localizedTexts: localizedTexts.map((text) => ({
        id: text.id,
        universityId: text.universityId,
        targetType: parseUniversityLocalizedTextTargetType(text.targetType),
        targetId: text.targetId,
        fieldKey: text.fieldKey,
        locale: text.locale,
        value: text.value,
        reviewStatus: parseUniversityTranslationReviewStatus(text.reviewStatus),
        sourceRecordId: text.sourceRecordId,
        metadata: asMetadata(text.metadata),
        createdAt: text.createdAt,
        updatedAt: text.updatedAt,
      })),
      optionalFields: safeOptionalFields,
      revision: record.updatedAt.getTime(),
    } as unknown as UniversityDto;
  }

  async readStageGeography(id: string) {
    const record = await this.prisma.university.findUnique({where:{id},select:{countryReference:{select:{region:true,subregion:true}}}});
    return record?.countryReference ?? undefined;
  }

  private async assertSourceRecordOwnedByUniversity(
    universityId: string,
    sourceRecordId: string | null | undefined,
  ): Promise<void> {
    if (!sourceRecordId) return;
    const count = await this.prisma.universitySourceRecord.count({
      where: { id: sourceRecordId, universityId },
    });
    if (count !== 1) throw new Error('UNIVERSITY_TRANSLATION_SOURCE_RECORD_OWNERSHIP_MISMATCH');
  }

  private async assertLocalizedTextTargetOwnedByUniversity(
    universityId: string,
    targetType: UniversityLocalizedTextTargetType,
    targetId: string,
  ): Promise<void> {
    const delegates: Record<
      UniversityLocalizedTextTargetType,
      { count(args: { where: { id: string; universityId: string } }): Promise<number> }
    > = {
      CAMPUS: this.prisma.universityCampus,
      ORGANIZATION_UNIT: this.prisma.universityOrganizationUnit,
      ACADEMIC_PROGRAM: this.prisma.universityAcademicProgram,
      TUITION_PROFILE: this.prisma.universityTuitionProfile,
      ACCOMMODATION_PROFILE: this.prisma.universityAccommodationProfile,
      RANKING: this.prisma.universityRanking,
    };
    const count = await delegates[targetType].count({ where: { id: targetId, universityId } });
    if (count !== 1) throw new Error('UNIVERSITY_LOCALIZED_TEXT_TARGET_OWNERSHIP_MISMATCH');
  }
}

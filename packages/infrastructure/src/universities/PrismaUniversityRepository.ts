import { Prisma, PrismaClient } from '@prisma/client';
import {
  AtomicPersistenceContext,
  ITransactionalUniversityRepository,
  IUniversityRepository,
  PaginatedUniversityResult,
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
} from '@manaratak/domain';
import { UniversityCanonicalRelationshipValidator } from './UniversityCanonicalRelationshipValidator';

import { queryStableCursorPage } from '../api-foundation/StableCursor';

const universityDetails = {
  campuses: true,
  organizationUnits: true,
  academicPrograms: { include: { campuses: true, admissionRequirements: true } },
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
  ) {}

  withTransaction(context: AtomicPersistenceContext): IUniversityRepository {
    const transactionClient = (context as Partial<UniversityTransactionContext>).transactionClient;
    if (!context.boundaryId || !transactionClient)
      throw new Error('UNIVERSITY_ATOMIC_TRANSACTION_CONTEXT_REQUIRED');
    return new PrismaUniversityRepository(
      transactionClient as unknown as PrismaClient,
      this.legacyCountryTextFiltersEnabled,
    );
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
      countryReferenceId: countryReferenceId === undefined ? existing?.countryReferenceId ?? undefined : countryReferenceId ?? undefined,
      regionReferenceId: regionReferenceId === undefined ? existing?.regionReferenceId ?? undefined : regionReferenceId ?? undefined,
      cityReferenceId: cityReferenceId === undefined ? existing?.cityReferenceId ?? undefined : cityReferenceId ?? undefined,
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
    if (filters.countryReferenceId) where.countryReferenceId = filters.countryReferenceId;
    else if (filters.country && this.legacyCountryTextFiltersEnabled) where.country = filters.country;
    if (filters.regionReferenceId) where.regionReferenceId = filters.regionReferenceId;
    if (filters.cityReferenceId) where.cityReferenceId = filters.cityReferenceId;
    if (filters.institutionType) where.institutionType = filters.institutionType;
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
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.university.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
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
      data: rows.map(row => ({
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
        mappedMajorCount: row.programs.filter(program => program.status !== 'INACTIVE' && program.status !== 'ARCHIVED' && Boolean(program.majorId) && program.majorMappingState === 'CANONICALLY_MAPPED').length,
        unresolvedMajorCount: row.programs.filter(program => program.status !== 'INACTIVE' && program.status !== 'ARCHIVED' && (!program.majorId || program.majorMappingState !== 'CANONICALLY_MAPPED')).length,
        activeProgramCount: row.programs.filter(program => program.status === 'ACTIVE').length,
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
    const where: Prisma.UniversityWhereInput = { status: UniversityStatus.PUBLISHED };
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

  async findPublishedByPublicIds(publicIds: string[]): Promise<UniversityDto[]> {
    if (!publicIds.length) return [];
    const rows = await this.prisma.university.findMany({
      where: { publicId: { in: [...new Set(publicIds)] }, status: UniversityStatus.PUBLISHED },
      include: universityDetails,
    });
    return rows.map((row) => this.mapToDto(row));
  }

  async findPublishedByIds(ids: string[]): Promise<UniversityDto[]> {
    if (!ids.length) return [];
    const rows = await this.prisma.university.findMany({
      where: { id: { in: [...new Set(ids)] }, status: UniversityStatus.PUBLISHED },
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
        university: { is: { status: UniversityStatus.PUBLISHED } },
      },
      select: {
        id: true,
        sourceProgramName: true,
        degreeLevelId: true,
        majorId: true,
        majorMappingState: true,
        status: true,
        university: {
          select: { id: true, publicId: true, slug: true, displayName: true },
        },
      },
    });
    return rows.map((row) => ({
      ownerId: row.id,
      universityOwnerId: row.university.id,
      universityPublicId: row.university.publicId,
      universitySlug: row.university.slug,
      universityDisplayName: row.university.displayName,
      sourceProgramName: row.sourceProgramName,
      degreeLevelId: row.degreeLevelId,
      majorId: row.majorId,
      majorMappingState: row.majorMappingState,
      status: row.status,
    }));
  }

  async listTranslations(id: string): Promise<UniversityTranslationDto[]> {
    await this.prisma.university.findUniqueOrThrow({ where: { id }, select: { id: true } });
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
    await this.prisma.university.findUniqueOrThrow({ where: { id }, select: { id: true } });
    await this.assertSourceRecordOwnedByUniversity(id, data.sourceRecordId);
    const record = await this.prisma.universityTranslation.upsert({
      where: { universityId_locale: { universityId: id, locale: data.locale } },
      create: {
        universityId: id,
        locale: data.locale,
        displayName: data.displayName,
        description: data.description,
        reviewStatus: data.reviewStatus ?? 'NEEDS_REVIEW',
        sourceRecordId: data.sourceRecordId,
        metadata: data.metadata as Prisma.InputJsonObject | undefined,
      },
      update: {
        displayName: data.displayName,
        description: data.description,
        reviewStatus: data.reviewStatus,
        sourceRecordId: data.sourceRecordId,
        metadata: data.metadata as Prisma.InputJsonObject | undefined,
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
        select: { id: true },
      });
      if (!existing) throw new Error('UNIVERSITY_ACADEMIC_PROGRAM_NOT_FOUND');
    }

    const normalizedName = input.sourceProgramName.trim().toLocaleLowerCase();
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
    await new UniversityCanonicalRelationshipValidator(this.prisma).validate(details);
    if (details.campuses !== undefined && details.academicPrograms === undefined) {
      throw new Error('UNIVERSITY_PROGRAMS_REQUIRED_WHEN_REPLACING_CAMPUSES');
    }
    if (details.organizationUnits !== undefined && details.academicPrograms === undefined) {
      throw new Error('UNIVERSITY_PROGRAMS_REQUIRED_WHEN_REPLACING_ORGANIZATION_UNITS');
    }

    if (details.academicPrograms !== undefined)
      await this.prisma.universityAcademicProgram.deleteMany({ where: { universityId: id } });
    if (details.organizationUnits !== undefined)
      await this.prisma.universityOrganizationUnit.deleteMany({ where: { universityId: id } });
    if (details.campuses !== undefined)
      await this.prisma.universityCampus.deleteMany({ where: { universityId: id } });
    if (details.tuitionProfiles !== undefined)
      await this.prisma.universityTuitionProfile.deleteMany({ where: { universityId: id } });
    if (details.accommodationProfiles !== undefined)
      await this.prisma.universityAccommodationProfile.deleteMany({ where: { universityId: id } });
    if (details.rankings !== undefined)
      await this.prisma.universityRanking.deleteMany({ where: { universityId: id } });

    const retainedCampuses =
      details.campuses === undefined
        ? await this.prisma.universityCampus.findMany({
            where: { universityId: id },
            select: { id: true, sourceReferenceId: true },
          })
        : [];
    const campusIds = new Map<string, string>(
      retainedCampuses
        .filter((campus): campus is { id: string; sourceReferenceId: string } =>
          Boolean(campus.sourceReferenceId),
        )
        .map((campus) => [campus.sourceReferenceId, campus.id]),
    );
    for (const campus of details.campuses ?? []) {
      const created = await this.prisma.universityCampus.create({
        data: {
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
        },
      });
      if (campus.sourceReferenceId) campusIds.set(campus.sourceReferenceId, created.id);
    }

    const retainedUnits =
      details.organizationUnits === undefined
        ? await this.prisma.universityOrganizationUnit.findMany({
            where: { universityId: id },
            select: { id: true, sourceReferenceId: true },
          })
        : [];
    const unitIds = new Map<string, string>(
      retainedUnits
        .filter((unit): unit is { id: string; sourceReferenceId: string } =>
          Boolean(unit.sourceReferenceId),
        )
        .map((unit) => [unit.sourceReferenceId, unit.id]),
    );
    for (const unit of details.organizationUnits ?? []) {
      const campusId = unit.campusSourceReferenceId
        ? campusIds.get(unit.campusSourceReferenceId)
        : undefined;
      if (unit.campusSourceReferenceId && !campusId)
        throw new Error(`UNIVERSITY_CAMPUS_REFERENCE_NOT_FOUND:${unit.campusSourceReferenceId}`);
      const created = await this.prisma.universityOrganizationUnit.create({
        data: {
          universityId: id,
          sourceReferenceId: unit.sourceReferenceId,
          campusId,
          unitType: unit.unitType,
          name: unit.name,
          normalizedName: unit.name.trim().toLocaleLowerCase(),
          status: unit.status ?? 'ACTIVE',
          metadata: unit.metadata as Prisma.InputJsonObject | undefined,
        },
      });
      if (unit.sourceReferenceId) unitIds.set(unit.sourceReferenceId, created.id);
    }
    for (const unit of details.organizationUnits ?? []) {
      if (!unit.sourceReferenceId || !unit.parentSourceReferenceId) continue;
      const unitId = unitIds.get(unit.sourceReferenceId);
      const parentId = unitIds.get(unit.parentSourceReferenceId);
      if (!unitId || !parentId) throw new Error('UNIVERSITY_ORGANIZATION_REFERENCE_NOT_FOUND');
      await this.prisma.universityOrganizationUnit.update({
        where: { id: unitId },
        data: { parentOrganizationUnitId: parentId },
      });
    }

    for (const program of details.academicPrograms ?? []) {
      const organizationUnitId = program.organizationUnitSourceReferenceId
        ? unitIds.get(program.organizationUnitSourceReferenceId)
        : undefined;
      if (program.organizationUnitSourceReferenceId && !organizationUnitId)
        throw new Error(`UNIVERSITY_ORGANIZATION_REFERENCE_NOT_FOUND:${program.organizationUnitSourceReferenceId}`);
      const created = await this.prisma.universityAcademicProgram.create({
        data: {
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
        } as Prisma.UniversityAcademicProgramUncheckedCreateInput,
      });
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

    if (details.tuitionProfiles?.length)
      await this.prisma.universityTuitionProfile.createMany({
        data: details.tuitionProfiles.map(
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
    if (details.accommodationProfiles?.length)
      await this.prisma.universityAccommodationProfile.createMany({
        data: details.accommodationProfiles.map((item) => ({
          universityId: id,
          ...item,
          metadata: item.metadata as Prisma.InputJsonObject | undefined,
        })),
      });
    if (details.rankings?.length)
      await this.prisma.universityRanking.createMany({
        data: details.rankings.map((item) => ({ universityId: id, ...item })),
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
        .filter((translation) => Boolean(translation.displayName))
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
        majorId: program.majorId,
        majorMappingState: program.majorMappingState,
        status: program.status,
        campusIds: (program.campuses ?? []).map((link) => link.campusId),
        admissionRequirements: (program.admissionRequirements ?? []).map((requirement) => ({
          id: requirement.id,
          academicProgramId: requirement.academicProgramId,
          internationalTestId: requirement.internationalTestId,
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
    } as unknown as UniversityDto;
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

import { PrismaClient, Prisma } from '@prisma/client';
import {
  IInternationalTestRepository,
  ITransactionalInternationalTestRepository,
  AtomicPersistenceContext,
  InternationalTestDto,
  InternationalTestProviderDto,
  UpsertInternationalTestDto,
  InternationalTestFilters,
  PaginatedInternationalTestResult,
  InternationalTestVariantDto,
  UpsertInternationalTestVariantDto,
  InternationalTestSectionDto,
  UpsertInternationalTestSectionDto,
  InternationalTestScoreScaleDto,
  UpsertInternationalTestScoreScaleDto,
  InternationalTestFeeMetadataDto,
  UpsertInternationalTestFeeMetadataDto,
  InternationalTestOfficialLinkDto,
  UpsertInternationalTestOfficialLinkDto,
  InternationalTestAvailabilityDto,
  UpsertInternationalTestAvailabilityDto,
  InternationalTestPreparationMaterialDto,
  UpsertInternationalTestPreparationMaterialDto,
  InternationalTestEvidenceDto,
  InternationalTestImportDraftRequestDto,
  InternationalTestImportDraftResultDto,
  InternationalTestVersionDto,
  InternationalTestStatus,
  InternationalTestDeliveryMode,
  UpsertInternationalTestAcademicTaxonomyRelationshipDto,
  UpsertInternationalTestDegreeRelationshipReference,
  UpsertInternationalTestReferenceRelationshipDto,
} from '@manaratak/domain';
import { toOptionalPrismaJson, toRequiredPrismaJson } from '../prisma/PrismaJsonValue';

export const INTERNATIONAL_TEST_OPTIONAL_FIELDS_RESERVED_KEYS = new Set([
  'id',
  'publicId',
  'slug',
  'canonicalName',
  'canonicalDedupKey',
  'displayName',
  'status',
  'completenessStatus',
  'testCategory',
  'providerName',
  'familyId',
  'providerId',
  'currentPublishedVersionId',
  'sourceImportRecordId',
  'localizedNameAr',
  'localizedNameEn',
  'abbreviation',
  'isPubliclyVisible',
  'isSourceVerified',
  'registrationRequirements',
  'identificationRequirements',
  'retakePolicy',
  'cancellationReschedulingNotes',
  'accessibilityNotes',
  'countryRelationships',
  'languageRelationships',
  'academicTaxonomyRelationships',
  'degreeRelationships',
  'scoreScale',
  'officialLinks',
  'family',
  'provider',
  'versions',
  'createdAt',
  'updatedAt',
]);

const defaultInclude = {
  variants: true,
  sections: { orderBy: { order: 'asc' as const } },
  scoreScale: true,
  fees: true,
  officialLinks: true,
  availability: true,
  preparationMaterials: true,
  evidence: true,
  countryRelationships: true,
  languageRelationships: true,
  academicTaxonomyRelationships: true,
  degreeRelationships: true,
};

type InternationalTestVersionWithBlocks = Prisma.InternationalTestVersionGetPayload<{
  include: { contentBlocks: true };
}>;

type InternationalTestContentBlockCreateInput = {
  blockKey: string;
  blockType: string;
  title?: string;
  locale?: string;
  content: string;
  sourceSectionPath?: string;
  reviewStatus: string;
  metadata?: Record<string, unknown>;
};

interface InternationalTestTransactionContext extends AtomicPersistenceContext {
  readonly transactionClient: Prisma.TransactionClient;
}

export class PrismaInternationalTestRepository implements ITransactionalInternationalTestRepository {
  constructor(private readonly prisma: PrismaClient) {}

  withTransaction(context: AtomicPersistenceContext): IInternationalTestRepository {
    const transactionClient = (context as Partial<InternationalTestTransactionContext>)
      .transactionClient;
    if (!context.boundaryId || !transactionClient)
      throw new Error('INTERNATIONAL_TEST_ATOMIC_TRANSACTION_CONTEXT_REQUIRED');
    return new PrismaInternationalTestRepository(transactionClient as unknown as PrismaClient);
  }

  // --- Legacy & Core Methods ---

  async findById(id: string): Promise<InternationalTestDto | null> {
    const record = await this.prisma.internationalTest.findUnique({
      where: { id },
      include: defaultInclude,
    });
    if (!record) return null;

    if (!record.variants && typeof this.prisma.internationalTestVariant?.findMany === 'function') {
      record.variants = await this.prisma.internationalTestVariant.findMany({
        where: { testId: id },
      });
      record.sections =
        typeof this.prisma.internationalTestSection?.findMany === 'function'
          ? await this.prisma.internationalTestSection.findMany({ where: { testId: id } })
          : [];
      const scoreScales =
        typeof this.prisma.internationalTestScoreScale?.findMany === 'function'
          ? await this.prisma.internationalTestScoreScale.findMany({ where: { testId: id } })
          : [];
      record.scoreScale = scoreScales[0] || null;
      record.fees =
        typeof this.prisma.internationalTestFeeMetadata?.findMany === 'function'
          ? await this.prisma.internationalTestFeeMetadata.findMany({ where: { testId: id } })
          : [];
      record.officialLinks =
        typeof this.prisma.internationalTestOfficialLink?.findMany === 'function'
          ? await this.prisma.internationalTestOfficialLink.findMany({ where: { testId: id } })
          : [];
      const availabilities =
        typeof this.prisma.internationalTestAvailability?.findMany === 'function'
          ? await this.prisma.internationalTestAvailability.findMany({ where: { testId: id } })
          : [];
      record.availability = availabilities[0] || null;
      record.preparationMaterials =
        typeof this.prisma.internationalTestPreparationMaterial?.findMany === 'function'
          ? await this.prisma.internationalTestPreparationMaterial.findMany({
              where: { testId: id },
            })
          : [];
      record.evidence =
        typeof this.prisma.internationalTestEvidence?.findUnique === 'function'
          ? await this.prisma.internationalTestEvidence.findUnique({ where: { testId: id } })
          : null;
    }

    return this.mapToDto(record);
  }

  async findBySlug(slug: string): Promise<InternationalTestDto | null> {
    const record = await this.prisma.internationalTest.findUnique({
      where: { slug },
      include: defaultInclude,
    });
    if (!record) return null;

    if (!record.variants && typeof this.prisma.internationalTestVariant?.findMany === 'function') {
      record.variants = await this.prisma.internationalTestVariant.findMany({
        where: { testId: record.id },
      });
      record.sections =
        typeof this.prisma.internationalTestSection?.findMany === 'function'
          ? await this.prisma.internationalTestSection.findMany({ where: { testId: record.id } })
          : [];
      const scoreScales =
        typeof this.prisma.internationalTestScoreScale?.findMany === 'function'
          ? await this.prisma.internationalTestScoreScale.findMany({ where: { testId: record.id } })
          : [];
      record.scoreScale = scoreScales[0] || null;
      record.fees =
        typeof this.prisma.internationalTestFeeMetadata?.findMany === 'function'
          ? await this.prisma.internationalTestFeeMetadata.findMany({
              where: { testId: record.id },
            })
          : [];
      record.officialLinks =
        typeof this.prisma.internationalTestOfficialLink?.findMany === 'function'
          ? await this.prisma.internationalTestOfficialLink.findMany({
              where: { testId: record.id },
            })
          : [];
      const availabilities =
        typeof this.prisma.internationalTestAvailability?.findMany === 'function'
          ? await this.prisma.internationalTestAvailability.findMany({
              where: { testId: record.id },
            })
          : [];
      record.availability = availabilities[0] || null;
      record.preparationMaterials =
        typeof this.prisma.internationalTestPreparationMaterial?.findMany === 'function'
          ? await this.prisma.internationalTestPreparationMaterial.findMany({
              where: { testId: record.id },
            })
          : [];
      record.evidence =
        typeof this.prisma.internationalTestEvidence?.findUnique === 'function'
          ? await this.prisma.internationalTestEvidence.findUnique({ where: { testId: record.id } })
          : null;
    }

    return this.mapToDto(record);
  }

  async findPublishedBySlug(slug: string): Promise<InternationalTestDto | null> {
    const record = await this.prisma.internationalTest.findFirst({
      where: {
        slug,
        status: InternationalTestStatus.PUBLISHED,
        isPubliclyVisible: true,
      },
      include: defaultInclude,
    });
    return record ? this.mapToDto(record) : null;
  }

  async findByDedupKey(key: string): Promise<InternationalTestDto | null> {
    const record = await this.prisma.internationalTest.findUnique({
      where: { canonicalDedupKey: key },
      include: defaultInclude,
    });
    return record ? this.mapToDto(record) : null;
  }

  async create(data: any): Promise<InternationalTestDto> {
    const {
      publicId,
      slug,
      canonicalName,
      canonicalDedupKey,
      displayName,
      status,
      completenessStatus,
      testCategory,
      providerName,
      familyId,
      providerId,
      currentPublishedVersionId,
      sourceImportRecordId,
      optionalFields,
      localizedNameAr,
      localizedNameEn,
      abbreviation,
      isPubliclyVisible,
      isSourceVerified,
      registrationRequirements,
      identificationRequirements,
      retakePolicy,
      cancellationReschedulingNotes,
      accessibilityNotes,
      countryRelationships,
      languageRelationships,
      academicTaxonomyRelationships,
      degreeRelationships,
      scoreScale,
      officialLinks,
      ...rest
    } = data;

    const safeOptionalFields = this.sanitizeOptionalFields({
      ...this.sanitizeOptionalFields(optionalFields),
      ...rest,
    });

    const record = await this.prisma.internationalTest.create({
      data: {
        publicId,
        slug,
        canonicalName,
        canonicalDedupKey,
        displayName,
        status,
        completenessStatus,
        testCategory,
        providerName,
        familyId,
        providerId,
        currentPublishedVersionId,
        sourceImportRecordId,
        localizedNameAr,
        localizedNameEn,
        abbreviation,
        isPubliclyVisible: isPubliclyVisible ?? false,
        isSourceVerified: isSourceVerified ?? false,
        registrationRequirements,
        identificationRequirements,
        retakePolicy,
        cancellationReschedulingNotes,
        accessibilityNotes,
        optionalFields: toRequiredPrismaJson(safeOptionalFields),
        ...(scoreScale
          ? { scoreScale: { create: this.scoreScalePersistencePayload(scoreScale) } }
          : {}),
        ...(Array.isArray(officialLinks)
          ? {
              officialLinks: {
                create: officialLinks.map((link: any) => this.officialLinkPersistencePayload(link)),
              },
            }
          : {}),
        ...(Array.isArray(countryRelationships)
          ? {
              countryRelationships: {
                create: countryRelationships.map((relationship: any) =>
                  this.countryRelationshipPersistencePayload(relationship),
                ),
              },
            }
          : {}),
        ...(Array.isArray(languageRelationships)
          ? {
              languageRelationships: {
                create: languageRelationships.map((relationship: any) =>
                  this.languageRelationshipPersistencePayload(relationship),
                ),
              },
            }
          : {}),
        ...(Array.isArray(academicTaxonomyRelationships)
          ? {
              academicTaxonomyRelationships: {
                create: academicTaxonomyRelationships.map((relationship: any) =>
                  this.taxonomyRelationshipPersistencePayload(relationship),
                ),
              },
            }
          : {}),
        ...(Array.isArray(degreeRelationships)
          ? {
              degreeRelationships: {
                create: degreeRelationships.map((relationship: any) =>
                  this.degreeRelationshipPersistencePayload(relationship),
                ),
              },
            }
          : {}),
      } as any,
      include: defaultInclude,
    });
    return this.mapToDto(record);
  }

  async update(id: string, updates: any): Promise<InternationalTestDto> {
    const {
      id: _id,
      createdAt,
      updatedAt,
      publicId,
      slug,
      canonicalName,
      canonicalDedupKey,
      displayName,
      status,
      completenessStatus,
      testCategory,
      providerName,
      familyId,
      providerId,
      currentPublishedVersionId,
      sourceImportRecordId,
      optionalFields,
      localizedNameAr,
      localizedNameEn,
      abbreviation,
      isPubliclyVisible,
      isSourceVerified,
      registrationRequirements,
      identificationRequirements,
      retakePolicy,
      cancellationReschedulingNotes,
      accessibilityNotes,
      countryRelationships,
      languageRelationships,
      academicTaxonomyRelationships,
      degreeRelationships,
      scoreScale,
      officialLinks,
      ...rest
    } = updates;

    const existing = await this.prisma.internationalTest.findUnique({ where: { id } });
    const existingOptional = this.sanitizeOptionalFields(existing?.optionalFields);
    const safeOptionalFields = this.sanitizeOptionalFields({
      ...existingOptional,
      ...this.sanitizeOptionalFields(optionalFields),
      ...rest,
    });

    const record = await this.prisma.internationalTest.update({
      where: { id },
      data: {
        displayName: displayName !== undefined ? displayName : undefined,
        status: status !== undefined ? status : undefined,
        completenessStatus: completenessStatus !== undefined ? completenessStatus : undefined,
        testCategory: testCategory !== undefined ? testCategory : undefined,
        providerName: providerName !== undefined ? providerName : undefined,
        familyId: familyId !== undefined ? familyId : undefined,
        providerId: providerId !== undefined ? providerId : undefined,
        currentPublishedVersionId:
          currentPublishedVersionId !== undefined ? currentPublishedVersionId : undefined,
        sourceImportRecordId: sourceImportRecordId !== undefined ? sourceImportRecordId : undefined,
        localizedNameAr: localizedNameAr !== undefined ? localizedNameAr : undefined,
        localizedNameEn: localizedNameEn !== undefined ? localizedNameEn : undefined,
        abbreviation: abbreviation !== undefined ? abbreviation : undefined,
        isPubliclyVisible: isPubliclyVisible !== undefined ? isPubliclyVisible : undefined,
        isSourceVerified: isSourceVerified !== undefined ? isSourceVerified : undefined,
        registrationRequirements:
          registrationRequirements !== undefined ? registrationRequirements : undefined,
        identificationRequirements:
          identificationRequirements !== undefined ? identificationRequirements : undefined,
        retakePolicy: retakePolicy !== undefined ? retakePolicy : undefined,
        cancellationReschedulingNotes:
          cancellationReschedulingNotes !== undefined ? cancellationReschedulingNotes : undefined,
        accessibilityNotes: accessibilityNotes !== undefined ? accessibilityNotes : undefined,
        optionalFields: toRequiredPrismaJson(safeOptionalFields),
        ...(scoreScale !== undefined
          ? {
              scoreScale: {
                upsert: {
                  create: this.scoreScalePersistencePayload(scoreScale),
                  update: this.scoreScalePersistencePayload(scoreScale),
                },
              },
            }
          : {}),
        ...(officialLinks !== undefined
          ? {
              officialLinks: {
                deleteMany: {},
                create: (officialLinks || []).map((link: any) =>
                  this.officialLinkPersistencePayload(link),
                ),
              },
            }
          : {}),
        ...(countryRelationships !== undefined
          ? {
              countryRelationships: {
                deleteMany: {},
                create: (countryRelationships || []).map((relationship: any) =>
                  this.countryRelationshipPersistencePayload(relationship),
                ),
              },
            }
          : {}),
        ...(languageRelationships !== undefined
          ? {
              languageRelationships: {
                deleteMany: {},
                create: (languageRelationships || []).map((relationship: any) =>
                  this.languageRelationshipPersistencePayload(relationship),
                ),
              },
            }
          : {}),
        ...(academicTaxonomyRelationships !== undefined
          ? {
              academicTaxonomyRelationships: {
                deleteMany: {},
                create: (academicTaxonomyRelationships || []).map((relationship: any) =>
                  this.taxonomyRelationshipPersistencePayload(relationship),
                ),
              },
            }
          : {}),
        ...(degreeRelationships !== undefined
          ? {
              degreeRelationships: {
                deleteMany: {},
                create: (degreeRelationships || []).map((relationship: any) =>
                  this.degreeRelationshipPersistencePayload(relationship),
                ),
              },
            }
          : {}),
      } as any,
      include: defaultInclude,
    });
    return this.mapToDto(record);
  }

  async updateStatus(
    id: string,
    status: InternationalTestStatus | string,
  ): Promise<InternationalTestDto> {
    const record = await this.prisma.internationalTest.update({
      where: { id },
      data: { status: status as any },
      include: defaultInclude,
    });
    return this.mapToDto(record);
  }

  async list(
    filters: InternationalTestFilters,
  ): Promise<PaginatedInternationalTestResult<InternationalTestDto>> {
    const requestedPage = Number(filters?.page);
    const requestedPageSize = Number(filters?.pageSize ?? filters?.limit);
    const page = Number.isFinite(requestedPage) ? Math.max(1, Math.floor(requestedPage)) : 1;
    const pageSize = Number.isFinite(requestedPageSize)
      ? Math.min(100, Math.max(1, Math.floor(requestedPageSize)))
      : 20;

    const where: any = {};
    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        where.status = { in: filters.status };
      } else {
        where.status = filters.status;
      }
    }

    const categories = filters?.category || filters?.testCategory;
    if (categories) {
      if (Array.isArray(categories)) {
        where.testCategory = { in: categories };
      } else {
        where.testCategory = categories;
      }
    }

    if (filters?.providerName) {
      where.providerName = filters.providerName;
    }

    if (filters?.countryIso2Code) {
      where.countryRelationships = {
        some: { countryIso2Code: filters.countryIso2Code.toUpperCase() },
      };
    }

    if (filters?.completenessStatus) {
      if (Array.isArray(filters.completenessStatus)) {
        where.completenessStatus = { in: filters.completenessStatus };
      } else {
        where.completenessStatus = filters.completenessStatus;
      }
    }

    if (filters?.isPubliclyVisible !== undefined) {
      where.isPubliclyVisible = filters.isPubliclyVisible;
    }

    const search = filters?.searchQuery || filters?.q;
    if (search && typeof search === 'string' && search.trim() !== '') {
      const query = search.trim();
      where.OR = [
        { canonicalName: { contains: query, mode: 'insensitive' } },
        { providerName: { contains: query, mode: 'insensitive' } },
        { displayName: { contains: query, mode: 'insensitive' } },
        { slug: { contains: query, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.internationalTest.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: defaultInclude,
      }),
      this.prisma.internationalTest.count({ where }),
    ]);

    return {
      data: data.map((d: any) => this.mapToDto(d)),
      total,
      page,
      limit: pageSize,
    };
  }

  async listPublished(
    filters?: Omit<InternationalTestFilters, 'status'>,
  ): Promise<PaginatedInternationalTestResult<InternationalTestDto>> {
    return this.list({
      ...filters,
      status: [InternationalTestStatus.PUBLISHED],
      isPubliclyVisible: true,
    });
  }

  // --- Normalized Profile & Discovery Methods ---

  async listTests(
    filters: InternationalTestFilters,
  ): Promise<PaginatedInternationalTestResult<InternationalTestDto>> {
    return this.list(filters);
  }

  async getTest(id: string): Promise<InternationalTestDto | null> {
    return this.findById(id);
  }

  async getTestBySlug(slug: string): Promise<InternationalTestDto | null> {
    return this.findBySlug(slug);
  }

  async getTestByDeterministicKey(key: string): Promise<InternationalTestDto | null> {
    return this.findByDedupKey(key);
  }

  async upsertTest(data: UpsertInternationalTestDto | any): Promise<InternationalTestDto> {
    if (data.id) {
      const existing = await this.findById(data.id);
      if (existing) {
        return this.update(data.id, data);
      }
    }

    if (data.slug) {
      const existing = await this.findBySlug(data.slug);
      if (existing) {
        return this.update(existing.id, data);
      }
    }

    const dedupKey = data.canonicalDedupKey || data.deterministicKey;
    if (dedupKey) {
      const existing = await this.findByDedupKey(dedupKey);
      if (existing) {
        return this.update(existing.id, data);
      }
    }

    return this.create(data);
  }

  async findProviderById(providerId: string): Promise<InternationalTestProviderDto | null> {
    const record = await this.prisma.internationalTestProvider.findUnique({
      where: { id: providerId },
    });
    return record ? this.mapProviderToDto(record) : null;
  }

  async listProviders(search?: string): Promise<InternationalTestProviderDto[]> {
    const query = search?.trim();
    const records = await this.prisma.internationalTestProvider.findMany({
      where: query
        ? {
            OR: [
              { displayName: { contains: query, mode: 'insensitive' } },
              { key: { contains: query, mode: 'insensitive' } },
              { localizedNameAr: { contains: query, mode: 'insensitive' } },
              { localizedNameEn: { contains: query, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: { displayName: 'asc' },
      take: 250,
    });
    return records.map((record: any) => this.mapProviderToDto(record));
  }

  async upsertProvider(
    data: Omit<InternationalTestProviderDto, 'id'> & { id?: string },
  ): Promise<InternationalTestProviderDto> {
    const key = data.key.trim();
    const displayName = data.displayName.trim();
    if (!key || !displayName) throw new Error('INTERNATIONAL_TEST_PROVIDER_KEY_AND_NAME_REQUIRED');
    const payload = {
      key,
      displayName,
      localizedNameAr: data.localizedNameAr?.trim() || null,
      localizedNameEn: data.localizedNameEn?.trim() || null,
      providerType: data.providerType?.trim() || null,
      officialWebsite: data.officialWebsite?.trim() || null,
      countryIso2Code: data.countryIso2Code?.trim().toUpperCase() || null,
      metadata: toOptionalPrismaJson(data.metadata),
    };
    const record = data.id
      ? await this.prisma.internationalTestProvider.update({
          where: { id: data.id },
          data: payload,
        })
      : await this.prisma.internationalTestProvider.upsert({
          where: { key },
          create: payload,
          update: payload,
        });
    return this.mapProviderToDto(record);
  }

  // --- Normalized Child Domain Methods ---

  async listVariants(testId: string): Promise<InternationalTestVariantDto[]> {
    const records = await this.prisma.internationalTestVariant.findMany({ where: { testId } });
    return records.map((r: any) => this.mapVariantToDto(r));
  }

  async upsertVariant(
    testId: string,
    data: UpsertInternationalTestVariantDto & { id?: string },
  ): Promise<InternationalTestVariantDto> {
    let record: any;
    if (data.id) {
      record = await this.prisma.internationalTestVariant.update({
        where: { id: data.id },
        data: {
          variantName: data.variantName,
          deliveryMode: data.deliveryMode,
          isActive: data.isActive ?? true,
          specificOfficialUrl: data.specificOfficialUrl,
          administrativeNotes: data.administrativeNotes,
        },
      });
    } else {
      record = await this.prisma.internationalTestVariant.create({
        data: {
          testId,
          variantName: data.variantName,
          deliveryMode: data.deliveryMode,
          isActive: data.isActive ?? true,
          specificOfficialUrl: data.specificOfficialUrl,
          administrativeNotes: data.administrativeNotes,
        },
      });
    }
    return this.mapVariantToDto(record);
  }

  async listSections(testId: string): Promise<InternationalTestSectionDto[]> {
    const records = await this.prisma.internationalTestSection.findMany({
      where: { testId },
      orderBy: { order: 'asc' },
    });
    return records.map((r: any) => this.mapSectionToDto(r));
  }

  async upsertSection(
    testId: string,
    data: UpsertInternationalTestSectionDto & { id?: string },
  ): Promise<InternationalTestSectionDto> {
    let record: any;
    const questionTypesJson = toRequiredPrismaJson(data.questionTypes ?? null);
    if (data.id) {
      record = await this.prisma.internationalTestSection.update({
        where: { id: data.id },
        data: {
          sectionName: data.sectionName,
          sectionType: data.sectionType,
          durationMinutes: data.durationMinutes,
          order: data.order,
          questionTypes: questionTypesJson,
          scoreMinimum: data.scoreMinimum,
          scoreMaximum: data.scoreMaximum,
        },
      });
    } else {
      record = await this.prisma.internationalTestSection.create({
        data: {
          testId,
          sectionName: data.sectionName,
          sectionType: data.sectionType,
          durationMinutes: data.durationMinutes,
          order: data.order,
          questionTypes: questionTypesJson,
          scoreMinimum: data.scoreMinimum,
          scoreMaximum: data.scoreMaximum,
        },
      });
    }
    return this.mapSectionToDto(record);
  }

  async upsertScoreScale(
    testId: string,
    data: UpsertInternationalTestScoreScaleDto,
  ): Promise<InternationalTestScoreScaleDto> {
    const bandsOrLevelsJson = toRequiredPrismaJson(data.bandsOrLevels ?? null);
    const payload = {
      overallMinimum: data.overallMinimum,
      overallMaximum: data.overallMaximum,
      scoreIncrement: data.scoreIncrement,
      bandsOrLevels: bandsOrLevelsJson,
      passFailRules: data.passFailRules,
      cefrEquivalency: data.cefrEquivalency,
      crossTestEquivalency: data.crossTestEquivalency,
      resultValidityDurationMonths: data.resultValidityDurationMonths,
      resultDeliveryTimeDays: data.resultDeliveryTimeDays,
      scoreReportingUrl: data.scoreReportingUrl,
    };

    const record = await this.prisma.internationalTestScoreScale.upsert({
      where: { testId },
      create: { testId, ...payload },
      update: payload,
    });
    return this.mapScoreScaleToDto(record);
  }

  async upsertFeeMetadata(
    testId: string,
    data: UpsertInternationalTestFeeMetadataDto & { id?: string },
  ): Promise<InternationalTestFeeMetadataDto> {
    let record: any;
    if (data.id) {
      record = await this.prisma.internationalTestFeeMetadata.update({
        where: { id: data.id },
        data: {
          feeType: data.feeType,
          amount: data.amount,
          currencyCode: data.currencyCode,
          currencyReferenceId: data.currencyReferenceId,
          hasRegionalVariation: data.hasRegionalVariation ?? false,
          validityWindowNotes: data.validityWindowNotes,
        },
      });
    } else {
      record = await this.prisma.internationalTestFeeMetadata.create({
        data: {
          testId,
          feeType: data.feeType,
          amount: data.amount,
          currencyCode: data.currencyCode,
          currencyReferenceId: data.currencyReferenceId,
          hasRegionalVariation: data.hasRegionalVariation ?? false,
          validityWindowNotes: data.validityWindowNotes,
        },
      });
    }
    return this.mapFeeMetadataToDto(record);
  }

  async upsertOfficialLink(
    testId: string,
    data: UpsertInternationalTestOfficialLinkDto & { id?: string },
  ): Promise<InternationalTestOfficialLinkDto> {
    let record: any;
    if (data.id) {
      record = await this.prisma.internationalTestOfficialLink.update({
        where: { id: data.id },
        data: {
          linkType: data.linkType,
          url: data.url,
          description: data.description,
        },
      });
    } else {
      record = await this.prisma.internationalTestOfficialLink.create({
        data: {
          testId,
          linkType: data.linkType,
          url: data.url,
          description: data.description,
        },
      });
    }
    return this.mapOfficialLinkToDto(record);
  }

  async listAvailability(testId: string): Promise<InternationalTestAvailabilityDto | null> {
    const record = await this.prisma.internationalTestAvailability.findUnique({
      where: { testId },
    });
    return record ? this.mapAvailabilityToDto(record) : null;
  }

  async upsertAvailability(
    testId: string,
    data: UpsertInternationalTestAvailabilityDto,
  ): Promise<InternationalTestAvailabilityDto> {
    const countryIdsJson = (data.availableCountryIds || []) as any;
    const cityIdsJson = data.availableCityIds
      ? (data.availableCityIds as any)
      : ((Prisma as any).JsonNull ?? null);
    const regionsJson = data.onlineAvailabilityRegions
      ? (data.onlineAvailabilityRegions as any)
      : ((Prisma as any).JsonNull ?? null);

    const payload = {
      availableCountryIds: countryIdsJson,
      availableCityIds: cityIdsJson,
      onlineAvailabilityRegions: regionsJson,
      testingWindowsNotes: data.testingWindowsNotes,
    };

    const record = await this.prisma.internationalTestAvailability.upsert({
      where: { testId },
      create: { testId, ...payload },
      update: payload,
    });
    return this.mapAvailabilityToDto(record);
  }

  async listPreparationMaterials(
    testId: string,
  ): Promise<InternationalTestPreparationMaterialDto[]> {
    const records = await this.prisma.internationalTestPreparationMaterial.findMany({
      where: { testId },
    });
    return records.map((r: any) => this.mapPreparationMaterialToDto(r));
  }

  async upsertPreparationMaterial(
    testId: string,
    data: UpsertInternationalTestPreparationMaterialDto & { id?: string },
  ): Promise<InternationalTestPreparationMaterialDto> {
    let record: any;
    if (data.id) {
      record = await this.prisma.internationalTestPreparationMaterial.update({
        where: { id: data.id },
        data: {
          materialType: data.materialType,
          url: data.url,
          assetId: data.assetId,
          title: data.title,
          description: data.description,
        },
      });
    } else {
      record = await this.prisma.internationalTestPreparationMaterial.create({
        data: {
          testId,
          materialType: data.materialType,
          url: data.url,
          assetId: data.assetId,
          title: data.title,
          description: data.description,
        },
      });
    }
    return this.mapPreparationMaterialToDto(record);
  }

  async listEvidence(testId: string): Promise<InternationalTestEvidenceDto[]> {
    const record = await this.prisma.internationalTestEvidence.findUnique({ where: { testId } });
    return record ? [this.mapEvidenceToDto(record)] : [];
  }

  async addEvidence(
    testId: string,
    data: InternationalTestEvidenceDto,
  ): Promise<InternationalTestEvidenceDto> {
    const conflictingFieldsJson = data.conflictingFields
      ? (data.conflictingFields as any)
      : ((Prisma as any).JsonNull ?? null);
    const mergeSuggestionsJson = data.mergeSuggestions
      ? (data.mergeSuggestions as any)
      : ((Prisma as any).JsonNull ?? null);

    const payload = {
      originalImportedName: data.originalImportedName,
      normalizedCanonicalName: data.normalizedCanonicalName,
      deterministicKey: data.deterministicKey,
      sourceId: data.sourceId,
      sourceUrl: data.sourceUrl,
      contentHash: data.contentHash,
      retrievedAt: data.retrievedAt,
      evidenceSnippet: data.evidenceSnippet,
      duplicateStatus: data.duplicateStatus,
      conflictingFields: conflictingFieldsJson,
      mergeSuggestions: mergeSuggestionsJson,
      sourceTrustLevel: data.sourceTrustLevel,
    };

    const record = await this.prisma.internationalTestEvidence.upsert({
      where: { testId },
      create: { testId, ...payload },
      update: payload,
    });
    return this.mapEvidenceToDto(record);
  }

  async createImportDraftVersion(
    testId: string,
    data: InternationalTestImportDraftRequestDto,
  ): Promise<InternationalTestImportDraftResultDto> {
    const transactionFactory = (this.prisma as any).$transaction;
    if (typeof transactionFactory === 'function') {
      return transactionFactory.call(
        this.prisma,
        async (tx: Prisma.TransactionClient) =>
          new PrismaInternationalTestRepository(
            tx as unknown as PrismaClient,
          ).createImportDraftVersion(testId, data),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    }

    const queryRaw = (this.prisma as any).$queryRaw;
    if (typeof queryRaw !== 'function') {
      throw new Error('INTERNATIONAL_TEST_VERSION_TRANSACTION_BOUNDARY_REQUIRED');
    }
    const lockedRows = await queryRaw.call(
      this.prisma,
      Prisma.sql`SELECT "id" FROM "InternationalTest" WHERE "id" = ${testId} FOR UPDATE`,
    );
    if (!Array.isArray(lockedRows) || lockedRows.length === 0) {
      throw new Error(`International test with id ${testId} not found`);
    }

    const latestVersion = await this.prisma.internationalTestVersion.findFirst({
      where: { testId },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true, metadata: true },
    });
    const versionNumber = (latestVersion?.versionNumber ?? 0) + 1;
    const hasRawContent = typeof data.rawContent === 'string' && data.rawContent.trim().length > 0;
    const unmappedSections = data.unmappedSections ?? [];
    const reviewBlocks: InternationalTestContentBlockCreateInput[] = [];

    if (hasRawContent && data.rawContent) {
      reviewBlocks.push({
        blockKey: 'source.raw',
        blockType: 'RAW_SOURCE',
        title: data.sourceFileName,
        content: data.rawContent,
        sourceSectionPath: '/',
        reviewStatus: 'NEEDS_REVIEW',
        metadata: {
          preservedOriginalSource: true,
          ...(data.sourceHash ? { sourceHash: data.sourceHash } : {}),
          ...(data.sourceUri ? { sourceUri: data.sourceUri } : {}),
        },
      });
    }

    for (const [index, section] of unmappedSections.entries()) {
      if (!section.content || section.content.trim() === '') continue;
      reviewBlocks.push({
        blockKey: `unmapped.${index + 1}.${this.normalizeBlockKey(section.sectionKey)}`,
        blockType: 'UNMAPPED_SOURCE_SECTION',
        title: section.title ?? section.sectionKey,
        locale: section.locale,
        content: section.content,
        sourceSectionPath: section.sourceSectionPath,
        reviewStatus: 'NEEDS_REVIEW',
        metadata: {
          requiresMapping: true,
          detectedFieldKeys: section.detectedFieldKeys ?? [],
          ...(section.metadata ?? {}),
        },
      });
    }

    const changeSummary = {
      ...this.buildImportChangeSummary(latestVersion?.metadata, data.detectedFields),
      unmappedSectionCount: reviewBlocks.filter(
        (block) => block.blockType === 'UNMAPPED_SOURCE_SECTION',
      ).length,
      unmappedSectionsRequireReview: reviewBlocks.some(
        (block) => block.blockType === 'UNMAPPED_SOURCE_SECTION',
      ),
    };
    const rawContentBlocks = reviewBlocks.map((block) => ({
      blockKey: block.blockKey,
      blockType: block.blockType,
      ...(block.title ? { title: block.title } : {}),
      ...(block.sourceSectionPath ? { sourceSectionPath: block.sourceSectionPath } : {}),
      contentLength: block.content.length,
      reviewStatus: block.reviewStatus,
    }));

    const version = await this.prisma.internationalTestVersion.create({
      data: {
        testId,
        versionNumber,
        status: 'DRAFT',
        sourceImportRecordId: data.sourceImportRecordId,
        sourceFileName: data.sourceFileName,
        sourceLocale: data.sourceLocale,
        sourceUri: data.sourceUri,
        sourceHash: data.sourceHash,
        importedAt: new Date(),
        changeSummary: toRequiredPrismaJson(changeSummary),
        rawContentBlocks: toRequiredPrismaJson(rawContentBlocks),
        metadata: toRequiredPrismaJson({
          ...(data.importedBy ? { importedBy: data.importedBy } : {}),
          detectedFields: data.detectedFields ?? {},
          detectedSections: data.detectedSections ?? [],
          unmappedSections: unmappedSections.map((section) => section.sectionKey),
          ...(data.metadata ?? {}),
        }),
        contentBlocks:
          reviewBlocks.length > 0
            ? {
                create: reviewBlocks.map((block) => ({
                  ...block,
                  metadata: toOptionalPrismaJson(block.metadata),
                })),
              }
            : undefined,
      },
      include: { contentBlocks: true },
    });

    return {
      testId,
      versionId: version.id,
      versionNumber: version.versionNumber,
      status: version.status as InternationalTestImportDraftResultDto['status'],
      sourceFileName: version.sourceFileName ?? data.sourceFileName,
      sourceLocale: version.sourceLocale ?? data.sourceLocale,
      sourceHash: version.sourceHash ?? undefined,
      preservedRawContent: hasRawContent,
      reviewStatus: 'NEEDS_REVIEW',
      createdContentBlockCount: Array.isArray(version.contentBlocks)
        ? version.contentBlocks.length
        : 0,
      needsReviewSectionCount: reviewBlocks.filter(
        (block) => block.blockType === 'UNMAPPED_SOURCE_SECTION',
      ).length,
    };
  }

  async listImportVersions(testId: string): Promise<InternationalTestVersionDto[]> {
    const existingTest = await this.prisma.internationalTest.findUnique({ where: { id: testId } });
    if (!existingTest) {
      throw new Error(`International test with id ${testId} not found`);
    }

    const records = await this.prisma.internationalTestVersion.findMany({
      where: { testId },
      orderBy: [{ versionNumber: 'desc' }],
      include: { contentBlocks: true },
    });

    return records.map((record) => this.mapVersionToDto(record, testId));
  }

  async upsertCountryRelationship(
    testId: string,
    data: UpsertInternationalTestReferenceRelationshipDto,
  ): Promise<void> {
    if (!data.canonicalReferenceId?.trim())
      throw new Error('COUNTRY_CANONICAL_REFERENCE_ID_REQUIRED');
    const country = await this.prisma.referenceCountry.findUnique({
      where: { id: data.canonicalReferenceId },
      select: { id: true, iso2Code: true, isActive: true },
    });
    if (!country?.isActive)
      throw new Error(`Active canonical COUNTRY not found: ${data.canonicalReferenceId}`);
    if (data.referenceCode && data.referenceCode.toUpperCase() !== country.iso2Code.toUpperCase()) {
      throw new Error('COUNTRY_REFERENCE_ID_CODE_MISMATCH');
    }
    await (this.prisma.internationalTestCountryRelationship as any).upsert({
      where: {
        testId_canonicalReferenceId_relationshipType: {
          testId,
          canonicalReferenceId: country.id,
          relationshipType: data.relationshipType,
        },
      },
      create: {
        testId,
        canonicalReferenceId: country.id,
        countryIso2Code: country.iso2Code,
        relationshipType: data.relationshipType,
        notes: data.notes,
        metadata: toOptionalPrismaJson(data.metadata),
      },
      update: {
        countryIso2Code: country.iso2Code,
        notes: data.notes,
        metadata: toOptionalPrismaJson(data.metadata),
      },
    });
  }

  async upsertLanguageRelationship(
    testId: string,
    data: UpsertInternationalTestReferenceRelationshipDto,
  ): Promise<void> {
    if (!data.canonicalReferenceId?.trim())
      throw new Error('LANGUAGE_CANONICAL_REFERENCE_ID_REQUIRED');
    const language = await this.prisma.referenceLanguage.findUnique({
      where: { id: data.canonicalReferenceId },
      select: { id: true, isoCode: true, isActive: true },
    });
    if (!language?.isActive)
      throw new Error(`Active canonical LANGUAGE not found: ${data.canonicalReferenceId}`);
    if (data.referenceCode && data.referenceCode.toUpperCase() !== language.isoCode.toUpperCase()) {
      throw new Error('LANGUAGE_REFERENCE_ID_CODE_MISMATCH');
    }
    await (this.prisma.internationalTestLanguageRelationship as any).upsert({
      where: {
        testId_canonicalReferenceId_relationshipType: {
          testId,
          canonicalReferenceId: language.id,
          relationshipType: data.relationshipType,
        },
      },
      create: {
        testId,
        canonicalReferenceId: language.id,
        languageIsoCode: language.isoCode,
        relationshipType: data.relationshipType,
        notes: data.notes,
        metadata: toOptionalPrismaJson(data.metadata),
      },
      update: {
        languageIsoCode: language.isoCode,
        notes: data.notes,
        metadata: toOptionalPrismaJson(data.metadata),
      },
    });
  }

  async upsertAcademicTaxonomyRelationship(
    testId: string,
    data: UpsertInternationalTestAcademicTaxonomyRelationshipDto,
  ): Promise<void> {
    await this.prisma.internationalTestAcademicTaxonomyRelationship.upsert({
      where: {
        testId_taxonomyNodeId_relationshipType: {
          testId,
          taxonomyNodeId: data.taxonomyNodeId,
          relationshipType: data.relationshipType,
        },
      },
      create: {
        testId,
        taxonomyNodeId: data.taxonomyNodeId,
        relationshipType: data.relationshipType,
        confidence: data.confidence,
        notes: data.notes,
        metadata: toOptionalPrismaJson(data.metadata),
      },
      update: {
        confidence: data.confidence,
        notes: data.notes,
        metadata: toOptionalPrismaJson(data.metadata),
      },
    });
  }

  async upsertDegreeRelationship(
    testId: string,
    data: UpsertInternationalTestDegreeRelationshipReference,
  ): Promise<void> {
    const degreeLevelCode = data.canonicalCode || data.degreeLevelId;
    await this.prisma.internationalTestDegreeRelationship.upsert({
      where: {
        testId_degreeLevelCode_relationshipType: {
          testId,
          degreeLevelCode,
          relationshipType: data.relationshipType,
        },
      },
      create: {
        testId,
        degreeLevelCode,
        degreeLevelId: data.degreeLevelId,
        relationshipType: data.relationshipType,
        notes: data.notes,
        metadata: toOptionalPrismaJson(data.metadata),
      },
      update: {
        degreeLevelId: data.degreeLevelId,
        notes: data.notes,
        metadata: toOptionalPrismaJson(data.metadata),
      },
    });
  }

  // --- Private Mapping Helpers ---

  private normalizeBlockKey(value: string): string {
    const normalized = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return normalized || 'section';
  }

  private buildImportChangeSummary(
    previousMetadata: unknown,
    detectedFields: Record<string, unknown> | undefined,
  ): Record<string, unknown> {
    if (!detectedFields) {
      return {
        comparisonStatus: 'PENDING_FIELD_MAPPING',
        createdFromExistingTest: true,
        addedFields: [],
        removedFields: [],
        changedFields: [],
      };
    }

    const previousFields = this.extractDetectedFields(previousMetadata);
    const previousKeys = Object.keys(previousFields);
    const currentKeys = Object.keys(detectedFields);
    const addedFields = currentKeys.filter((key) => !previousKeys.includes(key));
    const removedFields = previousKeys.filter((key) => !currentKeys.includes(key));
    const changedFields = currentKeys.filter((key) => {
      if (!previousKeys.includes(key)) return false;
      return JSON.stringify(previousFields[key]) !== JSON.stringify(detectedFields[key]);
    });

    return {
      comparisonStatus: previousKeys.length > 0 ? 'COMPLETED' : 'BASELINE_VERSION',
      createdFromExistingTest: true,
      addedFields,
      removedFields,
      changedFields,
      newFieldsRequireReview: addedFields.length > 0,
      deletedSourceFieldsRequireReview: removedFields.length > 0,
    };
  }

  private extractDetectedFields(metadata: unknown): Record<string, unknown> {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {};
    const detectedFields = (metadata as Record<string, unknown>).detectedFields;
    if (!detectedFields || typeof detectedFields !== 'object' || Array.isArray(detectedFields))
      return {};
    return detectedFields as Record<string, unknown>;
  }

  private asRecord(value: unknown): Record<string, unknown> | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    return value as Record<string, unknown>;
  }

  private asRecordArray(value: unknown): Record<string, unknown>[] | undefined {
    if (!Array.isArray(value)) return undefined;
    return value.filter((item): item is Record<string, unknown> => {
      return !!item && typeof item === 'object' && !Array.isArray(item);
    });
  }

  private sanitizeOptionalFields(value: unknown): Record<string, unknown> {
    const record = this.asRecord(value) ?? {};
    return Object.fromEntries(
      Object.entries(record).filter(
        ([key, item]) =>
          !INTERNATIONAL_TEST_OPTIONAL_FIELDS_RESERVED_KEYS.has(key) && item !== undefined,
      ),
    );
  }

  private scoreScalePersistencePayload(data: any): Record<string, unknown> {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('INTERNATIONAL_TEST_SCORE_SCALE_OBJECT_REQUIRED');
    }
    if (!Number.isFinite(data.overallMinimum) || !Number.isFinite(data.overallMaximum)) {
      throw new Error('INTERNATIONAL_TEST_SCORE_SCALE_BOUNDS_REQUIRED');
    }
    if (data.overallMinimum > data.overallMaximum) {
      throw new Error('INTERNATIONAL_TEST_SCORE_SCALE_INVALID_RANGE');
    }
    return {
      overallMinimum: data.overallMinimum,
      overallMaximum: data.overallMaximum,
      scoreIncrement: data.scoreIncrement,
      bandsOrLevels: toOptionalPrismaJson(data.bandsOrLevels),
      passFailRules: data.passFailRules,
      cefrEquivalency: data.cefrEquivalency,
      crossTestEquivalency: data.crossTestEquivalency,
      resultValidityDurationMonths: data.resultValidityDurationMonths,
      resultDeliveryTimeDays: data.resultDeliveryTimeDays,
      scoreReportingUrl: data.scoreReportingUrl,
    };
  }

  private officialLinkPersistencePayload(data: any): Record<string, unknown> {
    if (!data?.linkType || !data?.url)
      throw new Error('INTERNATIONAL_TEST_OFFICIAL_LINK_TYPE_URL_REQUIRED');
    return { linkType: data.linkType, url: data.url, description: data.description };
  }

  private countryRelationshipPersistencePayload(data: any): Record<string, unknown> {
    if (!data?.canonicalReferenceId) throw new Error('COUNTRY_CANONICAL_REFERENCE_ID_REQUIRED');
    if (!data?.referenceCode)
      throw new Error('COUNTRY_REFERENCE_CODE_REQUIRED_FOR_COMPATIBILITY_PROJECTION');
    if (!data?.relationshipType) throw new Error('COUNTRY_RELATIONSHIP_TYPE_REQUIRED');
    return {
      canonicalReferenceId: data.canonicalReferenceId,
      countryIso2Code: String(data.referenceCode).toUpperCase(),
      relationshipType: data.relationshipType,
      notes: data.notes,
      metadata: toOptionalPrismaJson(data.metadata),
    };
  }

  private languageRelationshipPersistencePayload(data: any): Record<string, unknown> {
    if (!data?.canonicalReferenceId) throw new Error('LANGUAGE_CANONICAL_REFERENCE_ID_REQUIRED');
    if (!data?.referenceCode)
      throw new Error('LANGUAGE_REFERENCE_CODE_REQUIRED_FOR_COMPATIBILITY_PROJECTION');
    if (!data?.relationshipType) throw new Error('LANGUAGE_RELATIONSHIP_TYPE_REQUIRED');
    return {
      canonicalReferenceId: data.canonicalReferenceId,
      languageIsoCode: String(data.referenceCode).trim(),
      relationshipType: data.relationshipType,
      notes: data.notes,
      metadata: toOptionalPrismaJson(data.metadata),
    };
  }

  private taxonomyRelationshipPersistencePayload(data: any): Record<string, unknown> {
    if (!data?.taxonomyNodeId || !data?.relationshipType) {
      throw new Error('ACADEMIC_TAXONOMY_RELATIONSHIP_CANONICAL_ID_REQUIRED');
    }
    return {
      taxonomyNodeId: data.taxonomyNodeId,
      relationshipType: data.relationshipType,
      confidence: data.confidence,
      notes: data.notes,
      metadata: toOptionalPrismaJson(data.metadata),
    };
  }

  private degreeRelationshipPersistencePayload(data: any): Record<string, unknown> {
    if (!data?.degreeLevelId || !data?.canonicalCode || !data?.relationshipType) {
      throw new Error('DEGREE_RELATIONSHIP_CANONICAL_ID_CODE_REQUIRED');
    }
    return {
      degreeLevelId: data.degreeLevelId,
      degreeLevelCode: data.canonicalCode,
      relationshipType: data.relationshipType,
      notes: data.notes,
      metadata: toOptionalPrismaJson(data.metadata),
    };
  }

  private mapVersionToDto(
    record: InternationalTestVersionWithBlocks,
    fallbackTestId: string,
  ): InternationalTestVersionDto {
    return {
      id: record.id,
      testId: record.testId ?? fallbackTestId,
      versionNumber: record.versionNumber,
      status: record.status as InternationalTestVersionDto['status'],
      sourceImportRecordId: record.sourceImportRecordId ?? undefined,
      sourceFileName: record.sourceFileName ?? undefined,
      sourceLocale: record.sourceLocale ?? undefined,
      sourceUri: record.sourceUri ?? undefined,
      sourceHash: record.sourceHash ?? undefined,
      importedAt: record.importedAt ?? undefined,
      publishedAt: record.publishedAt ?? undefined,
      approvedBy: record.approvedBy ?? undefined,
      supersededAt: record.supersededAt ?? undefined,
      effectiveFrom: record.effectiveFrom ?? undefined,
      effectiveTo: record.effectiveTo ?? undefined,
      changeSummary: this.asRecord(record.changeSummary),
      rawContentBlocks: this.asRecordArray(record.rawContentBlocks),
      contentBlocks: record.contentBlocks.map((block) => ({
        id: block.id,
        versionId: block.versionId,
        blockKey: block.blockKey,
        blockType: block.blockType,
        title: block.title ?? undefined,
        locale: block.locale ?? undefined,
        content: block.content,
        sourceSectionPath: block.sourceSectionPath ?? undefined,
        reviewStatus: this.contentBlockReviewStatus(block.reviewStatus),
        metadata: this.asRecord(block.metadata),
      })),
      metadata: this.asRecord(record.metadata),
    };
  }

  private contentBlockReviewStatus(
    value: string,
  ): NonNullable<InternationalTestVersionDto['contentBlocks']>[number]['reviewStatus'] {
    if (
      value === 'NEEDS_REVIEW' ||
      value === 'MAPPED' ||
      value === 'IGNORED' ||
      value === 'APPROVED'
    )
      return value;
    throw new Error(`INTERNATIONAL_TEST_CONTENT_BLOCK_REVIEW_STATUS_INVALID:${value}`);
  }

  private mapProviderToDto(record: any): InternationalTestProviderDto {
    return {
      id: record.id,
      key: record.key,
      displayName: record.displayName,
      localizedNameAr: record.localizedNameAr ?? undefined,
      localizedNameEn: record.localizedNameEn ?? undefined,
      providerType: record.providerType ?? undefined,
      officialWebsite: record.officialWebsite ?? undefined,
      countryIso2Code: record.countryIso2Code ?? undefined,
      metadata: this.asRecord(record.metadata),
    };
  }

  private mapToDto(record: any): InternationalTestDto {
    if (!record) return null as any;
    const {
      optionalFields,
      variants,
      sections,
      scoreScale,
      fees,
      officialLinks,
      availability,
      preparationMaterials,
      evidence,
      countryRelationships,
      languageRelationships,
      academicTaxonomyRelationships,
      degreeRelationships,
      ...rest
    } = record;

    const safeOptionalFields = this.sanitizeOptionalFields(optionalFields);
    const base: InternationalTestDto = {
      ...safeOptionalFields,
      ...rest,
      isPubliclyVisible: rest.isPubliclyVisible ?? false,
      isSourceVerified: rest.isSourceVerified ?? false,
      optionalFields: safeOptionalFields,
    };

    if (variants && Array.isArray(variants))
      base.variants = variants.map((v) => this.mapVariantToDto(v));
    if (sections && Array.isArray(sections))
      base.sections = sections.map((s) => this.mapSectionToDto(s));
    if (scoreScale) base.scoreScale = this.mapScoreScaleToDto(scoreScale);
    if (fees && Array.isArray(fees)) base.fees = fees.map((f) => this.mapFeeMetadataToDto(f));
    if (officialLinks && Array.isArray(officialLinks))
      base.officialLinks = officialLinks.map((l) => this.mapOfficialLinkToDto(l));
    if (availability) base.availability = this.mapAvailabilityToDto(availability);
    if (preparationMaterials && Array.isArray(preparationMaterials)) {
      base.preparationMaterials = preparationMaterials.map((m) =>
        this.mapPreparationMaterialToDto(m),
      );
    }
    if (evidence) base.importEvidence = this.mapEvidenceToDto(evidence);

    if (Array.isArray(countryRelationships)) {
      base.countryRelationships = countryRelationships.map((relationship: any) => ({
        id: relationship.id,
        testId: relationship.testId,
        canonicalReferenceId: relationship.canonicalReferenceId ?? undefined,
        referenceCode: relationship.countryIso2Code ?? undefined,
        relationshipType: relationship.relationshipType,
        notes: relationship.notes ?? undefined,
        metadata: this.asRecord(relationship.metadata),
      }));
    }
    if (Array.isArray(languageRelationships)) {
      base.languageRelationships = languageRelationships.map((relationship: any) => ({
        id: relationship.id,
        testId: relationship.testId,
        canonicalReferenceId: relationship.canonicalReferenceId ?? undefined,
        referenceCode: relationship.languageIsoCode ?? undefined,
        relationshipType: relationship.relationshipType,
        notes: relationship.notes ?? undefined,
        metadata: this.asRecord(relationship.metadata),
      }));
    }
    if (Array.isArray(academicTaxonomyRelationships)) {
      base.academicTaxonomyRelationships = academicTaxonomyRelationships.map(
        (relationship: any) => ({
          id: relationship.id,
          testId: relationship.testId,
          taxonomyNodeId: relationship.taxonomyNodeId,
          relationshipType: relationship.relationshipType,
          confidence: relationship.confidence ?? undefined,
          notes: relationship.notes ?? undefined,
          metadata: this.asRecord(relationship.metadata),
        }),
      );
    }
    if (Array.isArray(degreeRelationships)) {
      base.degreeRelationships = degreeRelationships.map((relationship: any) => ({
        degreeLevelId: relationship.degreeLevelId ?? undefined,
        canonicalCode: relationship.degreeLevelCode ?? undefined,
        relationshipType: relationship.relationshipType,
        notes: relationship.notes ?? undefined,
        metadata: this.asRecord(relationship.metadata),
      }));
    }

    return base;
  }

  private mapVariantToDto(v: any): InternationalTestVariantDto {
    return {
      id: v.id,
      variantName: v.variantName,
      deliveryMode: v.deliveryMode as InternationalTestDeliveryMode,
      isActive: v.isActive ?? true,
      specificOfficialUrl: v.specificOfficialUrl || undefined,
      administrativeNotes: v.administrativeNotes || undefined,
    };
  }

  private mapSectionToDto(s: any): InternationalTestSectionDto {
    return {
      id: s.id,
      sectionName: s.sectionName,
      sectionType: s.sectionType,
      durationMinutes: s.durationMinutes ?? undefined,
      order: s.order,
      questionTypes: Array.isArray(s.questionTypes) ? s.questionTypes : undefined,
      scoreMinimum: s.scoreMinimum ?? undefined,
      scoreMaximum: s.scoreMaximum ?? undefined,
    };
  }

  private mapScoreScaleToDto(sc: any): InternationalTestScoreScaleDto {
    return {
      id: sc.id,
      overallMinimum: sc.overallMinimum,
      overallMaximum: sc.overallMaximum,
      scoreIncrement: sc.scoreIncrement ?? undefined,
      bandsOrLevels: Array.isArray(sc.bandsOrLevels) ? sc.bandsOrLevels : undefined,
      passFailRules: sc.passFailRules || undefined,
      cefrEquivalency: sc.cefrEquivalency || undefined,
      crossTestEquivalency: sc.crossTestEquivalency || undefined,
      resultValidityDurationMonths: sc.resultValidityDurationMonths ?? undefined,
      resultDeliveryTimeDays: sc.resultDeliveryTimeDays ?? undefined,
      scoreReportingUrl: sc.scoreReportingUrl || undefined,
    };
  }

  private mapFeeMetadataToDto(f: any): InternationalTestFeeMetadataDto {
    return {
      id: f.id,
      feeType: f.feeType,
      amount: f.amount,
      currencyCode: f.currencyCode,
      currencyReferenceId: f.currencyReferenceId,
      hasRegionalVariation: f.hasRegionalVariation ?? false,
      validityWindowNotes: f.validityWindowNotes || undefined,
    };
  }

  private mapOfficialLinkToDto(l: any): InternationalTestOfficialLinkDto {
    return {
      id: l.id,
      linkType: l.linkType,
      url: l.url,
      description: l.description || undefined,
    };
  }

  private mapAvailabilityToDto(a: any): InternationalTestAvailabilityDto {
    return {
      id: a.id,
      availableCountryIds: Array.isArray(a.availableCountryIds) ? a.availableCountryIds : [],
      availableCityIds: Array.isArray(a.availableCityIds) ? a.availableCityIds : undefined,
      onlineAvailabilityRegions: Array.isArray(a.onlineAvailabilityRegions)
        ? a.onlineAvailabilityRegions
        : undefined,
      testingWindowsNotes: a.testingWindowsNotes || undefined,
    };
  }

  private mapPreparationMaterialToDto(m: any): InternationalTestPreparationMaterialDto {
    return {
      id: m.id,
      materialType: m.materialType,
      url: m.url || undefined,
      assetId: m.assetId || undefined,
      title: m.title,
      description: m.description || undefined,
    };
  }

  private mapEvidenceToDto(e: any): InternationalTestEvidenceDto {
    return {
      originalImportedName: e.originalImportedName || undefined,
      normalizedCanonicalName: e.normalizedCanonicalName || undefined,
      deterministicKey: e.deterministicKey || undefined,
      sourceId: e.sourceId || undefined,
      sourceUrl: e.sourceUrl || undefined,
      contentHash: e.contentHash || undefined,
      retrievedAt: e.retrievedAt ? new Date(e.retrievedAt) : undefined,
      evidenceSnippet: e.evidenceSnippet || undefined,
      duplicateStatus: e.duplicateStatus || undefined,
      conflictingFields: Array.isArray(e.conflictingFields) ? e.conflictingFields : undefined,
      mergeSuggestions: e.mergeSuggestions || undefined,
      sourceTrustLevel: e.sourceTrustLevel || undefined,
    };
  }
}

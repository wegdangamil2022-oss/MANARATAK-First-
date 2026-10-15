import { Prisma, PrismaClient } from '@prisma/client';
import {
  STUDY_DESTINATION_REVIEW_MAX_AGE_DAYS,
  AtomicPersistenceContext,
  IStudyDestinationRepository,
  PaginatedStudyDestinationResult,
  StudyDestinationCompletenessStatus,
  StudyDestinationFilters,
  StudyDestinationMissingCheck,
  StudyDestinationLivingCostTier,
  StudyDestinationOfficialLink,
  StudyDestinationEvidenceSource,
  StudyDestinationCostHighlight,
  StudyDestinationGovernance,
  StudyDestinationProfileDto,
  StudyDestinationRepositoryCreateInput,
  StudyDestinationRepositoryUpdateInput,
  StudyDestinationStatus,
  StudyDestinationVerificationStatus,
  ReferenceCountryDto,
  ReferenceLifecycleState,
} from '@manaratak/domain';
const include = { studyLanguages: true } as const;
type ProfileRow = Prisma.StudyDestinationProfileGetPayload<{ include: typeof include }>;
const array = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
const iso = (value: Date | string | null): string | null =>
  value instanceof Date ? value.toISOString() : value;
const num = (value: Prisma.Decimal | null): number | null =>
  value === null ? null : Number(value);
const json = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
type AdminFilters = Omit<StudyDestinationFilters, 'status'> & {
  status?: StudyDestinationStatus | 'NO_PROFILE';
  missingCheck?: StudyDestinationMissingCheck;
};

export class PrismaStudyDestinationRepository implements IStudyDestinationRepository {
  constructor(
    private readonly prisma: Prisma.TransactionClient,
    private readonly transactionBound = false,
    private readonly reviewMaxAgeDays = STUDY_DESTINATION_REVIEW_MAX_AGE_DAYS,
  ) {}
  withTransaction(context: AtomicPersistenceContext): IStudyDestinationRepository {
    const client = (
      context as AtomicPersistenceContext & { transactionClient?: Prisma.TransactionClient }
    ).transactionClient;
    if (!context.boundaryId || !client)
      throw new Error('STUDY_DESTINATION_ATOMIC_CONTEXT_REQUIRED');
    return new PrismaStudyDestinationRepository(client, true, this.reviewMaxAgeDays);
  }
  private assertBound() {
    if (!this.transactionBound) throw new Error('STUDY_DESTINATION_TRANSACTION_REQUIRED');
  }
  async lockCountry(countryReferenceId: string): Promise<void> {
    this.assertBound();
    await this.prisma.$queryRaw(
      Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${countryReferenceId}, 12012))`,
    );
    const rows = await this.prisma.$queryRaw<Array<{ isActive: boolean; lifecycleState: string }>>(
      Prisma.sql`SELECT "isActive", "lifecycleState" FROM "ReferenceCountry" WHERE "id"=${countryReferenceId} FOR SHARE`,
    );
    if (rows.length !== 1 || !rows[0].isActive || rows[0].lifecycleState !== 'ACTIVE')
      throw new Error('STUDY_DESTINATION_COUNTRY_NOT_FOUND');
    await this.prisma.$queryRaw(
      Prisma.sql`SELECT "id" FROM "StudyDestinationProfile" WHERE "countryReferenceId"=${countryReferenceId} FOR UPDATE`,
    );
  }
  async lockReferences(
    profile: Pick<
      StudyDestinationProfileDto,
      | 'countryReferenceId'
      | 'studyLanguageReferenceIds'
      | 'livingCostCurrencyReferenceId'
      | 'cityReferenceIds'
    >,
  ): Promise<void> {
    this.assertBound();
    const languages = [...new Set(profile.studyLanguageReferenceIds)].sort();
    if (languages.length) {
      const rows = await this.prisma.$queryRaw<
        Array<{ id: string; isActive: boolean; lifecycleState: string }>
      >(
        Prisma.sql`SELECT "id","isActive","lifecycleState" FROM "ReferenceLanguage" WHERE "id" IN (${Prisma.join(languages)}) ORDER BY "id" FOR SHARE`,
      );
      if (
        rows.length !== languages.length ||
        rows.some((r) => !r.isActive || r.lifecycleState !== 'ACTIVE')
      )
        throw new Error('INVALID_STUDY_LANGUAGE_REFERENCE');
    }
    if (profile.livingCostCurrencyReferenceId) {
      const rows = await this.prisma.$queryRaw<
        Array<{ isActive: boolean; lifecycleState: string }>
      >(
        Prisma.sql`SELECT "isActive","lifecycleState" FROM "ReferenceCurrency" WHERE "id"=${profile.livingCostCurrencyReferenceId} FOR SHARE`,
      );
      if (rows.length !== 1 || !rows[0].isActive || rows[0].lifecycleState !== 'ACTIVE')
        throw new Error('INVALID_LIVING_COST_CURRENCY_REFERENCE');
    }
    const cities = [...new Set(profile.cityReferenceIds)].sort();
    if (cities.length) {
      const rows = await this.prisma.$queryRaw<
        Array<{ countryReferenceId: string | null; isActive: boolean; lifecycleState: string }>
      >(
        Prisma.sql`SELECT "countryReferenceId","isActive","lifecycleState" FROM "ReferenceCity" WHERE "id" IN (${Prisma.join(cities)}) ORDER BY "id" FOR SHARE`,
      );
      if (
        rows.length !== cities.length ||
        rows.some(
          (r) =>
            !r.isActive ||
            r.lifecycleState !== 'ACTIVE' ||
            r.countryReferenceId !== profile.countryReferenceId,
        )
      )
        throw new Error('INVALID_STUDY_CITY_REFERENCE');
    }
  }
  async findById(id: string) {
    const row = await this.prisma.studyDestinationProfile.findUnique({ where: { id }, include });
    return row ? this.map(row) : null;
  }
  async findBySlug(slug: string) {
    const row = await this.prisma.studyDestinationProfile.findUnique({ where: { slug }, include });
    return row ? this.map(row) : null;
  }
  async findByCountryReferenceId(countryReferenceId: string) {
    const row = await this.prisma.studyDestinationProfile.findUnique({
      where: { countryReferenceId },
      include,
    });
    return row ? this.map(row) : null;
  }
  async list(filters: StudyDestinationFilters) {
    return this.listInternal(filters, false);
  }
  async listPublished(filters: Omit<StudyDestinationFilters, 'status' | 'completenessStatus'>) {
    return this.listInternal({ ...filters, status: StudyDestinationStatus.PUBLISHED }, true);
  }
  private countryWhere(filters: {
    q?: string;
    region?: string;
  }): Prisma.ReferenceCountryWhereInput {
    return {
      isActive: true,
      lifecycleState: 'ACTIVE',
      region: filters.region,
      ...(filters.q
        ? {
            OR: [
              { name: { contains: filters.q, mode: 'insensitive' } },
              { nameAr: { contains: filters.q, mode: 'insensitive' } },
              { iso2Code: { equals: filters.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }
  private async listInternal(
    filters: StudyDestinationFilters,
    publishedOnly: boolean,
  ): Promise<PaginatedStudyDestinationResult<StudyDestinationProfileDto>> {
    const page = Math.max(1, filters.page ?? 1),
      pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 30));
    const now = new Date(),
      fresh = new Date(now.getTime() - this.reviewMaxAgeDays * 86400000);
    const where: Prisma.StudyDestinationProfileWhereInput = {
      status: publishedOnly ? 'PUBLISHED' : filters.status,
      completenessStatus: filters.completenessStatus,
      countryReferenceId: filters.countryReferenceId,
      isFeatured: filters.isFeatured,
      countryReference: this.countryWhere(filters),
      ...(publishedOnly
        ? {
            sourceVerificationStatus: 'VERIFIED',
            sourceAuditDate: { gte: fresh, lte: now },
            AND: [
              {
                governance: {
                  path: ['proof', 'reviewedAt'],
                  gte: fresh.toISOString(),
                  lte: now.toISOString(),
                },
              },
              { governance: { path: ['proof', 'fingerprint'], not: Prisma.AnyNull } },
            ],
          }
        : {}),
    };
    const run = async (tx: Prisma.TransactionClient) => {
      const rows = await tx.studyDestinationProfile.findMany({
        where,
        include,
        orderBy: [{ isFeatured: 'desc' }, { updatedAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      });
      const total = await tx.studyDestinationProfile.count({ where });
      return {
        data: rows.map((row) => this.map(row)),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    };
    return this.transactionBound
      ? run(this.prisma)
      : (this.prisma as PrismaClient).$transaction(run, {
          isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
        });
  }
  private missingWhere(
    key: StudyDestinationMissingCheck,
  ): Prisma.StudyDestinationProfileWhereInput {
    const text = {
      'overview-ar': 'overviewAr',
      'overview-en': 'overviewEn',
      'study-system-ar': 'studySystemSummaryAr',
      'study-system-en': 'studySystemSummaryEn',
      'visa-summary-ar': 'visaSummaryAr',
      'visa-summary-en': 'visaSummaryEn',
      'visa-official-url': 'visaOfficialUrl',
    } as const;
    if (key in text) {
      const field = text[key as keyof typeof text];
      return { OR: [{ [field]: null }, { [field]: '' }] };
    }
    const arrays = {
      'admission-highlights': 'admissionHighlightsAr',
      'admission-highlights-en': 'admissionHighlightsEn',
      'visa-requirements': 'visaRequirementsAr',
      'visa-requirements-en': 'visaRequirementsEn',
      'official-links': 'officialLinks',
      'evidence-sources': 'evidenceSources',
    } as const;
    if (key in arrays) {
      const field = arrays[key as keyof typeof arrays];
      return { OR: [{ [field]: { equals: [] } }, { [field]: { equals: Prisma.AnyNull } }] };
    }
    if (key === 'image') return { imageAssetId: null };
    if (key === 'study-languages') return { studyLanguages: { none: {} } };
    if (key === 'living-cost-currency') return { livingCostCurrencyReferenceId: null };
    if (key === 'living-cost-range')
      return { OR: [{ averageMonthlyLivingCostMin: null }, { averageMonthlyLivingCostMax: null }] };
    if (key === 'source-audit-date')
      return {
        OR: [
          { sourceAuditDate: null },
          { sourceAuditDate: { lt: new Date(Date.now() - this.reviewMaxAgeDays * 86400000) } },
          { sourceAuditDate: { gt: new Date() } },
        ],
      };
    if (key === 'source-verification')
      return {
        OR: [
          { sourceVerificationStatus: { not: 'VERIFIED' } },
          { governance: { path: ['proof'], equals: Prisma.AnyNull } },
          {
            governance: {
              path: ['proof', 'reviewedAt'],
              lt: new Date(Date.now() - this.reviewMaxAgeDays * 86400000).toISOString(),
            },
          },
          { governance: { path: ['proof', 'reviewedAt'], gt: new Date().toISOString() } },
        ],
      };
    // Derived bilingual structures are evaluated by the owner and persisted with each revision.
    return {
      OR: [
        { governance: { path: ['readiness', key], equals: Prisma.AnyNull } },
        { NOT: { governance: { path: ['readiness', key], equals: true } } },
      ],
    };
  }
  async listAdminCountries(filters: AdminFilters) {
    const page = Math.max(1, filters.page ?? 1),
      pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 24));
    const where: Prisma.ReferenceCountryWhereInput = this.countryWhere(filters);
    const profile: Prisma.StudyDestinationProfileWhereInput = {
      status: filters.status === 'NO_PROFILE' ? undefined : filters.status,
      completenessStatus: filters.completenessStatus,
    };
    if (filters.status === 'NO_PROFILE') where.studyDestinationProfile = { is: null };
    else if (filters.status || filters.completenessStatus)
      where.studyDestinationProfile = { is: profile };
    if (filters.missingCheck)
      where.AND = [
        {
          OR: [
            { studyDestinationProfile: { is: null } },
            { studyDestinationProfile: { is: this.missingWhere(filters.missingCheck) } },
          ],
        },
      ];
    const run = async (tx: Prisma.TransactionClient) => {
      const rows = await tx.referenceCountry.findMany({
        where,
        include: { studyDestinationProfile: { include } },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      });
      const total = await tx.referenceCountry.count({ where });
      return {
        data: rows.map((row) => ({
          country: {
            id: row.id,
            iso2Code: row.iso2Code,
            iso3Code: row.iso3Code,
            name: row.name,
            nameAr: row.nameAr,
            officialName: row.officialName,
            region: row.region,
            subregion: row.subregion,
            isActive: row.isActive,
            lifecycleState: row.lifecycleState as ReferenceLifecycleState,
            versionNumber: row.versionNumber,
            effectiveFrom: row.effectiveFrom,
            effectiveTo: row.effectiveTo,
            defaultCurrencyCode: row.defaultCurrencyCode,
            defaultLanguageCode: row.defaultLanguageCode,
            callingCode: row.callingCode,
            flagAssetId: row.flagAssetId,
          } satisfies ReferenceCountryDto,
          profile: row.studyDestinationProfile ? this.map(row.studyDestinationProfile) : null,
        })),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    };
    return this.transactionBound
      ? run(this.prisma)
      : (this.prisma as PrismaClient).$transaction(run, {
          isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
        });
  }
  async create(data: StudyDestinationRepositoryCreateInput): Promise<StudyDestinationProfileDto> {
    this.assertBound();
    const row = await this.prisma.studyDestinationProfile.create({
      data: {
        ...this.persistence(data),
        publicId: data.publicId,
        slug: data.slug,
        countryReferenceId: data.countryReferenceId,
        status: data.status,
        completenessStatus: data.completenessStatus,
        studyLanguages: {
          create: [...new Set(data.studyLanguageReferenceIds ?? [])].map((languageReferenceId) => ({
            languageReferenceId,
          })),
        },
      },
      include,
    });
    return this.map(row);
  }
  async update(
    id: string,
    data: StudyDestinationRepositoryUpdateInput,
    expectedUpdatedAt?: string,
    expectedRevision?: number,
  ): Promise<StudyDestinationProfileDto> {
    this.assertBound();
    if (!Number.isSafeInteger(expectedRevision))
      throw new Error('STUDY_DESTINATION_PRECONDITION_REQUIRED');
    const updated = await this.prisma.studyDestinationProfile.updateMany({
      where: {
        id,
        revision: expectedRevision,
        updatedAt: expectedUpdatedAt ? new Date(expectedUpdatedAt) : undefined,
      },
      data: { ...this.persistence(data), revision: { increment: 1 } },
    });
    if (updated.count !== 1) throw new Error('STUDY_DESTINATION_VERSION_CONFLICT');
    if (data.studyLanguageReferenceIds !== undefined) {
      await this.prisma.studyDestinationStudyLanguage.deleteMany({ where: { profileId: id } });
      const ids = [...new Set(data.studyLanguageReferenceIds)];
      if (ids.length)
        await this.prisma.studyDestinationStudyLanguage.createMany({
          data: ids.map((languageReferenceId) => ({ profileId: id, languageReferenceId })),
        });
    }
    const row = await this.prisma.studyDestinationProfile.findUniqueOrThrow({
      where: { id },
      include,
    });
    return this.map(row);
  }
  private persistence(data: StudyDestinationRepositoryUpdateInput) {
    return {
      status: data.status,
      completenessStatus: data.completenessStatus,
      overviewAr: data.overviewAr,
      overviewEn: data.overviewEn,
      studySystemSummaryAr: data.studySystemSummaryAr,
      studySystemSummaryEn: data.studySystemSummaryEn,
      admissionHighlightsAr:
        data.admissionHighlightsAr === undefined ? undefined : json(data.admissionHighlightsAr),
      admissionHighlightsEn:
        data.admissionHighlightsEn === undefined ? undefined : json(data.admissionHighlightsEn),
      visaSummaryAr: data.visaSummaryAr,
      visaSummaryEn: data.visaSummaryEn,
      visaRequirementsAr:
        data.visaRequirementsAr === undefined ? undefined : json(data.visaRequirementsAr),
      visaRequirementsEn:
        data.visaRequirementsEn === undefined ? undefined : json(data.visaRequirementsEn),
      visaOfficialUrl: data.visaOfficialUrl,
      livingCostTier: data.livingCostTier,
      averageMonthlyLivingCostMin: data.averageMonthlyLivingCostMin,
      averageMonthlyLivingCostMax: data.averageMonthlyLivingCostMax,
      livingCostCurrencyReferenceId: data.livingCostCurrencyReferenceId,
      costHighlightsAr:
        data.costHighlightsAr === undefined ? undefined : json(data.costHighlightsAr),
      costHighlightsEn:
        data.costHighlightsEn === undefined ? undefined : json(data.costHighlightsEn),
      studentLifeHighlightsAr:
        data.studentLifeHighlightsAr === undefined ? undefined : json(data.studentLifeHighlightsAr),
      studentLifeHighlightsEn:
        data.studentLifeHighlightsEn === undefined ? undefined : json(data.studentLifeHighlightsEn),
      officialLinks: data.officialLinks === undefined ? undefined : json(data.officialLinks),
      sourceVerificationStatus: data.sourceVerificationStatus,
      sourceAuditDate: data.sourceAuditDate ? new Date(data.sourceAuditDate) : data.sourceAuditDate,
      publishedAt: data.publishedAt ? new Date(data.publishedAt) : data.publishedAt,
      evidenceSources: data.evidenceSources === undefined ? undefined : json(data.evidenceSources),
      imageAssetId: data.imageAssetId,
      isFeatured: data.isFeatured,
      governance: data.governance === undefined ? undefined : json(data.governance),
      cityReferenceIds:
        data.cityReferenceIds === undefined ? undefined : json(data.cityReferenceIds),
    };
  }
  private map(row: ProfileRow): StudyDestinationProfileDto {
    return PrismaStudyDestinationRepository.toProfile(row);
  }
  /** Canonical persistence mapping shared with transaction-bound owner readers. */
  public static toProfile(row: ProfileRow): StudyDestinationProfileDto {
    return {
      revision: row.revision,
      governance: (row.governance ?? {}) as unknown as StudyDestinationGovernance,
      cityReferenceIds: array<string>(row.cityReferenceIds),
      id: row.id,
      publicId: row.publicId,
      slug: row.slug,
      countryReferenceId: row.countryReferenceId,
      status: row.status as StudyDestinationStatus,
      completenessStatus: row.completenessStatus as StudyDestinationCompletenessStatus,
      overviewAr: row.overviewAr,
      overviewEn: row.overviewEn,
      studySystemSummaryAr: row.studySystemSummaryAr,
      studySystemSummaryEn: row.studySystemSummaryEn,
      admissionHighlightsAr: array<string>(row.admissionHighlightsAr),
      admissionHighlightsEn: array<string>(row.admissionHighlightsEn),
      visaSummaryAr: row.visaSummaryAr,
      visaSummaryEn: row.visaSummaryEn,
      visaRequirementsAr: array<string>(row.visaRequirementsAr),
      visaRequirementsEn: array<string>(row.visaRequirementsEn),
      visaOfficialUrl: row.visaOfficialUrl,
      livingCostTier: row.livingCostTier as StudyDestinationLivingCostTier | null,
      averageMonthlyLivingCostMin: num(row.averageMonthlyLivingCostMin),
      averageMonthlyLivingCostMax: num(row.averageMonthlyLivingCostMax),
      livingCostCurrencyReferenceId: row.livingCostCurrencyReferenceId,
      costHighlightsAr: array<StudyDestinationCostHighlight>(row.costHighlightsAr),
      costHighlightsEn: array<StudyDestinationCostHighlight>(row.costHighlightsEn),
      studentLifeHighlightsAr: array<string>(row.studentLifeHighlightsAr),
      studentLifeHighlightsEn: array<string>(row.studentLifeHighlightsEn),
      officialLinks: array<StudyDestinationOfficialLink>(row.officialLinks),
      sourceVerificationStatus: row.sourceVerificationStatus as StudyDestinationVerificationStatus,
      sourceAuditDate: iso(row.sourceAuditDate),
      evidenceSources: array<StudyDestinationEvidenceSource>(row.evidenceSources),
      imageAssetId: row.imageAssetId,
      studyLanguageReferenceIds: (row.studyLanguages ?? []).map((item) => item.languageReferenceId),
      isFeatured: Boolean(row.isFeatured),
      publishedAt: iso(row.publishedAt),
      createdAt: iso(row.createdAt) ?? new Date(0).toISOString(),
      updatedAt: iso(row.updatedAt) ?? new Date(0).toISOString(),
    };
  }
}

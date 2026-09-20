import { Prisma, PrismaClient } from '@prisma/client';
import {
  AtomicPersistenceContext,
  CreateScholarshipDto,
  IScholarshipRepository,
  ITransactionalScholarshipRepository,
  PublicScholarshipFilters,
  ScholarshipDto,
  ScholarshipCompletenessState,
  ScholarshipFilters,
  ScholarshipPage,
  ScholarshipStatus,
  ScholarshipPublicationStatus,
  ScholarshipRepositoryUpdateDto,
  ScholarshipVerificationStatus,
  MajorStatus,
  UniversityStatus,
} from '@manaratak/domain';

interface ScholarshipTransactionContext extends AtomicPersistenceContext {
  readonly transactionClient: Prisma.TransactionClient;
}

type AdminScholarshipFilters = ScholarshipFilters & {
  fundingCoverage?: string; sponsorName?: string; verificationStatus?: ScholarshipVerificationStatus;
  translationState?: 'NEEDS_TRANSLATION' | 'TRANSLATED'; deadlineFrom?: Date; deadlineTo?: Date;
  sourceType?: string; query?: string;
};

import { queryStableCursorPage } from '../api-foundation/StableCursor';

const LEGACY_COMPATIBILITY_KEYS = [
  'fundingCoverage',
  'coverageDetails',
  'eligibleMajorsOrFields',
  'degreeLevel',
  'studyCountry',
  'applicationLink',
  'sponsorName',
  'requiredDocuments',
  'eligibilityCriteria',
  'studyLanguage',
  'targetUniversities',
  'targetAcademicPrograms',
  'fundingAmount',
  'currency',
  'duration',
  'localizedNames',
  'metadata',
] as const;

type LegacyCompatibilityKey = (typeof LEGACY_COMPATIBILITY_KEYS)[number];

const RESERVED_OPTIONAL_KEYS = new Set([
  'id', 'publicId', 'slug', 'canonicalName', 'canonicalDedupKey', 'status', 'completenessStatus',
  'verificationStatus', 'publicationStatus', 'sourceImportRecordId', 'countryReferenceId',
  'studyLanguageReferenceId', 'createdAt', 'updatedAt', 'versions', 'sponsorContext', 'applicationCycles',
]);

export class PrismaScholarshipRepository implements ITransactionalScholarshipRepository {
  constructor(private readonly prisma: PrismaClient, private readonly transactionBound = false) {}

  private readonly normalizedInclude = {
    benefits: true,
    degreeTargets: true,
    majorTargets: true,
    eligibilityItems: true,
    requiredDocuments: true,
    sourceEvidence: true,
    universityLinks: true,
    versions: { orderBy: { versionNumber: 'asc' as const } },
    sponsorContext: true,
    applicationCycles: { orderBy: { createdAt: 'asc' as const } },
  } as const;

  withTransaction(context: AtomicPersistenceContext): IScholarshipRepository {
    const transactionClient = (context as Partial<ScholarshipTransactionContext>).transactionClient;
    if (!context.boundaryId || !transactionClient) {
      throw new Error('SCHOLARSHIP_ATOMIC_TRANSACTION_CONTEXT_REQUIRED');
    }
    return new PrismaScholarshipRepository(transactionClient as unknown as PrismaClient, true);
  }

  async findById(id: string): Promise<ScholarshipDto | null> {
    const record = await this.prisma.scholarship.findUnique({
      where: { id },
      include: this.normalizedInclude,
    });
    return record ? this.mapToDto(record) : null;
  }

  async findBySlug(slug: string): Promise<ScholarshipDto | null> {
    const record = await this.prisma.scholarship.findUnique({
      where: { slug },
      include: this.normalizedInclude,
    });
    return record ? this.mapToDto(record) : null;
  }

  async findPublishedBySlug(slug: string): Promise<ScholarshipDto | null> {
    const record = await this.prisma.scholarship.findFirst({
      where: { slug, publicationStatus: ScholarshipPublicationStatus.PUBLISHED, verificationStatus: ScholarshipVerificationStatus.VERIFIED },
      include: this.normalizedInclude,
    });
    return record ? this.mapToDto(record) : null;
  }

  async findByDedupKey(key: string): Promise<ScholarshipDto | null> {
    const record = await this.prisma.scholarship.findUnique({
      where: { canonicalDedupKey: key },
      include: this.normalizedInclude,
    });
    return record ? this.mapToDto(record) : null;
  }

  async create(data: CreateScholarshipDto): Promise<ScholarshipDto> {
    const legacyCompatibility = this.buildLegacyCompatibility(data.optionalFields, data);
    const createData = {
      publicId: data.publicId,
      slug: data.slug,
      canonicalName: data.canonicalName,
      canonicalDedupKey: data.canonicalDedupKey,
      displayName: data.displayName,
      providerName: data.providerName,
      status: data.status,
      completenessStatus: data.completenessStatus,
      verificationStatus: data.verificationStatus ?? ScholarshipVerificationStatus.PENDING,
      publicationStatus: data.publicationStatus ?? ScholarshipPublicationStatus.DRAFT,
      amountMinorUnits: data.amountMinorUnits,
      amountCurrencyCode: data.amountCurrencyCode,
      isFullyFunded: data.isFullyFunded,
      applicationDeadline: data.applicationDeadline,
      officialWebsite: data.officialWebsite,
      sourceUrl: data.sourceUrl,
      academicYear: data.academicYear,
      cycleName: data.cycleName,
      countryReferenceId: data.countryReferenceId,
      countrySourceLabel: data.countrySourceLabel,
      countryScope: data.countryScope,
      fundingTypeCode: data.fundingTypeCode,
      deadlineType: data.deadlineType,
      applicationMethod: data.applicationMethod,
      applicationUrl: data.applicationUrl ?? data.applicationLink,
      officialSourceUrl: data.officialSourceUrl,
      sourceImportRecordId: data.sourceImportRecordId,
      sourceLocale: data.sourceLocale,
      lastVerifiedAt: data.lastVerifiedAt,
      studyLanguageReferenceId: data.studyLanguageReferenceId,
      studyLanguageSourceLabel: data.studyLanguageSourceLabel,
      studyLanguageResolutionStatus: data.studyLanguageResolutionStatus,
      optionalFields: legacyCompatibility,
      benefits: this.toNestedCreate(data.benefits),
      degreeTargets: this.toNestedCreate(data.degreeTargets),
      majorTargets: this.toNestedCreate(data.majorTargets),
      eligibilityItems: this.toNestedCreate(data.eligibilityItems),
      requiredDocuments: this.toNestedCreate(data.requiredDocumentItems),
      sourceEvidence: this.toNestedCreate(data.sourceEvidence),
      universityLinks: this.toNestedCreate(data.universityLinks),
      sponsorContext: { create: { sponsorType: 'CONTEXTUAL', displayName: data.providerName ?? data.sponsorName ?? 'UNKNOWN_SPONSOR', source: 'SCHOLARSHIP_ROOT' } },
      applicationCycles: { create: [this.applicationCycleData(data)] },
      versions: { create: [this.initialVersionData(data)] },
    } as unknown as Prisma.ScholarshipCreateInput;

    const record = await this.prisma.scholarship.create({
      data: createData,
      include: this.normalizedInclude,
    });

    return this.mapToDto(record);
  }

  async update(id: string, updates: ScholarshipRepositoryUpdateDto): Promise<ScholarshipDto> {
    const structural = this.hasStructuralChanges(updates);
    if (structural && !this.transactionBound) throw new Error('SCHOLARSHIP_STRUCTURAL_TRANSACTION_REQUIRED');
    if (structural) await this.prisma.$queryRaw(Prisma.sql`SELECT "id" FROM "Scholarship" WHERE "id" = ${id} FOR UPDATE`);
    const existing = await this.prisma.scholarship.findUnique({ where: { id } });
    if (!existing) {
      throw new Error(`SCHOLARSHIP_NOT_FOUND:${id}`);
    }

    const legacyCompatibility = this.buildLegacyCompatibility(
      this.asOptionalRecord(existing.optionalFields),
      updates,
    );
    const updateData = {
      canonicalDedupKey: updates.canonicalDedupKey,
      displayName: updates.displayName,
      providerName: updates.providerName,
      status: updates.status,
      completenessStatus: updates.completenessStatus,
      verificationStatus: updates.verificationStatus,
      publicationStatus: updates.publicationStatus,
      amountMinorUnits: updates.amountMinorUnits,
      amountCurrencyCode: updates.amountCurrencyCode,
      isFullyFunded: updates.isFullyFunded,
      applicationDeadline: updates.applicationDeadline,
      officialWebsite: updates.officialWebsite,
      sourceUrl: updates.sourceUrl,
      academicYear: updates.academicYear,
      cycleName: updates.cycleName,
      countryReferenceId: updates.countryReferenceId,
      countrySourceLabel: updates.countrySourceLabel,
      countryScope: updates.countryScope,
      fundingTypeCode: updates.fundingTypeCode,
      deadlineType: updates.deadlineType,
      applicationMethod: updates.applicationMethod,
      applicationUrl: updates.applicationUrl ?? updates.applicationLink,
      officialSourceUrl: updates.officialSourceUrl,
      sourceImportRecordId: updates.sourceImportRecordId,
      sourceLocale: updates.sourceLocale,
      lastVerifiedAt: updates.lastVerifiedAt,
      studyLanguageReferenceId: updates.studyLanguageReferenceId,
      studyLanguageSourceLabel: updates.studyLanguageSourceLabel,
      studyLanguageResolutionStatus: updates.studyLanguageResolutionStatus,
      optionalFields: legacyCompatibility,
      benefits: this.toNestedReplace(updates.benefits),
      degreeTargets: this.toNestedReplace(updates.degreeTargets),
      majorTargets: this.toNestedReplace(updates.majorTargets),
      eligibilityItems: this.toNestedReplace(updates.eligibilityItems),
      requiredDocuments: this.toNestedReplace(updates.requiredDocumentItems),
      sourceEvidence: this.toNestedReplace(updates.sourceEvidence),
      universityLinks: this.toNestedReplace(updates.universityLinks),
    } as unknown as Prisma.ScholarshipUpdateInput;

    let record = await this.prisma.scholarship.update({
      where: { id },
      data: updateData,
      include: this.normalizedInclude,
    });
    if (structural) {
      const version = await this.appendStructuralVersion(id, record);
      await this.prisma.scholarshipSponsorContext.upsert({
        where: { scholarshipId: id },
        create: { scholarshipId: id, sponsorType: 'CONTEXTUAL', displayName: record.providerName ?? 'UNKNOWN_SPONSOR', source: 'SCHOLARSHIP_ROOT' },
        update: { displayName: record.providerName ?? 'UNKNOWN_SPONSOR' },
      });
      const cycle = this.applicationCycleData(record);
      await this.prisma.scholarshipApplicationCycle.upsert({
        where: { scholarshipId_cycleKey: { scholarshipId: id, cycleKey: cycle.cycleKey } },
        create: { scholarshipId: id, versionId: version.id, ...cycle },
        update: { versionId: version.id, academicYear: cycle.academicYear, closesAt: cycle.closesAt, status: cycle.status },
      });
      record = await this.prisma.scholarship.findUniqueOrThrow({ where: { id }, include: this.normalizedInclude });
    }
    return this.mapToDto(record);
  }

  async updateStatus(id: string, status: ScholarshipStatus): Promise<void> {
    await this.prisma.scholarship.update({
      where: { id },
      data: { status },
    });
  }

  async updateLifecycle(id: string, lifecycle: {
    workflowStatus?: ScholarshipStatus;
    verificationStatus?: ScholarshipVerificationStatus;
    publicationStatus?: ScholarshipPublicationStatus;
  }): Promise<void> {
    await this.prisma.scholarship.update({
      where: { id },
      data: {
        status: lifecycle.workflowStatus,
        verificationStatus: lifecycle.verificationStatus,
        publicationStatus: lifecycle.publicationStatus,
      },
    });

    if (lifecycle.publicationStatus === ScholarshipPublicationStatus.PUBLISHED) {
      const latest = await this.prisma.scholarshipVersion.findFirst({
        where: { scholarshipId: id },
        orderBy: { versionNumber: 'desc' },
      });
      if (!latest) throw new Error('SCHOLARSHIP_VERSION_REQUIRED');
      const publishedAt = new Date();
      await this.prisma.scholarshipVersion.updateMany({
        where: { scholarshipId: id, status: 'PUBLISHED', id: { not: latest.id } },
        data: { status: 'SUPERSEDED' },
      });
      await this.prisma.scholarshipVersion.update({
        where: { id: latest.id },
        data: { status: 'PUBLISHED', publishedAt },
      });
      await this.prisma.scholarshipApplicationCycle.updateMany({
        where: { scholarshipId: id, status: 'PUBLISHED', versionId: { not: latest.id } },
        data: { status: 'SUPERSEDED' },
      });
      await this.prisma.scholarshipApplicationCycle.updateMany({
        where: { scholarshipId: id, OR: [{ versionId: latest.id }, { versionId: null }] },
        data: { versionId: latest.id, status: 'PUBLISHED' },
      });
    } else if (lifecycle.publicationStatus === ScholarshipPublicationStatus.DRAFT) {
      await this.prisma.scholarshipVersion.updateMany({
        where: { scholarshipId: id, status: 'PUBLISHED' },
        data: { status: 'UNPUBLISHED' },
      });
      await this.prisma.scholarshipApplicationCycle.updateMany({
        where: { scholarshipId: id, status: 'PUBLISHED' },
        data: { status: 'UNPUBLISHED' },
      });
    } else if (lifecycle.publicationStatus === ScholarshipPublicationStatus.ARCHIVED) {
      const latest = await this.prisma.scholarshipVersion.findFirst({
        where: { scholarshipId: id },
        orderBy: { versionNumber: 'desc' },
      });
      if (latest) {
        await this.prisma.scholarshipVersion.update({ where: { id: latest.id }, data: { status: 'ARCHIVED' } });
        await this.prisma.scholarshipApplicationCycle.updateMany({
          where: { scholarshipId: id, OR: [{ versionId: latest.id }, { versionId: null }] },
          data: { versionId: latest.id, status: 'ARCHIVED' },
        });
      }
    }
  }

  async list(filters: AdminScholarshipFilters): Promise<ScholarshipPage<ScholarshipDto>> {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const where: Prisma.ScholarshipWhereInput = {};
    if (filters.status) where.status = filters.status;
    if (filters.completenessStatus) where.completenessStatus = filters.completenessStatus;
    const constraints: Prisma.ScholarshipWhereInput[] = [];
    if (filters.countryReferenceId) where.countryReferenceId = filters.countryReferenceId;
    if (filters.studyLanguageReferenceId) where.studyLanguageReferenceId = filters.studyLanguageReferenceId;
    if (filters.currencyReferenceId) constraints.push({ benefits: { some: { currencyReferenceId: filters.currencyReferenceId } } });
    if (filters.degreeLevelId) constraints.push({ degreeTargets: { some: { degreeLevelId: filters.degreeLevelId } } });
    if (filters.majorId) constraints.push({ OR: [
      { majorTargets: { some: { majorId: filters.majorId } } },
      { eligibilityItems: { some: { majorId: filters.majorId } } },
    ] });
    if (filters.internationalTestId) constraints.push({ OR: [
      { eligibilityItems: { some: { internationalTestId: filters.internationalTestId } } },
      { requiredDocuments: { some: { internationalTestId: filters.internationalTestId } } },
    ] });
    if (filters.universityId) constraints.push({ universityLinks: { some: { universityId: filters.universityId } } });
    if (filters.academicProgramId) constraints.push({ universityLinks: { some: { academicProgramId: filters.academicProgramId } } });
    if (filters.fundingCoverage) constraints.push({ OR: [
      { fundingTypeCode: { equals: filters.fundingCoverage, mode: 'insensitive' } },
      { benefits: { some: { coverageTypeCode: { equals: filters.fundingCoverage, mode: 'insensitive' } } } },
    ] });
    if (filters.sponsorName) constraints.push({ providerName: { contains: filters.sponsorName, mode: 'insensitive' } });
    if (filters.verificationStatus) where.verificationStatus = filters.verificationStatus;
    if (filters.translationState === 'NEEDS_TRANSLATION') constraints.push({ OR: [{ sourceLocale: null }, { sourceLocale: { notIn: ['ar', 'ar-SA'] } }] });
    if (filters.translationState === 'TRANSLATED') where.sourceLocale = { in: ['ar', 'ar-SA'] };
    if (filters.deadlineFrom || filters.deadlineTo) where.applicationDeadline = { gte: filters.deadlineFrom, lte: filters.deadlineTo };
    if (filters.sourceType) constraints.push({ sourceEvidence: { some: { sourceTypeCode: { equals: filters.sourceType, mode: 'insensitive' } } } });
    if (filters.query) constraints.push({ OR: [
      { displayName: { contains: filters.query, mode: 'insensitive' } },
      { canonicalName: { contains: filters.query, mode: 'insensitive' } },
      { providerName: { contains: filters.query, mode: 'insensitive' } },
    ] });
    if (constraints.length) where.AND = constraints;

    const [data, total] = await Promise.all([
      this.prisma.scholarship.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: this.normalizedInclude,
      }),
      this.prisma.scholarship.count({ where }),
    ]);

    return {
      data: data.map((record) => this.mapToDto(record)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getAdminSummary() {
    const [all, imported, missingFields, needsVerification, needsTranslation, readyToPublish, published, archived] = await Promise.all([
      this.prisma.scholarship.count(),
      this.prisma.scholarship.count({ where: { status: { in: [ScholarshipStatus.IMPORTED, ScholarshipStatus.READY_TO_REVIEW] } } }),
      this.prisma.scholarship.count({ where: { OR: [{ completenessStatus: { not: ScholarshipCompletenessState.COMPLETE } }, { applicationDeadline: null }] } }),
      this.prisma.scholarship.count({ where: { OR: [{ verificationStatus: { not: ScholarshipVerificationStatus.VERIFIED } }, { officialSourceUrl: null }] } }),
      this.prisma.scholarship.count({ where: { OR: [{ sourceLocale: null }, { sourceLocale: { notIn: ['ar', 'ar-SA'] } }] } }),
      this.prisma.scholarship.count({ where: { status: ScholarshipStatus.READY_TO_PUBLISH } }),
      this.prisma.scholarship.count({ where: { status: ScholarshipStatus.PUBLISHED } }),
      this.prisma.scholarship.count({ where: { status: ScholarshipStatus.ARCHIVED } }),
    ]);
    return { all, imported, missingFields, needsVerification, needsTranslation, readyToPublish, published, archived };
  }

  async listPublished(filters: PublicScholarshipFilters): Promise<ScholarshipPage<ScholarshipDto>> {
    const where: Prisma.ScholarshipWhereInput = {
      publicationStatus: ScholarshipPublicationStatus.PUBLISHED,
      verificationStatus: ScholarshipVerificationStatus.VERIFIED,
    };
    const constraints: Prisma.ScholarshipWhereInput[] = [];
    if (filters.countryReferenceId) where.countryReferenceId = filters.countryReferenceId;
    if (filters.studyLanguageReferenceId) where.studyLanguageReferenceId = filters.studyLanguageReferenceId;
    if (filters.currencyReferenceId) constraints.push({ benefits: { some: { currencyReferenceId: filters.currencyReferenceId } } });
    if (filters.degreeLevelId) constraints.push({ degreeTargets: { some: { degreeLevelId: filters.degreeLevelId } } });
    if (filters.majorId) constraints.push({ OR: [
      { majorTargets: { some: { majorId: filters.majorId, major: { is: { status: MajorStatus.PUBLISHED } } } } },
      { eligibilityItems: { some: { majorId: filters.majorId, major: { is: { status: MajorStatus.PUBLISHED } } } } },
    ] });
    if (filters.internationalTestId) constraints.push({ OR: [
      { eligibilityItems: { some: { internationalTestId: filters.internationalTestId } } },
      { requiredDocuments: { some: { internationalTestId: filters.internationalTestId } } },
    ] });
    if (filters.universityId) constraints.push({ universityLinks: { some: {
      universityId: filters.universityId,
      university: { is: { status: UniversityStatus.PUBLISHED } },
    } } });
    if (filters.academicProgramId) constraints.push({ universityLinks: { some: {
      academicProgramId: filters.academicProgramId,
      academicProgram: { is: {
        status: 'ACTIVE',
        majorMappingState: 'CANONICALLY_MAPPED',
        university: { is: { status: UniversityStatus.PUBLISHED } },
        major: { is: { status: MajorStatus.PUBLISHED } },
      } },
    } } });
    if (filters.fundingCoverage) constraints.push({ OR: [
      { fundingTypeCode: { equals: filters.fundingCoverage, mode: 'insensitive' } },
      { benefits: { some: { coverageTypeCode: { equals: filters.fundingCoverage, mode: 'insensitive' } } } },
    ] });
    if (filters.sponsorName) where.providerName = { equals: filters.sponsorName, mode: 'insensitive' };
    if (filters.applicationDeadlineFrom || filters.applicationDeadlineTo) where.applicationDeadline = {
      gte: filters.applicationDeadlineFrom,
      lte: filters.applicationDeadlineTo,
    };
    if (constraints.length) where.AND = constraints;
    return queryStableCursorPage({
      delegate: this.prisma.scholarship as any, where, include: this.normalizedInclude,
      cursor: filters.cursor, limit: filters.limit, map: (record: any) => this.mapToDto(record),
    });
  }

  private mapToDto(record: unknown): ScholarshipDto {
    const raw = record as Record<string, unknown>;
    const legacy = this.asOptionalRecord(raw.optionalFields);
    const compatibility = this.pickLegacyCompatibility(legacy);
    const requiredDocuments = Array.isArray(raw.requiredDocuments) ? raw.requiredDocuments : [];

    return {
      ...compatibility,
      ...raw,
      optionalFields: this.sanitizeOptionalFields(legacy),
      verificationStatus: raw.verificationStatus ?? ScholarshipVerificationStatus.PENDING,
      publicationStatus: raw.publicationStatus ?? this.legacyPublicationStatus(raw.status),
      benefits: Array.isArray(raw.benefits) ? raw.benefits : [],
      degreeTargets: Array.isArray(raw.degreeTargets) ? raw.degreeTargets : [],
      majorTargets: Array.isArray(raw.majorTargets) ? raw.majorTargets : [],
      eligibilityItems: Array.isArray(raw.eligibilityItems) ? raw.eligibilityItems : [],
      requiredDocumentItems: requiredDocuments,
      sourceEvidence: Array.isArray(raw.sourceEvidence) ? raw.sourceEvidence : [],
      universityLinks: Array.isArray(raw.universityLinks) ? raw.universityLinks : [],
    } as unknown as ScholarshipDto;
  }

  private legacyPublicationStatus(status: unknown): ScholarshipPublicationStatus {
    if (status === ScholarshipStatus.PUBLISHED) return ScholarshipPublicationStatus.PUBLISHED;
    if (status === ScholarshipStatus.ARCHIVED) return ScholarshipPublicationStatus.ARCHIVED;
    return ScholarshipPublicationStatus.DRAFT;
  }

  private buildLegacyCompatibility(
    currentOptionalFields: Record<string, unknown> | undefined,
    source: Partial<CreateScholarshipDto>,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = this.sanitizeOptionalFields(currentOptionalFields ?? {});
    for (const key of LEGACY_COMPATIBILITY_KEYS) {
      const value = source[key];
      if (value !== undefined) result[key] = value;
    }
    return result;
  }

  private pickLegacyCompatibility(
    value: Record<string, unknown>,
  ): Partial<Pick<CreateScholarshipDto, LegacyCompatibilityKey>> {
    const result: Partial<Record<LegacyCompatibilityKey, unknown>> = {};
    for (const key of LEGACY_COMPATIBILITY_KEYS) {
      if (value[key] !== undefined) result[key] = value[key];
    }
    return result as Partial<Pick<CreateScholarshipDto, LegacyCompatibilityKey>>;
  }

  private sanitizeOptionalFields(value: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(Object.entries(value).filter(([key]) => !RESERVED_OPTIONAL_KEYS.has(key)));
  }

  private hasStructuralChanges(updates: ScholarshipRepositoryUpdateDto): boolean {
    const structuralKeys = new Set([
      'providerName', 'amountMinorUnits', 'amountCurrencyCode', 'isFullyFunded', 'applicationDeadline',
      'academicYear', 'cycleName', 'countryReferenceId', 'countrySourceLabel', 'countryScope',
      'fundingTypeCode', 'deadlineType', 'applicationMethod', 'applicationUrl', 'officialSourceUrl',
      'studyLanguageReferenceId', 'studyLanguageSourceLabel', 'benefits', 'degreeTargets', 'majorTargets',
      'eligibilityItems', 'requiredDocumentItems', 'universityLinks',
    ]);
    return Object.keys(updates).some((key) => structuralKeys.has(key));
  }

  private jsonSafe(value: unknown): Prisma.InputJsonValue {
    if (value === null || value === undefined) return null as unknown as Prisma.InputJsonValue;
    if (typeof value === 'string' || typeof value === 'boolean') return value;
    if (typeof value === 'number') return Number.isFinite(value) ? value : String(value);
    if (typeof value === 'bigint') return value.toString();
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return value.map((item) => this.jsonSafe(item)) as Prisma.InputJsonArray;
    if (typeof value === 'object') {
      const serializable = value as { toJSON?: () => unknown };
      if (typeof serializable.toJSON === 'function') return this.jsonSafe(serializable.toJSON());
      const result: Record<string, Prisma.InputJsonValue> = {};
      for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
        if (item !== undefined && typeof item !== 'function' && typeof item !== 'symbol') result[key] = this.jsonSafe(item);
      }
      return result as Prisma.InputJsonObject;
    }
    return String(value);
  }

  private versionSnapshot(source: any): Prisma.InputJsonObject {
    const copy = { ...(source as Record<string, unknown>) };
    delete copy.versions; delete copy.sponsorContext; delete copy.applicationCycles; delete copy.optionalFields;
    return this.jsonSafe(copy) as Prisma.InputJsonObject;
  }

  private initialVersionData(data: CreateScholarshipDto): Record<string, unknown> {
    return {
      versionNumber: 1, status: 'DRAFT', sourceImportRecordId: data.sourceImportRecordId, snapshot: this.versionSnapshot(data),
      eligibilityRuleVersions: data.eligibilityItems?.length ? { create: data.eligibilityItems.map((item) => ({ ruleKey: item.itemKey, ruleVersionNumber: 1, definition: this.jsonSafe(item) })) } : undefined,
      awardPackageVersions: data.benefits?.length ? { create: data.benefits.map((item) => ({ packageKey: item.benefitKey, packageVersionNumber: 1, definition: this.jsonSafe(item) })) } : undefined,
    };
  }

  private applicationCycleData(source: any): { cycleKey: string; academicYear: string | null; closesAt: Date | null; status: string } {
    const academicYear = typeof source.academicYear === 'string' && source.academicYear.trim() ? source.academicYear.trim() : null;
    const closesAt = source.applicationDeadline instanceof Date ? source.applicationDeadline : source.applicationDeadline ? new Date(source.applicationDeadline) : null;
    const cycleName = typeof source.cycleName === 'string' && source.cycleName.trim() ? source.cycleName.trim() : 'DEFAULT';
    return { cycleKey: `${academicYear ?? 'NO_YEAR'}|${cycleName}|${closesAt?.toISOString() ?? 'ROLLING'}`, academicYear, closesAt, status: 'DRAFT' };
  }

  private async appendStructuralVersion(scholarshipId: string, record: any): Promise<{ id: string; versionNumber: number }> {
    const latest = await this.prisma.scholarshipVersion.findFirst({ where: { scholarshipId }, orderBy: { versionNumber: 'desc' } });
    const versionNumber = (latest?.versionNumber ?? 0) + 1;
    return this.prisma.scholarshipVersion.create({ data: {
      scholarshipId, versionNumber, status: 'DRAFT', sourceImportRecordId: record.sourceImportRecordId,
      snapshot: this.versionSnapshot(record),
      changeSummary: { kind: 'STRUCTURAL_UPDATE' },
      eligibilityRuleVersions: Array.isArray(record.eligibilityItems) && record.eligibilityItems.length ? { create: record.eligibilityItems.map((item: any) => ({ ruleKey: item.itemKey, ruleVersionNumber: 1, definition: this.versionSnapshot(item) })) } : undefined,
      awardPackageVersions: Array.isArray(record.benefits) && record.benefits.length ? { create: record.benefits.map((item: any) => ({ packageKey: item.benefitKey, packageVersionNumber: 1, definition: this.versionSnapshot(item) })) } : undefined,
    } } as any);
  }

  private asOptionalRecord(value: unknown): Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private toNestedCreate<T extends object>(
    items: readonly T[] | undefined,
  ): { create: Record<string, unknown>[] } | undefined {
    if (!items?.length) return undefined;
    return { create: items.map((item) => this.stripPersistenceFields(item)) };
  }

  private toNestedReplace<T extends object>(
    items: readonly T[] | undefined,
  ): { deleteMany: object; create: Record<string, unknown>[] } | undefined {
    if (items === undefined) return undefined;
    return {
      deleteMany: {},
      create: items.map((item) => this.stripPersistenceFields(item)),
    };
  }

  private stripPersistenceFields<T extends object>(item: T): Record<string, unknown> {
    const copy = { ...(item as Record<string, unknown>) };
    delete copy.id;
    delete copy.scholarshipId;
    delete copy.createdAt;
    delete copy.updatedAt;
    return copy;
  }
}

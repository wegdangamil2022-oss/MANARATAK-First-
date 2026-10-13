import { Prisma, PrismaClient } from '@prisma/client';
import {
  IStudyDestinationRepository,
  AtomicPersistenceContext,
  PaginatedStudyDestinationResult,
  StudyDestinationCompletenessStatus,
  StudyDestinationFilters,
  StudyDestinationLivingCostTier,
  StudyDestinationOfficialLink,
  StudyDestinationEvidenceSource,
  StudyDestinationCostHighlight,
  StudyDestinationProfileDto,
  StudyDestinationRepositoryCreateInput,
  StudyDestinationRepositoryUpdateInput,
  StudyDestinationStatus,
  StudyDestinationVerificationStatus,
} from '@manaratak/domain';

const array = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
const iso = (value: unknown): string | null =>
  value instanceof Date ? value.toISOString() : typeof value === 'string' ? value : null;
const num = (value: unknown): number | null =>
  value === null || value === undefined ? null : Number(value);

export class PrismaStudyDestinationRepository implements IStudyDestinationRepository {
  public constructor(private readonly prisma: PrismaClient | Prisma.TransactionClient, private readonly transactionBound = false) {}
  public withTransaction(context: AtomicPersistenceContext): IStudyDestinationRepository {
    const transactionClient = (context as AtomicPersistenceContext & {transactionClient?: Prisma.TransactionClient}).transactionClient;
    if (!context.boundaryId || !transactionClient) throw new Error('STUDY_DESTINATION_ATOMIC_TRANSACTION_REQUIRED');
    return new PrismaStudyDestinationRepository(transactionClient, true);
  }
  public async lockCountry(countryReferenceId: string): Promise<void> {
    if (!this.transactionBound) throw new Error('STUDY_DESTINATION_ATOMIC_TRANSACTION_REQUIRED');
    await this.prisma.$queryRaw`SELECT id FROM "ReferenceCountry" WHERE id = ${countryReferenceId} FOR UPDATE`;
  }
  private inTransaction<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.transactionBound ? operation(this.prisma) : (this.prisma as PrismaClient).$transaction(operation);
  }

  async reviewPolicy(){const row=await this.prisma.studyDestinationReviewPolicy.findUnique({where:{id:'source-review'}});return row?{maxEvidenceAgeDays:row.maxEvidenceAgeDays,updatedAt:row.updatedAt.toISOString()}:null;}
  async saveReviewPolicy(days:number|null,expectedUpdatedAt:string|null){
    if(!this.transactionBound)throw new Error('STUDY_DESTINATION_ATOMIC_TRANSACTION_REQUIRED');
    await this.prisma.$queryRaw`SELECT id FROM "StudyDestinationReviewPolicy" WHERE id='source-review' FOR UPDATE`;
    const current=await this.reviewPolicy();if((current?.updatedAt??null)!==expectedUpdatedAt)throw new Error('STUDY_DESTINATION_VERSION_CONFLICT');
    const row=await this.prisma.studyDestinationReviewPolicy.upsert({where:{id:'source-review'},create:{id:'source-review',maxEvidenceAgeDays:days},update:{maxEvidenceAgeDays:days}});return {maxEvidenceAgeDays:row.maxEvidenceAgeDays,updatedAt:row.updatedAt.toISOString()};
  }
  async appendRevision(profileId:string,actorId:string,action:string,reason:string,diff:unknown,proof:unknown){if(!this.transactionBound)throw new Error('STUDY_DESTINATION_ATOMIC_TRANSACTION_REQUIRED');await this.prisma.studyDestinationRevision.create({data:{profileId,actorId,action,reason,diff:diff as Prisma.InputJsonValue,proof:proof===null?Prisma.DbNull:proof as Prisma.InputJsonValue}});}
  async revisionPage(profileId:string,page:number){const where={profileId};const [rows,total]=await Promise.all([this.prisma.studyDestinationRevision.findMany({where,orderBy:[{createdAt:'desc'},{id:'asc'}],skip:(page-1)*20,take:20}),this.prisma.studyDestinationRevision.count({where})]);return {data:rows.map(row=>({...row,createdAt:row.createdAt.toISOString()})),total,page,totalPages:Math.ceil(total/20)};}

  private get profiles() {
    return this.prisma.studyDestinationProfile;
  }

  public async findByCountryReferenceIds(ids: string[]): Promise<StudyDestinationProfileDto[]> {
    const rows = await this.profiles.findMany({where: {countryReferenceId: {in: ids}}, include: {studyLanguages: true}});
    return rows.map(row => this.map(row));
  }

  public async findById(id: string): Promise<StudyDestinationProfileDto | null> {
    const row = await this.profiles.findUnique({
      where: { id },
      include: { studyLanguages: true },
    });
    return row ? this.map(row) : null;
  }

  public async findBySlug(slug: string): Promise<StudyDestinationProfileDto | null> {
    const row = await this.profiles.findUnique({
      where: { slug },
      include: { studyLanguages: true },
    });
    return row ? this.map(row) : null;
  }

  public async findByCountryReferenceId(
    countryReferenceId: string,
  ): Promise<StudyDestinationProfileDto | null> {
    const row = await this.profiles.findUnique({
      where: { countryReferenceId },
      include: { studyLanguages: true },
    });
    return row ? this.map(row) : null;
  }

  public async list(
    filters: StudyDestinationFilters,
  ): Promise<PaginatedStudyDestinationResult<StudyDestinationProfileDto>> {
    return this.listInternal(filters, false);
  }

  public async listPublished(
    filters: Omit<StudyDestinationFilters, 'status' | 'completenessStatus'>,
  ): Promise<PaginatedStudyDestinationResult<StudyDestinationProfileDto>> {
    return this.listInternal({ ...filters, status: StudyDestinationStatus.PUBLISHED }, true);
  }

  private async listInternal(
    filters: StudyDestinationFilters,
    publishedOnly: boolean,
  ): Promise<PaginatedStudyDestinationResult<StudyDestinationProfileDto>> {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 30));
    const policy=publishedOnly?await this.reviewPolicy():null;
    const where: Prisma.StudyDestinationProfileWhereInput = {
      status: publishedOnly ? StudyDestinationStatus.PUBLISHED : filters.status,
      completenessStatus: filters.completenessStatus,
      countryReferenceId: filters.countryReferenceId,
      isFeatured: filters.isFeatured,
      ...(policy?.maxEvidenceAgeDays!=null?{AND:[{sourceReviewProof:{path:['reviewedAt'],gte:new Date(Date.now()-policy.maxEvidenceAgeDays*86400000).toISOString()}}]}:{}),
      countryReference: publishedOnly ? { isActive: true, ...(filters.region?{region:filters.region}:{}), ...(filters.q?{OR:[{name:{contains:filters.q,mode:'insensitive'}},{nameAr:{contains:filters.q,mode:'insensitive'}},{iso2Code:{contains:filters.q,mode:'insensitive'}}]}:{}) } : undefined,
      ...(publishedOnly ? { sourceVerificationStatus: 'VERIFIED', sourceReviewProof: {not: Prisma.DbNull}, studyLanguages: {every: {language: {isActive: true}}}, OR: [{livingCostCurrencyReferenceId: null}, {livingCostCurrency: {isActive: true}}] } : {}),
    };
    const [rows, total] = await Promise.all([
      this.profiles.findMany({
        where,
        include: { studyLanguages: true },
        orderBy: [{ isFeatured: 'desc' }, { updatedAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.profiles.count({ where }),
    ]);
    return {
      data: rows.map((row) => this.map(row)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  public async create(
    data: StudyDestinationRepositoryCreateInput,
  ): Promise<StudyDestinationProfileDto> {
    const { studyLanguageReferenceIds = [], ...profile } = data;
    const row = await this.profiles.create({
      data: {
        ...this.persistence(profile),
        publicId: data.publicId,
        slug: data.slug,
        countryReferenceId: data.countryReferenceId,
        status: data.status,
        completenessStatus: data.completenessStatus,
        studyLanguages: studyLanguageReferenceIds.length
          ? {
              create: [...new Set(studyLanguageReferenceIds)].map((languageReferenceId) => ({
                languageReferenceId,
              })),
            }
          : undefined,
      },
      include: { studyLanguages: true },
    });
    return this.map(row);
  }

  public async update(
    id: string,
    data: StudyDestinationRepositoryUpdateInput,
    expectedUpdatedAt?: string,
  ): Promise<StudyDestinationProfileDto> {
    const { studyLanguageReferenceIds, ...profile } = data;
    return this.inTransaction(async (tx) => {
      if (expectedUpdatedAt) {
        const result = await tx.studyDestinationProfile.updateMany({
          where: { id, updatedAt: new Date(expectedUpdatedAt) },
          data: this.persistence(profile),
        });
        if (result.count !== 1) throw new Error('STUDY_DESTINATION_VERSION_CONFLICT');
      } else
        await tx.studyDestinationProfile.update({ where: { id }, data: this.persistence(profile) });
      if (studyLanguageReferenceIds !== undefined) {
        await tx.studyDestinationStudyLanguage.deleteMany({ where: { profileId: id } });
        const unique = [...new Set(studyLanguageReferenceIds)];
        if (unique.length)
          await tx.studyDestinationStudyLanguage.createMany({
            data: unique.map((languageReferenceId) => ({ profileId: id, languageReferenceId })),
          });
      }
      const row = await tx.studyDestinationProfile.findUnique({
        where: { id },
        include: { studyLanguages: true },
      });
      if (!row) throw new Error('STUDY_DESTINATION_NOT_FOUND');
      return this.map(row);
    });
  }

  private persistence(data: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = { ...data };
    const jsonFields = [
      'admissionHighlightsAr',
      'admissionHighlightsEn',
      'visaRequirementsAr',
      'visaRequirementsEn',
      'costHighlightsAr',
      'costHighlightsEn',
      'studentLifeHighlightsAr',
      'studentLifeHighlightsEn',
      'officialLinks',
      'evidenceSources',
    ];
    for (const key of jsonFields) {
      if (result[key] === undefined) continue;
      result[key] = result[key] ?? [];
    }
    if (result.sourceReviewProof === null) result.sourceReviewProof = Prisma.DbNull;
    if (typeof result.sourceAuditDate === 'string')
      result.sourceAuditDate = new Date(result.sourceAuditDate);
    if (typeof result.publishedAt === 'string') result.publishedAt = new Date(result.publishedAt);
    return result;
  }

  private map(row: Prisma.StudyDestinationProfileGetPayload<{include: {studyLanguages: true}}>): StudyDestinationProfileDto {
    return {
      lastEditedBy: row.lastEditedBy,
      sourceReviewProof: row.sourceReviewProof as unknown as StudyDestinationProfileDto['sourceReviewProof'],
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
      studyLanguageReferenceIds: (row.studyLanguages ?? []).map(
        (item) => item.languageReferenceId,
      ),
      isFeatured: Boolean(row.isFeatured),
      publishedAt: iso(row.publishedAt),
      createdAt: iso(row.createdAt) ?? new Date(0).toISOString(),
      updatedAt: iso(row.updatedAt) ?? new Date(0).toISOString(),
    };
  }
}

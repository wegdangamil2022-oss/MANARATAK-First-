import { PrismaClient } from '@prisma/client';
import {
  IStudyDestinationRepository,
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

const array = <T>(value: unknown): T[] => Array.isArray(value) ? value as T[] : [];
const iso = (value: unknown): string | null => value instanceof Date ? value.toISOString() : typeof value === 'string' ? value : null;
const num = (value: unknown): number | null => value === null || value === undefined ? null : Number(value);

export class PrismaStudyDestinationRepository implements IStudyDestinationRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  private get profiles(): any { return (this.prisma as any).studyDestinationProfile; }
  private get studyLanguages(): any { return (this.prisma as any).studyDestinationStudyLanguage; }

  public async findById(id: string): Promise<StudyDestinationProfileDto | null> {
    const row = await this.profiles.findUnique({ where: { id }, include: { studyLanguages: true } });
    return row ? this.map(row) : null;
  }

  public async findBySlug(slug: string): Promise<StudyDestinationProfileDto | null> {
    const row = await this.profiles.findUnique({ where: { slug }, include: { studyLanguages: true } });
    return row ? this.map(row) : null;
  }

  public async findByCountryReferenceId(countryReferenceId: string): Promise<StudyDestinationProfileDto | null> {
    const row = await this.profiles.findUnique({ where: { countryReferenceId }, include: { studyLanguages: true } });
    return row ? this.map(row) : null;
  }

  public async list(filters: StudyDestinationFilters): Promise<PaginatedStudyDestinationResult<StudyDestinationProfileDto>> {
    return this.listInternal(filters, false);
  }

  public async listPublished(filters: Omit<StudyDestinationFilters, 'status' | 'completenessStatus'>): Promise<PaginatedStudyDestinationResult<StudyDestinationProfileDto>> {
    return this.listInternal({ ...filters, status: StudyDestinationStatus.PUBLISHED }, true);
  }

  private async listInternal(filters: StudyDestinationFilters, publishedOnly: boolean): Promise<PaginatedStudyDestinationResult<StudyDestinationProfileDto>> {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 30));
    const where: any = {
      status: publishedOnly ? StudyDestinationStatus.PUBLISHED : filters.status,
      completenessStatus: filters.completenessStatus,
      countryReferenceId: filters.countryReferenceId,
      isFeatured: filters.isFeatured,
      countryReference: publishedOnly ? { isActive: true } : undefined,
    };
    Object.keys(where).forEach((key) => where[key] === undefined && delete where[key]);
    const [rows, total] = await Promise.all([
      this.profiles.findMany({
        where,
        include: { studyLanguages: true },
        orderBy: [{ isFeatured: 'desc' }, { updatedAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.profiles.count({ where }),
    ]);
    return {
      data: rows.map((row: any) => this.map(row)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  public async create(data: StudyDestinationRepositoryCreateInput): Promise<StudyDestinationProfileDto> {
    const { studyLanguageReferenceIds = [], ...profile } = data;
    const row = await this.profiles.create({
      data: {
        ...this.persistence(profile),
        publicId: data.publicId,
        slug: data.slug,
        countryReferenceId: data.countryReferenceId,
        status: data.status,
        completenessStatus: data.completenessStatus,
        studyLanguages: studyLanguageReferenceIds.length ? {
          create: [...new Set(studyLanguageReferenceIds)].map((languageReferenceId) => ({ languageReferenceId })),
        } : undefined,
      },
      include: { studyLanguages: true },
    });
    return this.map(row);
  }

  public async update(id: string, data: StudyDestinationRepositoryUpdateInput): Promise<StudyDestinationProfileDto> {
    const { studyLanguageReferenceIds, ...profile } = data;
    await this.profiles.update({ where: { id }, data: this.persistence(profile) });
    if (studyLanguageReferenceIds !== undefined) {
      await this.studyLanguages.deleteMany({ where: { profileId: id } });
      const unique = [...new Set(studyLanguageReferenceIds)];
      if (unique.length) {
        await this.studyLanguages.createMany({ data: unique.map((languageReferenceId) => ({ profileId: id, languageReferenceId })) });
      }
    }
    const row = await this.profiles.findUnique({ where: { id }, include: { studyLanguages: true } });
    if (!row) throw new Error('STUDY_DESTINATION_NOT_FOUND');
    return this.map(row);
  }

  private persistence(data: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = { ...data };
    const jsonFields = [
      'admissionHighlightsAr', 'admissionHighlightsEn', 'visaRequirementsAr', 'visaRequirementsEn',
      'costHighlightsAr', 'costHighlightsEn', 'studentLifeHighlightsAr', 'studentLifeHighlightsEn',
      'officialLinks', 'evidenceSources',
    ];
    for (const key of jsonFields) {
      if (result[key] === undefined) continue;
      result[key] = result[key] ?? [];
    }
    if (typeof result.sourceAuditDate === 'string') result.sourceAuditDate = new Date(result.sourceAuditDate);
    if (typeof result.publishedAt === 'string') result.publishedAt = new Date(result.publishedAt);
    return result;
  }

  private map(row: any): StudyDestinationProfileDto {
    return {
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
      studyLanguageReferenceIds: (row.studyLanguages ?? []).map((item: any) => item.languageReferenceId),
      isFeatured: Boolean(row.isFeatured),
      publishedAt: iso(row.publishedAt),
      createdAt: iso(row.createdAt) ?? new Date(0).toISOString(),
      updatedAt: iso(row.updatedAt) ?? new Date(0).toISOString(),
    };
  }
}

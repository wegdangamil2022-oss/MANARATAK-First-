import { Prisma, PrismaClient } from '@prisma/client';
import {
  CourseImportAnalysisDto,
  CourseImportChangeState,
  CourseImportMatchState,
  CourseSourceIdentityDto,
  CourseSourceIdentityStatus,
  CourseSourceIdentityStrategy,
  EnsureCourseSourceIdentityInput,
  ICourseImportAnalysisRepository,
  InitialCourseSourceUrlInput,
  UpsertCourseImportAnalysisInput,
} from '@manaratak/domain';

function toInputJson(value: Record<string, unknown> | undefined): Prisma.InputJsonObject | undefined {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;
}

export class PrismaCourseImportAnalysisRepository implements ICourseImportAnalysisRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async findAnalysisByImportRecordId(importRecordId: string): Promise<CourseImportAnalysisDto | null> {
    const record = await this.prisma.courseImportAnalysis.findUnique({ where: { importRecordId } });
    return record ? this.mapAnalysis(record) : null;
  }

  public async findSourceIdentityByKey(
    providerId: string,
    sourceNativeKey: string,
    languageVersionKey: string,
  ): Promise<CourseSourceIdentityDto | null> {
    const record = await this.prisma.courseSourceIdentity.findUnique({
      where: {
        providerId_sourceNativeKey_languageVersionKey: { providerId, sourceNativeKey, languageVersionKey },
      },
    });
    return record ? this.mapIdentity(record) : null;
  }

  public async findSourceIdentitiesByNormalizedTitle(
    providerId: string,
    normalizedOriginalTitle: string,
    languageVersionKey: string,
  ): Promise<CourseSourceIdentityDto[]> {
    const records = await this.prisma.courseSourceIdentity.findMany({
      where: { providerId, normalizedOriginalTitle, languageVersionKey },
      orderBy: { createdAt: 'asc' },
    });
    return records.map((record: any) => this.mapIdentity(record));
  }

  public async findSourceIdentitiesByNormalizedUrl(
    providerId: string,
    normalizedUrl: string,
    languageVersionKey: string,
  ): Promise<CourseSourceIdentityDto[]> {
    const records = await this.prisma.courseSourceIdentity.findMany({
      where: {
        providerId,
        languageVersionKey,
        urlHistory: { some: { normalizedUrl } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return records.map((record: any) => this.mapIdentity(record));
  }

  public async ensureSourceIdentity(input: EnsureCourseSourceIdentityInput): Promise<{
    identity: CourseSourceIdentityDto;
    created: boolean;
  }> {
    const existing = await this.findSourceIdentityByKey(
      input.providerId,
      input.sourceNativeKey,
      input.languageVersionKey,
    );
    if (existing) return { identity: existing, created: false };

    const observedAt = input.observedAt ?? new Date();
    try {
      const created = await this.prisma.courseSourceIdentity.create({
        data: {
          providerId: input.providerId,
          sourceNativeKey: input.sourceNativeKey,
          identityStrategy: input.identityStrategy,
          originalTitle: input.originalTitle,
          normalizedOriginalTitle: input.normalizedOriginalTitle,
          languageVersionKey: input.languageVersionKey,
          currentUrl: input.currentUrl,
          firstSeenAt: observedAt,
          lastSeenAt: observedAt,
          status: input.status ?? CourseSourceIdentityStatus.ACTIVE,
        },
      });
      return { identity: this.mapIdentity(created), created: true };
    } catch (error) {
      const raced = await this.findSourceIdentityByKey(
        input.providerId,
        input.sourceNativeKey,
        input.languageVersionKey,
      );
      if (raced) return { identity: raced, created: false };
      throw error;
    }
  }

  public async touchSourceIdentity(identityId: string, observedAt: Date = new Date()): Promise<void> {
    await this.prisma.courseSourceIdentity.update({
      where: { id: identityId },
      data: { lastSeenAt: observedAt },
    });
  }

  public async recordInitialUrl(input: InitialCourseSourceUrlInput): Promise<void> {
    const observedAt = input.observedAt ?? new Date();
    await this.prisma.courseSourceUrlHistory.upsert({
      where: {
        courseSourceIdentityId_normalizedUrl: {
          courseSourceIdentityId: input.courseSourceIdentityId,
          normalizedUrl: input.normalizedUrl,
        },
      },
      update: { lastSeenAt: observedAt },
      create: {
        courseSourceIdentityId: input.courseSourceIdentityId,
        url: input.url,
        normalizedUrl: input.normalizedUrl,
        isCurrent: true,
        firstSeenAt: observedAt,
        lastSeenAt: observedAt,
        verificationState: 'UNVERIFIED',
      },
    });
  }

  public async findLatestAnalysisForSourceKey(
    providerId: string,
    sourceNativeKey: string,
    languageVersionKey: string,
    excludeImportRecordId?: string,
  ): Promise<CourseImportAnalysisDto | null> {
    const records = await this.prisma.courseImportAnalysis.findMany({
      where: {
        resolvedProviderId: providerId,
        sourceNativeKey,
        ...(excludeImportRecordId ? { importRecordId: { not: excludeImportRecordId } } : {}),
      },
      orderBy: { analyzedAt: 'desc' },
      take: 50,
    });
    for (const record of records) {
      const payload = record.normalizedPayload;
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) continue;
      const identity = (payload as Record<string, unknown>).identity;
      if (!identity || typeof identity !== 'object' || Array.isArray(identity)) continue;
      if ((identity as Record<string, unknown>).languageVersionKey === languageVersionKey) {
        return this.mapAnalysis(record);
      }
    }
    return null;
  }

  public async upsertAnalysis(input: UpsertCourseImportAnalysisInput): Promise<CourseImportAnalysisDto> {
    const analyzedAt = input.analyzedAt ?? new Date();
    const data = {
      providerCandidateId: input.providerCandidateId ?? null,
      resolvedProviderId: input.resolvedProviderId ?? null,
      sourceNativeKey: input.sourceNativeKey ?? null,
      normalizedPayload: toInputJson(input.normalizedPayload)!,
      eligibilityState: input.eligibilityState,
      completenessState: input.completenessState,
      matchState: input.matchState,
      matchedCourseId: input.matchedCourseId ?? null,
      changeState: input.changeState,
      fieldDiffs: input.fieldDiffs ? toInputJson(input.fieldDiffs) : Prisma.DbNull,
      relationshipProposals: input.relationshipProposals ? toInputJson(input.relationshipProposals) : Prisma.DbNull,
      requiresReview: input.requiresReview,
      analyzedAt,
    };
    const record = await this.prisma.courseImportAnalysis.upsert({
      where: { importRecordId: input.importRecordId },
      update: data,
      create: { importRecordId: input.importRecordId, ...data },
    });
    return this.mapAnalysis(record);
  }

  private mapIdentity(record: any): CourseSourceIdentityDto {
    return {
      id: record.id,
      courseId: record.courseId ?? undefined,
      providerId: record.providerId,
      sourceNativeKey: record.sourceNativeKey,
      identityStrategy: record.identityStrategy as CourseSourceIdentityStrategy,
      originalTitle: record.originalTitle,
      normalizedOriginalTitle: record.normalizedOriginalTitle,
      languageVersionKey: record.languageVersionKey,
      currentUrl: record.currentUrl,
      firstSeenAt: record.firstSeenAt,
      lastSeenAt: record.lastSeenAt,
      status: record.status as CourseSourceIdentityStatus,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  private mapAnalysis(record: any): CourseImportAnalysisDto {
    return {
      id: record.id,
      importRecordId: record.importRecordId,
      providerCandidateId: record.providerCandidateId ?? undefined,
      resolvedProviderId: record.resolvedProviderId ?? undefined,
      sourceNativeKey: record.sourceNativeKey ?? undefined,
      normalizedPayload: record.normalizedPayload as Record<string, unknown>,
      eligibilityState: record.eligibilityState,
      completenessState: record.completenessState,
      matchState: record.matchState as CourseImportMatchState,
      matchedCourseId: record.matchedCourseId ?? undefined,
      changeState: record.changeState as CourseImportChangeState,
      fieldDiffs: record.fieldDiffs && typeof record.fieldDiffs === 'object' && !Array.isArray(record.fieldDiffs)
        ? record.fieldDiffs as Record<string, unknown>
        : undefined,
      relationshipProposals: record.relationshipProposals && typeof record.relationshipProposals === 'object' && !Array.isArray(record.relationshipProposals)
        ? record.relationshipProposals as Record<string, unknown>
        : undefined,
      requiresReview: record.requiresReview,
      analyzedAt: record.analyzedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}

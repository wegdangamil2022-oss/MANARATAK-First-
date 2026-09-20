import { Prisma, PrismaClient } from '@prisma/client';
import {
  CourseImportOperationsOverview,
  CourseImportReviewPage,
  ExternalCourseProviderImportStrategy,
  ExternalCourseProviderOperatingScope,
  ExternalCourseProviderStatus,
  IImportedCourseOperationsRepository,
  ImportedCourseAdminDetail,
  ImportedCourseAdminFilters,
  ImportedCourseAdminRecord,
  ImportedCourseLinkCheckResult,
  ImportedCourseLinkHealth,
  ImportedCourseOverview,
  ImportedCoursePage,
  ImportedCourseVerificationContext,
} from '@manaratak/domain';

const IMPORTED_ORIGIN = 'EXTERNAL_LINKED_COURSE';

function normalizeDomain(value: string): string {
  const raw = value.trim().toLowerCase();
  if (!raw) return '';
  try {
    return new URL(raw.includes('://') ? raw : `https://${raw}`).hostname.replace(/\.$/, '');
  } catch {
    return raw.split('/')[0].replace(/\.$/, '');
  }
}

function hostMatches(hostname: string, allowedDomain: string): boolean {
  const host = normalizeDomain(hostname);
  const allowed = normalizeDomain(allowedDomain);
  return Boolean(allowed) && (host === allowed || host.endsWith(`.${allowed}`));
}

function mapVerificationState(value?: string | null): ImportedCourseLinkHealth {
  switch (value) {
    case 'VERIFIED': return 'VERIFIED_DIRECT';
    case 'REDIRECTED': return 'REDIRECTED_VALID';
    case 'BROKEN': return 'BROKEN';
    case 'REJECTED': return 'BLOCKED_DOMAIN';
    case 'UNVERIFIED': return 'NEEDS_REVIEW';
    default: return 'UNKNOWN';
  }
}

function persistedVerificationState(value: ImportedCourseLinkHealth): string {
  switch (value) {
    case 'VERIFIED_DIRECT': return 'VERIFIED';
    case 'REDIRECTED_VALID': return 'REDIRECTED';
    case 'BROKEN': return 'BROKEN';
    case 'BLOCKED_DOMAIN':
    case 'NOT_DIRECT_COURSE_PAGE':
      return 'REJECTED';
    case 'NEEDS_REVIEW':
    case 'UNKNOWN':
    default:
      return 'UNVERIFIED';
  }
}

function pageNumber(value: unknown, fallback: number): number {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function pageSize(value: unknown, fallback: number): number {
  return Math.min(100, Math.max(1, pageNumber(value, fallback)));
}

export class PrismaImportedCourseOperationsRepository implements IImportedCourseOperationsRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async listImportedCourses(filters: ImportedCourseAdminFilters): Promise<ImportedCoursePage> {
    const page = pageNumber(filters.page, 1);
    const size = pageSize(filters.pageSize, 50);
    const where = this.courseWhere(filters);

    const [records, total, overview] = await Promise.all([
      this.prisma.course.findMany({
        where,
        skip: (page - 1) * size,
        take: size,
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        include: this.courseIncludes(),
      }),
      this.prisma.course.count({ where }),
      this.getOverview(),
    ]);

    return {
      data: records.map((record: any) => this.mapCourse(record)),
      total,
      page,
      pageSize: size,
      totalPages: Math.ceil(total / size),
      overview,
    };
  }

  public async getImportedCourseById(id: string): Promise<ImportedCourseAdminDetail | null> {
    const record = await this.prisma.course.findFirst({
      where: {
        originType: IMPORTED_ORIGIN,
        OR: [{ id }, { publicId: id }, { slug: id }],
      },
      include: {
        ...this.courseIncludes(),
        fieldProvenance: {
          orderBy: { importedAt: 'desc' },
          take: 200,
        },
      },
    });
    if (!record) return null;

    const mapped = this.mapCourse(record) as ImportedCourseAdminDetail;
    const analysis = record.sourceImportRecordId
      ? await this.prisma.courseImportAnalysis.findUnique({
          where: { importRecordId: record.sourceImportRecordId },
        })
      : null;

    const sourceIdentity = (record as any).sourceIdentities?.[0] ?? null;
    mapped.provider = record.externalProvider
      ? this.mapProvider(record.externalProvider)
      : null;
    mapped.sourceIdentity = sourceIdentity
      ? {
          id: sourceIdentity.id,
          providerId: sourceIdentity.providerId,
          sourceNativeKey: sourceIdentity.sourceNativeKey,
          identityStrategy: sourceIdentity.identityStrategy,
          originalTitle: sourceIdentity.originalTitle,
          languageVersionKey: sourceIdentity.languageVersionKey,
          currentUrl: sourceIdentity.currentUrl,
          status: sourceIdentity.status,
        }
      : null;
    mapped.importAnalysis = analysis
      ? {
          id: analysis.id,
          importRecordId: analysis.importRecordId,
          changeState: analysis.changeState,
          requiresReview: analysis.requiresReview,
          fieldDiffs: this.objectOrNull(analysis.fieldDiffs),
          relationshipProposals: this.objectOrNull(analysis.relationshipProposals),
          analyzedAt: analysis.analyzedAt,
        }
      : null;
    mapped.provenance = ((record as any).fieldProvenance ?? []).map((item: any) => ({
      fieldKey: item.fieldKey,
      importRecordId: item.importRecordId,
      providerId: item.providerId,
      sourceUrl: item.sourceUrl,
      importedAt: item.importedAt,
      reviewedBy: item.reviewedBy,
      reviewStatus: item.reviewStatus,
    }));
    return mapped;
  }

  public async getOverview(): Promise<ImportedCourseOverview> {
    const base: Prisma.CourseWhereInput = { originType: IMPORTED_ORIGIN };
    const [total, review, incomplete, broken, needsVerification, ready, published, archived] = await Promise.all([
      this.prisma.course.count({ where: base }),
      this.prisma.course.count({
        where: {
          ...base,
          status: { in: ['IMPORTED', 'INCOMPLETE', 'READY_TO_REVIEW'] },
        },
      }),
      this.prisma.course.count({
        where: {
          ...base,
          completenessStatus: 'INCOMPLETE',
        },
      }),
      this.prisma.course.count({
        where: {
          ...base,
          sourceIdentities: {
            some: { urlHistory: { some: { isCurrent: true, verificationState: 'BROKEN' } } },
          },
        },
      }),
      this.prisma.course.count({
        where: {
          ...base,
          OR: [
            {
              sourceIdentities: {
                some: {
                  urlHistory: {
                    some: {
                      isCurrent: true,
                      verificationState: 'UNVERIFIED',
                    },
                  },
                },
              },
            },
            {
              sourceIdentities: {
                none: {
                  urlHistory: {
                    some: { isCurrent: true },
                  },
                },
              },
            },
          ],
        },
      }),
      this.prisma.course.count({ where: { ...base, status: 'READY_TO_PUBLISH' } }),
      this.prisma.course.count({ where: { ...base, status: 'PUBLISHED' } }),
      this.prisma.course.count({ where: { ...base, status: 'ARCHIVED' } }),
    ]);

    return {
      total,
      review,
      incomplete,
      broken,
      needsVerification,
      ready,
      published,
      archived,
    };
  }

  public async getVerificationContext(courseId: string): Promise<ImportedCourseVerificationContext | null> {
    const course = await this.prisma.course.findFirst({
      where: {
        originType: IMPORTED_ORIGIN,
        OR: [{ id: courseId }, { publicId: courseId }, { slug: courseId }],
      },
      select: {
        id: true,
        directCourseUrl: true,
        externalProviderId: true,
        sourceIdentities: {
          where: { status: 'ACTIVE' },
          orderBy: { updatedAt: 'desc' },
          take: 1,
          select: { id: true },
        },
      },
    });
    if (!course) return null;
    return {
      courseId: course.id,
      directCourseUrl: course.directCourseUrl,
      providerId: course.externalProviderId,
      sourceIdentityId: course.sourceIdentities[0]?.id ?? null,
    };
  }

  public async recordLinkCheck(
    courseId: string,
    result: ImportedCourseLinkCheckResult,
    checkedUrl: string,
  ): Promise<void> {
    const context = await this.getVerificationContext(courseId);
    if (!context) throw new Error('IMPORTED_COURSE_NOT_FOUND');
    if (!context.sourceIdentityId) throw new Error('IMPORTED_COURSE_SOURCE_IDENTITY_REQUIRED');

    const normalizedUrl = this.normalizeUrl(context.directCourseUrl);
    if (this.normalizeUrl(checkedUrl) !== normalizedUrl) {
      // A link check may finish after a controlled import changed the URL. Never
      // attach that older result to the newer URL's current history record.
      throw new Error('IMPORTED_COURSE_LINK_CHECK_STALE_URL');
    }
    const existing = await this.prisma.courseSourceUrlHistory.findUnique({
      where: {
        courseSourceIdentityId_normalizedUrl: {
          courseSourceIdentityId: context.sourceIdentityId,
          normalizedUrl,
        },
      },
    });

    await this.prisma.$transaction([
      this.prisma.courseSourceUrlHistory.updateMany({
        where: { courseSourceIdentityId: context.sourceIdentityId },
        data: { isCurrent: false },
      }),
      this.prisma.courseSourceUrlHistory.upsert({
        where: {
          courseSourceIdentityId_normalizedUrl: {
            courseSourceIdentityId: context.sourceIdentityId,
            normalizedUrl,
          },
        },
        update: {
          url: context.directCourseUrl,
          isCurrent: true,
          lastSeenAt: result.checkedAt,
          verificationState: persistedVerificationState(result.state),
          responseCode: result.responseCode ?? null,
          redirectTarget: result.redirectTarget ?? null,
          checkedAt: result.checkedAt,
        },
        create: {
          courseSourceIdentityId: context.sourceIdentityId,
          url: context.directCourseUrl,
          normalizedUrl,
          isCurrent: true,
          firstSeenAt: existing?.firstSeenAt ?? result.checkedAt,
          lastSeenAt: result.checkedAt,
          verificationState: persistedVerificationState(result.state),
          responseCode: result.responseCode ?? null,
          redirectTarget: result.redirectTarget ?? null,
          checkedAt: result.checkedAt,
        },
      }),
      this.prisma.courseSourceIdentity.update({
        where: { id: context.sourceIdentityId },
        data: {
          currentUrl: context.directCourseUrl,
          lastSeenAt: result.checkedAt,
        },
      }),
    ]);
  }

  public async getImportOperationsOverview(): Promise<CourseImportOperationsOverview> {
    const courseBatchWhere = { dataType: 'COURSES' };
    const [
      providersTotal,
      providersApproved,
      batchesTotal,
      recordsTotal,
      reviewRequired,
      transferred,
      latestBatch,
    ] = await Promise.all([
      this.prisma.externalCourseProvider.count(),
      this.prisma.externalCourseProvider.count({ where: { status: 'APPROVED' } }),
      this.prisma.importBatch.count({ where: courseBatchWhere }),
      this.prisma.importRecord.count({ where: { batch: courseBatchWhere } }),
      this.prisma.courseImportAnalysis.count({ where: { requiresReview: true } }),
      this.prisma.importRecord.count({
        where: {
          batch: courseBatchWhere,
          promotedEntityId: { not: null },
        },
      }),
      this.prisma.importBatch.findFirst({
        where: courseBatchWhere,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      providersTotal,
      providersApproved,
      batchesTotal,
      recordsTotal,
      reviewRequired,
      transferred,
      latestBatch: latestBatch
        ? {
            id: latestBatch.id,
            sourceSystem: latestBatch.sourceSystem,
            batchStatus: latestBatch.batchStatus,
            totalRecords: latestBatch.totalRecords,
            processedRecords: latestBatch.processedRecords,
            failedRecords: latestBatch.failedRecords,
            createdAt: latestBatch.createdAt,
          }
        : null,
    };
  }

  public async listCourseBatches(limit: number = 50): Promise<any[]> {
    const bounded = Math.min(100, Math.max(1, Number.isFinite(limit) ? Math.floor(limit) : 50));
    return this.prisma.importBatch.findMany({
      where: { dataType: 'COURSES' },
      orderBy: { createdAt: 'desc' },
      take: bounded,
      select: {
        id: true,
        sourceSystem: true,
        dataType: true,
        batchStatus: true,
        totalRecords: true,
        processedRecords: true,
        failedRecords: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  public async listProviderCourseBatches(input: {
    providerPublicId: string;
    sourcePrefix?: string;
    limit?: number;
  }): Promise<{ data: any[]; total: number }> {
    const where: Prisma.ImportBatchWhereInput = {
      dataType: 'COURSES',
      ...(input.sourcePrefix
        ? { sourceSystem: { startsWith: input.sourcePrefix } }
        : { OR: [
          { sourceSystem: { startsWith: `COURSE_PROVIDER_FILE:${input.providerPublicId}:` } },
          { sourceSystem: { startsWith: `COURSE_PROVIDER_CONNECTOR:${input.providerPublicId}:` } },
        ] }),
    };
    const take = Math.min(100, Math.max(1, input.limit ?? 50));
    const [data, total] = await Promise.all([
      this.prisma.importBatch.findMany({
        where, take, orderBy: { createdAt: 'desc' },
        select: { id: true, sourceSystem: true, dataType: true, batchStatus: true, totalRecords: true, processedRecords: true, failedRecords: true, createdAt: true, updatedAt: true },
      }),
      this.prisma.importBatch.count({ where }),
    ]);
    return { data, total };
  }

  public async getCourseBatchById(id: string): Promise<any | null> {
    return this.prisma.importBatch.findFirst({
      where: { id, dataType: 'COURSES' },
      select: {
        id: true,
        sourceSystem: true,
        dataType: true,
        batchStatus: true,
        totalRecords: true,
        processedRecords: true,
        failedRecords: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  public async listReviewQueue(input: { page?: number; pageSize?: number } = {}): Promise<CourseImportReviewPage> {
    const page = pageNumber(input.page, 1);
    const size = pageSize(input.pageSize, 50);
    const offset = (page - 1) * size;

    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT
        a."importRecordId",
        r."batchId",
        r."status" AS "recordStatus",
        r."sourceRowNumber",
        a."resolvedProviderId",
        p."displayName" AS "providerName",
        a."normalizedPayload",
        a."changeState",
        a."requiresReview",
        a."matchedCourseId",
        r."promotedEntityId",
        r."validationErrors",
        a."analyzedAt",
        r."createdAt" AS "recordCreatedAt"
      FROM "CourseImportAnalysis" a
      INNER JOIN "ImportRecord" r ON r."id" = a."importRecordId"
      INNER JOIN "ImportBatch" b ON b."id" = r."batchId"
      LEFT JOIN "ExternalCourseProvider" p ON p."id" = a."resolvedProviderId"
      WHERE b."dataType" = 'COURSES'
        AND (
          a."requiresReview" = TRUE
          OR a."changeState" IN (
            'URL_CHANGED',
            'METADATA_CHANGED',
            'URL_AND_METADATA_CHANGED',
            'AMBIGUOUS_MATCH',
            'CONFLICT',
            'INVALID',
            'INCOMPLETE'
          )
        )
      ORDER BY a."analyzedAt" DESC
      LIMIT ${size}
      OFFSET ${offset}
    `;

    const countRows = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS "count"
      FROM "CourseImportAnalysis" a
      INNER JOIN "ImportRecord" r ON r."id" = a."importRecordId"
      INNER JOIN "ImportBatch" b ON b."id" = r."batchId"
      WHERE b."dataType" = 'COURSES'
        AND (
          a."requiresReview" = TRUE
          OR a."changeState" IN (
            'URL_CHANGED',
            'METADATA_CHANGED',
            'URL_AND_METADATA_CHANGED',
            'AMBIGUOUS_MATCH',
            'CONFLICT',
            'INVALID',
            'INCOMPLETE'
          )
        )
    `;

    const total = Number(countRows[0]?.count ?? 0);
    const data = rows.map((row: any) => {
      const payload = this.objectOrNull(row.normalizedPayload) ?? {};
      const normalizedRow = this.objectOrNull(payload.row) ?? payload;
      return {
        importRecordId: row.importRecordId,
        batchId: row.batchId,
        status: row.recordStatus,
        sourceRowNumber: row.sourceRowNumber,
        providerId: row.resolvedProviderId,
        providerName: row.providerName ?? null,
        courseName: this.stringValue(normalizedRow.courseName ?? normalizedRow['Course Name']),
        directCourseUrl: this.stringValue(normalizedRow.directCourseUrl ?? normalizedRow['Direct Course URL']),
        changeState: row.changeState,
        requiresReview: row.requiresReview,
        matchedCourseId: row.matchedCourseId,
        promotedEntityId: row.promotedEntityId,
        validationErrors: row.validationErrors,
        analyzedAt: row.analyzedAt,
        createdAt: row.recordCreatedAt,
      };
    });

    return {
      data,
      total,
      page,
      pageSize: size,
      totalPages: Math.ceil(total / size),
    };
  }

  public async listProviderReviewQueue(providerId: string, input: { page?: number; pageSize?: number } = {}): Promise<CourseImportReviewPage> {
    const page = pageNumber(input.page, 1);
    const size = pageSize(input.pageSize, 50);
    const offset = (page - 1) * size;
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT a."importRecordId", r."batchId", r."status" AS "recordStatus", r."sourceRowNumber",
        a."resolvedProviderId", p."displayName" AS "providerName", a."normalizedPayload", a."changeState",
        a."requiresReview", a."matchedCourseId", r."promotedEntityId", r."validationErrors", a."analyzedAt", r."createdAt" AS "recordCreatedAt"
      FROM "CourseImportAnalysis" a
      INNER JOIN "ImportRecord" r ON r."id" = a."importRecordId"
      INNER JOIN "ImportBatch" b ON b."id" = r."batchId"
      LEFT JOIN "ExternalCourseProvider" p ON p."id" = a."resolvedProviderId"
      WHERE b."dataType" = 'COURSES' AND a."resolvedProviderId" = ${providerId}
        AND (a."requiresReview" = TRUE OR a."changeState" IN ('URL_CHANGED','METADATA_CHANGED','URL_AND_METADATA_CHANGED','AMBIGUOUS_MATCH','CONFLICT','INVALID','INCOMPLETE'))
      ORDER BY a."analyzedAt" DESC LIMIT ${size} OFFSET ${offset}`;
    const countRows = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS "count" FROM "CourseImportAnalysis" a
      INNER JOIN "ImportRecord" r ON r."id" = a."importRecordId"
      INNER JOIN "ImportBatch" b ON b."id" = r."batchId"
      WHERE b."dataType" = 'COURSES' AND a."resolvedProviderId" = ${providerId}
        AND (a."requiresReview" = TRUE OR a."changeState" IN ('URL_CHANGED','METADATA_CHANGED','URL_AND_METADATA_CHANGED','AMBIGUOUS_MATCH','CONFLICT','INVALID','INCOMPLETE'))`;
    const total = Number(countRows[0]?.count ?? 0);
    return {
      data: rows.map((row: any) => {
        const payload = this.objectOrNull(row.normalizedPayload) ?? {};
        const normalizedRow = this.objectOrNull(payload.row) ?? payload;
        return { importRecordId: row.importRecordId, batchId: row.batchId, status: row.recordStatus, sourceRowNumber: row.sourceRowNumber, providerId: row.resolvedProviderId, providerName: row.providerName ?? null, courseName: this.stringValue(normalizedRow.courseName ?? normalizedRow['Course Name']), directCourseUrl: this.stringValue(normalizedRow.directCourseUrl ?? normalizedRow['Direct Course URL']), changeState: row.changeState, requiresReview: row.requiresReview, matchedCourseId: row.matchedCourseId, promotedEntityId: row.promotedEntityId, validationErrors: row.validationErrors, analyzedAt: row.analyzedAt, createdAt: row.recordCreatedAt };
      }), total, page, pageSize: size, totalPages: Math.ceil(total / size),
    };
  }

  public async getProviderReviewSummary(providerId: string): Promise<{ reviewRequiredCount: number; changedLinkQueueCount: number }> {
    const rows = await this.prisma.$queryRaw<Array<{ reviewCount: bigint; changedCount: bigint }>>`
      SELECT COUNT(*)::bigint AS "reviewCount",
        COUNT(*) FILTER (WHERE a."changeState" IN ('URL_CHANGED','URL_AND_METADATA_CHANGED'))::bigint AS "changedCount"
      FROM "CourseImportAnalysis" a INNER JOIN "ImportRecord" r ON r."id" = a."importRecordId"
      INNER JOIN "ImportBatch" b ON b."id" = r."batchId"
      WHERE b."dataType" = 'COURSES' AND a."resolvedProviderId" = ${providerId}
        AND (a."requiresReview" = TRUE OR a."changeState" IN ('URL_CHANGED','METADATA_CHANGED','URL_AND_METADATA_CHANGED','AMBIGUOUS_MATCH','CONFLICT','INVALID','INCOMPLETE'))`;
    return { reviewRequiredCount: Number(rows[0]?.reviewCount ?? 0), changedLinkQueueCount: Number(rows[0]?.changedCount ?? 0) };
  }

  private courseWhere(filters: ImportedCourseAdminFilters): Prisma.CourseWhereInput {
    const where: Prisma.CourseWhereInput = { originType: IMPORTED_ORIGIN };

    if (filters.q?.trim()) {
      const q = filters.q.trim();
      where.OR = [
        { displayName: { contains: q, mode: 'insensitive' } },
        { canonicalName: { contains: q, mode: 'insensitive' } },
        { originalSourceTitle: { contains: q, mode: 'insensitive' } },
        { providerName: { contains: q, mode: 'insensitive' } },
        { platformName: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (filters.providerId) where.externalProviderId = filters.providerId;
    if (filters.status) where.status = filters.status;
    if (filters.completenessStatus) where.completenessStatus = filters.completenessStatus;
    if (filters.language) where.learningLanguageRaw = { equals: filters.language, mode: 'insensitive' };
    if (filters.freeMode === 'FREE_STUDY') where.isStudyFree = true;
    if (filters.freeMode === 'FREE_CERTIFICATE') where.isFreeCertificate = true;

    if (filters.linkHealth) {
      const state = filters.linkHealth;
      if (state === 'VERIFIED_DIRECT') {
        where.sourceIdentities = { some: { urlHistory: { some: { isCurrent: true, verificationState: 'VERIFIED' } } } };
      } else if (state === 'REDIRECTED_VALID') {
        where.sourceIdentities = { some: { urlHistory: { some: { isCurrent: true, verificationState: 'REDIRECTED' } } } };
      } else if (state === 'BROKEN') {
        where.sourceIdentities = { some: { urlHistory: { some: { isCurrent: true, verificationState: 'BROKEN' } } } };
      } else if (state === 'BLOCKED_DOMAIN' || state === 'NOT_DIRECT_COURSE_PAGE') {
        where.sourceIdentities = { some: { urlHistory: { some: { isCurrent: true, verificationState: 'REJECTED' } } } };
      } else if (state === 'NEEDS_REVIEW') {
        where.sourceIdentities = { some: { urlHistory: { some: { isCurrent: true, verificationState: 'UNVERIFIED' } } } };
      } else if (state === 'UNKNOWN') {
        where.sourceIdentities = {
          none: { urlHistory: { some: { isCurrent: true } } },
        };
      }
    }

    return where;
  }

  private courseIncludes(): any {
    return {
      externalProvider: {
        include: {
          aliases: true,
          allowedDomains: true,
        },
      },
      sourceIdentities: {
        where: { status: 'ACTIVE' },
        orderBy: { updatedAt: 'desc' },
        take: 1,
        include: {
          urlHistory: {
            where: { isCurrent: true },
            orderBy: { checkedAt: 'desc' },
            take: 1,
          },
        },
      },
    };
  }

  private mapCourse(record: any): ImportedCourseAdminRecord {
    const provider = record.externalProvider ?? null;
    const sourceIdentity = record.sourceIdentities?.[0] ?? null;
    const urlState = sourceIdentity?.urlHistory?.[0] ?? null;
    const sourceVerified = this.sourceVerified(record.directCourseUrl, provider);
    const missingFields = this.missingFields(record);

    return {
      id: record.id,
      publicId: record.publicId,
      slug: record.slug,
      displayName: record.displayName,
      canonicalName: record.canonicalName,
      originalSourceTitle: record.originalSourceTitle,
      accessType: record.accessType,
      originType: record.originType,
      directCourseUrl: record.directCourseUrl,
      status: record.status,
      completenessStatus: record.completenessStatus,
      externalProviderId: record.externalProviderId,
      providerName: provider?.displayName ?? record.providerName,
      platformName: record.platformName,
      isStudyFree: record.isStudyFree,
      isFreeCertificate: record.isFreeCertificate,
      certificateType: record.certificateType,
      learningLanguageRaw: record.learningLanguageRaw,
      studyLevelRaw: record.studyLevelRaw,
      studyDurationRaw: record.studyDurationRaw,
      shortCourseTopicsRaw: record.shortCourseTopicsRaw,
      sourceImportRecordId: record.sourceImportRecordId,
      sourceVerified,
      sourceVerificationReason: sourceVerified
        ? 'APPROVED_PROVIDER_AND_DOMAIN'
        : provider
          ? 'PROVIDER_OR_DOMAIN_NOT_APPROVED'
          : 'PROVIDER_NOT_LINKED',
      linkHealth: mapVerificationState(urlState?.verificationState),
      linkResponseCode: urlState?.responseCode,
      linkRedirectTarget: urlState?.redirectTarget,
      linkCheckedAt: urlState?.checkedAt,
      missingFields,
      missingFieldsCount: missingFields.length,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  private sourceVerified(url: string, provider: any): boolean {
    if (!provider || provider.status !== 'APPROVED') return false;
    let hostname: string;
    try {
      hostname = new URL(url).hostname;
    } catch {
      return false;
    }
    return (provider.allowedDomains ?? []).some((item: any) =>
      hostMatches(hostname, item.normalizedDomain ?? item.domain),
    );
  }

  private missingFields(record: any): string[] {
    const checks: Array<[string, unknown]> = [
      ['externalProviderId', record.externalProviderId],
      ['originalSourceTitle', record.originalSourceTitle],
      ['directCourseUrl', record.directCourseUrl],
      ['isStudyFree', record.isStudyFree],
      ['isFreeCertificate', record.isFreeCertificate],
      ['certificateType', record.certificateType],
      ['learningLanguageRaw', record.learningLanguageRaw],
      ['studyLevelRaw', record.studyLevelRaw],
      ['studyDurationRaw', record.studyDurationRaw],
      ['shortCourseTopicsRaw', record.shortCourseTopicsRaw],
    ];
    return checks
      .filter(([, value]) => value === null || value === undefined || value === '')
      .map(([key]) => key);
  }

  private mapProvider(record: any): any {
    return {
      id: record.id,
      publicId: record.publicId,
      slug: record.slug,
      canonicalName: record.canonicalName,
      normalizedCanonicalName: record.normalizedCanonicalName,
      displayName: record.displayName,
      providerType: record.providerType ?? undefined,
      status: record.status as ExternalCourseProviderStatus,
      officialWebsite: record.officialWebsite ?? undefined,
      operatingScope: record.operatingScope as ExternalCourseProviderOperatingScope | undefined,
      headquartersCountryReferenceId: record.headquartersCountryReferenceId ?? undefined,
      sourceTrustLevel: record.sourceTrustLevel,
      importStrategy: record.importStrategy as ExternalCourseProviderImportStrategy,
      connectorKey: record.connectorKey ?? undefined,
      connectorVersion: record.connectorVersion ?? undefined,
      lastVerifiedAt: record.lastVerifiedAt ?? undefined,
      allowedDomains: (record.allowedDomains ?? []).map((item: any) => item.normalizedDomain ?? item.domain),
      aliases: (record.aliases ?? []).map((alias: any) => ({
        id: alias.id,
        providerId: alias.providerId,
        alias: alias.alias,
        normalizedAlias: alias.normalizedAlias,
        locale: alias.locale ?? undefined,
        source: alias.source ?? undefined,
        createdAt: alias.createdAt,
        updatedAt: alias.updatedAt,
      })),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  private normalizeUrl(value: string): string {
    const parsed = new URL(value);
    parsed.hash = '';
    const keys = [...parsed.searchParams.keys()]
      .filter((key) => key.toLowerCase().startsWith('utm_') || ['gclid', 'fbclid'].includes(key.toLowerCase()));
    keys.forEach((key) => parsed.searchParams.delete(key));
    parsed.hostname = parsed.hostname.toLowerCase();
    if (parsed.pathname !== '/') parsed.pathname = parsed.pathname.replace(/\/+$/, '');
    return parsed.toString();
  }

  private objectOrNull(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  }

  private stringValue(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }
}

import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaImportPromotionLinkWriter } from '../import-foundation/PrismaImportPromotionLinkWriter';
import type { AtomicPersistenceContext } from '@manaratak/domain';
import type {
  CourseFieldProvenanceWrite,
  CourseImportTransferAnalysis,
  CourseImportTransferBatch,
  CourseImportTransferGateway,
  CourseImportTransferSourceIdentity,
  CourseImportTransferStoredRecord,
} from '@manaratak/application';

interface CourseTransferTransactionContext extends AtomicPersistenceContext {
  readonly transactionClient: Prisma.TransactionClient;
}

function asObject(value: Prisma.JsonValue | null): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

export class PrismaCourseImportTransferGateway implements CourseImportTransferGateway {
  public constructor(
    private readonly prisma: PrismaClient,
    private readonly importPromotionWriter = new PrismaImportPromotionLinkWriter(prisma),
  ) {}

  public withTransaction(context: AtomicPersistenceContext): CourseImportTransferGateway {
    const transactionClient = (context as Partial<CourseTransferTransactionContext>).transactionClient;
    if (!context.boundaryId || !transactionClient) {
      throw new Error('COURSE_IMPORT_ATOMIC_TRANSACTION_CONTEXT_REQUIRED');
    }
    const transactionPrisma = transactionClient as unknown as PrismaClient;
    return new PrismaCourseImportTransferGateway(
      transactionPrisma,
      new PrismaImportPromotionLinkWriter(transactionPrisma),
    );
  }

  public async getRecordById(recordId: string): Promise<CourseImportTransferStoredRecord | null> {
    const record = await this.prisma.importRecord.findUnique({ where: { id: recordId } });
    if (!record) return null;
    return {
      id: record.id,
      batchId: record.batchId,
      status: record.status,
      rawPayload: record.rawPayload,
      validationErrors: record.validationErrors ?? undefined,
      processingNotes: record.processingNotes,
      promotedEntityId: record.promotedEntityId,
      sourceRowNumber: record.sourceRowNumber,
      updatedAt: record.updatedAt,
    };
  }

  public async getBatchById(batchId: string): Promise<CourseImportTransferBatch | null> {
    const batch = await this.prisma.importBatch.findUnique({ where: { id: batchId } });
    return batch ? { id: batch.id, dataType: batch.dataType, batchStatus: batch.batchStatus } : null;
  }

  public async getAnalysisByRecordId(recordId: string): Promise<CourseImportTransferAnalysis | null> {
    const record = await this.prisma.courseImportAnalysis.findUnique({ where: { importRecordId: recordId } });
    if (!record) return null;
    return {
      id: record.id,
      importRecordId: record.importRecordId,
      resolvedProviderId: record.resolvedProviderId,
      sourceNativeKey: record.sourceNativeKey,
      normalizedPayload: asObject(record.normalizedPayload) ?? {},
      eligibilityState: record.eligibilityState,
      completenessState: record.completenessState,
      matchState: record.matchState,
      matchedCourseId: record.matchedCourseId,
      changeState: record.changeState,
      fieldDiffs: asObject(record.fieldDiffs),
      relationshipProposals: asObject(record.relationshipProposals),
      requiresReview: record.requiresReview,
      analyzedAt: record.analyzedAt,
      updatedAt: record.updatedAt,
    };
  }

  public async getSourceIdentity(identityId: string): Promise<CourseImportTransferSourceIdentity | null> {
    const record = await this.prisma.courseSourceIdentity.findUnique({ where: { id: identityId } });
    if (!record) return null;
    return {
      id: record.id,
      courseId: record.courseId,
      providerId: record.providerId,
      sourceNativeKey: record.sourceNativeKey,
      languageVersionKey: record.languageVersionKey,
      currentUrl: record.currentUrl,
      status: record.status,
    };
  }

  public async updateImportLink(input: {
    recordId: string;
    courseId: string;
    processingNotes: string;
  }): Promise<void> {
    await this.importPromotionWriter.recordPromotion(input);
  }

  public async linkAnalysisCourse(input: {
    importRecordId: string;
    courseId: string;
    eligibilityState: string;
    completenessState: string;
  }): Promise<void> {
    await this.prisma.courseImportAnalysis.update({
      where: { importRecordId: input.importRecordId },
      data: {
        matchedCourseId: input.courseId,
        eligibilityState: input.eligibilityState,
        completenessState: input.completenessState,
      },
    });
  }

  public async linkSourceIdentity(input: {
    identityId: string;
    courseId: string;
    currentUrl: string;
  }): Promise<void> {
    const identity = await this.prisma.courseSourceIdentity.findUnique({ where: { id: input.identityId } });
    if (!identity) throw new Error('COURSE_IMPORT_SOURCE_IDENTITY_NOT_FOUND');
    if (identity.courseId && identity.courseId !== input.courseId) {
      throw new Error('COURSE_IMPORT_SOURCE_IDENTITY_ALREADY_LINKED');
    }
    await this.prisma.courseSourceIdentity.update({
      where: { id: input.identityId },
      data: {
        courseId: input.courseId,
        currentUrl: input.currentUrl,
        lastSeenAt: new Date(),
      },
    });
  }

  public async applyVerifiedUrlChange(input: {
    identityId: string;
    previousUrl: string;
    nextUrl: string;
    normalizedNextUrl: string;
    importRecordId: string;
  }): Promise<void> {
    await this.prisma.courseSourceUrlHistory.updateMany({
      where: { courseSourceIdentityId: input.identityId, isCurrent: true },
      data: { isCurrent: false, lastSeenAt: new Date() },
    });
    await this.prisma.courseSourceUrlHistory.upsert({
      where: {
        courseSourceIdentityId_normalizedUrl: {
          courseSourceIdentityId: input.identityId,
          normalizedUrl: input.normalizedNextUrl,
        },
      },
      update: {
        url: input.nextUrl,
        isCurrent: true,
        lastSeenAt: new Date(),
        verificationState: 'UNVERIFIED',
        changeImportRecordId: input.importRecordId,
        checkedAt: null,
      },
      create: {
        courseSourceIdentityId: input.identityId,
        url: input.nextUrl,
        normalizedUrl: input.normalizedNextUrl,
        isCurrent: true,
        verificationState: 'UNVERIFIED',
        changeImportRecordId: input.importRecordId,
        checkedAt: null,
      },
    });
  }

  public async writeFieldProvenance(input: CourseFieldProvenanceWrite[]): Promise<void> {
    for (const item of input) {
      await this.prisma.courseFieldProvenance.upsert({
        where: {
          courseId_fieldKey_importRecordId: {
            courseId: item.courseId,
            fieldKey: item.fieldKey,
            importRecordId: item.importRecordId,
          },
        },
        update: {
          sourceArtifactHash: item.sourceArtifactHash,
          sourceRowNumber: item.sourceRowNumber ?? null,
          providerId: item.providerId,
          sourceUrl: item.sourceUrl ?? null,
          valueHash: item.valueHash,
          reviewedBy: item.reviewedBy ?? null,
          reviewStatus: item.reviewStatus,
          importedAt: new Date(),
        },
        create: {
          courseId: item.courseId,
          fieldKey: item.fieldKey,
          importRecordId: item.importRecordId,
          sourceArtifactHash: item.sourceArtifactHash,
          sourceRowNumber: item.sourceRowNumber ?? null,
          providerId: item.providerId,
          sourceUrl: item.sourceUrl ?? null,
          valueHash: item.valueHash,
          reviewedBy: item.reviewedBy ?? null,
          reviewStatus: item.reviewStatus,
        },
      });
    }
  }
}

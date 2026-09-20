import {
  CourseImportOperationsOverview,
  CourseImportReviewPage,
  IImportedCourseOperationsRepository,
} from '@manaratak/domain';
import { CourseImportCoordinator } from './CourseImportCoordinator';
import { CourseImportIdentityDiffUseCase } from './CourseImportIdentityDiffUseCase';
import type { CourseImportTransferApproval } from '../contracts/CourseImportTransferContracts';

export interface CourseImportBatchReader {
  getBatchById(id: string): Promise<any | null>;
  listRecords(filters?: {
    batchId?: string;
    status?: string;
    dataType?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ data: any[]; total: number; page: number; pageSize: number }>;
}

export interface CourseImportBatchTransferInput {
  batchId: string;
  actorId: string;
  correlationId?: string;
  recordIds?: string[];
  approvals?: Record<string, CourseImportTransferApproval>;
  limit?: number;
}

export class CourseImportOperationsUseCases {
  public constructor(
    private readonly operationsRepository: IImportedCourseOperationsRepository,
    private readonly batchReader: CourseImportBatchReader,
    private readonly coordinator: CourseImportCoordinator,
    private readonly identityDiff: CourseImportIdentityDiffUseCase,
  ) {}

  public overview(): Promise<CourseImportOperationsOverview> {
    return this.operationsRepository.getImportOperationsOverview();
  }

  public analyzeBatch(batchId: string, options: { force?: boolean } = {}) {
    return options.force
      ? this.identityDiff.analyzeBatch(batchId, { force: true })
      : this.identityDiff.analyzeBatch(batchId);
  }

  public listBatches(limit: number = 50) {
    return this.operationsRepository.listCourseBatches(limit);
  }

  public async getBatch(batchId: string): Promise<any> {
    const batch = await this.operationsRepository.getCourseBatchById(batchId);
    if (!batch) throw new Error('COURSE_IMPORT_BATCH_NOT_FOUND');
    return batch;
  }

  public async listBatchRecords(
    batchId: string,
    input: { status?: string; page?: number; pageSize?: number } = {},
  ) {
    await this.getBatch(batchId);
    return this.batchReader.listRecords({
      batchId,
      status: input.status,
      dataType: 'COURSES',
      page: input.page,
      pageSize: input.pageSize,
    });
  }

  public reviewQueue(input: { page?: number; pageSize?: number } = {}): Promise<CourseImportReviewPage> {
    return this.operationsRepository.listReviewQueue(input);
  }

  public async transferBatch(input: CourseImportBatchTransferInput) {
    if (!input.actorId?.trim()) throw new Error('COURSE_IMPORT_ACTOR_ID_REQUIRED');
    await this.getBatch(input.batchId);

    const boundedLimit = Math.min(100, Math.max(1, input.limit ?? 50));
    const selected = input.recordIds?.filter(Boolean);
    let records: any[];

    if (selected?.length) {
      if (selected.length > boundedLimit) throw new Error('COURSE_IMPORT_TRANSFER_SELECTION_TOO_LARGE');
      const pages: any[] = [];
      let pageNo = 1;
      while (pages.length < selected.length && pageNo <= 1000) {
        const page = await this.batchReader.listRecords({
          batchId: input.batchId,
          dataType: 'COURSES',
          page: pageNo,
          pageSize: 100,
        });
        pages.push(...page.data);
        if (pageNo * page.pageSize >= page.total) break;
        pageNo += 1;
      }
      const allowed = new Set(selected);
      records = pages.filter((record) => allowed.has(record.id)).slice(0, boundedLimit);
      if (records.length !== selected.length) throw new Error('COURSE_IMPORT_TRANSFER_RECORD_SELECTION_INVALID');
    } else {
      const candidates: any[] = [];
      let pageNo = 1;
      while (candidates.length < boundedLimit && pageNo <= 1000) {
        const page = await this.batchReader.listRecords({
          batchId: input.batchId,
          dataType: 'COURSES',
          page: pageNo,
          pageSize: 100,
        });
        candidates.push(...page.data.filter((record) => !record.promotedEntityId));
        if (pageNo * page.pageSize >= page.total) break;
        pageNo += 1;
      }
      records = candidates.slice(0, boundedLimit);
    }

    const results: Array<Record<string, unknown>> = [];
    for (const record of records) {
      try {
        const preview = await this.coordinator.preview(record.id);
        const approval = input.approvals?.[record.id];
        const transfer = await this.coordinator.transfer({
          recordId: record.id,
          actorId: input.actorId,
          correlationId: input.correlationId,
          approval,
        });
        results.push({ recordId: record.id, preview, transfer, status: 'TRANSFERRED' });
      } catch (error) {
        results.push({
          recordId: record.id,
          status: 'BLOCKED_OR_FAILED',
          error: error instanceof Error ? error.message : 'COURSE_IMPORT_TRANSFER_FAILED',
        });
      }
    }

    const transferred = results.filter((item) => item.status === 'TRANSFERRED').length;
    return {
      batchId: input.batchId,
      attempted: results.length,
      transferred,
      blockedOrFailed: results.length - transferred,
      results,
      hasMore: !selected && records.length >= boundedLimit,
    };
  }
}

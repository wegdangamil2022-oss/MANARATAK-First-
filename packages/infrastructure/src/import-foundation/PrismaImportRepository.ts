import { PrismaClient } from '@prisma/client';
import type { AtomicPersistenceContext } from '@manaratak/domain';
import { v4 as uuidv4 } from 'uuid';
import {
  toNullablePrismaJson,
  toOptionalPrismaJson,
  toRequiredPrismaJson,
} from '../prisma/PrismaJsonValue';

export class PrismaImportRepository {
  public readonly persistenceClassification: 'DURABLE' | 'DEVELOPMENT_ONLY';
  private inMemoryBatches: Map<string, any> = new Map();
  private inMemoryRecords: Map<string, any> = new Map();

  constructor(
    private readonly prisma?: PrismaClient,
    mode: 'DURABLE' | 'DEVELOPMENT_ONLY' = 'DURABLE',
  ) {
    if (mode === 'DURABLE' && !prisma) {
      throw new Error('Durable import persistence is unavailable: PrismaClient is required.');
    }
    if (mode === 'DEVELOPMENT_ONLY' && prisma) {
      throw new Error('DEVELOPMENT_ONLY import persistence must not receive PrismaClient.');
    }
    this.persistenceClassification = mode;
  }

  withTransaction(context: AtomicPersistenceContext): PrismaImportRepository {
    const transactionClient = (
      context as AtomicPersistenceContext & { transactionClient?: PrismaClient }
    ).transactionClient;
    if (!context.boundaryId || !transactionClient) {
      throw new Error('IMPORT_ATOMIC_TRANSACTION_CONTEXT_REQUIRED');
    }
    return new PrismaImportRepository(transactionClient);
  }

  async createBatch(data: {
    sourceSystem?: string;
    dataType: string;
    batchStatus?: string;
    totalRecords?: number;
    processedRecords?: number;
    failedRecords?: number;
  }): Promise<any> {
    const batch = {
      id: `batch-${uuidv4().substring(0, 8)}`,
      sourceSystem: data.sourceSystem || 'ADMIN_CONSOLE',
      dataType: data.dataType,
      batchStatus: data.batchStatus || 'PROCESSING',
      totalRecords: data.totalRecords || 0,
      processedRecords: data.processedRecords || 0,
      failedRecords: data.failedRecords || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (this.prisma) {
      const created = await this.prisma.importBatch.create({
        data: {
          id: batch.id,
          sourceSystem: batch.sourceSystem,
          dataType: batch.dataType,
          batchStatus: batch.batchStatus,
          totalRecords: batch.totalRecords,
          processedRecords: batch.processedRecords,
          failedRecords: batch.failedRecords,
        },
      });
      return created;
    }

    this.inMemoryBatches.set(batch.id, batch);
    return batch;
  }

  async getBatchById(id: string): Promise<any | null> {
    if (this.prisma) {
      const batch = await this.prisma.importBatch.findUnique({
        where: { id },
        include: { records: true },
      });
      return batch;
    }

    return this.inMemoryBatches.get(id) || null;
  }

  async listBatches(filters?: { dataType?: string; limit?: number }): Promise<any[]> {
    let limit = filters?.limit ? parseInt(filters.limit as any, 10) : 50;
    if (isNaN(limit) || limit < 1) limit = 50;
    if (limit > 100) limit = 100;

    if (this.prisma) {
      const where: any = {};
      if (filters?.dataType) where.dataType = filters.dataType;

      const batches = await this.prisma.importBatch.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
      return batches;
    }

    let list = Array.from(this.inMemoryBatches.values());
    if (filters?.dataType) {
      list = list.filter((b) => b.dataType === filters.dataType);
    }
    return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getOverview(filters?: { dataType?: string }): Promise<any> {
    const activeBatchStatuses = [
      'CREATED',
      'QUEUED',
      'RUNNING',
      'PAUSED',
      'RESUMING',
      'CANCELLING',
      'PROCESSING',
    ];
    const recordReviewStatuses = ['NEEDS_REVIEW', 'INCOMPLETE', 'READY_FOR_REVIEW'];
    const recordFailedStatuses = ['FAILED', 'DLQ'];
    const recordTransferredStatuses = ['PROMOTED'];
    const batchWhere: any = filters?.dataType ? { dataType: filters.dataType } : {};
    const recordWhere: any = filters?.dataType ? { batch: { dataType: filters.dataType } } : {};

    if (this.prisma) {
      const [
        totalBatches,
        totalRecords,
        activeBatches,
        needsReview,
        failedRecords,
        transferredRecords,
        recordStatusGroups,
        batchStatusGroups,
        batchDomainGroups,
        latestBatch,
      ] = await Promise.all([
        this.prisma.importBatch.count({ where: batchWhere }),
        this.prisma.importRecord.count({ where: recordWhere }),
        this.prisma.importBatch.count({
          where: { ...batchWhere, batchStatus: { in: activeBatchStatuses } },
        }),
        this.prisma.importRecord.count({
          where: { ...recordWhere, status: { in: recordReviewStatuses } },
        }),
        this.prisma.importRecord.count({
          where: { ...recordWhere, status: { in: recordFailedStatuses } },
        }),
        this.prisma.importRecord.count({
          where: { ...recordWhere, status: { in: recordTransferredStatuses } },
        }),
        this.prisma.importRecord.groupBy({
          by: ['status'],
          where: recordWhere,
          _count: { _all: true },
        }),
        this.prisma.importBatch.groupBy({
          by: ['batchStatus'],
          where: batchWhere,
          _count: { _all: true },
        }),
        this.prisma.importBatch.groupBy({
          by: ['dataType'],
          where: batchWhere,
          _count: { _all: true },
        }),
        this.prisma.importBatch.findFirst({ where: batchWhere, orderBy: { createdAt: 'desc' } }),
      ]);

      const recordStatusCounts = Object.fromEntries(
        recordStatusGroups.map((row: any) => [row.status, row._count._all]),
      );
      const batchStatusCounts = Object.fromEntries(
        batchStatusGroups.map((row: any) => [row.batchStatus, row._count._all]),
      );

      const byDomainEntries = await Promise.all(
        batchDomainGroups.map(async (row: any) => {
          const dataType = row.dataType;
          const domainRecordWhere = { batch: { dataType } };
          const [records, active, review, failed, transferred, statusGroups] = await Promise.all([
            this.prisma!.importRecord.count({ where: domainRecordWhere }),
            this.prisma!.importBatch.count({
              where: { dataType, batchStatus: { in: activeBatchStatuses } },
            }),
            this.prisma!.importRecord.count({
              where: { ...domainRecordWhere, status: { in: recordReviewStatuses } },
            }),
            this.prisma!.importRecord.count({
              where: { ...domainRecordWhere, status: { in: recordFailedStatuses } },
            }),
            this.prisma!.importRecord.count({
              where: { ...domainRecordWhere, status: { in: recordTransferredStatuses } },
            }),
            this.prisma!.importRecord.groupBy({
              by: ['status'],
              where: domainRecordWhere,
              _count: { _all: true },
            }),
          ]);
          return [
            dataType,
            {
              batches: row._count._all,
              records,
              activeBatches: active,
              needsReview: review,
              failedRecords: failed,
              transferredRecords: transferred,
              recordStatusCounts: Object.fromEntries(
                statusGroups.map((statusRow: any) => [statusRow.status, statusRow._count._all]),
              ),
            },
          ];
        }),
      );

      return {
        totalBatches,
        totalRecords,
        activeBatches,
        needsReview,
        failedRecords,
        transferredRecords,
        recordStatusCounts,
        batchStatusCounts,
        byDomain: Object.fromEntries(byDomainEntries),
        latestBatch,
        generatedAt: new Date(),
      };
    }

    let batches = Array.from(this.inMemoryBatches.values());
    if (filters?.dataType) batches = batches.filter((batch) => batch.dataType === filters.dataType);
    const allowedBatchIds = new Set(batches.map((batch) => batch.id));
    let records = Array.from(this.inMemoryRecords.values()).filter((record) =>
      allowedBatchIds.has(record.batchId),
    );

    const countBy = (items: any[], key: string) =>
      items.reduce<Record<string, number>>((acc, item) => {
        const value = String(item[key] ?? 'UNKNOWN');
        acc[value] = (acc[value] ?? 0) + 1;
        return acc;
      }, {});
    const domainKeys = Array.from(new Set(batches.map((batch) => String(batch.dataType))));
    const byDomain = Object.fromEntries(
      domainKeys.map((dataType) => {
        const domainBatches = batches.filter((batch) => batch.dataType === dataType);
        const ids = new Set(domainBatches.map((batch) => batch.id));
        const domainRecords = records.filter((record) => ids.has(record.batchId));
        return [
          dataType,
          {
            batches: domainBatches.length,
            records: domainRecords.length,
            activeBatches: domainBatches.filter((batch) =>
              activeBatchStatuses.includes(batch.batchStatus),
            ).length,
            needsReview: domainRecords.filter((record) =>
              recordReviewStatuses.includes(record.status),
            ).length,
            failedRecords: domainRecords.filter((record) =>
              recordFailedStatuses.includes(record.status),
            ).length,
            transferredRecords: domainRecords.filter((record) =>
              recordTransferredStatuses.includes(record.status),
            ).length,
            recordStatusCounts: countBy(domainRecords, 'status'),
          },
        ];
      }),
    );

    const latestBatch =
      [...batches].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0] ?? null;
    return {
      totalBatches: batches.length,
      totalRecords: records.length,
      activeBatches: batches.filter((batch) => activeBatchStatuses.includes(batch.batchStatus))
        .length,
      needsReview: records.filter((record) => recordReviewStatuses.includes(record.status)).length,
      failedRecords: records.filter((record) => recordFailedStatuses.includes(record.status))
        .length,
      transferredRecords: records.filter((record) =>
        recordTransferredStatuses.includes(record.status),
      ).length,
      recordStatusCounts: countBy(records, 'status'),
      batchStatusCounts: countBy(batches, 'batchStatus'),
      byDomain,
      latestBatch,
      generatedAt: new Date(),
    };
  }

  async getOperationalInsights(filters?: { dataType?: string }): Promise<any> {
    const activeStatuses = [
      'CREATED',
      'QUEUED',
      'RUNNING',
      'PAUSED',
      'RESUMING',
      'CANCELLING',
      'PROCESSING',
    ];
    const staleBefore = new Date(Date.now() - 15 * 60 * 1000);
    const whereDomain: any = filters?.dataType ? { dataType: filters.dataType } : {};

    if (this.prisma) {
      const [
        stuckBatches,
        retryableBatches,
        pausedBatches,
        queuedBatches,
        dlqBatches,
        oldestActiveBatch,
        failureCandidates,
        recentProblemCandidates,
      ] = await Promise.all([
        this.prisma.importBatch.count({
          where: {
            ...whereDomain,
            batchStatus: { in: ['RUNNING', 'PROCESSING'] },
            updatedAt: { lt: staleBefore },
          },
        }),
        this.prisma.importBatch.count({
          where: { ...whereDomain, batchStatus: 'FAILED_RETRYABLE' },
        }),
        this.prisma.importBatch.count({ where: { ...whereDomain, batchStatus: 'PAUSED' } }),
        this.prisma.importBatch.count({
          where: { ...whereDomain, batchStatus: { in: ['CREATED', 'QUEUED', 'RESUMING'] } },
        }),
        this.prisma.importBatch.count({ where: { ...whereDomain, batchStatus: 'DLQ' } }),
        this.prisma.importBatch.findFirst({
          where: { ...whereDomain, batchStatus: { in: activeStatuses } },
          orderBy: { updatedAt: 'asc' },
        }),
        this.prisma.importBatch.findMany({
          where: { ...whereDomain, failedRecords: { gt: 0 } },
          select: {
            id: true,
            sourceSystem: true,
            dataType: true,
            batchStatus: true,
            totalRecords: true,
            processedRecords: true,
            failedRecords: true,
            attemptCount: true,
            lastError: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        this.prisma.importBatch.findMany({
          where: {
            ...whereDomain,
            OR: [
              { batchStatus: { in: ['FAILED_RETRYABLE', 'FAILED_PERMANENT', 'DLQ', 'PAUSED'] } },
              { failedRecords: { gt: 0 } },
              { batchStatus: { in: ['RUNNING', 'PROCESSING'] }, updatedAt: { lt: staleBefore } },
            ],
          },
          orderBy: { updatedAt: 'desc' },
          take: 25,
        }),
      ]);

      const highFailureIds = new Set(
        failureCandidates
          .filter(
            (batch: any) =>
              Number(batch.totalRecords ?? 0) > 0 &&
              Number(batch.failedRecords ?? 0) / Number(batch.totalRecords) > 0.1,
          )
          .map((batch: any) => batch.id),
      );
      const recentProblemBatches = recentProblemCandidates
        .map((batch: any) => ({
          ...batch,
          stuck:
            ['RUNNING', 'PROCESSING'].includes(String(batch.batchStatus)) &&
            new Date(batch.updatedAt).getTime() < staleBefore.getTime(),
          highFailureRate: highFailureIds.has(batch.id),
          failureRate:
            Number(batch.totalRecords ?? 0) > 0
              ? Number(batch.failedRecords ?? 0) / Number(batch.totalRecords)
              : 0,
        }))
        .filter(
          (batch: any) =>
            batch.stuck ||
            batch.highFailureRate ||
            ['FAILED_RETRYABLE', 'FAILED_PERMANENT', 'DLQ', 'PAUSED'].includes(
              String(batch.batchStatus),
            ),
        )
        .slice(0, 8);

      return {
        stuckBatches,
        highFailureBatches: highFailureIds.size,
        retryableBatches,
        pausedBatches,
        queuedBatches,
        dlqBatches,
        oldestActiveBatch,
        recentProblemBatches,
        thresholds: { stuckAfterMinutes: 15, highFailureRate: 0.1 },
        generatedAt: new Date(),
      };
    }

    let batches = Array.from(this.inMemoryBatches.values());
    if (filters?.dataType) batches = batches.filter((batch) => batch.dataType === filters.dataType);
    const highFailure = batches.filter(
      (batch) =>
        Number(batch.totalRecords ?? 0) > 0 &&
        Number(batch.failedRecords ?? 0) / Number(batch.totalRecords) > 0.1,
    );
    const stuck = batches.filter(
      (batch) =>
        ['RUNNING', 'PROCESSING'].includes(String(batch.batchStatus)) &&
        new Date(batch.updatedAt ?? batch.createdAt).getTime() < staleBefore.getTime(),
    );
    return {
      stuckBatches: stuck.length,
      highFailureBatches: highFailure.length,
      retryableBatches: batches.filter((batch) => batch.batchStatus === 'FAILED_RETRYABLE').length,
      pausedBatches: batches.filter((batch) => batch.batchStatus === 'PAUSED').length,
      queuedBatches: batches.filter((batch) =>
        ['CREATED', 'QUEUED', 'RESUMING'].includes(String(batch.batchStatus)),
      ).length,
      dlqBatches: batches.filter((batch) => batch.batchStatus === 'DLQ').length,
      oldestActiveBatch:
        batches
          .filter((batch) => activeStatuses.includes(String(batch.batchStatus)))
          .sort(
            (a, b) =>
              new Date(a.updatedAt ?? a.createdAt).getTime() -
              new Date(b.updatedAt ?? b.createdAt).getTime(),
          )[0] ?? null,
      recentProblemBatches: [...stuck, ...highFailure]
        .filter(
          (batch, index, all) => all.findIndex((candidate) => candidate.id === batch.id) === index,
        )
        .slice(0, 8),
      thresholds: { stuckAfterMinutes: 15, highFailureRate: 0.1 },
      generatedAt: new Date(),
    };
  }

  async getErrorReport(filters?: {
    dataType?: string;
    batchId?: string;
    limit?: number;
  }): Promise<any> {
    const limit = Math.min(1000, Math.max(1, Number(filters?.limit ?? 500)));
    if (this.prisma) {
      const where: any = { status: { in: ['FAILED', 'DLQ'] } };
      if (filters?.batchId) where.batchId = filters.batchId;
      if (filters?.dataType) where.batch = { dataType: filters.dataType };

      const [total, failed, dlq, rows] = await Promise.all([
        this.prisma.importRecord.count({ where }),
        this.prisma.importRecord.count({ where: { ...where, status: 'FAILED' } }),
        this.prisma.importRecord.count({ where: { ...where, status: 'DLQ' } }),
        this.prisma.importRecord.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          include: { batch: true },
        }),
      ]);
      return {
        total,
        failed,
        dlq,
        rows,
        truncated: total > rows.length,
        generatedAt: new Date(),
      };
    }

    let rows = Array.from(this.inMemoryRecords.values()).filter((record) =>
      ['FAILED', 'DLQ'].includes(String(record.status)),
    );
    if (filters?.batchId) rows = rows.filter((record) => record.batchId === filters.batchId);
    if (filters?.dataType)
      rows = rows.filter(
        (record) => this.inMemoryBatches.get(record.batchId)?.dataType === filters.dataType,
      );
    rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const failed = rows.filter((record) => record.status === 'FAILED').length;
    const dlq = rows.filter((record) => record.status === 'DLQ').length;
    const data = rows
      .slice(0, limit)
      .map((record) => ({ ...record, batch: this.inMemoryBatches.get(record.batchId) ?? null }));
    return {
      total: rows.length,
      failed,
      dlq,
      rows: data,
      truncated: rows.length > data.length,
      generatedAt: new Date(),
    };
  }

  async createRecord(data: {
    batchId: string;
    status: string;
    rawPayload: unknown;
    validationErrors?: unknown;
    processingNotes?: string;
    sourceDedupKey?: string;
    promotedEntityId?: string;
  }): Promise<any> {
    const record = {
      id: `rec-${uuidv4().substring(0, 8)}`,
      batchId: data.batchId,
      status: data.status,
      rawPayload: data.rawPayload,
      validationErrors: data.validationErrors || null,
      processingNotes: data.processingNotes || null,
      sourceDedupKey: data.sourceDedupKey || null,
      promotedEntityId: data.promotedEntityId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (this.prisma) {
      const created = await this.prisma.importRecord.create({
        data: {
          id: record.id,
          batchId: record.batchId,
          status: record.status,
          rawPayload: toRequiredPrismaJson(record.rawPayload),
          validationErrors: toNullablePrismaJson(record.validationErrors),
          processingNotes: record.processingNotes,
          sourceDedupKey: record.sourceDedupKey,
          promotedEntityId: record.promotedEntityId,
        },
      });
      return created;
    }

    this.inMemoryRecords.set(record.id, record);
    return record;
  }

  async bulkCreateRecords(
    records: Array<{
      batchId: string;
      status: string;
      rawPayload: unknown;
      validationErrors?: unknown;
      processingNotes?: string;
      sourceDedupKey?: string;
      promotedEntityId?: string;
      chunkIndex?: number;
      recordOffset?: number;
      sourceRowNumber?: number;
      retentionExpiresAt?: Date;
      id?: string;
    }>,
  ): Promise<{ count: number }> {
    const recordsWithIds = records.map((record) => ({
      ...record,
      id: record.id ?? `rec-${uuidv4().substring(0, 8)}`,
    }));

    if (this.prisma) {
      const created = await this.prisma.importRecord.createMany({
        data: recordsWithIds.map((r) => ({
          id: r.id,
          batchId: r.batchId,
          status: r.status,
          rawPayload: toRequiredPrismaJson(r.rawPayload),
          validationErrors: toNullablePrismaJson(r.validationErrors),
          processingNotes: r.processingNotes || null,
          sourceDedupKey: r.sourceDedupKey || null,
          promotedEntityId: r.promotedEntityId || null,
          chunkIndex: r.chunkIndex ?? null,
          recordOffset: r.recordOffset ?? null,
          sourceRowNumber: r.sourceRowNumber ?? null,
          retentionExpiresAt: r.retentionExpiresAt ?? null,
        })),
      });
      return { count: created.count };
    }

    for (const r of recordsWithIds) {
      const id = r.id!;
      this.inMemoryRecords.set(id, {
        id,
        batchId: r.batchId,
        status: r.status,
        rawPayload: r.rawPayload,
        validationErrors: r.validationErrors || null,
        processingNotes: r.processingNotes || null,
        sourceDedupKey: r.sourceDedupKey || null,
        promotedEntityId: r.promotedEntityId || null,
        chunkIndex: r.chunkIndex ?? null,
        recordOffset: r.recordOffset ?? null,
        sourceRowNumber: r.sourceRowNumber ?? null,
        retentionExpiresAt: r.retentionExpiresAt ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return { count: records.length };
  }

  async listRecords(filters?: {
    batchId?: string;
    status?: string;
    dataType?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ data: any[]; total: number; page: number; pageSize: number }> {
    const DEFAULT_PAGE = 1;
    const DEFAULT_PAGE_SIZE = 50;
    const MAX_PAGE_SIZE = 100;

    let page = filters?.page ? parseInt(filters.page as any, 10) : DEFAULT_PAGE;
    if (isNaN(page) || page < 1) page = DEFAULT_PAGE;

    let pageSize = filters?.pageSize ? parseInt(filters.pageSize as any, 10) : DEFAULT_PAGE_SIZE;
    if (isNaN(pageSize) || pageSize < 1) pageSize = DEFAULT_PAGE_SIZE;
    if (pageSize > MAX_PAGE_SIZE) pageSize = MAX_PAGE_SIZE;

    if (this.prisma) {
      const where: any = {};
      if (filters?.batchId) where.batchId = filters.batchId;
      if (filters?.status) where.status = filters.status;
      if (filters?.dataType) {
        where.batch = { dataType: filters.dataType };
      }

      const [data, total] = await Promise.all([
        this.prisma.importRecord.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: { batch: true },
        }),
        this.prisma.importRecord.count({ where }),
      ]);
      return { data, total, page, pageSize };
    }

    let records = Array.from(this.inMemoryRecords.values());
    if (filters?.batchId) {
      records = records.filter((r) => r.batchId === filters.batchId);
    }
    if (filters?.status) {
      records = records.filter((r) => r.status === filters.status);
    }
    if (filters?.dataType) {
      records = records.filter((r) => {
        const batch = this.inMemoryBatches.get(r.batchId);
        return batch && batch.dataType === filters.dataType;
      });
    }

    const total = records.length;
    const rawData = records.slice((page - 1) * pageSize, page * pageSize);
    const data = rawData.map((r) => ({
      ...r,
      batch: this.inMemoryBatches.get(r.batchId) || null,
    }));

    return { data, total, page, pageSize };
  }

  async getRecordById(id: string): Promise<any | null> {
    if (this.prisma) {
      return this.prisma.importRecord.findUnique({ where: { id } });
    }

    return this.inMemoryRecords.get(id) || null;
  }

  async findExistingSourceDedupKeys(sourceDedupKeys: string[]): Promise<string[]> {
    const keys = Array.from(new Set(sourceDedupKeys.filter(Boolean)));
    if (keys.length === 0) return [];

    if (this.prisma) {
      const rows = await this.prisma.importRecord.findMany({
        where: { sourceDedupKey: { in: keys } },
        select: { sourceDedupKey: true },
      });
      return Array.from(new Set(rows.map((row: any) => row.sourceDedupKey).filter(Boolean)));
    }

    const requested = new Set(keys);
    const found = new Set<string>();
    for (const record of this.inMemoryRecords.values()) {
      if (record.sourceDedupKey && requested.has(record.sourceDedupKey))
        found.add(record.sourceDedupKey);
    }
    return Array.from(found);
  }

  async findBySourceDedupKey(sourceDedupKey: string, batchId?: string): Promise<any | null> {
    if (this.prisma) {
      const where: any = { sourceDedupKey };
      if (batchId) {
        where.batchId = batchId;
      }
      const record = await this.prisma.importRecord.findFirst({ where });
      return record;
    }

    for (const record of this.inMemoryRecords.values()) {
      if (record.sourceDedupKey === sourceDedupKey) {
        if (batchId && record.batchId !== batchId) {
          continue;
        }
        return record;
      }
    }
    return null;
  }

  async updateRecord(
    id: string,
    updates: {
      status?: string;
      validationErrors?: unknown;
      promotedEntityId?: string;
      processingNotes?: string;
      rawPayload?: unknown;
    },
  ): Promise<any> {
    if (this.prisma) {
      const record = await this.prisma.importRecord.update({
        where: { id },
        data: {
          status: updates.status,
          validationErrors: toOptionalPrismaJson(updates.validationErrors),
          promotedEntityId: updates.promotedEntityId,
          processingNotes: updates.processingNotes,
          rawPayload: toOptionalPrismaJson(updates.rawPayload),
        },
      });
      return record;
    }

    const existing = this.inMemoryRecords.get(id);
    if (existing) {
      const updated = {
        ...existing,
        ...updates,
        updatedAt: new Date(),
      };
      this.inMemoryRecords.set(id, updated);
      return updated;
    }
    return null;
  }

  async updateBatchStats(
    batchId: string,
    stats: {
      totalRecords?: number;
      processedRecords?: number;
      failedRecords?: number;
      batchStatus?: string;
    },
  ): Promise<any> {
    if (this.prisma) {
      const batch = await this.prisma.importBatch.update({
        where: { id: batchId },
        data: {
          totalRecords: stats.totalRecords,
          processedRecords: stats.processedRecords,
          failedRecords: stats.failedRecords,
          batchStatus: stats.batchStatus,
        },
      });
      return batch;
    }

    const existing = this.inMemoryBatches.get(batchId);
    if (existing) {
      const updated = {
        ...existing,
        ...stats,
        updatedAt: new Date(),
      };
      this.inMemoryBatches.set(batchId, updated);
      return updated;
    }
    return null;
  }
}

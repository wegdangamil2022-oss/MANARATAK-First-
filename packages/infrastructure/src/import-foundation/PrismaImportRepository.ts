import { PrismaClient } from '@prisma/client';
import type { AtomicPersistenceContext } from '@manaratak/domain';
import { createHash } from 'node:crypto';
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
      id: `batch-${uuidv4()}`,
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
          ...(batch.batchStatus === 'STAGING' ? { claimedBy: 'ARTIFACT_STAGING',
            claimUntil: new Date(Date.now() + 300_000) } : {}),
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
      if (filters?.dataType) where.dataType = importDomainFilter(filters.dataType);

      const batches = await this.prisma.importBatch.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit,
      });
      return batches;
    }

    let list = Array.from(this.inMemoryBatches.values());
    if (filters?.dataType) {
      list = list.filter((b) => matchesImportDomain(b.dataType, filters.dataType));
    }
    return list
      .sort(
        (a, b) =>
          b.createdAt.getTime() - a.createdAt.getTime() || String(b.id).localeCompare(String(a.id)),
      )
      .slice(0, limit);
  }

  async getOverview(filters?: { dataType?: string }): Promise<any> {
    const activeBatchStatuses = [
      'STAGING',
      'CREATED',
      'QUEUED',
      'RUNNING',
      'PAUSING',
      'PAUSED',
      'RESUMING',
      'CANCELLING',
      'PROCESSING',
    ];
    const recordReviewStatuses = ['NEEDS_REVIEW', 'INCOMPLETE', 'READY_FOR_REVIEW'];
    const recordFailedStatuses = ['FAILED', 'DLQ'];
    const recordTransferredStatuses = ['PROMOTED'];
    const batchWhere: any = filters?.dataType
      ? { dataType: importDomainFilter(filters.dataType) }
      : {};
    const recordWhere: any = {
      status: { notIn: ['CHECKPOINT', 'WORKER_FAILURE'] },
      ...(filters?.dataType ? { batch: { dataType: importDomainFilter(filters.dataType) } } : {}),
    };

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
          const domainRecordWhere = { batch: { dataType }, status: { notIn: ['CHECKPOINT', 'WORKER_FAILURE'] } };
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
    if (filters?.dataType)
      batches = batches.filter((batch) => matchesImportDomain(batch.dataType, filters.dataType));
    const allowedBatchIds = new Set(batches.map((batch) => batch.id));
    let records = Array.from(this.inMemoryRecords.values()).filter((record) =>
      allowedBatchIds.has(record.batchId) && !['CHECKPOINT', 'WORKER_FAILURE'].includes(record.status),
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
      'STAGING',
      'CREATED',
      'QUEUED',
      'RUNNING',
      'PAUSING',
      'PAUSED',
      'RESUMING',
      'CANCELLING',
      'PROCESSING',
    ];
    const now = new Date();
    const staleBefore = new Date(now.getTime() - 15 * 60 * 1000);
    const pendingStopWhere = {
      batchStatus: { in: ['PAUSING', 'CANCELLING'] },
    };
    // An expired stop claim is for operator verification, NEVER auto-completion:
    // the remote owner call could still be in flight after the lease expires.
    const strandedStopWhere = {
      ...pendingStopWhere,
      updatedAt: { lt: staleBefore },
      OR: [{ claimUntil: { lt: now } }, { claimUntil: null }],
    };
    const whereDomain: any = filters?.dataType
      ? { dataType: importDomainFilter(filters.dataType) }
      : {};

    if (this.prisma) {
      const [
        stuckBatches,
        pendingStopBatches,
        strandedStopBatches,
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
        this.prisma.importBatch.count({ where: { ...whereDomain, ...pendingStopWhere } }),
        this.prisma.importBatch.count({ where: { ...whereDomain, ...strandedStopWhere } }),
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
              strandedStopWhere,
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
          stuck: (
            ['RUNNING', 'PROCESSING'].includes(String(batch.batchStatus)) &&
            new Date(batch.updatedAt).getTime() < staleBefore.getTime()
          ) || (
            ['PAUSING', 'CANCELLING'].includes(String(batch.batchStatus)) &&
            new Date(batch.updatedAt).getTime() < staleBefore.getTime() &&
            (!batch.claimUntil || new Date(batch.claimUntil).getTime() < now.getTime())
          ),
          pendingStop: ['PAUSING', 'CANCELLING'].includes(String(batch.batchStatus)),
          requiresOwnerVerification:
            ['PAUSING', 'CANCELLING'].includes(String(batch.batchStatus)) &&
            new Date(batch.updatedAt).getTime() < staleBefore.getTime() &&
            (!batch.claimUntil || new Date(batch.claimUntil).getTime() < now.getTime()),
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
        stuckBatches: stuckBatches + strandedStopBatches,
        pendingStopBatches,
        strandedStopBatches,
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
    if (filters?.dataType)
      batches = batches.filter((batch) => matchesImportDomain(batch.dataType, filters.dataType));
    const highFailure = batches.filter(
      (batch) =>
        Number(batch.totalRecords ?? 0) > 0 &&
        Number(batch.failedRecords ?? 0) / Number(batch.totalRecords) > 0.1,
    );
    const pendingStops = batches.filter(batch =>
      ['PAUSING', 'CANCELLING'].includes(String(batch.batchStatus)));
    const strandedStops = pendingStops.filter(batch =>
      new Date(batch.updatedAt ?? batch.createdAt).getTime() < staleBefore.getTime() &&
      (!batch.claimUntil || new Date(batch.claimUntil).getTime() < now.getTime()));
    const stuck = batches.filter(batch =>
      ['RUNNING', 'PROCESSING'].includes(String(batch.batchStatus)) &&
      new Date(batch.updatedAt ?? batch.createdAt).getTime() < staleBefore.getTime()
    );
    const stuckOrStranded = [...stuck, ...strandedStops];
    return {
      stuckBatches: stuckOrStranded.length,
      pendingStopBatches: pendingStops.length,
      strandedStopBatches: strandedStops.length,
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
      recentProblemBatches: [...stuckOrStranded, ...highFailure]
        .map(batch => ({
          ...batch,
          stuck: stuckOrStranded.some(candidate => candidate.id === batch.id),
          pendingStop: pendingStops.some(candidate => candidate.id === batch.id),
          requiresOwnerVerification: strandedStops.some(candidate => candidate.id === batch.id),
          highFailureRate: highFailure.some(candidate => candidate.id === batch.id),
          failureRate: Number(batch.totalRecords ?? 0) > 0
            ? Number(batch.failedRecords ?? 0) / Number(batch.totalRecords) : 0,
        }))
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
      if (filters?.dataType) where.batch = { dataType: importDomainFilter(filters.dataType) };

      const batchWhere = {
        batchStatus: { in: ['DLQ', 'FAILED_PERMANENT', 'FAILED_RETRYABLE'] },
        ...(filters?.batchId ? { id: filters.batchId } : {}),
        ...(filters?.dataType ? { dataType: importDomainFilter(filters.dataType) } : {}),
      };
      const [total, failed, dlq, rows, batchFailureTotal, batchFailureRows, workerFailureTotal, workerFailureRows] = await Promise.all([
        this.prisma.importRecord.count({ where }),
        this.prisma.importRecord.count({ where: { ...where, status: 'FAILED' } }),
        this.prisma.importRecord.count({ where: { ...where, status: 'DLQ' } }),
        this.prisma.importRecord.findMany({
          where,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: limit,
          include: { batch: true },
        }),
        this.prisma.importBatch.count({ where: batchWhere }),
        this.prisma.importBatch.findMany({
          where: batchWhere,
          orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
          take: limit,
          select: { id: true, sourceSystem: true, dataType: true,
            batchStatus: true, lastError: true, attemptCount: true, updatedAt: true },
        }),
        this.prisma.importRecord.count({ where: { ...where, status: 'WORKER_FAILURE' } }),
        this.prisma.importRecord.findMany({
          where: { ...where, status: 'WORKER_FAILURE' },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: limit,
          select: { id: true, batchId: true, rawPayload: true, processingNotes: true,
            createdAt: true, batch: { select: { dataType: true, sourceSystem: true } } },
        }),
      ]);
      return {
        total, failed, dlq, rows,
        workerFailureTotal,
        workerFailures: workerFailureRows.map(row => this.safeWorkerFailure(row)),
        truncatedWorkerFailures: workerFailureTotal > workerFailureRows.length,
        truncated: total > rows.length,
        batchFailureTotal,
        batchFailures: batchFailureRows.map((batch) => this.safeBatchFailure(batch)),
        truncatedBatchFailures: batchFailureTotal > batchFailureRows.length,
        generatedAt: new Date(),
      };
    }

    const workerFailures = [...this.inMemoryRecords.values()]
      .filter(record => record.status === 'WORKER_FAILURE')
      .filter(record => !filters?.batchId || record.batchId === filters.batchId)
      .filter(record => !filters?.dataType || matchesImportDomain(this.inMemoryBatches.get(record.batchId)?.dataType, filters.dataType))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    let rows = Array.from(this.inMemoryRecords.values()).filter((record) =>
      ['FAILED', 'DLQ'].includes(String(record.status)),
    );
    if (filters?.batchId) rows = rows.filter((record) => record.batchId === filters.batchId);
    if (filters?.dataType)
      rows = rows.filter((record) =>
        matchesImportDomain(this.inMemoryBatches.get(record.batchId)?.dataType, filters.dataType),
      );
    rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const failed = rows.filter((record) => record.status === 'FAILED').length;
    const dlq = rows.filter((record) => record.status === 'DLQ').length;
    const data = rows
      .slice(0, limit)
      .map((record) => ({ ...record, batch: this.inMemoryBatches.get(record.batchId) ?? null }));
    const batchFailures = [...this.inMemoryBatches.values()]
      .filter(batch => ['DLQ', 'FAILED_PERMANENT', 'FAILED_RETRYABLE'].includes(String(batch.batchStatus)))
      .filter(batch => !filters?.batchId || batch.id === filters.batchId)
      .filter(batch => !filters?.dataType || matchesImportDomain(batch.dataType, filters.dataType))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return {
      workerFailureTotal: workerFailures.length,
      workerFailures: workerFailures.slice(0, limit).map(row => this.safeWorkerFailure({
        ...row, batch: this.inMemoryBatches.get(row.batchId),
      })),
      truncatedWorkerFailures: workerFailures.length > limit,
      total: rows.length,
      failed,
      dlq,
      rows: data,
      truncated: rows.length > data.length,
      batchFailureTotal: batchFailures.length,
      batchFailures: batchFailures.slice(0, limit).map(batch => this.safeBatchFailure(batch)),
      truncatedBatchFailures: batchFailures.length > limit,
      generatedAt: new Date(),
    };
  }

  private safeWorkerFailure(row: {
    id: string; batchId: string; rawPayload: unknown; processingNotes?: string | null;
    createdAt: Date; batch?: { dataType?: string; sourceSystem?: string } | null;
  }) {
    const payload = row.rawPayload && typeof row.rawPayload === 'object' && !Array.isArray(row.rawPayload)
      ? row.rawPayload as Record<string, unknown> : {};
    return {
      eventId: row.id, batchId: row.batchId,
      domain: row.batch?.dataType ?? '', sourceSystem: row.batch?.sourceSystem ?? '',
      stage: 'BATCH_WORKER',
      errorCode: typeof payload.errorCode === 'string' && /^[A-Z][A-Z0-9_]{0,127}$/.test(payload.errorCode)
        ? payload.errorCode : null,
      attempt: Number.isSafeInteger(payload.attempt) ? payload.attempt : null,
      retryable: payload.retryable === true,
      outcome: ['DLQ', 'FAILED_RETRYABLE'].includes(String(payload.outcome)) ? payload.outcome : null,
      message: (row.processingNotes ?? '')
        .replace(/(password|token|secret|authorization|api[_-]?key|access[_-]?key)\s*[=:]\s*\S+/gi, '$1=[REDACTED]')
        .slice(0, 1000),
      createdAt: row.createdAt,
    };
  }

  private safeBatchFailure(batch: {
    id: string; sourceSystem?: string | null; dataType?: string | null;
    batchStatus: string; lastError?: string | null;
    attemptCount?: number | null; updatedAt?: Date | null;
  }) {
    return {
      batchId: batch.id,
      domain: batch.dataType ?? '',
      sourceSystem: batch.sourceSystem ?? '',
      status: batch.batchStatus,
      stage: 'BATCH_WORKER',
      errorCode: null,
      retryable: batch.batchStatus === 'FAILED_RETRYABLE',
      attempt: batch.attemptCount ?? 0,
      message: (batch.lastError ?? '')
        .replace(/(password|token|secret|authorization|api[_-]?key|access[_-]?key)\s*[=:]\s*\S+/gi, '$1=[REDACTED]')
        .slice(0, 1000),
      updatedAt: batch.updatedAt ?? null,
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
      id: `rec-${uuidv4()}`,
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

    if (record.sourceDedupKey) {
      // All keyed writes must participate in the same global check/insert lock.
      // Do not expose an unguarded single-record bypass for concurrent batches.
      const result = await this.bulkCreateRecords([{ ...record, sourceDedupKey: record.sourceDedupKey,
        processingNotes: record.processingNotes ?? undefined,
        promotedEntityId: record.promotedEntityId ?? undefined }]);
      if (result.count !== 1) throw new Error('IMPORT_SOURCE_DEDUP_ALREADY_CLAIMED');
      return this.prisma
        ? this.prisma.importRecord.findUniqueOrThrow({ where: { id: record.id } })
        : this.inMemoryRecords.get(record.id);
    }

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

  /**
   * Global technical-source dedup is serialized across processes using PostgreSQL
   * transaction-scoped advisory locks. Lock order is deterministic; the read and
   * insert share the SAME transaction, closing the cross-batch TOCTOU window.
   * Historical ImportRecord rows remain the durable source-identity evidence.
   */
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
  ): Promise<{ count: number; acceptedRecordIds: string[] }> {
    const recordsWithIds = records.map((record) => ({
      ...record,
      id: record.id ?? `rec-${uuidv4()}`,
    }));
    const keys = [...new Set(recordsWithIds.map(item => item.sourceDedupKey).filter(
      (key): key is string => typeof key === 'string' && key.length > 0,
    ))].sort();

    if (this.prisma) {
      const persist = async (client: PrismaClient) => {
        // Always acquire source-key locks in sorted order to avoid lock inversion.
        // hash collisions merely serialize unrelated keys; full keys are compared.
        for (const key of keys) {
          await client.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`phase6-source:${key}`}, 0))::text AS lock_result`;
        }
        // Renew the staging lease and lock its batch before inserting any chunk.
        // An expired/recovered parser cannot resurrect dedup reservations.
        const stagingBatches = [...new Set(recordsWithIds.filter(row =>
          ['STAGING_PENDING', 'STAGING_INVALID'].includes(row.status)).map(row => row.batchId))].sort();
        for (const batchId of stagingBatches) {
          const updated = await client.importBatch.updateMany({ where: { id: batchId, batchStatus: 'STAGING',
            claimedBy: 'ARTIFACT_STAGING', claimUntil: { gt: new Date() } },
            data: { claimUntil: new Date(Date.now() + 300_000) } });
          if (updated.count !== 1) throw new Error('IMPORT_STAGING_LEASE_LOST');
        }
        const existing = keys.length
          ? await client.importRecord.findMany({
              where: { sourceDedupKey: { in: keys }, status: { not: 'STAGING_REJECTED' } },
              select: { sourceDedupKey: true, batchId: true, status: true },
            })
          : [];
        if (existing.some(row => ['STAGING_PENDING', 'STAGING_INVALID'].includes(row.status) &&
            recordsWithIds.some(input => input.sourceDedupKey === row.sourceDedupKey && input.batchId !== row.batchId)))
          throw new Error('IMPORT_SOURCE_STAGING_BUSY');
        const seen = new Set(existing.map(row => row.sourceDedupKey).filter(Boolean));
        const accepted = recordsWithIds.filter(record => {
          const key = record.sourceDedupKey;
          if (!key) return true;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        if (!accepted.length) return { count: 0, acceptedRecordIds: [] };
        const created = await client.importRecord.createMany({
          data: accepted.map(r => ({
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
        return { count: created.count, acceptedRecordIds: accepted.map(record => record.id) };
      };
      // The repository participates in an existing transaction if one is supplied.
      // In the normal staging path it owns the entire advisory lock+read+insert unit.
      if (typeof this.prisma.$transaction === 'function') {
        return this.prisma.$transaction(transaction => persist(transaction as unknown as PrismaClient));
      }
      throw new Error('IMPORT_ATOMIC_SOURCE_DEDUP_TRANSACTION_REQUIRED');
    }

    // Development-only repository: JS synchronous critical section, not a
    // distributed locking implementation; production must use PostgreSQL.
    const existingKeys = new Set([...this.inMemoryRecords.values()]
      .filter(item => item.status !== 'STAGING_REJECTED').map(item => item.sourceDedupKey).filter(Boolean));
    const acceptedRecordIds: string[] = [];
    for (const record of recordsWithIds) {
      if (record.sourceDedupKey && existingKeys.has(record.sourceDedupKey)) continue;
      if (record.sourceDedupKey) existingKeys.add(record.sourceDedupKey);
      const id = record.id;
      this.inMemoryRecords.set(id, {
        ...record,
        validationErrors: record.validationErrors || null,
        processingNotes: record.processingNotes || null,
        sourceDedupKey: record.sourceDedupKey || null,
        promotedEntityId: record.promotedEntityId || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      acceptedRecordIds.push(id);
    }
    return { count: acceptedRecordIds.length, acceptedRecordIds };
  }

  async listRecords(filters?: {
    batchId?: string;
    status?: string;
    dataType?: string;
    page?: number;
    pageSize?: number;
    workItemsOnly?: boolean;
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
      const where: any = filters?.status ? {} : { status: { notIn: ['CHECKPOINT', 'WORKER_FAILURE'] } };
      if (filters?.batchId) where.batchId = filters.batchId;
      if (filters?.status) where.status = filters.status;
      if (filters?.workItemsOnly) {
        delete where.status;
        where.AND = [{ status: { notIn: ['CHECKPOINT', 'DLQ', 'WORKER_FAILURE', 'STAGING_PENDING', 'STAGING_INVALID', 'STAGING_REJECTED'] } }];
      }
      if (filters?.dataType) {
        where.batch = { dataType: importDomainFilter(filters.dataType) };
      }

      const [data, total] = await Promise.all([
        this.prisma.importRecord.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          include: { batch: true },
        }),
        this.prisma.importRecord.count({ where }),
      ]);
      return { data, total, page, pageSize };
    }

    let records = Array.from(this.inMemoryRecords.values());
    if (!filters?.status) records = records.filter(r => !['CHECKPOINT', 'WORKER_FAILURE'].includes(r.status));
    if (filters?.workItemsOnly) records = records.filter(r => !['CHECKPOINT', 'DLQ', 'WORKER_FAILURE', 'STAGING_PENDING', 'STAGING_INVALID', 'STAGING_REJECTED'].includes(r.status));
    if (filters?.batchId) {
      records = records.filter((r) => r.batchId === filters.batchId);
    }
    if (filters?.status) {
      records = records.filter((r) => r.status === filters.status);
    }
    if (filters?.dataType) {
      records = records.filter((r) => {
        const batch = this.inMemoryBatches.get(r.batchId);
        return batch && matchesImportDomain(batch.dataType, filters.dataType);
      });
    }

    records.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() ||
        String(b.id).localeCompare(String(a.id)),
    );
    const total = records.length;
    const rawData = records.slice((page - 1) * pageSize, page * pageSize);
    const data = rawData.map((r) => ({
      ...r,
      batch: this.inMemoryBatches.get(r.batchId) || null,
    }));

    return { data, total, page, pageSize };
  }

  /**
   * Read-only owner-handoff reconciliation queue.
   *
   * Never return raw imported payloads, credentials, validation content, or
   * generic processing notes in this operational surface. A reconciliation
   * decision MUST be made by the owning domain; this reader cannot release,
   * retry, or publish any import record.
   */
  async listHandoffReconciliation(input: {
    batchId: string; page?: number; pageSize?: number;
  }): Promise<{ data: Array<Record<string, unknown>>; total: number; page: number; pageSize: number }> {
    if (!input.batchId?.trim()) throw new Error('IMPORT_RECONCILIATION_BATCH_REQUIRED');
    const page = Number.isSafeInteger(input.page) && (input.page ?? 0) > 0 ? input.page! : 1;
    const pageSize = Number.isSafeInteger(input.pageSize) && (input.pageSize ?? 0) > 0
      ? Math.min(input.pageSize!, 100) : 50;
    const states = [
      'DISPATCH_IN_FLIGHT',
      'MANUAL_RECONCILIATION_REQUIRED',
      'AWAITING_DOMAIN_INTEGRATION',
    ] as const;
    let rows: any[];
    let total: number;
    if (this.prisma) {
      // PostgreSQL Prisma JSON-path predicate keeps scans bounded and indexable
      // without materializing an entire import batch in Node memory.
      const where = {
        batchId: input.batchId,
        OR: states.map(state => ({
          rawPayload: { path: ['_phase6HandoffState'], equals: state },
        })),
      };
      [rows, total] = await Promise.all([
        this.prisma.importRecord.findMany({
          where, skip: (page - 1) * pageSize, take: pageSize,
          orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
          select: { id: true, batchId: true, status: true, rawPayload: true, updatedAt: true },
        }),
        this.prisma.importRecord.count({ where }),
      ]);
    } else {
      const matches = [...this.inMemoryRecords.values()]
        .filter(record => record.batchId === input.batchId)
        .filter(record => {
          const raw = record.rawPayload;
          return raw && typeof raw === 'object' && !Array.isArray(raw) &&
            states.includes(raw._phase6HandoffState);
        })
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          || String(b.id).localeCompare(String(a.id)));
      total = matches.length;
      rows = matches.slice((page - 1) * pageSize, page * pageSize);
    }
    const data = rows.map(record => {
      const raw = record.rawPayload && typeof record.rawPayload === 'object'
        && !Array.isArray(record.rawPayload) ? record.rawPayload : {};
      const envelope = raw._phase6HandoffEnvelope &&
        typeof raw._phase6HandoffEnvelope === 'object' &&
        !Array.isArray(raw._phase6HandoffEnvelope)
        ? raw._phase6HandoffEnvelope : {};
      return {
        recordId: record.id, batchId: record.batchId,
        recordStatus: record.status,
        handoffState: typeof raw._phase6HandoffState === 'string'
          ? raw._phase6HandoffState : 'UNKNOWN',
        handoffId: typeof envelope.handoffId === 'string' ? envelope.handoffId : null,
        ownerDomain: typeof envelope.ownerDomain === 'string' ? envelope.ownerDomain : null,
        manualVerificationRequired: raw._phase6HandoffState !== 'AWAITING_DOMAIN_INTEGRATION',
        updatedAt: record.updatedAt,
      };
    });
    return { data, total, page, pageSize };
  }

  async getRecordById(id: string): Promise<any | null> {
    if (this.prisma) {
      return this.prisma.importRecord.findUnique({ where: { id } });
    }

    return this.inMemoryRecords.get(id) || null;
  }

  /** Bounded read-only comparison; no imported payload is selected or returned. */
  async compareBatches(leftId: string, rightId: string, page = 1,
    versions?: { leftUpdatedAt: string; rightUpdatedAt: string; leftRecordVersion?: string; rightRecordVersion?: string }) {
    if (!this.prisma) throw new Error('IMPORT_BATCH_DIFF_DURABLE_REQUIRED');
    if (leftId === rightId || !Number.isSafeInteger(page) || page < 1 || page > 50) throw new Error('IMPORT_BATCH_DIFF_INPUT_INVALID');
    return this.prisma.$transaction(async tx => {
      const batches = await tx.importBatch.findMany({ where: { id: { in: [leftId, rightId] } },
        select: { id: true, sourceSystem: true, dataType: true, updatedAt: true, batchStatus: true } });
      const left = batches.find(batch => batch.id === leftId); const right = batches.find(batch => batch.id === rightId);
      if (!left || !right) throw new Error('IMPORT_BATCH_NOT_FOUND');
      if (versions && (left.updatedAt.toISOString() !== versions.leftUpdatedAt || right.updatedAt.toISOString() !== versions.rightUpdatedAt))
        throw new Error('IMPORT_BATCH_DIFF_VERSION_CONFLICT');
      if (left.sourceSystem !== right.sourceSystem || left.dataType !== right.dataType) throw new Error('IMPORT_BATCH_DIFF_SCOPE_MISMATCH');
      type Row = { id: string; sourceDedupKey: string | null; promotedEntityId?: string | null; updatedAt?: Date; fingerprint: string | null };
      const read = (id: string) => tx.$queryRaw<Row[]>`
        SELECT "id", "updatedAt", CASE WHEN length("sourceDedupKey") <= 512 THEN "sourceDedupKey" ELSE NULL END AS "sourceDedupKey",
        CASE WHEN length("promotedEntityId") <= 512 THEN "promotedEntityId" ELSE NULL END AS "promotedEntityId",
        CASE WHEN "rawPayload"->>'_payloadFingerprint' ~ '^[a-f0-9]{64}$'
          THEN "rawPayload"->>'_payloadFingerprint' ELSE NULL END AS "fingerprint"
        FROM "ImportRecord" WHERE "batchId" = ${id}
        AND "status" NOT IN ('CHECKPOINT', 'DLQ', 'WORKER_FAILURE', 'STAGING_PENDING', 'STAGING_INVALID', 'STAGING_REJECTED')
        ORDER BY "id" ASC LIMIT 5001`;
      const leftRows = await read(leftId); const rightRows = await read(rightId);
      if (leftRows.length > 5000 || rightRows.length > 5000) throw new Error('IMPORT_BATCH_DIFF_LIMIT_EXCEEDED');
      const leftRecordVersion = createHash('sha256').update(JSON.stringify(leftRows)).digest('hex');
      const rightRecordVersion = createHash('sha256').update(JSON.stringify(rightRows)).digest('hex');
      if (versions && ((versions.leftRecordVersion && versions.leftRecordVersion !== leftRecordVersion) ||
          (versions.rightRecordVersion && versions.rightRecordVersion !== rightRecordVersion)))
        throw new Error('IMPORT_BATCH_DIFF_VERSION_CONFLICT');
      if ([...leftRows, ...rightRows].some(row => !row.sourceDedupKey && !row.promotedEntityId)) throw new Error('IMPORT_BATCH_DIFF_IDENTITY_REQUIRED');
      const externalKey = (row: Row) => {
        if (!row.sourceDedupKey) return `owner:${row.promotedEntityId}`;
        const key = row.sourceDedupKey;
        const base = key.replace(/\|sha256:[a-f0-9]{64}$/, '');
        return base.endsWith('|payload') ? key : base;
      };
      const ownerLinks = new Map<string, string>();
      for (const row of [...leftRows, ...rightRows]) {
        if (!row.promotedEntityId) continue;
        const key = externalKey(row); const prior = ownerLinks.get(key);
        if (prior && prior !== row.promotedEntityId) throw new Error('IMPORT_BATCH_DIFF_OWNER_CONFLICT');
        ownerLinks.set(key, row.promotedEntityId);
      }
      const identity = (row: Row) => {
        const key = externalKey(row); const owner = row.promotedEntityId ?? ownerLinks.get(key);
        return owner ? `owner:${owner}` : key;
      };
      const before = new Map(leftRows.map(row => [identity(row), row]));
      const after = new Map(rightRows.map(row => [identity(row), row]));
      if (before.size !== leftRows.length || after.size !== rightRows.length) throw new Error('IMPORT_BATCH_DIFF_IDENTITY_AMBIGUOUS');
      const counters = { added: 0, missingFromComparison: 0, changed: 0, unchanged: 0, unknown: 0 };
      const differences: Array<{ identityHash: string; beforeRecordId: string | null; afterRecordId: string | null;
        outcome: 'ADDED' | 'MISSING_FROM_COMPARISON' | 'CHANGED' | 'UNKNOWN' }> = [];
      for (const key of [...new Set([...before.keys(), ...after.keys()])].sort()) {
        const a = before.get(key); const b = after.get(key);
        let outcome: 'ADDED' | 'MISSING_FROM_COMPARISON' | 'CHANGED' | 'UNKNOWN';
        if (!a) { counters.added++; outcome = 'ADDED'; }
        else if (!b) { counters.missingFromComparison++; outcome = 'MISSING_FROM_COMPARISON'; }
        else if (!a.fingerprint || !b.fingerprint) { counters.unknown++; outcome = 'UNKNOWN'; }
        else if (a.fingerprint !== b.fingerprint) { counters.changed++; outcome = 'CHANGED'; }
        else { counters.unchanged++; continue; }
        differences.push({ identityHash: createHash('sha256').update(key).digest('hex'),
          beforeRecordId: a?.id ?? null, afterRecordId: b?.id ?? null, outcome });
      }
      return { left, right, counters, rows: differences.slice((page - 1) * 200, page * 200),
        page, pageSize: 200, totalDifferences: differences.length, maxRowsPerBatch: 5000,
        nextCursor: page * 200 < differences.length ? Buffer.from(JSON.stringify({
          leftId, rightId, leftUpdatedAt: left.updatedAt.toISOString(), rightUpdatedAt: right.updatedAt.toISOString(),
          leftRecordVersion, rightRecordVersion, page: page + 1 })).toString('base64url') : null,
        leftRecordVersion, rightRecordVersion, comparisonAlgorithm: 'EXTERNAL_OR_RESOLVED_OWNER_ID_V1',
        readOnly: true, canonicalDeletion: false, missingRowsMeaning: 'OBSERVATION_ONLY',
        comparisonScope: 'PERSISTED_ACCEPTED_ROWS_NOT_COMPLETE_SOURCE_SNAPSHOT' };
    }, { isolationLevel: 'RepeatableRead' });
  }

  /** Bounded recovery of expired artifact staging; never time out an owner handoff. */
  async recoverStaleStaging(): Promise<number> {
    if (!this.prisma) throw new Error('IMPORT_STREAM_DURABLE_COMPOSITION_REQUIRED');
    const now = new Date();
    const candidates = await this.prisma.importBatch.findMany({
      where: { OR: [
        { batchStatus: 'STAGING', claimedBy: 'ARTIFACT_STAGING', claimUntil: { lte: now } },
        // Compatibility with interrupted Session 2 streams. Ordinary CREATED jobs are excluded.
        { batchStatus: 'CREATED', claimedBy: null, claimUntil: null,
          updatedAt: { lte: new Date(now.getTime() - 300_000) },
          records: { some: { status: { in: ['STAGING_PENDING', 'STAGING_INVALID'] } } } },
      ] }, select: { id: true, batchStatus: true, updatedAt: true, claimUntil: true },
      orderBy: { updatedAt: 'asc' }, take: 20,
    });
    let recovered = 0;
    for (const candidate of candidates) {
      recovered += await this.prisma.$transaction(async tx => {
        const won = await tx.importBatch.updateMany({ where: { id: candidate.id,
          batchStatus: candidate.batchStatus, updatedAt: candidate.updatedAt, claimUntil: candidate.claimUntil },
          data: { batchStatus: 'FAILED_PERMANENT', claimedBy: null, claimUntil: null,
            lastError: 'IMPORT_ARTIFACT_STAGING_REJECTED' } });
        if (won.count !== 1) return 0;
        await tx.importRecord.updateMany({ where: { batchId: candidate.id, promotedEntityId: null,
          status: { in: ['STAGING_PENDING', 'STAGING_INVALID'] } }, data: { status: 'STAGING_REJECTED' } });
        return 1;
      });
    }
    return recovered;
  }

  async finalizeStagedStream(batchId: string, count: number): Promise<void> {
    if (!this.prisma) throw new Error('IMPORT_STREAM_DURABLE_COMPOSITION_REQUIRED');
    await this.prisma.$transaction(async tx => {
      const batch = await tx.importBatch.updateMany({
        where: { id: batchId, batchStatus: 'STAGING', claimedBy: 'ARTIFACT_STAGING', claimUntil: { gt: new Date() } },
        // Queue visibility and all promoted rows commit together.
        data: { batchStatus: 'QUEUED', availableAt: new Date(), claimedBy: null, claimUntil: null,
          totalRecords: count, processedRecords: 0, failedRecords: 0 },
      });
      if (batch.count !== 1) throw new Error('IMPORT_STREAM_STATE_CONFLICT');
      const valid = await tx.importRecord.updateMany({ where: { batchId, status: 'STAGING_PENDING' }, data: { status: 'COMPLETE' } });
      const invalid = await tx.importRecord.updateMany({ where: { batchId, status: 'STAGING_INVALID' }, data: { status: 'INCOMPLETE' } });
      if (valid.count + invalid.count !== count) throw new Error('IMPORT_STREAM_ACCEPTANCE_COUNT_MISMATCH');
    });
  }

  async rejectStagedStream(batchId: string): Promise<void> {
    if (!this.prisma) throw new Error('IMPORT_STREAM_DURABLE_COMPOSITION_REQUIRED');
    await this.prisma.$transaction(async tx => {
      const updated = await tx.importBatch.updateMany({
        where: { id: batchId, batchStatus: 'STAGING', claimedBy: 'ARTIFACT_STAGING' },
        data: { batchStatus: 'FAILED_PERMANENT', claimedBy: null, claimUntil: null, lastError: 'IMPORT_ARTIFACT_STAGING_REJECTED' },
      });
      // If queue ownership already changed, never overwrite its result.
      if (!updated.count) return;
      await tx.importRecord.updateMany({ where: { batchId, promotedEntityId: null,
        status: { in: ['STAGING_PENDING', 'STAGING_INVALID', 'COMPLETE', 'INCOMPLETE'] } }, data: { status: 'STAGING_REJECTED' } });
    });
  }

  async findExistingSourceDedupKeys(sourceDedupKeys: string[]): Promise<string[]> {
    const keys = Array.from(new Set(sourceDedupKeys.filter(Boolean)));
    if (keys.length === 0) return [];

    if (this.prisma) {
      const rows = await this.prisma.importRecord.findMany({
        where: { sourceDedupKey: { in: keys }, status: { notIn: ['STAGING_REJECTED', 'STAGING_PENDING', 'STAGING_INVALID'] } },
        select: { sourceDedupKey: true },
      });
      return Array.from(new Set(rows.map((row: any) => row.sourceDedupKey).filter(Boolean)));
    }

    const requested = new Set(keys);
    const found = new Set<string>();
    for (const record of this.inMemoryRecords.values()) {
      if (!['STAGING_REJECTED', 'STAGING_PENDING', 'STAGING_INVALID'].includes(record.status) && record.sourceDedupKey && requested.has(record.sourceDedupKey))
        found.add(record.sourceDedupKey);
    }
    return Array.from(found);
  }

  async findBySourceDedupKey(sourceDedupKey: string, batchId?: string): Promise<any | null> {
    if (this.prisma) {
      const where: any = { sourceDedupKey, status: { notIn: ['STAGING_REJECTED', 'STAGING_PENDING', 'STAGING_INVALID'] } };
      if (batchId) {
        where.batchId = batchId;
      }
      const record = await this.prisma.importRecord.findFirst({ where });
      return record;
    }

    for (const record of this.inMemoryRecords.values()) {
      if (record.sourceDedupKey === sourceDedupKey && !['STAGING_REJECTED', 'STAGING_PENDING', 'STAGING_INVALID'].includes(record.status)) {
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
    lease?: { batchId: string; workerId: string; attempt: number; claimUntil: Date },
  ): Promise<any> {
    const data = {
      status: updates.status,
      validationErrors: toOptionalPrismaJson(updates.validationErrors),
      promotedEntityId: updates.promotedEntityId,
      processingNotes: updates.processingNotes,
      rawPayload: toOptionalPrismaJson(updates.rawPayload),
    };
    if (this.prisma) {
      if (lease) {
        // Lock the owning batch row and update the record within ONE transaction.
        // Admin pause/cancel and worker claim transfers update the same batch row;
        // they cannot slip between a separate heartbeat and an unfenced record write.
        return this.prisma.$transaction(async tx => {
          const guarded = await tx.importBatch.updateMany({
            where: {
              id: lease.batchId, batchStatus: 'RUNNING',
              claimedBy: lease.workerId, attemptCount: lease.attempt,
              claimUntil: { equals: lease.claimUntil, gte: new Date() },
            },
            data: { claimedBy: lease.workerId },
          });
          if (guarded.count !== 1) throw new Error('IMPORT_WORKER_LEASE_LOST');
          const changed = await tx.importRecord.updateMany({
            where: { id, batchId: lease.batchId },
            data,
          });
          if (changed.count !== 1) throw new Error('IMPORT_RECORD_BATCH_MISMATCH');
          return changed;
        });
      }
      return this.prisma.importRecord.update({ where: { id }, data });
    }

    const existing = this.inMemoryRecords.get(id);
    if (existing) {
      if (lease && existing.batchId !== lease.batchId)
        throw new Error('IMPORT_RECORD_BATCH_MISMATCH');
      const updated = {
        ...existing,
        ...updates,
        updatedAt: new Date(),
      };
      this.inMemoryRecords.set(id, updated);
      return updated;
    }
    if (lease) throw new Error('IMPORT_RECORD_BATCH_MISMATCH');
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
    lease?: { batchId: string; workerId: string; attempt: number; claimUntil: Date },
  ): Promise<any> {
    if (this.prisma) {
      if (lease) {
        if (lease.batchId !== batchId || stats.batchStatus !== undefined)
          throw new Error('IMPORT_WORKER_LEASE_LOST');
        const now = new Date();
        const result = await this.prisma.importBatch.updateMany({
          where: {
            id: batchId, batchStatus: 'RUNNING', claimedBy: lease.workerId,
            attemptCount: lease.attempt,
            claimUntil: { equals: lease.claimUntil, gte: now },
          },
          data: { processedRecords: stats.processedRecords, failedRecords: stats.failedRecords },
        });
        if (result.count !== 1) throw new Error('IMPORT_WORKER_LEASE_LOST');
        return result;
      }
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

// Read legacy test batches together with their canonical domain; never rewrite historical provenance.
function importDomainFilter(value: string): string | { in: string[] } {
  return value === 'TESTS' || value === 'INTERNATIONAL_TESTS'
    ? { in: ['TESTS', 'INTERNATIONAL_TESTS'] }
    : value;
}
function matchesImportDomain(actual: string | undefined, requested: string | undefined): boolean {
  if (!requested) return true;
  return requested === 'TESTS' || requested === 'INTERNATIONAL_TESTS'
    ? actual === 'TESTS' || actual === 'INTERNATIONAL_TESTS'
    : actual === requested;
}

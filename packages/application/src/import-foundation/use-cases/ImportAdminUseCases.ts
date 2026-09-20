import {
  ImportCheckpoint,
  ImportJobStatus,
  ImportRecordStatus,
  ImportTargetDomain,
} from '@manaratak/domain';
import { v4 as uuidv4 } from 'uuid';
import { IImportQueueGateway } from '../gateways/IImportQueueGateway';
import { ImportJobLease } from '../dtos/ImportQueueDtos';
import { InlineDataParser } from '../parsers/InlineDataParser';
import { ImportSourceIdentity } from '../services/ImportSourceIdentity';
import { ImportHandoffDispatcher } from '../services/ImportHandoffDispatcher';
import { ImportWorkerProtocol } from './ImportWorkerProtocol';

type ImportRepository = {
  createBatch(data: Record<string, unknown>): Promise<any>;
  createRecord(data: Record<string, unknown>): Promise<any>;
  bulkCreateRecords?(records: Array<Record<string, unknown>>): Promise<{ count: number }>;
  updateRecord?(id: string, updates: Record<string, unknown>): Promise<any>;
  updateBatchStats(id: string, data: Record<string, unknown>): Promise<any>;
  getBatchById?(id: string): Promise<any | null>;
  listBatches(filters?: Record<string, unknown>): Promise<any[]>;
  listRecords(filters?: Record<string, unknown>): Promise<any>;
  findBySourceDedupKey?(sourceDedupKey: string): Promise<any | null>;
  findExistingSourceDedupKeys?(sourceDedupKeys: string[]): Promise<string[]>;
  getOverview?(filters?: { dataType?: string }): Promise<any>;
  getOperationalInsights?(filters?: { dataType?: string }): Promise<any>;
  getErrorReport?(filters?: { dataType?: string; batchId?: string; limit?: number }): Promise<any>;
};

export interface StageImportRowsInput {
  ownerDomain: string;
  sourceSystem: string;
  rows: Array<Readonly<Record<string, unknown>>>;
  validationIssues?: Array<readonly unknown[]>;
  handoffContext?: {
    artifactId?: string;
    rawArtifactReference?: string;
    correlationId?: string;
    executionId?: string;
    importSessionId?: string;
    attempt?: number;
    dryRun?: boolean;
    referenceMetadata?: Record<string, string>;
  };
}

interface PersistedHandoffEnvelope {
  handoffId: string;
  ownerDomain: string;
  artifact: Record<string, unknown>;
  normalizedPayload: Readonly<Record<string, unknown>>;
  provenance: Record<string, unknown>;
  validation: Record<string, unknown>;
  execution: Record<string, unknown>;
  correlationId?: string;
  referenceMetadata?: Record<string, string>;
}

export class ImportAdminUseCases {
  constructor(
    private readonly importRepository: ImportRepository,
    private readonly importQueueGateway?: IImportQueueGateway,
    private readonly handoffDispatcher?: ImportHandoffDispatcher,
    private readonly importWorkerProtocol?: ImportWorkerProtocol,
  ) {}

  async importData(input: { dataText: string; sourceSystem?: string; dataType?: string }) {
    const text = input.dataText.trim();
    const ownerDomain = this.resolveOwnerDomain(input.dataType);
    const maxLength = 90 * 1024;
    if (new TextEncoder().encode(text).byteLength > maxLength) {
      throw new Error('Import payload is too large. Large imports must use the artifact import flow.');
    }

    const rows = await InlineDataParser.parse(text);
    return this.stageNormalizedRows({
      ownerDomain,
      sourceSystem: input.sourceSystem || 'ADMIN_CONSOLE',
      rows: rows.map((row) => ({ ...row })),
    });
  }

  async preflightData(input: { dataText: string; sourceSystem?: string; dataType?: string }) {
    const text = input.dataText.trim();
    const ownerDomain = this.resolveOwnerDomain(input.dataType);
    const sourceSystem = input.sourceSystem?.trim() || 'ADMIN_CONSOLE';
    const maxLength = 90 * 1024;
    if (!text) throw new Error('Import text or CSV content is required.');
    if (new TextEncoder().encode(text).byteLength > maxLength) {
      throw new Error('Import payload is too large. Large imports must use the artifact import flow.');
    }

    const rows = await InlineDataParser.parse(text);
    const seen = new Set<string>();
    const uniqueSourceKeys: string[] = [];
    let invalidRows = 0;
    let duplicatesInPayload = 0;
    let duplicatesAlreadyStaged = 0;
    const previewRows: Array<Record<string, unknown>> = [];

    for (const row of rows) {
      const validObject = row !== null && typeof row === 'object' && Object.keys(row).length > 0;
      if (!validObject) {
        invalidRows++;
        continue;
      }
      const identity = ImportSourceIdentity.create({ sourceSystem, ownerDomain, payload: row });
      if (seen.has(identity.sourceDedupKey)) {
        duplicatesInPayload++;
        continue;
      }
      seen.add(identity.sourceDedupKey);
      uniqueSourceKeys.push(identity.sourceDedupKey);
      if (previewRows.length < 5) previewRows.push({ ...row });
    }

    if (uniqueSourceKeys.length > 0) {
      if (this.importRepository.findExistingSourceDedupKeys) {
        duplicatesAlreadyStaged = (await this.importRepository.findExistingSourceDedupKeys(uniqueSourceKeys)).length;
      } else if (this.importRepository.findBySourceDedupKey) {
        const existing = await Promise.all(uniqueSourceKeys.map((key) => this.importRepository.findBySourceDedupKey!(key)));
        duplicatesAlreadyStaged = existing.filter(Boolean).length;
      }
    }

    const duplicateRows = duplicatesInPayload + duplicatesAlreadyStaged;
    const newRows = Math.max(0, rows.length - invalidRows - duplicateRows);
    return {
      ownerDomain,
      sourceSystem,
      totalRows: rows.length,
      newRows,
      invalidRows,
      duplicateRows,
      duplicatesInPayload,
      duplicatesAlreadyStaged,
      previewRows,
      warnings: [
        ...(invalidRows ? [`${invalidRows} row(s) are empty or structurally invalid and will require review.`] : []),
        ...(duplicateRows ? [`${duplicateRows} duplicate row(s) will be skipped by source identity deduplication.`] : []),
        'Generic preflight validates parsing and source identity only. Domain completeness and merge policy remain owned by the target domain.',
        'Staging never publishes records automatically.',
      ],
    };
  }

  async getOverview(filters?: { dataType?: string }) {
    const dataType = filters?.dataType ? this.resolveOwnerDomain(filters.dataType) : undefined;
    if (this.importRepository.getOverview) {
      return this.importRepository.getOverview(dataType ? { dataType } : undefined);
    }

    const batches = await this.importRepository.listBatches(dataType ? { dataType } : {});
    const statuses = ['NEEDS_REVIEW', 'INCOMPLETE', 'FAILED', 'DLQ', 'PROMOTED'];
    const [all, ...statusResults] = await Promise.all([
      this.importRepository.listRecords({ dataType, page: 1, pageSize: 1 }),
      ...statuses.map((status) => this.importRepository.listRecords({ dataType, status, page: 1, pageSize: 1 })),
    ]);
    const statusTotals = Object.fromEntries(statuses.map((status, index) => [status, statusResults[index]?.total ?? 0]));
    return {
      totalBatches: batches.length,
      totalRecords: all.total ?? 0,
      activeBatches: batches.filter((batch: any) => ['CREATED', 'QUEUED', 'RUNNING', 'PAUSED', 'RESUMING', 'CANCELLING', 'PROCESSING'].includes(batch.batchStatus)).length,
      needsReview: (statusTotals.NEEDS_REVIEW ?? 0) + (statusTotals.INCOMPLETE ?? 0),
      failedRecords: (statusTotals.FAILED ?? 0) + (statusTotals.DLQ ?? 0),
      transferredRecords: statusTotals.PROMOTED ?? 0,
      recordStatusCounts: statusTotals,
      batchStatusCounts: {},
      byDomain: {},
      latestBatch: batches[0] ?? null,
      generatedAt: new Date(),
    };
  }


  async getOperationalInsights(filters?: { dataType?: string }) {
    const dataType = filters?.dataType ? this.resolveOwnerDomain(filters.dataType) : undefined;
    if (this.importRepository.getOperationalInsights) {
      return this.importRepository.getOperationalInsights(dataType ? { dataType } : undefined);
    }

    const batches = await this.importRepository.listBatches({ ...(dataType ? { dataType } : {}), limit: 100 });
    const now = Date.now();
    const staleBefore = now - 15 * 60 * 1000;
    const activeStatuses = new Set(['CREATED', 'QUEUED', 'RUNNING', 'PAUSED', 'RESUMING', 'CANCELLING', 'PROCESSING']);
    const stuck = batches.filter((batch: any) => ['RUNNING', 'PROCESSING'].includes(String(batch.batchStatus)) && new Date(batch.updatedAt ?? batch.createdAt).getTime() < staleBefore);
    const highFailure = batches.filter((batch: any) => Number(batch.totalRecords ?? 0) > 0 && (Number(batch.failedRecords ?? 0) / Number(batch.totalRecords)) > 0.10);
    return {
      stuckBatches: stuck.length,
      highFailureBatches: highFailure.length,
      retryableBatches: batches.filter((batch: any) => String(batch.batchStatus) === 'FAILED_RETRYABLE').length,
      pausedBatches: batches.filter((batch: any) => String(batch.batchStatus) === 'PAUSED').length,
      queuedBatches: batches.filter((batch: any) => ['CREATED', 'QUEUED', 'RESUMING'].includes(String(batch.batchStatus))).length,
      dlqBatches: batches.filter((batch: any) => String(batch.batchStatus) === 'DLQ').length,
      oldestActiveBatch: batches.filter((batch: any) => activeStatuses.has(String(batch.batchStatus))).sort((a: any, b: any) => new Date(a.updatedAt ?? a.createdAt).getTime() - new Date(b.updatedAt ?? b.createdAt).getTime())[0] ?? null,
      recentProblemBatches: [...stuck, ...highFailure]
        .filter((batch: any, index: number, all: any[]) => all.findIndex((candidate: any) => candidate.id === batch.id) === index)
        .sort((a: any, b: any) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime())
        .slice(0, 8),
      generatedAt: new Date(),
    };
  }

  async getErrorReport(filters?: { dataType?: string; batchId?: string; limit?: number }) {
    const dataType = filters?.dataType ? this.resolveOwnerDomain(filters.dataType) : undefined;
    const limit = this.boundedNumber(filters?.limit, 500, 1, 1000);
    if (this.importRepository.getErrorReport) {
      return this.importRepository.getErrorReport({
        ...(dataType ? { dataType } : {}),
        ...(filters?.batchId ? { batchId: filters.batchId } : {}),
        limit,
      });
    }

    const failed = await this.importRepository.listRecords({ dataType, batchId: filters?.batchId, status: 'FAILED', page: 1, pageSize: Math.min(100, limit) });
    const dlq = await this.importRepository.listRecords({ dataType, batchId: filters?.batchId, status: 'DLQ', page: 1, pageSize: Math.min(100, limit) });
    const rows = [...(failed.data ?? []), ...(dlq.data ?? [])].slice(0, limit);
    return {
      total: Number(failed.total ?? 0) + Number(dlq.total ?? 0),
      failed: Number(failed.total ?? 0),
      dlq: Number(dlq.total ?? 0),
      rows,
      truncated: Number(failed.total ?? 0) + Number(dlq.total ?? 0) > rows.length,
      generatedAt: new Date(),
    };
  }

  getDomainCapabilities(domains: string[]) {
    return {
      data: domains.map((ownerDomain) => {
        const resolvedDomain = this.resolveOwnerDomain(ownerDomain);
        const handoffReady = this.hasHandoffConsumer(resolvedDomain);
        return {
          ownerDomain: resolvedDomain,
          stagingReady: true,
          handoffReady,
          integrationMode: handoffReady ? 'DOMAIN_HANDOFF_READY' : 'STAGING_ONLY',
          semanticPromotionOwner: 'OWNING_DOMAIN',
        };
      }),
      generatedAt: new Date(),
    };
  }

  async stageNormalizedRows(input: StageImportRowsInput) {
    if (!input.ownerDomain.trim()) throw new Error('Import ownerDomain is required.');

    const durableWorkerPath = Boolean(this.importQueueGateway && this.importWorkerProtocol);
    const batch = await this.importRepository.createBatch({
      sourceSystem: input.sourceSystem,
      dataType: input.ownerDomain,
      batchStatus: durableWorkerPath ? ImportJobStatus.CREATED : 'PROCESSING',
      totalRecords: input.rows.length,
      processedRecords: 0,
      failedRecords: 0,
    });

    let processedRecords = 0;
    let failedRecords = 0;
    let stagedRecords = 0;
    let skippedDuplicates = 0;
    const seenDedupKeys = new Set<string>();
    const recordsToReturn: any[] = [];
    const chunkSize = 500;

    try {
      for (let offset = 0; offset < input.rows.length; offset += chunkSize) {
        const chunk = input.rows.slice(offset, offset + chunkSize);
        const records: Array<Record<string, unknown>> = [];

        for (let index = 0; index < chunk.length; index++) {
          const payload = chunk[index];
          const sourceRowNumber = offset + index + 1;
          const issues = input.validationIssues?.[sourceRowNumber - 1] ?? [];
          const validObject =
            payload !== null && typeof payload === 'object' && Object.keys(payload).length > 0;
          const status =
            validObject && issues.length === 0
              ? ImportRecordStatus.COMPLETE
              : ImportRecordStatus.INCOMPLETE;

          if (status === ImportRecordStatus.COMPLETE) processedRecords++;
          else failedRecords++;

          const identity = ImportSourceIdentity.create({
            sourceSystem: input.sourceSystem,
            ownerDomain: input.ownerDomain,
            payload,
          });
          const alreadyPersisted = this.importRepository.findBySourceDedupKey
            ? await this.importRepository.findBySourceDedupKey(identity.sourceDedupKey)
            : null;
          if (seenDedupKeys.has(identity.sourceDedupKey) || alreadyPersisted) {
            skippedDuplicates++;
            continue;
          }
          seenDedupKeys.add(identity.sourceDedupKey);

          const validationState = !validObject
            ? 'INVALID'
            : issues.length
              ? 'NEEDS_REVIEW'
              : 'VALID';
          const handoffEnvelope =
            validationState !== 'INVALID'
              ? this.buildHandoffEnvelope(input, batch.id, sourceRowNumber, identity, payload, issues, validationState)
              : null;

          // In the durable worker composition, persist work before dispatching it. If the API/worker
          // dies, the record remains an authoritative recovery instruction and the queue lease can be reclaimed.
          const handoffReady = Boolean(
            handoffEnvelope && this.hasHandoffConsumer(handoffEnvelope.ownerDomain),
          );
          const handoff =
            !durableWorkerPath && handoffReady && this.handoffDispatcher && handoffEnvelope
              ? await this.handoffDispatcher.dispatch(handoffEnvelope as any)
              : null;
          const persistedStatus =
            !durableWorkerPath && handoffEnvelope && !handoffReady && status === ImportRecordStatus.COMPLETE
              ? ImportRecordStatus.NEEDS_REVIEW
              : status;

          records.push({
            id: `rec-${uuidv4().substring(0, 8)}`,
            batchId: batch.id,
            status: persistedStatus,
            rawPayload: {
              ...payload,
              _sourceRowNumber: sourceRowNumber,
              _payloadFingerprint: identity.payloadFingerprint,
              ...(durableWorkerPath && handoffEnvelope
                ? { _phase6HandoffEnvelope: handoffEnvelope }
                : handoff
                  ? { _domainHandoff: handoff, _phase6HandoffState: 'DISPATCHED' }
                  : handoffEnvelope
                    ? { _phase6HandoffEnvelope: handoffEnvelope, _phase6HandoffState: 'AWAITING_DOMAIN_INTEGRATION' }
                    : {}),
            },
            validationErrors:
              issues.length > 0 ? issues : validObject ? null : ['EMPTY_NORMALIZED_PAYLOAD'],
            processingNotes: `Source row ${sourceRowNumber}`,
            sourceDedupKey: identity.sourceDedupKey,
            chunkIndex: Math.floor((sourceRowNumber - 1) / chunkSize),
            sourceRowNumber,
          });
        }

        if (records.length > 0) {
          if (this.importRepository.bulkCreateRecords) {
            const created = await this.importRepository.bulkCreateRecords(records);
            stagedRecords += created.count;
          } else {
            for (const record of records) {
              await this.importRepository.createRecord(record);
              stagedRecords++;
            }
          }
          if (recordsToReturn.length < 100) {
            recordsToReturn.push(...records.slice(0, 100 - recordsToReturn.length));
          }
        }
      }

      const finalizedBatch = await this.importRepository.updateBatchStats(batch.id, {
        totalRecords: input.rows.length,
        processedRecords: durableWorkerPath ? 0 : processedRecords,
        failedRecords: durableWorkerPath ? 0 : failedRecords,
        batchStatus: durableWorkerPath ? ImportJobStatus.CREATED : ImportJobStatus.COMPLETED,
      });

      if (durableWorkerPath) {
        await this.importQueueGateway!.enqueueImportJob({
          batchId: batch.id,
          targetDomain: this.toTargetDomain(input.ownerDomain),
          sourceSystem: input.sourceSystem,
          metadata: { stagingMode: 'PHASE6_DURABLE_WORKER' },
        });

        const result = await this.importWorkerProtocol!.runOne(
          `phase6-inline-${uuidv4()}`,
          (lease, heartbeat) => this.processClaimedBatch(lease, heartbeat),
          batch.id,
        );
        if (result !== 'COMPLETED') {
          throw new Error(`IMPORT_DURABLE_WORKER_NOT_COMPLETED:${result}`);
        }
      }

      const finalBatch = this.importRepository.getBatchById
        ? await this.importRepository.getBatchById(batch.id)
        : finalizedBatch;

      return {
        batch: finalBatch ?? batch,
        summary: {
          totalRecords: input.rows.length,
          processedRecords,
          failedRecords,
          stagedRecords,
          skippedDuplicates,
        },
        records: recordsToReturn,
      };
    } catch (error) {
      // If the durable queue already owns the batch, it is authoritative for retry/DLQ state.
      if (!durableWorkerPath) {
        await this.importRepository.updateBatchStats(batch.id, {
          totalRecords: input.rows.length,
          processedRecords,
          failedRecords,
          batchStatus: 'FAILED',
        });
      }
      throw error;
    }
  }

  /** Process one recoverable durable import job. Intended for worker/scheduler composition. */
  async processNextQueuedBatch(workerId: string): Promise<'IDLE' | 'COMPLETED' | 'RETRY_SCHEDULED' | 'DLQ'> {
    if (!this.importWorkerProtocol) throw new Error('IMPORT_WORKER_PROTOCOL_UNAVAILABLE');
    return this.importWorkerProtocol.runOne(workerId, (lease, heartbeat) =>
      this.processClaimedBatch(lease, heartbeat),
    );
  }

  async listBatches(filters?: any) {
    return this.importRepository.listBatches(this.normalizeLegacyFilters(filters));
  }

  async listRecords(filters?: any) {
    const normalized = this.normalizeLegacyFilters(filters);
    normalized.page = this.boundedNumber(normalized.page, 1, 1, Number.MAX_SAFE_INTEGER);
    normalized.pageSize = this.boundedNumber(normalized.pageSize, 50, 1, 100);
    return this.importRepository.listRecords(normalized);
  }

  async getQueueJobStatus(batchId: string) {
    return this.importQueueGateway?.getJobStatus(batchId) ?? null;
  }

  async pauseQueueJob(batchId: string, reason?: string): Promise<boolean> {
    return this.importQueueGateway?.pauseJob({ batchId, reason }) ?? false;
  }

  async resumeQueueJob(batchId: string): Promise<boolean> {
    return this.importQueueGateway?.resumeJob({ batchId }) ?? false;
  }

  async cancelQueueJob(batchId: string, reason?: string): Promise<boolean> {
    return this.importQueueGateway?.cancelJob({ batchId, reason }) ?? false;
  }

  async replayQueueJob(batchId: string, fromCheckpoint?: boolean): Promise<boolean> {
    return this.importQueueGateway?.replayJob({ batchId, fromCheckpoint }) ?? false;
  }

  private async processClaimedBatch(
    lease: ImportJobLease,
    heartbeat: () => Promise<void>,
  ): Promise<void> {
    if (!this.handoffDispatcher) throw new Error('IMPORT_HANDOFF_DISPATCHER_UNAVAILABLE');
    if (!this.importRepository.updateRecord) throw new Error('IMPORT_RECORD_UPDATE_UNAVAILABLE');
    if (!this.importQueueGateway) throw new Error('IMPORT_QUEUE_GATEWAY_UNAVAILABLE');

    let page = 1;
    const pageSize = 100;
    let processedRecords = 0;
    let failedRecords = 0;
    let recordOffset = 0;
    const acceptedRecordKeys: string[] = [];

    while (true) {
      const result = await this.importRepository.listRecords({
        batchId: lease.batchId,
        page,
        pageSize,
      });
      const records = Array.isArray(result) ? result : result?.data ?? [];
      const total = Array.isArray(result) ? records.length : result?.total ?? records.length;

      for (const record of records) {
        if (record.status === 'CHECKPOINT' || record.status === 'DLQ') continue;
        recordOffset++;
        const rawPayload = this.asRecord(record.rawPayload);
        const envelopeValue = rawPayload._phase6HandoffEnvelope;
        const envelope = envelopeValue && typeof envelopeValue === 'object' && !Array.isArray(envelopeValue)
          ? envelopeValue as unknown as PersistedHandoffEnvelope
          : undefined;

        if (envelope) {
          if (!this.hasHandoffConsumer(envelope.ownerDomain)) {
            await this.importRepository.updateRecord(record.id, {
              status: ImportRecordStatus.NEEDS_REVIEW,
              rawPayload: {
                ...rawPayload,
                _phase6HandoffState: 'AWAITING_DOMAIN_INTEGRATION',
              },
              processingNotes: 'Phase 06 staging completed; owning-domain handoff integration is not registered yet.',
            });
            processedRecords++;
            if (typeof record.sourceDedupKey === 'string') acceptedRecordKeys.push(record.sourceDedupKey);
            continue;
          }

          const handoffResult = await this.handoffDispatcher.dispatch(envelope as any);
          const nextPayload: Record<string, unknown> = { ...rawPayload };
          delete nextPayload._phase6HandoffEnvelope;
          nextPayload._phase6HandoffState = 'DISPATCHED';
          if (handoffResult !== null && handoffResult !== undefined) {
            nextPayload._domainHandoff = handoffResult;
          }
          await this.importRepository.updateRecord(record.id, { rawPayload: nextPayload });
        }

        if (record.status === ImportRecordStatus.COMPLETE) {
          processedRecords++;
          if (typeof record.sourceDedupKey === 'string') acceptedRecordKeys.push(record.sourceDedupKey);
        } else if (record.status === ImportRecordStatus.INCOMPLETE) {
          failedRecords++;
        }
      }

      await this.importRepository.updateBatchStats(lease.batchId, {
        processedRecords,
        failedRecords,
      });

      if (page * pageSize >= total) break;
      await heartbeat();
      page++;
    }

    await this.importQueueGateway.recordCheckpoint(
      lease.batchId,
      ImportCheckpoint.create({
        batchId: lease.batchId,
        stage: 'DOMAIN_HANDOFF_DISPATCHED',
        chunkIndex: Math.max(0, page - 1),
        recordOffset,
        processedRecords,
        failedRecords,
        acceptedRecordKeys,
        updatedAt: new Date(),
        metadata: { workerId: lease.workerId, attempt: lease.attempt },
      }),
    );
  }

  private buildHandoffEnvelope(
    input: StageImportRowsInput,
    batchId: string,
    sourceRowNumber: number,
    identity: { sourceDedupKey: string; payloadFingerprint: string },
    payload: Readonly<Record<string, unknown>>,
    issues: readonly unknown[],
    validationState: 'VALID' | 'NEEDS_REVIEW',
  ): PersistedHandoffEnvelope {
    return {
      handoffId: `handoff:${identity.sourceDedupKey}`,
      ownerDomain: input.ownerDomain,
      artifact: {
        sourceId: input.sourceSystem,
        ...(input.handoffContext?.artifactId ? { artifactId: input.handoffContext.artifactId } : {}),
        ...(input.handoffContext?.rawArtifactReference
          ? { rawArtifactReference: input.handoffContext.rawArtifactReference }
          : {}),
      },
      normalizedPayload: payload,
      provenance: {
        sourceSystem: input.sourceSystem,
        sourceRowNumber,
        contentHash: identity.payloadFingerprint,
      },
      validation: {
        state: validationState,
        issues: (issues as string[]).map((message) => ({
          code: 'PHASE6_VALIDATION',
          message,
          severity: 'WARNING' as const,
        })),
      },
      execution: {
        executionId: input.handoffContext?.executionId ?? batchId,
        importSessionId: input.handoffContext?.importSessionId,
        dryRun: input.handoffContext?.dryRun ?? false,
        attempt: input.handoffContext?.attempt ?? 1,
        idempotencyKey: identity.sourceDedupKey,
      },
      correlationId: input.handoffContext?.correlationId,
      referenceMetadata: input.handoffContext?.referenceMetadata,
    };
  }

  private hasHandoffConsumer(ownerDomain: string): boolean {
    if (!this.handoffDispatcher) return false;
    const detector = (this.handoffDispatcher as any).hasConsumer;
    return typeof detector === 'function' ? Boolean(detector.call(this.handoffDispatcher, ownerDomain)) : true;
  }

  private toTargetDomain(ownerDomain: string): ImportTargetDomain {
    const normalized = ownerDomain.trim().toUpperCase();
    const candidate = Object.values(ImportTargetDomain).find((value) => value === normalized);
    return candidate ?? ImportTargetDomain.Generic;
  }

  private asRecord(value: unknown): Record<string, any> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, any>)
      : {};
  }

  private resolveOwnerDomain(dataType?: string): string {
    const requested = (dataType || 'GENERIC').trim().toUpperCase();
    if (!/^[A-Z][A-Z0-9_-]{1,63}$/.test(requested)) {
      throw new Error('Invalid import owner domain identifier.');
    }
    return requested;
  }

  private normalizeLegacyFilters(filters?: any): Record<string, any> {
    return { ...(filters || {}) };
  }

  private boundedNumber(value: unknown, fallback: number, min: number, max: number): number {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
  }
}

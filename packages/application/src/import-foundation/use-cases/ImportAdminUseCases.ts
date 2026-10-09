import {
  ImportCheckpoint,
  ImportParseError,
  ParsedImportRow,
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
  compareBatches?(leftId: string, rightId: string, page?: number, versions?: { leftUpdatedAt: string; rightUpdatedAt: string; leftRecordVersion?: string; rightRecordVersion?: string }): Promise<unknown>;
  recoverStaleStaging?(): Promise<number>;
  finalizeStagedStream?(batchId: string, count: number, counters?: { receivedRecords: number; skippedRecords: number; invalidRecords: number }, sourceFence?: { sourceId: string; revision: string }): Promise<void>;
  rejectStagedStream?(batchId: string): Promise<void>;
  createBatch(data: Record<string, unknown>): Promise<any>;
  createRecord(data: Record<string, unknown>): Promise<any>;
  bulkCreateRecords?(records: Array<Record<string, unknown>>): Promise<{ count: number; acceptedRecordIds?: string[] }>;
  updateRecord?(id: string, updates: Record<string, unknown>, lease?: ImportJobLease): Promise<any>;
  updateBatchStats(id: string, data: Record<string, unknown>, lease?: ImportJobLease): Promise<any>;
  getBatchById?(id: string): Promise<any | null>;
  listBatches(filters?: Record<string, unknown>): Promise<any[]>;
  listRecords(filters?: Record<string, unknown>): Promise<any>;
  findBySourceDedupKey?(sourceDedupKey: string): Promise<any | null>;
  findExistingSourceDedupKeys?(sourceDedupKeys: string[]): Promise<string[]>;
  getOverview?(filters?: { dataType?: string }): Promise<any>;
  getOperationalInsights?(filters?: { dataType?: string }): Promise<any>;
  getErrorReport?(filters?: { dataType?: string; batchId?: string; limit?: number }): Promise<any>;
  listHandoffReconciliation?(filters: { batchId: string; page: number; pageSize: number }): Promise<any>;
};

export interface StageImportRowsInput {
  ownerDomain: string;
  sourceSystem: string;
  rows: Array<Readonly<Record<string, unknown>>>;
  validationIssues?: Array<readonly unknown[]>;
  sourceFence?: { sourceId: string; revision: string };
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
    private readonly maintenance?: () => Promise<unknown>,
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
      activeBatches: batches.filter((batch: any) => ['STAGING', 'CREATED', 'QUEUED', 'RUNNING', 'PAUSED', 'RESUMING', 'CANCELLING', 'PROCESSING'].includes(batch.batchStatus)).length,
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
    const activeStatuses = new Set(['STAGING', 'CREATED', 'QUEUED', 'RUNNING', 'PAUSING', 'PAUSED', 'RESUMING', 'CANCELLING', 'PROCESSING']);
    const stuck = batches.filter((batch: any) => ['RUNNING', 'PROCESSING'].includes(String(batch.batchStatus)) && new Date(batch.updatedAt ?? batch.createdAt).getTime() < staleBefore);
    const pendingStops = batches.filter((batch: any) => ['PAUSING', 'CANCELLING'].includes(String(batch.batchStatus)));
    const strandedStops = pendingStops.filter((batch: any) =>
      new Date(batch.updatedAt ?? batch.createdAt).getTime() < staleBefore &&
      (!batch.claimUntil || new Date(batch.claimUntil).getTime() < now));
    const highFailure = batches.filter((batch: any) => Number(batch.totalRecords ?? 0) > 0 && (Number(batch.failedRecords ?? 0) / Number(batch.totalRecords)) > 0.10);
    return {
      stuckBatches: stuck.length + strandedStops.length,
      pendingStopBatches: pendingStops.length,
      strandedStopBatches: strandedStops.length,
      highFailureBatches: highFailure.length,
      retryableBatches: batches.filter((batch: any) => String(batch.batchStatus) === 'FAILED_RETRYABLE').length,
      pausedBatches: batches.filter((batch: any) => String(batch.batchStatus) === 'PAUSED').length,
      queuedBatches: batches.filter((batch: any) => ['CREATED', 'QUEUED', 'RESUMING'].includes(String(batch.batchStatus))).length,
      dlqBatches: batches.filter((batch: any) => String(batch.batchStatus) === 'DLQ').length,
      oldestActiveBatch: batches.filter((batch: any) => activeStatuses.has(String(batch.batchStatus))).sort((a: any, b: any) => new Date(a.updatedAt ?? a.createdAt).getTime() - new Date(b.updatedAt ?? b.createdAt).getTime())[0] ?? null,
      recentProblemBatches: [...stuck, ...strandedStops, ...highFailure]
        .map((batch: any) => ({
          ...batch,
          stuck: stuck.some((value: any) => value.id === batch.id) ||
            strandedStops.some((value: any) => value.id === batch.id),
          pendingStop: pendingStops.some((value: any) => value.id === batch.id),
          requiresOwnerVerification: strandedStops.some((value: any) => value.id === batch.id),
          highFailureRate: highFailure.some((value: any) => value.id === batch.id),
          failureRate: Number(batch.totalRecords ?? 0) > 0
            ? Number(batch.failedRecords ?? 0) / Number(batch.totalRecords) : 0,
        }))
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
          handoffEffectMode: handoffReady ? 'SCREENING_ONLY' : null,
          canonicalMutationReady: false,
          transactionalOwnerReceiptReady: false,
          durableScreeningReceiptReady: this.handoffDispatcher?.hasDurableScreeningReceipts() ?? false,
          integrationMode: handoffReady ? 'DOMAIN_HANDOFF_READY' : 'STAGING_ONLY',
          semanticPromotionOwner: 'OWNING_DOMAIN',
        };
      }),
      generatedAt: new Date(),
    };
  }

  async stageNormalizedRows(input: StageImportRowsInput) {
    if (!input.ownerDomain.trim()) throw new Error('Import ownerDomain is required.');
    // The importer alone owns the private receipt/routing fields. Reject before
    // any batch is created so input cannot forge a delivery acknowledgement.
    for (const row of input.rows) {
      if (row && typeof row === 'object' &&
          Object.keys(row).some(key => key.startsWith('_phase6') ||
            ['_domainHandoff', '_sourceRowNumber', '_payloadFingerprint', '_importProvenance', '_mappingOriginal', '_screeningReceiptId'].includes(key))) {
        throw new Error('IMPORT_RESERVED_HANDOFF_METADATA_FORBIDDEN');
      }
    }

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
    const recordsToReturn: any[] = [];
    const chunkSize = 500;

    try {
      for (let offset = 0; offset < input.rows.length; offset += chunkSize) {
        const chunk = input.rows.slice(offset, offset + chunkSize);
        const seenDedupKeys = new Set<string>();
        const records: Array<Record<string, unknown>> = [];
        // One bounded source-identity lookup per chunk instead of one SQL read
        // for each imported row. Atomic insert remains the final concurrency gate.
        const previouslyPersisted = this.importRepository.findExistingSourceDedupKeys
          ? new Set(await this.importRepository.findExistingSourceDedupKeys(
              chunk.map(payload => ImportSourceIdentity.create({
                sourceSystem: input.sourceSystem, ownerDomain: input.ownerDomain, payload,
              }).sourceDedupKey),
            ))
          : null;

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

          const identity = ImportSourceIdentity.create({
            sourceSystem: input.sourceSystem,
            ownerDomain: input.ownerDomain,
            payload,
          });
          const alreadyPersisted = previouslyPersisted
            ? previouslyPersisted.has(identity.sourceDedupKey)
            : this.importRepository.findBySourceDedupKey
              ? Boolean(await this.importRepository.findBySourceDedupKey(identity.sourceDedupKey))
              : false;
          if (seenDedupKeys.has(identity.sourceDedupKey) || alreadyPersisted) {
            skippedDuplicates++;
            continue;
          }
          seenDedupKeys.add(identity.sourceDedupKey);
          // Counters must describe the rows persisted for processing, not
          // input duplicates which never enter the durable worker.
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
            id: `rec-${uuidv4()}`,
            batchId: batch.id,
            status: persistedStatus,
            rawPayload: {
              ...payload,
              _sourceRowNumber: sourceRowNumber,
              _payloadFingerprint: identity.payloadFingerprint,
              ...(durableWorkerPath && handoffEnvelope
                ? { _phase6HandoffEnvelope: handoffEnvelope, _phase6HandoffState: 'PENDING_HANDOFF' }
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
            sourceRowNumber, retentionExpiresAt: new Date(Date.now() + 365 * 86400_000), retentionState: 'IMPORT_RAW_PROVENANCE',
          });
        }

        if (records.length > 0) {
          let accepted: Array<Record<string, unknown>> = records;
          if (this.importRepository.bulkCreateRecords) {
            const created = await this.importRepository.bulkCreateRecords(records);
            if (created.acceptedRecordIds) {
              const acceptedIds = new Set(created.acceptedRecordIds);
              accepted = records.filter(record => acceptedIds.has(String(record.id)));
            } else if (created.count !== records.length) {
              // Without exact accepted IDs the caller cannot safely report or dispatch
              // a partial commit. Fail closed rather than inventing successful records.
              throw new Error('IMPORT_BULK_ACCEPTANCE_IDS_REQUIRED');
            }
            if (accepted.length !== created.count) throw new Error('IMPORT_BULK_ACCEPTANCE_COUNT_MISMATCH');
            stagedRecords += created.count;
            skippedDuplicates += records.length - created.count;
          } else {
            for (const record of records) {
              await this.importRepository.createRecord(record);
              stagedRecords++;
            }
          }
          // NEEDS_REVIEW may mean an otherwise valid record awaits an owner
          // integration. Count structural validity, not handoff readiness.
          processedRecords += accepted.filter(record => !record.validationErrors).length;
          failedRecords += accepted.filter(record => Boolean(record.validationErrors)).length;
          if (recordsToReturn.length < 100) {
            recordsToReturn.push(...accepted.slice(0, 100 - recordsToReturn.length));
          }
        }
      }

      const finalizedBatch = await this.importRepository.updateBatchStats(batch.id, {
        totalRecords: stagedRecords, receivedRecords: input.rows.length, skippedRecords: skippedDuplicates, invalidRecords: failedRecords,
        processedRecords: durableWorkerPath ? 0 : processedRecords,
        failedRecords: durableWorkerPath ? 0 : failedRecords,
        batchStatus: durableWorkerPath
          ? ImportJobStatus.CREATED
          : failedRecords > 0 ? ImportJobStatus.PARTIALLY_COMPLETED : ImportJobStatus.COMPLETED,
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
          (lease, heartbeat, getActiveLease) => this.processClaimedBatch(lease, heartbeat, getActiveLease),
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
          totalRecords: stagedRecords,
          processedRecords,
          failedRecords,
          batchStatus: 'FAILED',
        });
      }
      throw error;
    }
  }

  /** Stage bounded chunks without invoking any owner. Only a fully parsed artifact becomes claimable. */
  async stageNormalizedStream(input: Omit<StageImportRowsInput, 'rows' | 'validationIssues'> & {
    rows: AsyncIterable<ParsedImportRow | ImportParseError>;
  }) {
    const repository = this.importRepository;
    if (!this.importQueueGateway || !this.importWorkerProtocol || !repository.bulkCreateRecords ||
        !repository.finalizeStagedStream || !repository.rejectStagedStream || !repository.recoverStaleStaging)
      throw new Error('IMPORT_STREAM_DURABLE_COMPOSITION_REQUIRED');
    const ownerDomain = this.resolveOwnerDomain(input.ownerDomain);
    await repository.recoverStaleStaging();
    const batch = await repository.createBatch({ sourceSystem: input.sourceSystem, dataType: ownerDomain,
      batchStatus: 'STAGING', totalRecords: 0, processedRecords: 0, failedRecords: 0 });
    const envelopeInput: StageImportRowsInput = { ...input, ownerDomain, rows: [] };
    let received = 0; let staged = 0; let skipped = 0; let invalid = 0;
    let chunk: Array<Record<string, unknown>> = [];
    let seen = new Set<string>();
    const flush = async () => {
      if (!chunk.length) return;
      const result = await repository.bulkCreateRecords!(chunk);
      if (!result.acceptedRecordIds || result.acceptedRecordIds.length !== result.count)
        throw new Error('IMPORT_BULK_ACCEPTANCE_IDS_REQUIRED');
      const accepted = new Set(result.acceptedRecordIds);
      if (accepted.size !== result.count || [...accepted].some(id => !chunk.some(record => record.id === id)))
        throw new Error('IMPORT_BULK_ACCEPTANCE_COUNT_MISMATCH');
      staged += result.count; skipped += chunk.length - result.count;
      invalid += chunk.filter(row => accepted.has(String(row.id)) && row.status === 'STAGING_INVALID').length;
      chunk = []; seen = new Set();
    };
    try {
      for await (const item of input.rows) {
        if (++received > 100_000) throw new Error('IMPORT_ARTIFACT_ROW_LIMIT');
        if (item instanceof ImportParseError && !item.recoverable) throw new Error(item.code);
        const payload = item instanceof ParsedImportRow ? item.normalized ?? item.raw : {};
        if (Object.keys(item instanceof ParsedImportRow ? { ...item.raw, ...payload } : payload).some(key => key.startsWith('_phase6') ||
            ['__proto__', 'constructor', 'prototype', '_domainHandoff', '_sourceRowNumber', '_payloadFingerprint', '_importProvenance', '_mappingOriginal', '_screeningReceiptId'].includes(key)))
          throw new Error('IMPORT_RESERVED_HANDOFF_METADATA_FORBIDDEN');
        if (Buffer.byteLength(JSON.stringify(payload), 'utf8') > 1024 * 1024) throw new Error('IMPORT_ROW_SIZE_LIMIT');
        const rowNumber = item.sourceRowNumber ?? received;
        const issues = item instanceof ImportParseError ? [{ code: item.code, severity: 'ERROR' }] : [];
        const identity = ImportSourceIdentity.create({ sourceSystem: input.sourceSystem, ownerDomain,
          payload: item instanceof ImportParseError ? { parseError: item.code, parseErrorSourceRow: rowNumber } : payload });
        if (seen.has(identity.sourceDedupKey)) { skipped++; continue; }
        seen.add(identity.sourceDedupKey);
        const envelope = item instanceof ParsedImportRow
          ? this.buildHandoffEnvelope(envelopeInput, batch.id, rowNumber, identity, payload, [], 'VALID') : undefined;
        chunk.push({ id: `rec-${uuidv4()}`, batchId: batch.id,
          status: issues.length ? 'STAGING_INVALID' : 'STAGING_PENDING',
          rawPayload: { ...payload, _sourceRowNumber: rowNumber, _payloadFingerprint: identity.payloadFingerprint,
            ...(input.handoffContext?.referenceMetadata ? { _importProvenance: { ...input.handoffContext.referenceMetadata } } : {}),
            ...(item instanceof ParsedImportRow && item.normalized ? { _mappingOriginal: item.raw } : {}),
            ...(envelope ? { _phase6HandoffEnvelope: envelope, _phase6HandoffState: 'PENDING_HANDOFF' } : {}) },
          sourceDedupKey: identity.sourceDedupKey, sourceRowNumber: rowNumber,
          chunkIndex: Math.floor((received - 1) / 500), recordOffset: item.recordOffset,
          validationErrors: issues.length ? issues : null,
          retentionExpiresAt: new Date(Date.now() + 365 * 86400_000), retentionState: 'IMPORT_RAW_PROVENANCE',
        });
        if (chunk.length >= 500) await flush();
      }
      await flush();
      if (!received) throw new Error('IMPORT_ARTIFACT_EMPTY');
      await repository.finalizeStagedStream(batch.id, staged, { receivedRecords: received, skippedRecords: skipped, invalidRecords: invalid }, input.sourceFence);
      // Durable repository finalization commits QUEUED and all work items atomically.
      const status = await this.importQueueGateway.getJobStatus(batch.id);
      if (!status || status.status === ImportJobStatus.CREATED) throw new Error('IMPORT_STREAM_QUEUE_NOT_ACCEPTED');
      return { batchId: batch.id, status: status.status, summary: {
        receivedRecords: received, stagedRecords: staged, skippedDuplicates: skipped, invalidRecords: invalid,
      } };
    } catch (error) {
      await repository.rejectStagedStream(batch.id);
      throw error;
    }
  }

  /** Process one recoverable durable import job. Intended for worker/scheduler composition. */
  async processNextQueuedBatch(workerId: string): Promise<'IDLE' | 'COMPLETED' | 'RETRY_SCHEDULED' | 'DLQ'> {
    if (!this.importWorkerProtocol) throw new Error('IMPORT_WORKER_PROTOCOL_UNAVAILABLE');
    await this.maintenance?.();
    await this.importRepository.recoverStaleStaging?.();
    return this.importWorkerProtocol.runOne(workerId, (lease, heartbeat, getActiveLease) =>
      this.processClaimedBatch(lease, heartbeat, getActiveLease),
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

  /** Read-only comparison of bounded persisted observations. */
  async compareBatches(leftId: string, rightId: string, page?: number, cursor?: string) {
    if (!this.importRepository.compareBatches) throw new Error('IMPORT_BATCH_DIFF_UNAVAILABLE');
    if (!cursor) return this.importRepository.compareBatches(leftId, rightId, page);
    try {
      if (page !== undefined || cursor.length > 1024 || !/^[A-Za-z0-9_-]+$/.test(cursor)) throw new Error();
      const value = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
      if (!value || typeof value !== 'object' || value.leftId !== leftId || value.rightId !== rightId ||
          !Number.isSafeInteger(value.page) || value.page < 1 || value.page > 50 ||
          typeof value.leftUpdatedAt !== 'string' || typeof value.rightUpdatedAt !== 'string' ||
          !Number.isFinite(Date.parse(value.leftUpdatedAt)) || !Number.isFinite(Date.parse(value.rightUpdatedAt)) ||
          typeof value.leftRecordVersion !== 'string' || !/^[a-f0-9]{64}$/.test(value.leftRecordVersion) ||
          typeof value.rightRecordVersion !== 'string' || !/^[a-f0-9]{64}$/.test(value.rightRecordVersion) ||
          Object.keys(value).length !== 7) throw new Error();
      return this.importRepository.compareBatches(leftId, rightId, value.page,
        { leftUpdatedAt: value.leftUpdatedAt, rightUpdatedAt: value.rightUpdatedAt,
          leftRecordVersion: value.leftRecordVersion, rightRecordVersion: value.rightRecordVersion });
    } catch { throw new Error('IMPORT_BATCH_DIFF_CURSOR_INVALID'); }
  }

  async getHandoffReconciliation(input: { batchId: string; page?: number; pageSize?: number }) {
    if (!input.batchId?.trim() || input.batchId.length > 180)
      throw new Error('IMPORT_RECONCILIATION_BATCH_INVALID');
    if (!this.importRepository.listHandoffReconciliation)
      throw new Error('IMPORT_RECONCILIATION_READER_UNAVAILABLE');
    return this.importRepository.listHandoffReconciliation({
      batchId: input.batchId,
      page: this.boundedNumber(input.page, 1, 1, Number.MAX_SAFE_INTEGER),
      pageSize: this.boundedNumber(input.pageSize, 50, 1, 100),
    });
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
    getActiveLease: () => ImportJobLease,
  ): Promise<void> {
    if (!this.handoffDispatcher) throw new Error('IMPORT_HANDOFF_DISPATCHER_UNAVAILABLE');
    if (!this.importRepository.updateRecord) throw new Error('IMPORT_RECORD_UPDATE_UNAVAILABLE');
    if (!this.importQueueGateway) throw new Error('IMPORT_QUEUE_GATEWAY_UNAVAILABLE');

    let page = 1;
    const pageSize = 100;
    let processedRecords = 0;
    let failedRecords = 0;
    let reviewRequiredRecords = 0;
    let recordOffset = 0;
    // A checkpoint is a compact cursor, not a full list of all accepted rows.
    // Keep only the most recent keys for diagnostics; the counts and offset
    // remain authoritative even for multi-million-row imports.
    const acceptedRecordKeys: string[] = [];
    let acceptedRecordKeyCount = 0;
    const rememberAcceptedKey = (key: unknown) => {
      if (typeof key !== 'string' || !key) return;
      acceptedRecordKeyCount++;
      acceptedRecordKeys.push(key.slice(0, 512));
      if (acceptedRecordKeys.length > 32) acceptedRecordKeys.shift();
    };

    while (true) {
      const result = await this.importRepository.listRecords({
        batchId: lease.batchId,
        page,
        pageSize,
        workItemsOnly: true,
      });
      const records = Array.isArray(result) ? result : result?.data ?? [];
      const total = Array.isArray(result) ? records.length : result?.total ?? records.length;

      for (const record of records) {
        if (['CHECKPOINT', 'DLQ', 'WORKER_FAILURE'].includes(record.status)) continue;
        // A pause/cancel/worker takeover invalidates the durable lease. Fence before any
        // record mutation or owner handoff, not just between 100-record pages.
        await heartbeat();
        recordOffset++;
        const rawPayload = this.asRecord(record.rawPayload);
        const envelopeValue = rawPayload._phase6HandoffEnvelope;
        const envelope = envelopeValue && typeof envelopeValue === 'object' && !Array.isArray(envelopeValue)
          ? envelopeValue as unknown as PersistedHandoffEnvelope
          : undefined;

        if (envelope) {
          // A write-ahead marker prevents automatic replay after a crash between
          // owner acceptance and ImportRecord acknowledgement. Until the owning
          // domain provides a transactional receipt, uncertain outcomes need review.
          if (rawPayload._phase6HandoffState === 'DISPATCH_IN_FLIGHT' ||
              rawPayload._phase6HandoffState === 'MANUAL_RECONCILIATION_REQUIRED') {
            const receipt = await this.handoffDispatcher.findReceipt?.(envelope as any);
            if (receipt) {
              await heartbeat();
              const resolved: Record<string, unknown> = { ...rawPayload, _domainHandoff: receipt.result, _phase6HandoffState: 'DISPATCHED' };
              delete resolved._phase6HandoffEnvelope;
              await this.importRepository.updateRecord(record.id, { rawPayload: resolved,
                status: envelope.validation.state === 'VALID' ? ImportRecordStatus.COMPLETE : ImportRecordStatus.NEEDS_REVIEW, processingNotes: 'Recovered from durable screening receipt; no owner re-invocation.' }, getActiveLease());
              if (envelope.validation.state === 'VALID') { processedRecords++; rememberAcceptedKey(record.sourceDedupKey); }
              else { failedRecords++; reviewRequiredRecords++; }
              continue;
            }
            await this.importRepository.updateRecord(record.id, {
              status: ImportRecordStatus.NEEDS_REVIEW,
              rawPayload: { ...rawPayload, _phase6HandoffState: 'MANUAL_RECONCILIATION_REQUIRED' },
              processingNotes: 'Owner dispatch outcome uncertain; reconcile before replay.',
            }, getActiveLease());
            failedRecords++; reviewRequiredRecords++; continue;
          }
          if (!this.hasHandoffConsumer(envelope.ownerDomain)) {
            await this.importRepository.updateRecord(record.id, {
              status: ImportRecordStatus.NEEDS_REVIEW,
              rawPayload: {
                ...rawPayload,
                _phase6HandoffState: 'AWAITING_DOMAIN_INTEGRATION',
              },
              processingNotes: 'Phase 06 staging completed; owning-domain handoff integration is not registered yet.',
            }, getActiveLease());
            failedRecords++;
            reviewRequiredRecords++;
            continue;
          }

          await this.importRepository.updateRecord(record.id, {
            rawPayload: { ...rawPayload, _phase6HandoffState: 'DISPATCH_IN_FLIGHT' },
          }, getActiveLease());
          await heartbeat();
          const handoffResult = await this.handoffDispatcher.dispatch(envelope as any);
          // If cancelled during a slow owner call, retain the uncertainty marker.
          await heartbeat();
          const nextPayload: Record<string, unknown> = { ...rawPayload };
          delete nextPayload._phase6HandoffEnvelope;
          nextPayload._phase6HandoffState = 'DISPATCHED';
          if (handoffResult !== null && handoffResult !== undefined) {
            nextPayload._domainHandoff = handoffResult;
          }
          await this.importRepository.updateRecord(record.id, { rawPayload: nextPayload }, getActiveLease());
        }

        if (record.status === ImportRecordStatus.COMPLETE) {
          processedRecords++;
          rememberAcceptedKey(record.sourceDedupKey);
        } else if (record.status === ImportRecordStatus.INCOMPLETE) {
          failedRecords++;
        } else if (record.status === ImportRecordStatus.NEEDS_REVIEW) {
          // A previously staged review cannot silently disappear from
          // completion accounting during a crash recovery/replay.
          failedRecords++;
          reviewRequiredRecords++;
        }
      }

      await heartbeat();
      await this.importRepository.updateBatchStats(lease.batchId, {
        processedRecords,
        failedRecords,
      }, getActiveLease());

      if (page * pageSize >= total) break;
      await heartbeat();
      page++;
    }

    await heartbeat();
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
        metadata: { workerId: lease.workerId, attempt: lease.attempt,
          acceptedRecordKeyCount, retainedAcceptedKeyLimit: 32, cursorMode: 'RECENT_KEYS',
          reviewRequiredRecords, nonSuccessfulWorkIncludesReview: true },
      }),
      getActiveLease(),
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

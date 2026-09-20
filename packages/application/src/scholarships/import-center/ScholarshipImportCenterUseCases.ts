import {
  ScholarshipCompletenessClassifier,
  ScholarshipCompletenessState,
  ScholarshipDeduplicationService,
  ScholarshipImportPayloadSchema,
  ScholarshipNamingService,
  type IScholarshipRepository,
  type ScholarshipDto,
} from '@manaratak/domain';
import type {
  IScholarshipImportCenterGateway,
  IScholarshipImportReviewDecisionPort,
  IScholarshipImportTransferPort,
  ScholarshipImportCenterBatchRecord,
  ScholarshipImportCenterCanonicalSummary,
  ScholarshipImportCenterDiff,
  ScholarshipImportCenterDiffField,
  ScholarshipImportCenterOverview,
  ScholarshipImportCenterQuery,
  ScholarshipImportCenterRecordView,
  ScholarshipImportCenterScanResult,
  ScholarshipImportCenterStoredRecord,
  ScholarshipImportOperationalClass,
  ScholarshipImportReviewDecisionRequest,
  ScholarshipImportTransferRequest,
  ScholarshipImportVerificationState,
  IScholarshipImportVerificationDecisionPort,
  IScholarshipImportCanonicalResolutionDecisionPort,
} from './ScholarshipImportCenterContracts';
import { readScholarshipImportReviewDecision, readScholarshipImportTransferReceipt } from './ScholarshipImportReviewDecisionCodec';
import { ScholarshipImportScreeningReader } from './ScholarshipImportScreeningReader';
import type { ScholarshipSourceRegistryService } from '../source-registry/ScholarshipSourceRegistryService';

const OWNER_DOMAIN = 'SCHOLARSHIPS';
const PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
const MAX_OVERVIEW_SCAN = 5000;
const OPERATIONAL_CLASSES = new Set<ScholarshipImportOperationalClass>([
  'REAL', 'TEST', 'DEMO', 'ARCHIVED', 'UNCLASSIFIED',
]);

export class ScholarshipImportCenterUseCases {
  constructor(
    private readonly gateway: IScholarshipImportCenterGateway,
    private readonly scholarshipRepository: IScholarshipRepository,
    private readonly reviewDecisionPort?: IScholarshipImportReviewDecisionPort,
    private readonly transferPort?: IScholarshipImportTransferPort,
    private readonly sourceRegistry?: ScholarshipSourceRegistryService,
    private readonly verificationDecisionPort?: IScholarshipImportVerificationDecisionPort,
    private readonly canonicalResolutionDecisionPort?: IScholarshipImportCanonicalResolutionDecisionPort,
  ) {}

  async getOverview(
    operationalClass: ScholarshipImportOperationalClass = 'REAL',
  ): Promise<ScholarshipImportCenterOverview> {
    const scan = await this.scan({ operationalClass }, MAX_OVERVIEW_SCAN);
    const records = scan.records;
    return {
      operationalClass,
      totalIncoming: records.length,
      newRecords: records.filter((record) => record.dedupe.state === 'NEW').length,
      duplicateRecords: records.filter((record) => record.dedupe.state === 'DUPLICATE').length,
      updateRecords: records.filter((record) => record.dedupe.state === 'UPDATE').length,
      incomplete: records.filter((record) =>
        record.completeness.state === ScholarshipCompletenessState.INCOMPLETE,
      ).length,
      conflicts: records.filter((record) =>
        record.dedupe.state === 'COLLISION_REVIEW' || record.canonical.ambiguousCount > 0,
      ).length,
      needsReview: records.filter((record) => record.reviewReasons.length > 0).length,
      readyToTransfer: records.filter((record) => record.readyToTransfer).length,
      failedProcessing: records.filter((record) => record.parseState === 'INVALID').length,
      transferred: records.filter((record) => record.transferred).length,
      countsExact: !scan.truncated,
      scanTruncated: scan.truncated,
      scannedRecords: scan.scanned,
      sourceTotal: scan.sourceTotal,
      capabilities: {
        reviewDecisionPersistence: this.reviewDecisionPort ? 'CONFIGURED' : 'NOT_CONFIGURED',
        atomicTransfer: this.transferPort ? 'CONFIGURED' : 'NOT_CONFIGURED',
        sourceRegistryRuntime: 'PENDING_RUNTIME',
      },
    };
  }

  async listSources() {
    const batches = await this.gateway.listBatches({ dataType: OWNER_DOMAIN, limit: 100 });
    const grouped = new Map<string, { batches: number; totalRecords: number; lastBatchAt: Date | string | null }>();
    for (const batch of batches) {
      const current = grouped.get(batch.sourceSystem) ?? { batches: 0, totalRecords: 0, lastBatchAt: null };
      current.batches += 1;
      current.totalRecords += Number(batch.totalRecords ?? 0);
      if (!current.lastBatchAt || this.timestamp(batch.createdAt) > this.timestamp(current.lastBatchAt)) {
        current.lastBatchAt = batch.createdAt ?? null;
      }
      grouped.set(batch.sourceSystem, current);
    }
    const observed = [...grouped.entries()].map(([sourceSystem, value]) => ({ sourceSystem, ...value }));
    if (!this.sourceRegistry) return { registryState: 'NOT_CONFIGURED' as const, sourceRegistryRuntime: 'PENDING_RUNTIME' as const, completeRegistry: false, sources: [], observedStatistics: observed };
    const sources = await this.sourceRegistry.list();
    return { registryState: 'AUTHORITATIVE_SCHOLARSHIP_SOURCE_REGISTRY' as const, sourceRegistryRuntime: 'PENDING_RUNTIME' as const, completeRegistry: true, sources: sources.map((source) => ({ sourceId: source.sourceId, displayName: source.displayName, baseUrl: source.baseUrl, category: source.category, status: source.status, accessClassification: source.accessClassification, connectorId: source.connectorId, connectorVersion: source.connectorVersion, rateLimitPerMinute: source.rateLimitPerMinute ?? null, metadata: source.metadata ?? {} })), observedStatistics: observed };
  }

  async listRecords(query: ScholarshipImportCenterQuery = {}): Promise<{
    data: ScholarshipImportCenterRecordView[];
    sourceTotal: number;
    filteredTotal: number;
    page: number;
    pageSize: number;
    countsExact: boolean;
    scanTruncated: boolean;
    scannedRecords: number;
  }> {
    const page = this.bound(query.page, 1, 1, Number.MAX_SAFE_INTEGER);
    const pageSize = this.bound(query.pageSize, DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);

    if (query.operationalClass) {
      const scan = await this.scan(query, MAX_OVERVIEW_SCAN);
      const start = (page - 1) * pageSize;
      return {
        data: scan.records.slice(start, start + pageSize),
        sourceTotal: scan.sourceTotal,
        filteredTotal: scan.records.length,
        page,
        pageSize,
        countsExact: !scan.truncated,
        scanTruncated: scan.truncated,
        scannedRecords: scan.scanned,
      };
    }

    const result = await this.gateway.listRecords({
      batchId: query.batchId,
      status: query.status,
      dataType: OWNER_DOMAIN,
      page,
      pageSize,
    });
    const analyzed = await Promise.all(result.data.map((record) => this.analyzeWithBatch(record)));
    return {
      data: analyzed,
      sourceTotal: result.total,
      filteredTotal: result.total,
      page: result.page,
      pageSize: result.pageSize,
      countsExact: true,
      scanTruncated: false,
      scannedRecords: analyzed.length,
    };
  }

  async getRecord(recordId: string): Promise<ScholarshipImportCenterRecordView> {
    const record = await this.gateway.getRecordById(recordId);
    if (!record) throw new Error('SCHOLARSHIP_IMPORT_RECORD_NOT_FOUND');
    const batch = record.batch ?? await this.gateway.getBatchById(record.batchId);
    this.assertScholarshipBatch(batch);
    return this.analyze(record, batch!);
  }

  async getDiff(recordId: string): Promise<ScholarshipImportCenterDiff> {
    const view = await this.getRecord(recordId);
    const existing = view.dedupe.duplicateKey
      ? await this.scholarshipRepository.findByDedupKey(view.dedupe.duplicateKey)
      : null;
    const incoming = this.incomingProjection(view);
    const current = existing ? this.currentProjection(existing) : {};
    const fields = this.diffFields(current, incoming);
    return {
      recordId,
      duplicateKey: view.dedupe.duplicateKey,
      existingScholarshipId: existing?.id ?? null,
      fields,
      mutationPerformed: false,
    };
  }

  async listScreening(query: ScholarshipImportCenterQuery = {}): Promise<ScholarshipImportCenterScanResult> {
    const scan = await this.scan(query, MAX_OVERVIEW_SCAN);
    return this.scanResult(scan, scan.records);
  }

  async listDuplicatesAndUpdates(query: ScholarshipImportCenterQuery = {}): Promise<ScholarshipImportCenterScanResult> {
    const scan = await this.scan(query, MAX_OVERVIEW_SCAN);
    return this.scanResult(scan, scan.records.filter((record) =>
      record.dedupe.state === 'DUPLICATE' ||
      record.dedupe.state === 'UPDATE' ||
      record.dedupe.state === 'COLLISION_REVIEW',
    ));
  }

  async listMissingData(query: ScholarshipImportCenterQuery = {}): Promise<ScholarshipImportCenterScanResult> {
    const scan = await this.scan(query, MAX_OVERVIEW_SCAN);
    return this.scanResult(scan, scan.records.filter((record) => record.completeness.missingFields.length > 0));
  }

  async listVerification(query: ScholarshipImportCenterQuery = {}): Promise<ScholarshipImportCenterScanResult> {
    const scan = await this.scan(query, MAX_OVERVIEW_SCAN);
    return this.scanResult(scan, scan.records);
  }

  async getMergeProposal(recordId: string) {
    const record = await this.getRecord(recordId);
    const diff = await this.getDiff(recordId);
    const suggestedActions = record.dedupe.state === 'COLLISION_REVIEW'
      ? ['KEEP_CURRENT', 'SPLIT'] as const
      : record.dedupe.state === 'DUPLICATE' || record.dedupe.state === 'UPDATE'
        ? ['MERGE', 'KEEP_CURRENT', 'SPLIT'] as const
        : [] as const;
    return {
      recordId,
      duplicateKey: record.dedupe.duplicateKey,
      duplicateState: record.dedupe.state,
      requiresReview: record.reviewReasons.length > 0 || record.dedupe.requiresReview,
      suggestedActions,
      diff,
      automaticMergePerformed: false as const,
    };
  }

  async listReviewQueue(query: ScholarshipImportCenterQuery = {}): Promise<ScholarshipImportCenterScanResult> {
    const scan = await this.scan(query, MAX_OVERVIEW_SCAN);
    return this.scanResult(scan, scan.records.filter((record) => record.reviewReasons.length > 0 && !record.transferred));
  }

  async listReadyToTransfer(query: ScholarshipImportCenterQuery = {}): Promise<ScholarshipImportCenterScanResult> {
    const scan = await this.scan(query, MAX_OVERVIEW_SCAN);
    return this.scanResult(scan, scan.records.filter((record) => record.readyToTransfer && !record.transferred));
  }

  async listHistory(query: ScholarshipImportCenterQuery = {}): Promise<ScholarshipImportCenterScanResult> {
    const scan = await this.scan(query, MAX_OVERVIEW_SCAN);
    const data = [...scan.records].sort(
      (left, right) => this.timestamp(right.updatedAt) - this.timestamp(left.updatedAt),
    );
    const events = (await Promise.all(data.map(async (record) => {
      const stored = await this.gateway.getRecordById(record.id);
      const events: import('./ScholarshipImportCenterContracts').ScholarshipImportHistoryEvent[] = [{ recordId: record.id, eventType: 'STAGED_RECORD', occurredAt: record.createdAt ?? record.updatedAt ?? new Date(0), data: { batchId: record.batchId, status: record.importStatus } }];
      if (this.verificationDecisionPort) for (const decision of await this.verificationDecisionPort.list(record.id)) events.push({ recordId: record.id, eventType: 'VERIFICATION_DECISION', occurredAt: decision.recordedAt, data: { state: decision.state, reason: decision.reason, actorId: decision.actorId } });
      if (this.canonicalResolutionDecisionPort) for (const decision of await this.canonicalResolutionDecisionPort.list(record.id)) events.push({ recordId: record.id, eventType: 'CANONICAL_RESOLUTION_DECISION', occurredAt: decision.recordedAt, data: { fieldOrRequirementKey: decision.fieldOrRequirementKey, resolutionType: decision.resolutionType, canonicalId: decision.canonicalId ?? null } });
      const review = readScholarshipImportReviewDecision(stored?.processingNotes);
      if (review?.recordId === record.id) events.push({ recordId: record.id, eventType: 'REVIEW_DECISION', occurredAt: review.recordedAt, data: { decisionId: review.decisionId, action: review.action, actorId: review.actorId, reason: review.reason, duplicateKey: review.duplicateKey, targetScholarshipId: review.targetScholarshipId, correlationId: review.correlationId } });
      const receipt = readScholarshipImportTransferReceipt(stored?.processingNotes);
      if (receipt?.recordId === record.id) events.push({ recordId: record.id, eventType: 'TRANSFER_RECEIPT', occurredAt: receipt.transferredAt, data: { scholarshipId: receipt.scholarshipId, actorId: receipt.actorId, mode: receipt.mode, correlationId: receipt.correlationId } });
      return events;
    }))).flat().sort((a, b) => this.timestamp(b.occurredAt) - this.timestamp(a.occurredAt));
    return { ...this.scanResult(scan, data), events };
  }

  async recordDecision(input: ScholarshipImportReviewDecisionRequest) {
    if (!this.reviewDecisionPort) {
      throw new Error('SCHOLARSHIP_IMPORT_REVIEW_DECISION_PORT_NOT_CONFIGURED');
    }
    await this.getRecord(input.recordId);
    return this.reviewDecisionPort.recordDecision(input);
  }

  async transfer(input: ScholarshipImportTransferRequest) {
    if (!this.transferPort) {
      throw new Error('SCHOLARSHIP_IMPORT_TRANSFER_PORT_NOT_CONFIGURED');
    }
    const record = await this.getRecord(input.recordId);
    if (!record.readyToTransfer) {
      throw new Error('SCHOLARSHIP_IMPORT_RECORD_NOT_READY_TO_TRANSFER');
    }
    return this.transferPort.transfer(input);
  }

  private async scan(query: ScholarshipImportCenterQuery, maxRecords: number) {
    const records: ScholarshipImportCenterRecordView[] = [];
    let page = 1;
    let sourceTotal = 0;
    let scanned = 0;
    let truncated = false;
    while (scanned < maxRecords) {
      const response = await this.gateway.listRecords({
        batchId: query.batchId,
        status: query.status,
        dataType: OWNER_DOMAIN,
        page,
        pageSize: PAGE_SIZE,
      });
      sourceTotal = response.total;
      if (response.data.length === 0) break;
      const views = await Promise.all(response.data.map((record) => this.analyzeWithBatch(record)));
      const remaining = Math.max(0, maxRecords - scanned);
      const boundedViews = views.slice(0, remaining);
      scanned += boundedViews.length;
      for (const view of boundedViews) {
        if (!query.operationalClass || view.operationalClass === query.operationalClass) records.push(view);
      }
      if (page * response.pageSize >= response.total) break;
      page += 1;
    }
    if (scanned < sourceTotal) truncated = true;
    return { records, sourceTotal, scanned, truncated };
  }

  private scanResult(
    scan: { sourceTotal: number; scanned: number; truncated: boolean },
    data: ScholarshipImportCenterRecordView[],
  ): ScholarshipImportCenterScanResult {
    return {
      data,
      countsExact: !scan.truncated,
      scanTruncated: scan.truncated,
      scannedRecords: scan.scanned,
      sourceTotal: scan.sourceTotal,
    };
  }

  private legacyDedupeCompatible(existing: ScholarshipDto, input: { countryReferenceId?: string | null; countrySourceLabel?: string | null; officialSourceUrl?: string | null }): boolean {
    const countryMatches = Boolean(input.countryReferenceId && existing.countryReferenceId && input.countryReferenceId === existing.countryReferenceId) ||
      Boolean(input.countrySourceLabel && existing.countrySourceLabel && this.equal(input.countrySourceLabel, existing.countrySourceLabel));
    const normalizeUrl = (value?: string | null) => {
      if (!value?.trim()) return '';
      try { const url = new URL(value); return `${url.hostname.toLowerCase()}${url.pathname.replace(/\/+$/u, '') || '/'}`; }
      catch { return value.normalize('NFKC').trim().toLocaleLowerCase('und'); }
    };
    const incomingUrl = normalizeUrl(input.officialSourceUrl);
    const existingUrl = normalizeUrl(existing.officialSourceUrl ?? existing.sourceUrl ?? existing.officialWebsite);
    return Boolean(countryMatches && incomingUrl && existingUrl && incomingUrl === existingUrl);
  }

  private async analyzeWithBatch(record: ScholarshipImportCenterStoredRecord) {
    const batch = record.batch ?? await this.gateway.getBatchById(record.batchId);
    this.assertScholarshipBatch(batch);
    return this.analyze(record, batch!);
  }

  private async analyze(
    record: ScholarshipImportCenterStoredRecord,
    batch: ScholarshipImportCenterBatchRecord,
  ): Promise<ScholarshipImportCenterRecordView> {
    const operationalClass = this.operationalClass(record.rawPayload, batch.sourceSystem);
    const raw = this.object(record.rawPayload);
    const parsed = ScholarshipImportPayloadSchema.safeParse(raw);
    const base = {
      id: record.id,
      batchId: record.batchId,
      sourceSystem: batch.sourceSystem,
      sourceRowNumber: record.sourceRowNumber ?? this.numberValue(raw._sourceRowNumber),
      importStatus: record.status,
      operationalClass,
      rawPayload: record.rawPayload,
      screeningOrigin: Object.keys(this.object(raw._domainHandoff)).length ? ('PERSISTED_HANDOFF' as const) : ('LEGACY_RECOMPUTED' as const),
      transferred: Boolean(record.promotedEntityId),
      promotedEntityId: record.promotedEntityId ?? null,
      createdAt: record.createdAt ?? null,
      updatedAt: record.updatedAt ?? null,
    };

    if (!parsed.success) {
      return {
        ...base,
        parseState: 'INVALID',
        screeningOrigin: 'NOT_AVAILABLE',
        parseIssues: parsed.error.issues.map((issue) => `${issue.path.join('.') || 'payload'}:${issue.code}`),
        rawSourceTitle: typeof raw.scholarshipName === 'string' ? raw.scholarshipName : null,
        cleanedScholarshipName: null,
        sourceAliases: [],
        completeness: {
          state: 'NOT_AVAILABLE',
          missingFields: [],
          identityMissingFields: [],
          coreMissingFields: [],
          optionalMissingFields: [],
          identityReady: false,
        },
        dedupe: { duplicateKey: null, state: 'NOT_CHECKED', matchIds: [], requiresReview: false },
        verification: { state: 'PENDING', sourceTraceable: this.sourceTraceable(raw, batch) },
        canonical: this.canonicalSummary(raw),
        reviewReasons: ['PARSE_INVALID'],
        readyToTransfer: false,
      };
    }

    const metadata = this.object(parsed.data.metadata);
    const persistedHandoff = this.object(raw._domainHandoff);
    const aliases = Array.isArray(metadata.sourceAliases)
      ? metadata.sourceAliases.filter((item): item is string => typeof item === 'string')
      : [];
    const persistedName = this.object(persistedHandoff.nameScreening);
    const name = Object.keys(persistedName).length ? { rawSourceTitle: this.stringValue(persistedName.rawSourceTitle) ?? parsed.data.scholarshipName, cleanedScholarshipName: this.stringValue(persistedName.cleanedScholarshipName) ?? parsed.data.scholarshipName, sourceAliases: Array.isArray(persistedName.sourceAliases) ? persistedName.sourceAliases.filter((value): value is string => typeof value === 'string') : aliases, extracted: this.object(persistedName.extracted), detectedYear: this.stringValue(persistedName.detectedYear) } : ScholarshipNamingService.clean(parsed.data.scholarshipName, aliases);
    const canonicalDecisions = this.canonicalResolutionDecisionPort
      ? await this.canonicalResolutionDecisionPort.list(record.id)
      : [];
    const effectiveCanonical = ScholarshipImportScreeningReader.resolve(raw, canonicalDecisions).entries;
    const providerCanonicalPublicId = this.stringValue(metadata.providerCanonicalPublicId)
      ?? effectiveCanonical.find((item) => item.target === 'PROVIDER_UNIVERSITY' && item.state === 'RESOLVED')?.canonicalPublicId
      ?? null;
    const sourceTraceable = this.sourceTraceable(parsed.data, batch);
    const calculatedCompleteness = ScholarshipCompletenessClassifier.classify({
      ...parsed.data,
      cleanedScholarshipName: name.cleanedScholarshipName,
      providerCanonicalPublicId,
      sourceTraceable,
      extractedFundingTypeCode: this.stringValue(name.extracted.fundingTypeCode),
      extractedDegreeLevels: this.stringArray(name.extracted.degreeLevelLabels, []),
    });
    const persistedCompleteness = this.object(persistedHandoff.completeness);
    const completeness = Object.keys(persistedCompleteness).length ? { ...calculatedCompleteness, state: (this.stringValue(persistedCompleteness.state) as ScholarshipCompletenessState) ?? calculatedCompleteness.state, missingFields: this.stringArray(persistedCompleteness.missingFields, calculatedCompleteness.missingFields), identityMissingFields: this.stringArray(persistedCompleteness.identityMissingFields, calculatedCompleteness.identityMissingFields), coreMissingFields: this.stringArray(persistedCompleteness.coreMissingFields, calculatedCompleteness.coreMissingFields), optionalMissingFields: this.stringArray(persistedCompleteness.optionalMissingFields, calculatedCompleteness.optionalMissingFields), identityReady: typeof persistedCompleteness.identityReady === 'boolean' ? persistedCompleteness.identityReady : calculatedCompleteness.identityReady } : calculatedCompleteness;
    const incomingSourceImportRecordId = record.id;
    const dedupeInput = {
      cleanedScholarshipName: name.cleanedScholarshipName,
      providerName: parsed.data.providerName ?? parsed.data.sponsorName,
      providerCanonicalPublicId,
      year: this.stringValue(metadata.academicYear) ?? name.detectedYear,
      countryReferenceId: effectiveCanonical.find((item) => item.target === 'COUNTRY' && item.state === 'RESOLVED')?.canonicalReferenceId ?? null,
      countrySourceLabel: parsed.data.studyCountry ?? null,
      officialSourceUrl: parsed.data.officialSourceUrl ?? parsed.data.sourceUrl ?? parsed.data.officialWebsite ?? parsed.data.applicationLink ?? null,
      incomingSourceImportRecordId,
    };
    const key = ScholarshipDeduplicationService.buildKey(dedupeInput);
    let existing = completeness.identityReady
      ? await this.scholarshipRepository.findByDedupKey(key.duplicateKey)
      : null;
    let legacyReconciliationRequired = false;
    if (!existing && completeness.identityReady) {
      const legacyCandidate = await this.scholarshipRepository.findByDedupKey(ScholarshipDeduplicationService.buildLegacyKey(dedupeInput));
      if (legacyCandidate) {
        if (this.legacyDedupeCompatible(legacyCandidate, dedupeInput)) existing = legacyCandidate;
        else legacyReconciliationRequired = true;
      }
    }
    const matches = existing ? [{
      id: existing.id,
      publicId: existing.publicId,
      displayName: existing.displayName,
      canonicalDedupKey: existing.canonicalDedupKey,
      sourceImportRecordId: existing.sourceImportRecordId ?? null,
    }] : [];
    const calculatedBase = completeness.identityReady
      ? ScholarshipDeduplicationService.assess(dedupeInput, matches)
      : ScholarshipDeduplicationService.assess(dedupeInput);
    const calculatedDedupe = legacyReconciliationRequired
      ? { ...calculatedBase, state: 'COLLISION_REVIEW' as const, requiresReview: true, reason: 'Legacy v1 dedupe candidate requires country/official-URL reconciliation.' }
      : calculatedBase;
    const persistedDedupe = this.object(persistedHandoff.dedupe);
    const persistedDedupeKey = this.stringValue(persistedDedupe.duplicateKey);
    const persistedDedupeCurrent = persistedDedupeKey === calculatedDedupe.duplicateKey;
    const dedupe = Object.keys(persistedDedupe).length && persistedDedupeCurrent
      ? { ...calculatedDedupe, state: (this.stringValue(persistedDedupe.state) as typeof calculatedDedupe.state) ?? calculatedDedupe.state, matches: Array.isArray(persistedDedupe.matches) ? persistedDedupe.matches as typeof calculatedDedupe.matches : calculatedDedupe.matches, requiresReview: typeof persistedDedupe.requiresReview === 'boolean' ? persistedDedupe.requiresReview : calculatedDedupe.requiresReview }
      : calculatedDedupe;
    const persistedVerification = this.verificationDecisionPort ? await this.verificationDecisionPort.latest(record.id) : null;
    const verification = {
      state: persistedVerification?.state ?? this.verificationState(raw),
      sourceTraceable,
    };
    const canonical = this.canonicalSummary(raw, canonicalDecisions);
    const decision = readScholarshipImportReviewDecision(record.processingNotes);
    const mergeDecisionMatches = Boolean(
      existing &&
      decision?.action === 'MERGE' &&
      decision.recordId === record.id &&
      decision.duplicateKey === dedupe.duplicateKey &&
      decision.targetScholarshipId === existing.id,
    );
    const reviewReasons = this.reviewReasons(completeness, dedupe, verification, canonical)
      .filter((reason) => !(mergeDecisionMatches && reason === `DEDUPE:${dedupe.state}`));
    const dedupeReady = dedupe.state === 'NEW' || (
      (dedupe.state === 'DUPLICATE' || dedupe.state === 'UPDATE') && mergeDecisionMatches
    );
    const readyToTransfer =
      completeness.state === ScholarshipCompletenessState.COMPLETE &&
      completeness.identityReady &&
      dedupeReady &&
      !dedupe.requiresReview &&
      verification.state === 'VERIFIED' &&
      canonical.state === 'CLEAR' &&
      !base.transferred;

    return {
      ...base,
      parseState: 'VALID',
      parseIssues: [],
      rawSourceTitle: name.rawSourceTitle,
      cleanedScholarshipName: name.cleanedScholarshipName,
      sourceAliases: name.sourceAliases,
      completeness: {
        state: completeness.state,
        missingFields: completeness.missingFields,
        identityMissingFields: completeness.identityMissingFields,
        coreMissingFields: completeness.coreMissingFields,
        optionalMissingFields: completeness.optionalMissingFields,
        identityReady: completeness.identityReady,
      },
      dedupe: {
        duplicateKey: dedupe.duplicateKey,
        state: dedupe.state,
        matchIds: dedupe.matches.map((match) => match.id),
        requiresReview: dedupe.requiresReview,
      },
      verification,
      canonical,
      reviewReasons,
      readyToTransfer,
    };
  }

  private reviewReasons(
    completeness: ReturnType<typeof ScholarshipCompletenessClassifier.classify>,
    dedupe: ReturnType<typeof ScholarshipDeduplicationService.assess>,
    verification: { state: ScholarshipImportVerificationState; sourceTraceable: boolean },
    canonical: ScholarshipImportCenterCanonicalSummary,
  ): string[] {
    const reasons = new Set<string>();
    for (const field of completeness.identityMissingFields) reasons.add(`IDENTITY_MISSING:${field}`);
    for (const field of completeness.coreMissingFields) reasons.add(`CORE_MISSING:${field}`);
    if (dedupe.state === 'DUPLICATE' || dedupe.state === 'UPDATE' || dedupe.state === 'COLLISION_REVIEW') {
      reasons.add(`DEDUPE:${dedupe.state}`);
    }
    if (verification.state !== 'VERIFIED') reasons.add(`VERIFICATION:${verification.state}`);
    if (!verification.sourceTraceable) reasons.add('SOURCE_NOT_TRACEABLE');
    if (canonical.state === 'NOT_EXECUTED') reasons.add('CANONICAL:NOT_EXECUTED');
    if (canonical.unresolvedCount > 0) reasons.add('CANONICAL:UNRESOLVED');
    if (canonical.ambiguousCount > 0) reasons.add('CANONICAL:AMBIGUOUS');
    if (canonical.reviewRequiredCount > 0) reasons.add('CANONICAL:REVIEW_REQUIRED');
    return [...reasons];
  }

  private canonicalSummary(rawPayload: Record<string, unknown>, decisions: Array<{ fieldOrRequirementKey: string; resolutionType: string; recordedAt?: string }> = []): ScholarshipImportCenterCanonicalSummary {
    const raw = ScholarshipImportScreeningReader.rawEntries(rawPayload);
    if (raw.length === 0) {
      return { state: 'NOT_EXECUTED', unresolvedCount: 0, ambiguousCount: 0, reviewRequiredCount: 0 };
    }
    // This is an append-only decision ledger: only the newest decision for a
    // screening key is effective; an older approval cannot hide a later reject.
    const effective = new Map<string, { resolutionType: string; recordedAt?: string }>();
    for (const decision of decisions) {
      const current = effective.get(decision.fieldOrRequirementKey);
      if (!current || String(decision.recordedAt ?? '') >= String(current.recordedAt ?? '')) effective.set(decision.fieldOrRequirementKey, decision);
    }
    let unresolvedCount = 0;
    let ambiguousCount = 0;
    let reviewRequiredCount = 0;
    for (const item of raw) {
      const entry = this.object(item); const key = this.stringValue(entry.requirementKey) ?? this.stringValue(entry.fieldOrRequirementKey) ?? this.stringValue(entry.target);
      const latest = key ? effective.get(key) : undefined;
      const overridden = latest?.resolutionType === 'RESOLVED' || latest?.resolutionType === 'NOT_APPLICABLE';
      if (overridden) continue;
      const state = this.stringValue(entry.state)?.toUpperCase();
      if (state === 'UNRESOLVED') unresolvedCount += 1;
      if (state === 'AMBIGUOUS') ambiguousCount += 1;
      if (state === 'REVIEW_REQUIRED') reviewRequiredCount += 1;
    }
    const state = unresolvedCount || ambiguousCount || reviewRequiredCount ? 'REVIEW_REQUIRED' : 'CLEAR';
    return { state, unresolvedCount, ambiguousCount, reviewRequiredCount };
  }

  private verificationState(rawPayload: Record<string, unknown>): ScholarshipImportVerificationState {
    const metadata = this.object(rawPayload.metadata);
    const candidate = (
      this.stringValue(metadata.verificationState) ?? this.stringValue(rawPayload._verificationState)
    )?.toUpperCase();
    return candidate === 'VERIFIED' || candidate === 'FAILED' || candidate === 'PENDING'
      ? candidate
      : 'PENDING';
  }

  private sourceTraceable(payload: Record<string, unknown>, batch: ScholarshipImportCenterBatchRecord): boolean {
    const candidates = [
      payload.officialSourceUrl,
      payload.sourceUrl,
      payload.officialWebsite,
      payload.applicationLink,
    ];
    return candidates.some((value) => typeof value === 'string' && value.trim().length > 0)
      || Boolean(batch.sourceSystem?.trim());
  }

  private stringArray(value: unknown, fallback: string[]): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : fallback; }

  private operationalClass(rawPayload: unknown, sourceSystem: string): ScholarshipImportOperationalClass {
    const raw = this.object(rawPayload);
    const metadata = this.object(raw.metadata);
    const explicit = (
      this.stringValue(raw._operationalClass) ?? this.stringValue(metadata.operationalClass)
    )?.toUpperCase() as ScholarshipImportOperationalClass | undefined;
    if (explicit && OPERATIONAL_CLASSES.has(explicit)) return explicit;
    const source = sourceSystem.trim().toUpperCase();
    if (source.includes('DEMO')) return 'DEMO';
    if (source.includes('TEST') || source.includes('SANDBOX')) return 'TEST';
    if (source.includes('ARCHIVE')) return 'ARCHIVED';
    return source ? 'REAL' : 'UNCLASSIFIED';
  }

  private incomingProjection(view: ScholarshipImportCenterRecordView): Record<string, unknown> {
    const raw = this.object(view.rawPayload);
    const metadata = this.object(raw.metadata);
    return {
      displayName: view.cleanedScholarshipName,
      providerName: raw.providerName ?? raw.sponsorName,
      academicYear: metadata.academicYear ?? null,
      fundingTypeCode: metadata.fundingTypeCode ?? (raw.isFullyFunded === true ? 'FULLY_FUNDED' : null),
      studyCountry: raw.studyCountry ?? raw.targetCountries,
      degreeLevel: raw.degreeLevel ?? raw.studyLevels,
      eligibilityCriteria: raw.eligibilityCriteria,
      requiredDocuments: raw.requiredDocuments,
      applicationDeadline: raw.applicationDeadline,
      applicationUrl: raw.applicationLink,
      sourceUrl: raw.officialSourceUrl ?? raw.sourceUrl ?? raw.officialWebsite,
    };
  }

  private currentProjection(existing: ScholarshipDto): Record<string, unknown> {
    return {
      displayName: existing.displayName,
      providerName: existing.providerName,
      academicYear: existing.academicYear,
      fundingTypeCode: existing.fundingTypeCode,
      studyCountry: existing.studyCountry ?? existing.countrySourceLabel ?? existing.countryScope,
      degreeLevel: existing.degreeLevel ?? existing.degreeTargets?.map((target) => target.sourceLabel ?? target.degreeLevelId),
      eligibilityCriteria: existing.eligibilityCriteria,
      requiredDocuments: existing.requiredDocuments ?? existing.requiredDocumentItems?.map((item) => item.displayName),
      applicationDeadline: existing.applicationDeadline,
      applicationUrl: existing.applicationUrl ?? existing.applicationLink,
      sourceUrl: existing.officialSourceUrl ?? existing.sourceUrl ?? existing.officialWebsite,
    };
  }

  private diffFields(
    current: Record<string, unknown>,
    incoming: Record<string, unknown>,
  ): ScholarshipImportCenterDiffField[] {
    const fields = new Set([...Object.keys(current), ...Object.keys(incoming)]);
    return [...fields].map((field) => {
      const currentValue = current[field];
      const incomingValue = incoming[field];
      let state: ScholarshipImportCenterDiffField['state'];
      if (!this.meaningful(incomingValue) && this.meaningful(currentValue)) state = 'MISSING_IN_IMPORT';
      else if (!this.meaningful(currentValue) && this.meaningful(incomingValue)) state = 'ADDITION';
      else if (this.equal(currentValue, incomingValue)) state = 'NO_CHANGE';
      else state = 'CONFLICT';
      return { field, currentValue, incomingValue, state };
    });
  }

  private assertScholarshipBatch(batch: ScholarshipImportCenterBatchRecord | null): void {
    if (!batch || batch.dataType.trim().toUpperCase() !== OWNER_DOMAIN) {
      throw new Error('SCHOLARSHIP_IMPORT_RECORD_NOT_IN_SCHOLARSHIP_BATCH');
    }
  }

  private bound(value: unknown, fallback: number, min: number, max: number): number {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
  }

  private object(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
  }

  private stringValue(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private numberValue(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }

  private timestamp(value: Date | string | null | undefined): number {
    if (!value) return 0;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }

  private meaningful(value: unknown): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  }

  private equal(left: unknown, right: unknown): boolean {
    const normalize = (value: unknown): string => {
      if (value instanceof Date) return value.toISOString();
      if (typeof value === 'string') return value.trim().toLowerCase();
      return JSON.stringify(value ?? null);
    };
    return normalize(left) === normalize(right);
  }
}

import type { AtomicPersistenceContext, UniversalImportHandoff } from '@manaratak/domain';
import { createHash } from 'node:crypto';
import { AtomicDomainMutationCoordinator, type AtomicMutationRequestContext } from '../../event-foundation/use-cases/AtomicDomainMutationCoordinator';
import { ReferenceDataScreeningHandoffConsumer, referenceImportPayloadDigest } from '../services/ReferenceDataScreeningHandoffConsumer';

export interface ReviewedGeographyRow {
  sourceKey: string; sourceRowHash: string; sourceFileHash: string;
  raw: Record<string, unknown>; payload: Record<string, unknown>;
}
export interface ReviewedGeographyBatch {
  batchId: string; entity: 'REGION' | 'CITY'; countryIso2Code: string;
  sourceArtifactId: string; sourceContentHash: string;
  rows: ReviewedGeographyRow[]; reason: string; reviewedHash: string;
}
export interface GeographyBatchResult { replay: boolean; records: Array<{ sourceKey: string; id: string }> }
export interface IReviewedGeographyBatchGateway {
  screen(handoffs: UniversalImportHandoff[], results: unknown[]): Promise<void>;
  create(batch: ReviewedGeographyBatch, context: AtomicPersistenceContext, actorId: string): Promise<GeographyBatchResult>;
}
export function geographyBatchReviewHash(batch: Omit<ReviewedGeographyBatch, 'reviewedHash'> | ReviewedGeographyBatch): string {
  const { reviewedHash: _ignored, ...evidence } = batch as ReviewedGeographyBatch;
  return referenceImportPayloadDigest(evidence);
}
export function geographySourceRowHash(raw: Record<string, unknown>): string {
  const stable = (value: unknown): unknown => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, stable(item)])) : value ?? null;
  return createHash('sha256').update(JSON.stringify(stable(raw))).digest('hex');
}
/** Operator-only, create-only owner command. No HTTP route, updates, seeds or lifecycle commands. */
export class ReviewedGeographyBatchUseCase {
  constructor(private readonly gateway: IReviewedGeographyBatchGateway, private readonly atomic: AtomicDomainMutationCoordinator) {}
  async execute(batch: ReviewedGeographyBatch, context: AtomicMutationRequestContext): Promise<GeographyBatchResult> {
    if (!context.actorId?.trim()) throw Error('GEOGRAPHY_BATCH_ACTOR_REQUIRED');
    if (!batch.batchId || !['REGION', 'CITY'].includes(batch.entity) || !/^[A-Z]{2}$/.test(batch.countryIso2Code) ||
      !batch.sourceArtifactId || !/^[a-f0-9]{64}$/.test(batch.sourceContentHash) || batch.reason.trim().length < 10 || batch.reason.length > 1000 ||
      !batch.rows.length || batch.rows.length > 100 || geographyBatchReviewHash(batch) !== batch.reviewedHash) throw Error('GEOGRAPHY_BATCH_REVIEW_INVALID');
    const keys = new Set<string>(), identities = new Set<string>();
    for (const row of batch.rows) {
      const p = row.payload;
      const allowed = batch.entity === 'REGION' ? ['countryIso2Code','name','nameAr','regionCode','localName','regionType'] : ['countryIso2Code','name','nameAr','region','administrativeRegionId','metadata'];
      if (!row.sourceKey || keys.has(row.sourceKey) || !/^[a-f0-9]{64}$/.test(row.sourceFileHash) || geographySourceRowHash(row.raw) !== row.sourceRowHash ||
        !row.raw || !p || Object.keys(p).some(key => !allowed.includes(key)) || p.countryIso2Code !== batch.countryIso2Code ||
        typeof p.name !== 'string' || !p.name.trim() || p.name.length > 300 ||
        ['nameAr','region','localName','regionType'].some(key => p[key] !== undefined && (typeof p[key] !== 'string' || (p[key] as string).length > 300)) ||
        (batch.entity === 'REGION' && (typeof p.regionCode !== 'string' || !/^[A-Z0-9][A-Z0-9-]{0,31}$/.test(p.regionCode) || !p.regionCode.startsWith(batch.countryIso2Code + '-'))) ||
        (batch.entity === 'CITY' && (typeof p.administrativeRegionId !== 'string' || !p.administrativeRegionId))) throw Error('GEOGRAPHY_BATCH_ROW_INVALID');
      const rawName = batch.entity === 'REGION' ? row.raw.nameEn : row.raw.cityNameEn;
      const rawArabic = batch.entity === 'REGION' ? row.raw.nameAr : row.raw.cityNameAr;
      if (p.countryIso2Code !== row.raw.countryIso2 || p.name !== rawName || (p.nameAr !== undefined && p.nameAr !== rawArabic) ||
        (batch.entity === 'REGION' && (p.regionCode !== row.raw.regionCode || (p.localName !== undefined && p.localName !== row.raw.localName) || (p.regionType !== undefined && p.regionType !== row.raw.regionType)))) throw Error('GEOGRAPHY_BATCH_SOURCE_MAPPING_CONFLICT');
      const identity = JSON.stringify([p.name, p.regionCode ?? p.administrativeRegionId]);
      if (identities.has(identity)) throw Error('GEOGRAPHY_BATCH_DUPLICATE_IDENTITY');
      keys.add(row.sourceKey); identities.add(identity);
    }
    if (batch.entity === 'CITY') {
      const handoffs = geographyCityHandoffs(batch), consumer = new ReferenceDataScreeningHandoffConsumer();
      const results = await Promise.all(handoffs.map(row => consumer.accept(row)));
      if (results.some(row => row.state !== 'NEEDS_OWNER_REVIEW' || row.issues.length)) throw Error('GEOGRAPHY_BATCH_SCREENING_INVALID');
      await this.gateway.screen(handoffs, results);
    }
    return this.atomic.execute({ domain: 'REFERENCE_DATA', aggregateType: 'REVIEWED_GEOGRAPHY_BATCH', aggregateId: batch.batchId,
      action: 'REVIEWED_GEOGRAPHY_BATCH_CREATED', context,
      auditMetadata: { reviewedHash: batch.reviewedHash, reason: batch.reason, entity: batch.entity, rows: batch.rows.length, sourceArtifactId: batch.sourceArtifactId, sourceContentHash: batch.sourceContentHash },
      outbox: { payload: { batchId: batch.batchId, entity: batch.entity, rows: batch.rows.length, reviewedHash: batch.reviewedHash } },
    }, tx => this.gateway.create(batch, tx, context.actorId), result => !result.replay);
  }
}
export function geographyCityHandoffs(batch: ReviewedGeographyBatch): UniversalImportHandoff[] {
  return batch.rows.map(row => ({ handoffId: row.sourceKey, ownerDomain: 'REFERENCE_DATA', artifact: { sourceId: 'reviewed-geography-source', artifactId: batch.sourceArtifactId },
    normalizedPayload: row.payload, provenance: { sourceSystem: 'MANARATAK_REVIEWED_GEOGRAPHY_BATCH', contentHash: batch.sourceContentHash, sourceRowNumber: Number(row.sourceKey.split('#').at(-1)) },
    validation: { state: 'VALID', issues: [] }, execution: { executionId: batch.batchId, dryRun: false, attempt: 1, idempotencyKey: batch.batchId + ':' + row.sourceKey },
    referenceMetadata: { referenceEntityType: 'CITY', sourceVersion: row.sourceFileHash } }));
}

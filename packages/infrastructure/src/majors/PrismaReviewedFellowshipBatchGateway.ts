import { randomUUID } from 'node:crypto';
import { Prisma, type PrismaClient } from '@prisma/client';
import { FellowshipDeduplicationService, ImportRecordStatus, MajorStatus, type AtomicPersistenceContext, type FellowshipDefinitionDto, type IFellowshipDefinitionRepository } from '@manaratak/domain';
import { FellowshipImportPromotionUseCase } from '../../../application/src/majors/use-cases/FellowshipImportPromotionUseCase';
import { FellowshipImportScreeningConsumer, parseFellowshipOwnerPayload, type ReviewedFellowshipBatch, type FellowshipBatchResult, type IReviewedFellowshipBatchGateway } from '../../../application/src/majors/use-cases/ReviewedFellowshipBatchUseCase';
import { taxonomyRevisionHash as hash } from '../../../application/src/academic-taxonomy/services/TaxonomyRevisionHash';
import { PrismaAssetRecordRepository } from '../asset-platform/PrismaAssetRecordRepository';
import { AssetId } from '@manaratak/domain';
import { screeningReceiptIdentity } from '../import-foundation/PrismaImportScreeningReceiptStore';

const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const identity = (h: ReviewedFellowshipBatch['handoffs'][number]) => {
  const key = screeningReceiptIdentity(h); return { ...key, id: 'fellowship-screen-' + hash(key) };
};
export class PrismaReviewedFellowshipBatchGateway implements IReviewedFellowshipBatchGateway {
  constructor(private readonly prisma: PrismaClient) {}
  async screen(batch: ReviewedFellowshipBatch): Promise<void> {
    const consumer = new FellowshipImportScreeningConsumer(), keys = batch.handoffs.map(identity), results = await Promise.all(batch.handoffs.map(h => consumer.accept(h)));
    await this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'fellowship-screen:' + batch.batchId},0))::text`;
      const prior = await tx.importScreeningReceipt.findMany({ where: { ownerDomain: 'FELLOWSHIPS', handoffKey: { in: keys.map(k => k.handoffKey) } }, select: { id: true, requestHash: true } });
      for (const row of prior) if (!keys.some(k => k.id === row.id && k.requestHash === row.requestHash)) throw Error('FELLOWSHIP_RECEIPT_CONFLICT');
      const missing = keys.flatMap((k, i) => prior.some(p => p.id === k.id) ? [] : [{ ...k, result: json(results[i]) }]);
      if (missing.length) await tx.importScreeningReceipt.createMany({ data: missing });
    });
  }
  async apply(batch: ReviewedFellowshipBatch, context: AtomicPersistenceContext, actorId: string): Promise<FellowshipBatchResult> {
    const tx = (context as AtomicPersistenceContext & { transactionClient?: Prisma.TransactionClient }).transactionClient;
    if (!context.boundaryId || !tx || !actorId) throw Error('FELLOWSHIP_TRANSACTION_REQUIRED');
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'fellowship-import:owner-review'},0))::text`;
    const payloads = batch.handoffs.map(h => parseFellowshipOwnerPayload(h.normalizedPayload)), keys = batch.handoffs.map(identity), codes = payloads.map(p => p.classificationCode), dedup = payloads.map(FellowshipDeduplicationService.generateKey);
    if (new Set(dedup).size !== dedup.length) throw Error('FELLOWSHIP_SOURCE_IDENTITY_COLLISION');
    const prior = await tx.fellowshipDefinition.findMany({ where: { OR: [{ publicId: { in: codes } }, { canonicalDedupKey: { in: dedup } }] } });
    if (prior.length) {
      if (prior.length !== payloads.length) throw Error('FELLOWSHIP_EXISTING_REVIEW_REQUIRED');
      const results = payloads.map((payload, i) => {
        const row = prior.find(p => p.publicId === payload.classificationCode && p.canonicalDedupKey === dedup[i]);
        const evidence = (row?.optionalFields as Record<string, unknown> | undefined)?.reviewedImport as Record<string, unknown> | undefined;
        if (!row || evidence?.batchId !== batch.batchId || evidence.reviewedHash !== batch.reviewedHash) throw Error('FELLOWSHIP_REPLAY_CONFLICT');
        return { code: payload.classificationCode, fellowshipId: row.id };
      }); return { replay: true, results };
    }
    const receipts = await tx.importScreeningReceipt.findMany({ where: { id: { in: keys.map(k => k.id) } }, select: { id: true, requestHash: true } });
    for (const key of keys) if (!receipts.some(r => r.id === key.id && r.requestHash === key.requestHash)) throw Error('FELLOWSHIP_RECEIPT_REQUIRED');
    const consumer = new FellowshipImportScreeningConsumer(), screenings = await Promise.all(batch.handoffs.map(h => consumer.accept(h)));
    const sourceKeys = screenings.map(s => s.origin!.sourceDedupKey!);
    const records = await tx.importRecord.findMany({ where: { sourceDedupKey: { in: sourceKeys } }, select: { id: true, batchId: true, sourceDedupKey: true, status: true, rawPayload: true } });
    const sourceRecords = screenings.map((screen, i) => {
      const row = records.find(r => r.batchId === screen.origin!.batchId && r.sourceDedupKey === screen.origin!.sourceDedupKey);
      if (!row || !['VALID', 'COMPLETE', 'NEEDS_REVIEW'].includes(row.status) || hash((row.rawPayload as Record<string, unknown>)._phase6HandoffEnvelope) !== hash(batch.handoffs[i])) throw Error('FELLOWSHIP_P6_SOURCE_CONFLICT');
      return row;
    });
    for (const sourceId of new Set(screenings.map(s => s.source!.artifactId!))) {
      await tx.$queryRaw`SELECT id FROM "AssetRecord" WHERE id=${sourceId} FOR SHARE`;
      const asset = await new PrismaAssetRecordRepository(tx as unknown as PrismaClient).findById(new AssetId(sourceId));
      if (!asset) throw Error('FELLOWSHIP_SOURCE_UNAVAILABLE'); asset.assertCanDeliver();
      if (!asset.checksum || screenings.some(s => s.source!.artifactId === sourceId && s.source!.sha256 !== asset.checksum?.hash)) throw Error('FELLOWSHIP_SOURCE_HASH_CONFLICT');
    }
    const buffered: FellowshipDefinitionDto[] = [];
    const repository: IFellowshipDefinitionRepository = {
      findByDedupKey: async key => buffered.find(r => r.canonicalDedupKey === key) ?? null,
      update: async () => { throw Error('FELLOWSHIP_CREATE_ONLY'); },
      create: async data => { const row = { ...data, id: randomUUID(), createdAt: new Date(), updatedAt: new Date() }; buffered.push(row); return row; },
    };
    const promote = new FellowshipImportPromotionUseCase(repository), results: FellowshipBatchResult['results'] = [];
    for (let i = 0; i < payloads.length; i++) {
      const result = await promote.promote({ id: sourceRecords[i].id, status: ImportRecordStatus.NEEDS_REVIEW, normalizedPayload: payloads[i], sourceFileName: payloads[i].metadata?.sourceFileName });
      if (result.type !== 'CREATED') throw Error('FELLOWSHIP_PROMOTION_FAILED:' + JSON.stringify(result));
      results.push({ code: payloads[i].classificationCode, fellowshipId: result.fellowshipId });
    }
    await tx.fellowshipDefinition.createMany({ data: buffered.map((row, i) => ({
      id: row.id, publicId: row.publicId, slug: row.slug, canonicalName: row.canonicalName, canonicalDedupKey: row.canonicalDedupKey,
      displayName: row.displayName, localizedNameAr: payloads[i].localizedNames?.ar, localizedNameEn: payloads[i].localizedNames?.en,
      fellowshipType: row.fellowshipType, professionalDomain: row.professionalDomain, status: MajorStatus.READY_TO_REVIEW, completenessStatus: row.completenessStatus,
      optionalFields: json({ ...row.optionalFields, reviewedImport: { batchId: batch.batchId, reviewedHash: batch.reviewedHash, actorId, reason: batch.reason, receiptId: keys[i].id, sourcePayloadHash: hash(payloads[i]) } }),
    })) }); return { replay: false, results };
  }
}

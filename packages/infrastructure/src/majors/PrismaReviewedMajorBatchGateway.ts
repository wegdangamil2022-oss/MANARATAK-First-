import { createHash } from 'node:crypto';
import { Prisma, type PrismaClient } from '@prisma/client';
import { ImportRecordStatus, MajorDeduplicationService, type AtomicPersistenceContext, type MajorDto, type MajorLevelProfileDto, type MajorVersionDto } from '@manaratak/domain';
import { MajorImportPromotionUseCase } from '@manaratak/application';
import { MajorImportScreeningConsumer, parseMajorOwnerPayload } from '@manaratak/application';
import { ReviewedMajorTaxonomyResolver } from '@manaratak/application';
import type { IReviewedMajorBatchGateway, ReviewedMajorBatch, MajorBatchResult } from '@manaratak/application';
import { taxonomyRevisionHash as hash } from '@manaratak/application';
import { PrismaMajorImportReviewGateway } from './PrismaMajorImportReviewGateway';
import { CanonicalMajorReferenceService } from '@manaratak/application';
import { PrismaAcademicTaxonomyRepository } from '../academic-taxonomy/PrismaAcademicTaxonomyRepository';
import { DegreeLevelRepository } from '../degree-level/DegreeLevelRepository';
import { screeningReceiptIdentity } from '../import-foundation/PrismaImportScreeningReceiptStore';
import { BufferedMajorImportRepository } from './BufferedMajorImportRepository';
import { VerifiedMajorSourceWriter } from './VerifiedMajorSourceWriter';

const digest = (s: string) => createHash('sha256').update(s).digest('hex');
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const optional = <T>(value: unknown): T => JSON.parse(JSON.stringify(value), (_key, item) => item === null ? undefined : item);
const receiptIdentity = (handoff: ReviewedMajorBatch['handoffs'][number]) => {
  const identity = screeningReceiptIdentity(handoff);
  return { ...identity, id: 'major-batch-screen-' + digest(identity.ownerDomain + ':' + identity.handoffKey) };
};

export class PrismaReviewedMajorBatchGateway implements IReviewedMajorBatchGateway {
  constructor(private readonly prisma: PrismaClient) {}
  async screen(batch: ReviewedMajorBatch): Promise<void> {
    const identities = batch.handoffs.map(receiptIdentity), consumer = new MajorImportScreeningConsumer();
    const results = await Promise.all(batch.handoffs.map(h => consumer.accept(h)));
    await this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'major-batch-screen:' + batch.batchId},0))::text`;
      const prior = await tx.importScreeningReceipt.findMany({ where: { ownerDomain: 'MAJORS', handoffKey: { in: identities.map(i => i.handoffKey) } }, select: { id: true, handoffKey: true, requestHash: true } });
      for (const identity of identities) if (prior.some(r => r.handoffKey === identity.handoffKey && (r.id !== identity.id || r.requestHash !== identity.requestHash))) throw Error('MAJOR_BATCH_RECEIPT_CONFLICT');
      const missing = identities.flatMap((identity, i) => prior.some(r => r.id === identity.id) ? [] : [{ ...identity, result: json(results[i]) }]);
      if (missing.length) await tx.importScreeningReceipt.createMany({ data: missing });
    });
  }
  async apply(batch: ReviewedMajorBatch, context: AtomicPersistenceContext, actorId: string): Promise<MajorBatchResult> {
    const tx = (context as AtomicPersistenceContext & { transactionClient?: Prisma.TransactionClient }).transactionClient;
    if (!context.boundaryId || !tx || !actorId) throw Error('MAJOR_BATCH_TRANSACTION_REQUIRED');
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'major-import:owner-review'},0))::text`;
    const payloads = batch.handoffs.map(h => parseMajorOwnerPayload(h.normalizedPayload));
    const identities = batch.handoffs.map(receiptIdentity), reviewIds = identities.map(i => 'major-import-' + hash(i.id));
    // A compact replay check avoids downloading retained dossiers on every retry.
    const prior = await tx.$queryRaw<Array<{ id: string; requestHash: string; status: string; reason: string; result: MajorBatchResult['results'][number] }>>(Prisma.sql`SELECT id,"requestHash",status,reason,result FROM "MajorImportOwnerReview" WHERE id IN (${Prisma.join(reviewIds)})`);
    if (prior.length) {
      if (prior.length !== payloads.length) throw Error('MAJOR_BATCH_PARTIAL_REPLAY');
      const results = reviewIds.map((id, i) => {
        const row = prior.find(r => r.id === id);
        if (!row || row.status !== 'APPLIED' || row.requestHash !== identities[i].requestHash || row.reason !== batch.reason + ' Reviewed batch: ' + batch.reviewedHash) throw Error('MAJOR_BATCH_REPLAY_CONFLICT');
        return row.result;
      });
      return { replay: true, results };
    }
    const client = tx as unknown as PrismaClient;
    const references = new CanonicalMajorReferenceService(new PrismaAcademicTaxonomyRepository(client, true), new DegreeLevelRepository(client));
    const owner = new PrismaMajorImportReviewGateway(this.prisma, references).withTransaction(context);
    const consumer = new MajorImportScreeningConsumer();
    const screenings = await Promise.all(batch.handoffs.map(h => consumer.accept(h)));
    const degrees = [...new Set(payloads.map(p => p.degreeLevelId!))].sort();
    const liveDegrees = await tx.$queryRaw<Array<{ id: string; canonicalCode: string; status: string }>>(Prisma.sql`SELECT id,"canonicalCode",status FROM "DegreeLevel" WHERE id IN (${Prisma.join(degrees)}) ORDER BY id FOR SHARE`);
    const taxonomyIds = [...new Set(payloads.flatMap(p => [p.academicFieldId, p.disciplineId].filter((id): id is string => Boolean(id))))].sort();
    const nodes = taxonomyIds.length ? await tx.$queryRaw<Array<{ id: string; nodeType: string; status: string }>>(Prisma.sql`SELECT id,"nodeType",status FROM "AcademicTaxonomyNode" WHERE id IN (${Prisma.join(taxonomyIds)}) ORDER BY id FOR SHARE`) : [];
    for (const payload of payloads) {
      if (!liveDegrees.some(d => d.id === payload.degreeLevelId && d.canonicalCode === payload.degreeLevel && d.status === 'ACTIVE')) throw Error('MAJOR_BATCH_DEGREE_MISMATCH');
      for (const [id, type] of [[payload.academicFieldId, 'ACADEMIC_FIELD'], [payload.disciplineId, 'DISCIPLINE']]) if (id && !nodes.some(n => n.id === id && n.nodeType === type && n.status === 'ACTIVE')) throw Error('MAJOR_BATCH_TAXONOMY_INACTIVE');
    }
    for (const artifactId of new Set(screenings.map(s => s.source!.artifactId!))) {
      const contentHash = screenings.find(s => s.source!.artifactId === artifactId)!.source!.sha256!;
      if (screenings.some(s => s.source!.artifactId === artifactId && s.source!.sha256 !== contentHash)) throw Error('MAJOR_BATCH_SOURCE_CONFLICT');
      await owner.verifyArtifact(artifactId, contentHash);
    }
    const expectedSources = screenings.map((s, i) => ({ batchId: s.origin!.batchId, sourceDedupKey: s.origin!.sourceDedupKey, handoff: batch.handoffs[i] }));
    // Compare the complete JSONB envelope in PostgreSQL. Returning retained dossiers
    // merely to compare them again in JS costs minutes on a distant connection.
    const records = await tx.$queryRaw<Array<{ id: string; status: string; ordinal: number; matches: boolean }>>`
      SELECT r.id,r.status,(e.ordinal-1)::int AS ordinal,
        r."rawPayload"->'_phase6HandoffEnvelope'=e.value->'handoff' AS matches
      FROM jsonb_array_elements(${JSON.stringify(expectedSources)}::jsonb) WITH ORDINALITY e(value,ordinal)
      JOIN "ImportRecord" r ON r."batchId"=e.value->>'batchId' AND r."sourceDedupKey"=e.value->>'sourceDedupKey' FOR SHARE OF r`;
    if (records.length !== payloads.length) throw Error('MAJOR_BATCH_P6_SOURCE_CONFLICT');
    const sourceRecords = screenings.map((_screen, i) => {
      const record = records.find(r => r.ordinal === i);
      if (!record || !record.matches || !['VALID', 'COMPLETE', 'NEEDS_REVIEW'].includes(record.status)) throw Error('MAJOR_BATCH_P6_SOURCE_CONFLICT');
      return record;
    });
    const existingReceipts = await tx.importScreeningReceipt.findMany({ where: { ownerDomain: 'MAJORS', handoffKey: { in: identities.map(i => i.handoffKey) } }, select: { id: true, handoffKey: true, requestHash: true } });
    for (const identity of identities) if (!existingReceipts.some(r => r.id === identity.id && r.handoffKey === identity.handoffKey && r.requestHash === identity.requestHash)) throw Error('MAJOR_BATCH_RECEIPT_CONFLICT');
    const keys = payloads.map(MajorDeduplicationService.generateKey);
    const existingMajors = await tx.major.findMany({ where: { OR: [{ canonicalDedupKey: { in: keys } }, { publicId: { in: payloads.map(p => p.classificationCode!) } }] } });
    if (existingMajors.some(m => ['PUBLISHED', 'ARCHIVED', 'REJECTED'].includes(m.status) || m.currentPublishedVersionId)) throw Error('MAJOR_BATCH_PUBLISHED_TARGET_IMMUTABLE');
    for (const payload of payloads) {
      const byCode = existingMajors.find(m => m.publicId === payload.classificationCode);
      if (byCode && byCode.canonicalDedupKey !== MajorDeduplicationService.generateKey(payload)) throw Error('MAJOR_BATCH_SOURCE_IDENTITY_CONFLICT');
    }
    const ids = existingMajors.map(m => m.id).sort();
    if (ids.length) {
      const locked = await tx.$queryRaw<Array<{ id: string; updatedAt: Date }>>(Prisma.sql`SELECT id,"updatedAt" FROM "Major" WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`);
      if (locked.length !== ids.length || locked.some(row => existingMajors.find(m => m.id === row.id)?.updatedAt.getTime() !== row.updatedAt.getTime())) throw Error('MAJOR_BATCH_STALE_TARGET');
    }
    const [existingProfiles, existingVersions] = ids.length ? await Promise.all([
      tx.majorLevelProfile.findMany({ where: { majorId: { in: ids } } }), tx.majorVersion.findMany({ where: { majorId: { in: ids } } }),
    ]) : [[], []];
    if (existingProfiles.some(p => p.currentPublishedVersionId || ['PUBLISHED', 'ARCHIVED', 'REJECTED'].includes(p.status))) throw Error('MAJOR_BATCH_PROFILE_IMMUTABLE');
    const sourceWriter = new VerifiedMajorSourceWriter(client, sourceRecords.map((r, i) => ({ id: r.id, payload: payloads[i] as unknown as Record<string, unknown> })));
    const buffer = new BufferedMajorImportRepository(client, { majors: optional<MajorDto[]>(existingMajors), profiles: optional<MajorLevelProfileDto[]>(existingProfiles), versions: optional<MajorVersionDto[]>(existingVersions) }, sourceWriter);
    const promotion = new MajorImportPromotionUseCase(buffer, new ReviewedMajorTaxonomyResolver());
    const results: MajorBatchResult['results'] = [];
    for (let i = 0; i < payloads.length; i++) {
      const result = await promotion.promote({ id: sourceRecords[i].id, status: ImportRecordStatus.NEEDS_REVIEW, normalizedPayload: payloads[i], rawPayload: payloads[i] });
      if (result.type !== 'CREATED' && result.type !== 'VERSION_CREATED') throw Error('MAJOR_BATCH_PROMOTION_FAILED:' + JSON.stringify(result));
      const majorId = result.type === 'CREATED' ? result.majorId : result.existingId;
      const profile = await buffer.findLevelProfile(majorId, payloads[i].degreeLevel as MajorLevelProfileDto['level'], payloads[i].classificationCode);
      if (!profile?.id) throw Error('MAJOR_BATCH_PROFILE_REQUIRED');
      results.push({ ...result, code: payloads[i].classificationCode!, majorId, profileId: profile.id });
    }
    await buffer.flush();
    await sourceWriter.insert('MajorImportOwnerReview', payloads.map((payload, i) => {
      const target = existingMajors.find(m => m.canonicalDedupKey === keys[i]);
      const preview = { targetId: target?.id ?? null, targetRevision: target?.updatedAt.getTime() ?? null };
      return { sourceId: sourceRecords[i].id, data: { id: reviewIds[i], receiptId: identities[i].id, requestHash: identities[i].requestHash, payload: json(payload), preview: json(preview),
        previewHash: hash({ payload, preview, origin: screenings[i].origin, source: screenings[i].source }),
        version: 1, status: 'APPLIED', reviewer: actorId, reason: batch.reason + ' Reviewed batch: ' + batch.reviewedHash, result: json(results[i]) } };
    }));
    return { replay: false, results };
  }
}

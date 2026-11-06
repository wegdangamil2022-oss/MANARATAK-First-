import type { Prisma } from '@prisma/client';
import type { AtomicPersistenceContext } from '@manaratak/domain';
import type { IFellowshipPromotionLinkReconciliationGateway } from '../../../application/src/import-foundation/use-cases/ReconcileFellowshipPromotionLinksUseCase';

/** Completes only the P6 backlink for a demonstrably applied fellowship owner result. */
export class PrismaFellowshipPromotionLinkReconciliationGateway implements IFellowshipPromotionLinkReconciliationGateway {
  async reconcile(batchId: string, context: AtomicPersistenceContext) {
    const tx = (context as AtomicPersistenceContext & { transactionClient?: Prisma.TransactionClient }).transactionClient;
    if (!context.boundaryId || !tx) throw Error('FELLOWSHIP_LINK_TRANSACTION_REQUIRED');
    const batches = await tx.$queryRaw<Array<{ dataType: string; batchStatus: string }>>`SELECT "dataType","batchStatus" FROM "ImportBatch" WHERE id=${batchId} FOR UPDATE`;
    if (batches.length !== 1 || batches[0].dataType !== 'FELLOWSHIPS' || batches[0].batchStatus !== 'COMPLETED') throw Error('FELLOWSHIP_LINK_TERMINAL_BATCH_REQUIRED');
    const records = await tx.$queryRaw<Array<{ id: string; status: string; promotedEntityId: string | null }>>`SELECT id,status,"promotedEntityId" FROM "ImportRecord" WHERE "batchId"=${batchId} ORDER BY id FOR UPDATE`;
    if (!records.length || records.length > 25) throw Error('FELLOWSHIP_LINK_BATCH_SIZE_INVALID');
    const proofs = await tx.$queryRaw<Array<{ recordId: string; fellowshipId: string; receiptId: string }>>`
      SELECT r.id AS "recordId",f.id AS "fellowshipId",s.id AS "receiptId"
      FROM "ImportRecord" r JOIN "ImportScreeningReceipt" s ON s."ownerDomain"='FELLOWSHIPS'
        AND s.result->'origin'->>'batchId'=r."batchId" AND s.result->'origin'->>'sourceDedupKey'=r."sourceDedupKey"
      JOIN "FellowshipDefinition" f ON f."publicId"=r."rawPayload"->>'classificationCode'
        AND f."optionalFields"->'reviewedImport'->>'receiptId'=s.id
      WHERE r."batchId"=${batchId} AND s.result->>'state'='NEEDS_OWNER_REVIEW' AND s.result->>'dryRun'='false'
        AND f.status='READY_TO_REVIEW' AND f."linkedMajorId" IS NULL AND f."linkedProfileId" IS NULL
        AND f."optionalFields"->'rawPayload'=s.result->'payload'
        AND r."rawPayload"->'_phase6HandoffEnvelope'->'normalizedPayload'=s.result->'payload'
        AND f."publicId" ~ '^FEL-[0-9]{4}$'
        AND f."optionalFields"->'reviewedImport'->>'reviewedHash' ~ '^[a-f0-9]{64}$'
        AND f."optionalFields"->'reviewedImport'->>'sourcePayloadHash' ~ '^[a-f0-9]{64}$'
        AND COALESCE(f."optionalFields"->'reviewedImport'->>'actorId','')<>''
        AND COALESCE(f."optionalFields"->'reviewedImport'->>'batchId','')<>''
        AND COALESCE(f."optionalFields"->'reviewedImport'->>'reason','')<>'' FOR SHARE OF s,f`;
    if (proofs.length !== records.length || new Set(proofs.map(p => p.recordId)).size !== records.length) throw Error('FELLOWSHIP_LINK_APPLIED_OWNER_PROOF_REQUIRED');
    for (const record of records) {
      const proof = proofs.find(p => p.recordId === record.id)!;
      if (!['NEEDS_REVIEW', 'COMPLETE', 'VALID', 'PROMOTED'].includes(record.status) || (record.promotedEntityId && record.promotedEntityId !== proof.fellowshipId)) throw Error('FELLOWSHIP_LINK_TARGET_CONFLICT');
    }
    const pending = records.filter(r => r.status !== 'PROMOTED' || !r.promotedEntityId);
    if (!pending.length) return { linked: records.length, replay: true };
    const updates = pending.map(r => ({ id: r.id, ...proofs.find(p => p.recordId === r.id)! }));
    const changed = await tx.$executeRaw`UPDATE "ImportRecord" r SET status='PROMOTED',"promotedEntityId"=u.value->>'fellowshipId',
      "processingNotes"='Fellowship canonical target verified against its applied owner evidence; no degree or publication is implied.',
      "rawPayload"=jsonb_set(jsonb_set(r."rawPayload",'{_phase6HandoffState}','"DISPATCHED"'::jsonb),'{_domainHandoff}',receipt.result),
      "updatedAt"=GREATEST(clock_timestamp(),r."updatedAt"+interval '1 millisecond')
      FROM jsonb_array_elements(${JSON.stringify(updates)}::jsonb) u(value)
      JOIN "ImportScreeningReceipt" receipt ON receipt.id=u.value->>'receiptId'
      WHERE r.id=u.value->>'id' AND r."batchId"=${batchId}`;
    if (changed !== pending.length) throw Error('FELLOWSHIP_LINK_WRITE_COUNT_CONFLICT');
    return { linked: records.length, replay: false };
  }
}

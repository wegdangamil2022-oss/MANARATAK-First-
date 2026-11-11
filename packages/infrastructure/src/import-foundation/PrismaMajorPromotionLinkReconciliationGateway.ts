import type { Prisma } from '@prisma/client';
import type { AtomicPersistenceContext } from '@manaratak/domain';
import type { IMajorPromotionLinkReconciliationGateway } from '@manaratak/application';

export class PrismaMajorPromotionLinkReconciliationGateway implements IMajorPromotionLinkReconciliationGateway {
  async reconcile(batchId: string, context: AtomicPersistenceContext) {
    const tx = (context as AtomicPersistenceContext & { transactionClient?: Prisma.TransactionClient }).transactionClient;
    if (!context.boundaryId || !tx) throw Error('IMPORT_LINK_TRANSACTION_REQUIRED');
    const batches = await tx.$queryRaw<Array<{ dataType: string; batchStatus: string }>>`SELECT "dataType","batchStatus" FROM "ImportBatch" WHERE id=${batchId} FOR UPDATE`;
    if (batches.length !== 1 || batches[0].dataType !== 'MAJORS' || batches[0].batchStatus !== 'COMPLETED') throw Error('IMPORT_LINK_TERMINAL_MAJOR_BATCH_REQUIRED');
    const records = await tx.$queryRaw<Array<{ id: string; status: string; promotedEntityId: string | null }>>`SELECT id,status,"promotedEntityId" FROM "ImportRecord" WHERE "batchId"=${batchId} ORDER BY id FOR UPDATE`;
    if (!records.length || records.length > 25) throw Error('IMPORT_LINK_BATCH_SIZE_INVALID');
    const proofs = await tx.$queryRaw<Array<{ recordId: string; majorId: string; profileId: string; receiptId: string }>>`
      SELECT r.id AS "recordId",v."majorId",v."profileId",s.id AS "receiptId"
      FROM "ImportRecord" r JOIN "MajorVersion" v ON v."sourceImportRecordId"=r.id
      JOIN "MajorLevelProfile" p ON p.id=v."profileId" AND p."majorId"=v."majorId"
      JOIN "ImportScreeningReceipt" s ON s."ownerDomain"='MAJORS' AND s.result->'origin'->>'batchId'=r."batchId" AND s.result->'origin'->>'sourceDedupKey'=r."sourceDedupKey"
      JOIN "MajorImportOwnerReview" o ON o."receiptId"=s.id AND o."requestHash"=s."requestHash"
      WHERE r."batchId"=${batchId} AND o.status='APPLIED' AND s.result->>'state'='NEEDS_OWNER_REVIEW'
        AND s.result->>'dryRun'='false' AND o.payload=r."rawPayload"->'_phase6HandoffEnvelope'->'normalizedPayload'
        AND o.result->>'majorId'=v."majorId" AND o.result->>'profileId'=v."profileId"
        AND o.result->>'code'=p.code AND p.code=r."rawPayload"->>'classificationCode' FOR SHARE OF s,o,v,p`;
    if (proofs.length !== records.length || new Set(proofs.map(p => p.recordId)).size !== records.length) throw Error('IMPORT_LINK_APPLIED_OWNER_PROOF_REQUIRED');
    for (const record of records) {
      const proof = proofs.find(p => p.recordId === record.id)!;
      if (!['NEEDS_REVIEW', 'COMPLETE', 'VALID', 'PROMOTED'].includes(record.status) || (record.promotedEntityId && record.promotedEntityId !== proof.majorId)) throw Error('IMPORT_LINK_TARGET_CONFLICT');
    }
    const pending = records.filter(r => r.status !== 'PROMOTED' || !r.promotedEntityId);
    if (!pending.length) return { linked: records.length, replay: true };
    const updates = pending.map(record => {
      const proof = proofs.find(p => p.recordId === record.id)!;
      return { id: record.id, majorId: proof.majorId, receiptId: proof.receiptId };
    });
    const changed = await tx.$executeRaw`UPDATE "ImportRecord" r SET status='PROMOTED',"promotedEntityId"=u.value->>'majorId',
      "processingNotes"='Canonical major/profile verified against the applied owner review; publication remains separate.',
      "rawPayload"=jsonb_set(jsonb_set(r."rawPayload",'{_phase6HandoffState}','"DISPATCHED"'::jsonb),'{_domainHandoff}',receipt.result),
      "updatedAt"=GREATEST(clock_timestamp(),r."updatedAt"+interval '1 millisecond')
      FROM jsonb_array_elements(${JSON.stringify(updates)}::jsonb) u(value)
      JOIN "ImportScreeningReceipt" receipt ON receipt.id=u.value->>'receiptId'
      WHERE r.id=u.value->>'id' AND r."batchId"=${batchId}`;
    if (changed !== pending.length) throw Error('IMPORT_LINK_RECONCILIATION_COUNT_CONFLICT');
    return { linked: records.length, replay: false };
  }
}

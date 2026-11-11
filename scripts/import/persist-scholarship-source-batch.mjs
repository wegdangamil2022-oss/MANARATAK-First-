import assert from 'node:assert/strict';
import { courseBulkHash as hash } from './persist-external-course-batch.mjs';

/** Persist the frozen output of the scholarship owner's screening pipeline.
 * Call inside the authorized audit/outbox transaction. This stages source work
 * only; it never approves verification, transfers a scholarship or publishes. */
export async function persistScholarshipSourceBatch(tx, batch, context) {
  assert.match(context.planHash, /^[a-f0-9]{64}$/);
  assert.match(context.sourceHash, /^[a-f0-9]{64}$/);
  const records = batch.records,
    inputs = context.sourceRows;
  assert.ok(records.length > 0 && records.length <= 25);
  assert.equal(records.length, inputs.length);
  const keys = records.map((row) => row.sourceDedupKey).sort();
  assert.ok(keys.every((key) => typeof key === 'string' && key.length > 0));
  assert.equal(new Set(keys).size, records.length);
  const receiptKey = hash('scholarship-source:' + context.planHash + ':' + batch.index);
  const requestHash = hash(batch);
  await tx.$queryRawUnsafe(
    'SELECT pg_advisory_xact_lock(hashtextextended($1,0))::text',
    'scholarship-source-stage:' + batch.batch.sourceSystem,
  );
  const prior = await tx.importScreeningReceipt.findUnique({
    where: { ownerDomain_handoffKey: { ownerDomain: 'SCHOLARSHIPS', handoffKey: receiptKey } },
  });
  if (prior) {
    assert.equal(prior.requestHash, requestHash, 'SCHOLARSHIP_SOURCE_REPLAY_DRIFT');
    return { ...prior.result, replayed: true };
  }
  assert.equal(batch.batch.dataType, 'SCHOLARSHIPS');
  assert.equal(batch.batch.batchStatus, 'COMPLETED');
  assert.equal(batch.batch.totalRecords, records.length);
  assert.equal(batch.batch.failedRecords, 0);
  assert.equal(batch.receipts.length, records.length);
  const sourceIds = new Set(inputs.map((row) => row.sourceReferenceId));
  assert.equal(sourceIds.size, inputs.length);
  for (const row of records) {
    assert.equal(row.batchId, batch.batch.id);
    assert.equal(row.promotedEntityId, null);
    assert.equal(row.status, 'COMPLETE'); // Structural validity is not publication readiness.
    assert.equal(row.validationErrors, null);
    assert.equal(row.retentionState, 'IMPORT_RAW_PROVENANCE');
    assert.ok(row.retentionExpiresAt);
    const source = inputs.find(
      (input) => input.sourceReferenceId === row.rawPayload.sourceReferenceId,
    );
    assert.ok(source, 'SCHOLARSHIP_SOURCE_ID_DRIFT');
    assert.equal(row.rawPayload.metadata.sourceArtifactSha256, context.sourceHash);
    const originalFields = Object.fromEntries(
      Object.keys(source).map((key) => [key, row.rawPayload[key]]),
    );
    assert.equal(hash(originalFields), hash(source), 'SCHOLARSHIP_SOURCE_CONTENT_DRIFT');
    assert.ok(row.rawPayload._domainHandoff);
    assert.equal(row.rawPayload._phase6HandoffState, 'DISPATCHED');
    assert.ok(
      batch.receipts.some(
        (receipt) =>
          receipt.ownerDomain === 'SCHOLARSHIPS' &&
          hash(receipt.result) === hash(row.rawPayload._domainHandoff),
      ),
      'SCHOLARSHIP_SCREENING_RECEIPT_MISSING',
    );
  }
  await tx.$queryRawUnsafe(
    `SELECT pg_advisory_xact_lock(hashtextextended('phase6-source:' || ordered.key,0))::text
     FROM (SELECT jsonb_array_elements_text($1::jsonb) AS key ORDER BY key) ordered`,
    JSON.stringify(keys),
  );
  const [existing] = await tx.$queryRawUnsafe(
    `SELECT count(*)::int AS count FROM "ImportRecord"
     WHERE "sourceDedupKey"=ANY($1::text[]) AND status<>'STAGING_REJECTED'`,
    keys,
  );
  assert.equal(existing.count, 0, 'SCHOLARSHIP_SOURCE_ALREADY_STAGED_REQUIRES_REVIEW');
  const assets = await tx.$queryRawUnsafe(
    `SELECT id,"ownerId","ownerType","lifecycleState","checksumHash","deletedAt"
     FROM "AssetRecord" WHERE id=$1 FOR SHARE`,
    batch.assetId,
  );
  assert.equal(assets.length, 1, 'SCHOLARSHIP_SOURCE_ASSET_REQUIRED');
  assert.deepEqual(
    assets[0],
    {
      id: batch.assetId,
      ownerId: context.actorId,
      ownerType: 'SCHOLARSHIPS',
      lifecycleState: 'ACTIVE',
      checksumHash: batch.artifactHash,
      deletedAt: null,
    },
    'SCHOLARSHIP_SOURCE_ASSET_NOT_APPROVED',
  );
  assert.equal((await tx.importBatch.createMany({ data: [batch.batch] })).count, 1);
  for (const [delegate, rows] of [
    [tx.importScreeningReceipt, batch.receipts],
    [tx.importRecord, records],
  ])
    for (let offset = 0; offset < rows.length; offset += 25) {
      const data = rows.slice(offset, offset + 25);
      assert.equal((await delegate.createMany({ data })).count, data.length);
    }
  const result = {
    batchId: batch.batch.id,
    stagedRecords: records.length,
    failedRecords: 0,
    catalogWrites: 0,
  };
  await tx.importScreeningReceipt.create({
    data: {
      id: 'scholarship-source-receipt-' + receiptKey,
      ownerDomain: 'SCHOLARSHIPS',
      handoffKey: receiptKey,
      requestHash,
      result,
    },
  });
  return { ...result, replayed: false };
}

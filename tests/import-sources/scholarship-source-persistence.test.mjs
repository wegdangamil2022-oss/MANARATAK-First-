import assert from 'node:assert/strict';
import { test } from 'node:test';
import { persistScholarshipSourceBatch } from '../../scripts/import/persist-scholarship-source-batch.mjs';

const hash = 'a'.repeat(64);
function fixture() {
  const source = {
    sourceReferenceId: 'SCH-EXAMPLE',
    eligibilityCriteria: 'شرط واحد.',
    metadata: { sourceArtifactSha256: hash, rawSourceBlock: 'النص الأصلي' },
  };
  const result = { stageState: 'NEEDS_REVIEW' };
  const batch = {
    index: 0,
    assetId: 'asset',
    artifactHash: hash,
    batch: {
      id: 'batch',
      sourceSystem: 'source',
      dataType: 'SCHOLARSHIPS',
      batchStatus: 'COMPLETED',
      totalRecords: 1,
      failedRecords: 0,
    },
    records: [
      {
        id: 'record',
        batchId: 'batch',
        sourceDedupKey: 'key',
        promotedEntityId: null,
        status: 'COMPLETE',
        validationErrors: null,
        retentionState: 'IMPORT_RAW_PROVENANCE',
        retentionExpiresAt: '2027-11-11T00:00:00Z',
        rawPayload: { ...source, _phase6HandoffState: 'DISPATCHED', _domainHandoff: result },
      },
    ],
    receipts: [{ ownerDomain: 'SCHOLARSHIPS', result }],
  };
  const writes = [];
  const tx = {
    $queryRawUnsafe: async (sql) =>
      sql.includes('AssetRecord')
        ? [
            {
              id: 'asset',
              ownerId: 'actor',
              ownerType: 'SCHOLARSHIPS',
              lifecycleState: 'ACTIVE',
              checksumHash: hash,
              deletedAt: null,
            },
          ]
        : sql.includes('count(*)')
          ? [{ count: 0 }]
          : [],
    importScreeningReceipt: {
      findUnique: async () => null,
      createMany: async ({ data }) => {
        writes.push(data);
        return { count: data.length };
      },
      create: async ({ data }) => {
        writes.push(data);
      },
    },
    importBatch: {
      createMany: async ({ data }) => {
        writes.push(data);
        return { count: data.length };
      },
    },
    importRecord: {
      createMany: async ({ data }) => {
        writes.push(data);
        return { count: data.length };
      },
    },
  };
  return {
    batch,
    tx,
    writes,
    context: { actorId: 'actor', planHash: hash, sourceHash: hash, sourceRows: [source] },
  };
}
test('rejects eligibility enrichment before writing source records', async () => {
  const f = fixture();
  f.batch.records[0].rawPayload.eligibilityCriteria += ' TOEFL 100';
  await assert.rejects(
    persistScholarshipSourceBatch(f.tx, f.batch, f.context),
    /SCHOLARSHIP_SOURCE_CONTENT_DRIFT/,
  );
  assert.equal(f.writes.length, 0);
});
test('requires an active asset with the exact reviewed bytes', async () => {
  const f = fixture(),
    query = f.tx.$queryRawUnsafe;
  f.tx.$queryRawUnsafe = async (sql) => (sql.includes('AssetRecord') ? [] : query(sql));
  await assert.rejects(
    persistScholarshipSourceBatch(f.tx, f.batch, f.context),
    /SCHOLARSHIP_SOURCE_ASSET_REQUIRED/,
  );
  assert.equal(f.writes.length, 0);
});
test('stages source and screening receipts without a canonical write delegate', async () => {
  const f = fixture(),
    result = await persistScholarshipSourceBatch(f.tx, f.batch, f.context);
  assert.equal(result.stagedRecords, 1);
  assert.equal(result.catalogWrites, 0);
  assert.equal(result.replayed, false);
  assert.equal(f.writes[2][0].rawPayload.eligibilityCriteria, 'شرط واحد.');
});

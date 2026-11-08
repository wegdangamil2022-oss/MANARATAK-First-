import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { universityStage1Hash } from './persist-university-stage1-batch.mjs';
import { applyStage2OwnerProjection } from './persist-university-stage2-batch.mjs';

/** Audited projection-only follow-up: recognize the European workbook's literal
 * Verified status. Existing immutable source rows and their raw fields stay intact. */
export async function projectUniversityStage2Verified(tx, batch, context) {
  assert.ok(context.actorId && /^[a-f0-9]{64}$/.test(context.planHash));
  assert.match(context.sourcePlanHash, /^[a-f0-9]{64}$/);
  assert.ok(batch.rows.length > 0 && batch.rows.length <= 500);
  assert.equal(new Set(batch.rows.map((row) => row.targetId)).size, batch.rows.length);
  const changeSetId =
    'stage2-verified-' + universityStage1Hash(context.planHash + ':' + batch.index).slice(0, 40);
  await tx.$queryRawUnsafe(
    'SELECT pg_advisory_xact_lock(hashtextextended($1,0))::text',
    changeSetId,
  );
  const applied = await tx.universityImportChangeSet.findUnique({ where: { id: changeSetId } });
  if (applied) {
    assert.equal(applied.state, 'APPLIED');
    assert.equal(applied.sourceArtifactId, batch.fileHash);
    return { replayed: true, updated: 0, sourcesCreated: 0 };
  }
  await tx.$queryRawUnsafe('SELECT id FROM "AssetRecord" WHERE id=$1 FOR SHARE', batch.assetId);
  const asset = await tx.assetRecord.findUnique({ where: { id: batch.assetId } });
  assert.ok(
    asset?.lifecycleState === 'ACTIVE' &&
      !asset.deletedAt &&
      !asset.purgedAt &&
      asset.securityClassification === 'INTERNAL' &&
      asset.checksumHash === batch.artifactHash,
  );
  const ids = batch.rows.map((row) => row.targetId);
  await tx.$queryRawUnsafe(
    'SELECT id FROM "University" WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE',
    ids,
  );
  const owners = await tx.$queryRawUnsafe(
    `SELECT id,to_char("updatedAt",'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS version_time,encode(sha256(convert_to(to_jsonb(u)::text,'UTF8')),'hex') AS hash FROM "University" u WHERE id=ANY($1::text[])`,
    ids,
  );
  assert.equal(owners.length, batch.rows.length);
  const sources = await tx.universitySourceRecord.findMany({
    where: {
      stage: 'STAGE_2',
      sourceArtifactId: batch.fileHash,
      universityId: { in: ids },
      metadata: { path: ['planHash'], equals: context.sourcePlanHash },
    },
    select: { id: true, universityId: true, sourceHash: true },
  });
  assert.equal(sources.length, batch.rows.length);
  const decisions = batch.rows.map((row, index) => {
    const owner = owners.find((item) => item.id === row.targetId),
      source = sources.find((item) => item.universityId === row.targetId);
    assert.equal(owner?.hash, row.expectedVersion, 'STAGE2_VERIFIED_OWNER_CHANGED');
    assert.equal(owner.version_time, row.expectedUpdatedAt, 'STAGE2_VERIFIED_TIMESTAMP_CHANGED');
    assert.equal(source?.sourceHash, row.rowHash, 'STAGE2_VERIFIED_SOURCE_CHANGED');
    assert.equal(universityStage1Hash(row.raw), row.rowHash);
    assert.match(String(row.raw['Review Status']), /^verified$/i);
    assert.equal(row.projection.sourceReady, true);
    assert.equal(row.projection.ownerImmutable, false);
    return {
      sourceId: source.id,
      journalId: randomUUID(),
      sequence: index + 1,
      projection: row.projection,
    };
  });
  await tx.universityImportChangeSet.create({
    data: {
      id: changeSetId,
      sourceArtifactId: batch.fileHash,
      stage: 'STAGE_2',
      state: 'APPLIED',
      approvedBy: context.actorId,
      appliedAt: new Date(),
    },
  });
  const sourceRelation = `(SELECT original.id,original."universityId",original.stage,original."sourceArtifactId",
    original.metadata||jsonb_build_object('projection',decision.projection,'ownerJournalId',decision."journalId",'ownerSequence',decision.sequence) AS metadata
    FROM "UniversitySourceRecord" original JOIN jsonb_to_recordset($5::jsonb) AS decision("sourceId" text,"journalId" text,sequence int,projection jsonb) ON original.id=decision."sourceId")`;
  const sourceWhere = `s.stage='STAGE_2' AND s."sourceArtifactId"=$2 AND s.metadata->>'planHash'=$3 AND s."universityId"=ANY($4::text[])`;
  const updated = await applyStage2OwnerProjection(tx, {
    changeSetId,
    sourceRelation,
    sourceWhere,
    reviewProjection: true,
    parameters: [
      changeSetId,
      batch.fileHash,
      context.sourcePlanHash,
      ids,
      JSON.stringify(decisions),
      context.planHash,
    ],
  });
  assert.equal(updated, batch.rows.length);
  return { replayed: false, updated, sourcesCreated: 0, sourceRecordsUnchanged: true };
}

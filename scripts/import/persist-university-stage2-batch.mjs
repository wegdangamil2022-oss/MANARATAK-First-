import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  universityStage1Hash,
  insertUniversityImportRows,
} from './persist-university-stage1-batch.mjs';
import { stage2RootFields, stage2OptionalFields } from './university-stage2-projection.mjs';

const snapshot = (alias) =>
  `to_jsonb(${alias}) || jsonb_build_object('createdAt',to_char(${alias}."createdAt",'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'updatedAt',to_char(${alias}."updatedAt",'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))`;
export async function persistUniversityStage2Batch(tx, batch, context) {
  assert.ok(context.actorId && /^[a-f0-9]{64}$/.test(context.planHash));
  assert.ok(batch.rows.length > 0 && batch.rows.length <= 500);
  assert.equal(new Set(batch.rows.map((row) => row.publicId)).size, batch.rows.length);
  const changeSetId =
    'stage2-full-' + universityStage1Hash(context.planHash + ':' + batch.index).slice(0, 40);
  await tx.$queryRawUnsafe(
    'SELECT pg_advisory_xact_lock(hashtextextended($1,0))::text',
    changeSetId,
  );
  const prior = await tx.universityImportChangeSet.findUnique({ where: { id: changeSetId } });
  if (prior) {
    assert.equal(prior.state, 'APPLIED');
    assert.equal(prior.sourceArtifactId, batch.fileHash);
    return { replayed: true, sources: 0, updated: 0, projected: 0 };
  }
  await tx.$queryRawUnsafe('SELECT id FROM "AssetRecord" WHERE id=$1 FOR SHARE', batch.assetId);
  const asset = await tx.assetRecord.findUnique({ where: { id: batch.assetId } });
  assert.ok(
    asset?.lifecycleState === 'ACTIVE' &&
      !asset.deletedAt &&
      !asset.purgedAt &&
      asset.securityClassification === 'INTERNAL' &&
      asset.checksumHash === batch.artifactHash,
    'STAGE2_SOURCE_ASSET_NOT_VERIFIED',
  );
  const ids = batch.rows.map((row) => row.targetId);
  await tx.$queryRawUnsafe(
    'SELECT id FROM "University" WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE',
    ids,
  );
  const versions = await tx.$queryRawUnsafe(
    `SELECT id,"publicId",status,to_char("updatedAt",'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS version_time,encode(sha256(convert_to(to_jsonb(u)::text,'UTF8')),'hex') AS hash FROM "University" u WHERE id=ANY($1::text[])`,
    ids,
  );
  assert.equal(versions.length, batch.rows.length, 'STAGE2_OWNER_MISSING');
  for (const row of batch.rows) {
    const owner = versions.find((item) => item.id === row.targetId);
    assert.equal(owner?.publicId, row.publicId, 'STAGE2_IDENTITY_CHANGED');
    assert.equal(owner.hash, row.expectedVersion, 'STAGE2_OWNER_CHANGED_SINCE_PLAN');
    assert.equal(
      owner.version_time,
      context.expectedOwnerUpdatedAt?.[row.targetId],
      'STAGE2_BACKUP_VERSION_CHANGED',
    );
    assert.equal(universityStage1Hash(row.raw), row.rowHash, 'STAGE2_SOURCE_ROW_CHANGED');
    assert.equal(row.raw['University Reference ID'], row.publicId);
    assert.ok(row.projection.rootKeys.every((key) => key in stage2RootFields));
    assert.ok(row.projection.optionalKeys.every((key) => key in stage2OptionalFields));
  }
  const sourceKeys = batch.rows.map((row) =>
    ['STAGE_2', batch.fileHash, row.sheet, 'row:' + row.row].join('|'),
  );
  for (let offset = 0; offset < sourceKeys.length; offset += 100)
    assert.equal(
      await tx.universitySourceRecord.count({
        where: { sourceIdentityKey: { in: sourceKeys.slice(offset, offset + 100) } },
      }),
      0,
      'STAGE2_SOURCE_WITHOUT_BATCH',
    );
  const sources = batch.rows.map((row, index) => ({
    id: randomUUID(),
    sourceIdentityKey: sourceKeys[index],
    universityId: row.targetId,
    stage: 'STAGE_2',
    sourceArtifactId: batch.fileHash,
    sourceRowNumber: row.row,
    sourceHash: row.rowHash,
    sourceUri: row.file + '#' + row.sheet + '!' + row.row,
    sourceLocale: 'en',
    importedAt: new Date(),
    metadata: {
      rawFields: row.raw,
      sourceSheet: row.sheet,
      sourceWorkbookSha256: batch.fileHash,
      sourceAssetId: batch.assetId,
      sourceAssetHash: batch.artifactHash,
      planHash: context.planHash,
      expectedOwnerVersion: row.expectedVersion,
      projection: row.projection,
      reviewedBy: context.actorId,
      ownerJournalId: randomUUID(),
      sourceJournalId: randomUUID(),
      ownerSequence: index * 2 + 1,
      sourceSequence: index * 2 + 2,
    },
  }));
  await insertUniversityImportRows(tx, 'UniversitySourceRecord', sources);
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
  const sourceWhere = `s.stage='STAGE_2' AND s."sourceArtifactId"=$2 AND s.metadata->>'planHash'=$3 AND s."universityId"=ANY($4::text[])`;
  const parameters = [changeSetId, batch.fileHash, context.planHash, ids];
  const updated = await applyStage2OwnerProjection(tx, { changeSetId, sourceWhere, parameters });
  const sourceCount = await tx.$executeRawUnsafe(
    `INSERT INTO "UniversityImportChange" (id,"changeSetId","universityId","entityType","entityId",operation,"afterState",sequence)
    SELECT s.metadata->>'sourceJournalId',$1,s."universityId",'SOURCE_RECORD',s.id,'CREATE',to_jsonb(s)||jsonb_build_object('createdAt',to_char(s."createdAt",'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'importedAt',to_char(s."importedAt",'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),(s.metadata->>'sourceSequence')::int
    FROM "UniversitySourceRecord" s WHERE ${sourceWhere}`,
    ...parameters,
  );
  assert.equal(sourceCount, sources.length);
  return {
    replayed: false,
    sources: sources.length,
    updated,
    projected: batch.rows.filter(
      (row) => row.projection.rootKeys.length || row.projection.optionalKeys.length,
    ).length,
  };
}

export { snapshot as universityStage2SnapshotSql };
export async function applyStage2OwnerProjection(
  tx,
  {
    changeSetId,
    sourceWhere,
    parameters,
    sourceRelation = '"UniversitySourceRecord"',
    reviewProjection = false,
  },
) {
  const reviewExtension = reviewProjection
    ? "||jsonb_build_object('projectionReviewHash',$6::text)"
    : '';
  const updated = await tx.$executeRawUnsafe(
    `INSERT INTO "UniversityImportChange" (id,"changeSetId","universityId","entityType","entityId",operation,"beforeState",sequence)
    SELECT s.metadata->>'ownerJournalId',$1,u.id,'UNIVERSITY',u.id,'UPDATE',${snapshot('u')},(s.metadata->>'ownerSequence')::int
    FROM ${sourceRelation} s JOIN "University" u ON u.id=s."universityId" WHERE ${sourceWhere}
    AND coalesce((s.metadata->'projection'->>'ownerImmutable')::boolean,false)=false`,
    ...parameters,
  );
  const sets = Object.entries(stage2RootFields).map(([key, column]) => {
    const value = `btrim(s.metadata->'rawFields'->>'${column}')`;
    return `"${key}"=CASE WHEN s.metadata->'projection'->'rootKeys' ? '${key}' THEN ${key === 'foundedYear' ? '(' + value + ')::int' : value} ELSE u."${key}" END`;
  });
  const direct = Object.entries(stage2OptionalFields).filter(([key]) => !key.includes('.'));
  const optionals = direct
    .map(
      ([key, column]) =>
        `CASE WHEN s.metadata->'projection'->'optionalKeys' ? '${key}' THEN jsonb_build_object('${key}',btrim(s.metadata->'rawFields'->>'${column}')) ELSE '{}'::jsonb END`,
    )
    .join(' || ');
  const admissions = `CASE WHEN s.metadata->'projection'->'optionalKeys' ? 'internationalAdmissions.applicationPortalUrl' THEN jsonb_build_object('internationalAdmissions',coalesce(u."optionalFields"->'internationalAdmissions','{}'::jsonb)||jsonb_build_object('applicationPortalUrl',btrim(s.metadata->'rawFields'->>'Official Application Portal URL'))) ELSE '{}'::jsonb END`;
  const review = `jsonb_build_object('stage2Review',coalesce(u."optionalFields"->'stage2Review','{}'::jsonb)||jsonb_build_object('planHash',$3::text,'sourceRecordId',s.id,'sourceReady',s.metadata->'projection'->'sourceReady','issues',s.metadata->'projection'->'issues','publication',false))`;
  const ownerUpdates = await tx.$executeRawUnsafe(
    `UPDATE "University" u SET ${sets.join(',')},"optionalFields"=coalesce(u."optionalFields",'{}'::jsonb)||${optionals}||${admissions}||${review}${reviewExtension},"completenessStatus"='NEEDS_REVIEW',"updatedAt"=timezone('UTC',clock_timestamp())
    FROM ${sourceRelation} s WHERE u.id=s."universityId" AND ${sourceWhere} AND coalesce((s.metadata->'projection'->>'ownerImmutable')::boolean,false)=false`,
    ...parameters,
  );
  assert.equal(ownerUpdates, updated, 'STAGE2_UPDATE_COUNT_MISMATCH');
  const snapshots = await tx.$executeRawUnsafe(
    `UPDATE "UniversityImportChange" j SET "afterState"=${snapshot('u')} FROM "University" u WHERE j."changeSetId"=$1 AND j."entityType"='UNIVERSITY' AND j."entityId"=u.id`,
    changeSetId,
  );
  assert.equal(snapshots, updated);
  return updated;
}

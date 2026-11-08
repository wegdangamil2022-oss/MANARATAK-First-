import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';

function ordered(value) {
  if (Array.isArray(value)) return value.map(ordered);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, ordered(item)]),
    );
  return value;
}
export const courseBulkHash = (value) =>
  createHash('sha256')
    .update(
      typeof value === 'string'
        ? value
        : JSON.stringify(ordered(JSON.parse(JSON.stringify(value)))),
    )
    .digest('hex');
const clean = (value) => JSON.parse(JSON.stringify(value));
async function createChunks(delegate, rows, size = 1000) {
  for (let offset = 0; offset < rows.length; offset += size) {
    const data = clean(rows.slice(offset, offset + size));
    const result = await delegate.createMany({ data });
    assert.equal(result.count, data.length);
  }
}

/** Bounded append-only persistence of a frozen plan produced by the existing
 * course identity analyzer and transfer coordinator. Call inside the real
 * authorization/audit/outbox transaction; this helper never publishes. */
export async function persistExternalCourseBatch(tx, batch, context) {
  assert.match(context.planHash, /^[a-f0-9]{64}$/);
  assert.ok(context.actorId && batch.records.length > 0 && batch.records.length <= 500);
  const handoffKey = courseBulkHash(context.planHash + ':' + batch.index);
  await tx.$queryRawUnsafe(
    'SELECT pg_advisory_xact_lock(hashtextextended($1,0))::text',
    'courses-bulk:' + handoffKey,
  );
  const requestHash = courseBulkHash(batch);
  const previous = await tx.importScreeningReceipt.findUnique({
    where: { ownerDomain_handoffKey: { ownerDomain: 'COURSES', handoffKey } },
  });
  if (previous) {
    assert.equal(previous.requestHash, requestHash, 'COURSE_BULK_REPLAY_DRIFT');
    return { ...previous.result, replayed: true };
  }
  const providerIds = [...new Set(batch.analyses.map((x) => x.resolvedProviderId).filter(Boolean))];
  await tx.$queryRawUnsafe(
    'SELECT id FROM "ExternalCourseProvider" WHERE id=ANY($1::text[]) FOR SHARE',
    providerIds,
  );
  await tx.$queryRawUnsafe(
    'SELECT id FROM "ExternalCourseProviderDomain" WHERE "providerId"=ANY($1::text[]) FOR SHARE',
    providerIds,
  );
  const providers = await tx.externalCourseProvider.findMany({
    where: { id: { in: providerIds } },
    include: { allowedDomains: true },
  });
  assert.equal(providers.length, providerIds.length);
  for (const course of batch.courses) {
    assert.equal(course.status, 'IMPORTED');
    assert.equal(course.originType, 'EXTERNAL_LINKED_COURSE');
    assert.equal(course.isStudyFree, true);
    const provider = providers.find((p) => p.id === course.externalProviderId);
    assert.equal(provider?.status, 'APPROVED');
    const url = new URL(course.directCourseUrl);
    assert.equal(url.protocol, 'https:');
    assert.ok(!url.username && !url.password);
    assert.ok(
      provider.allowedDomains.some(
        (d) =>
          url.hostname === d.normalizedDomain || url.hostname.endsWith('.' + d.normalizedDomain),
      ),
      'COURSE_BULK_DOMAIN_CHANGED',
    );
  }
  for (const source of context.sources) {
    const asset = await tx.assetRecord.findUnique({ where: { id: source.assetId } });
    assert.equal(asset?.lifecycleState, 'ACTIVE');
    assert.equal(asset.checksumHash, source.sha256);
    assert.ok(!asset.deletedAt && !asset.purgedAt);
  }
  // Every existing owner is preserved; a source duplicate never becomes a
  // second canonical record and never overwrites a manually edited title.
  for (const existing of batch.preserved) {
    const owner = await tx.course.findUnique({ where: { id: existing.courseId } });
    assert.ok(owner);
    assert.equal(courseBulkHash(owner), existing.expectedHash, 'EXISTING_COURSE_CHANGED');
  }
  const ids = batch.courses.map((c) => c.id),
    recordIds = new Set(batch.records.map((r) => r.id));
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(batch.courses.every((c) => recordIds.has(c.sourceImportRecordId)));
  assert.ok(
    batch.provenance.every((p) => ids.includes(p.courseId) && recordIds.has(p.importRecordId)),
  );
  assert.equal(batch.provenance.length, batch.courses.length * 9);
  if (batch.sourceReviewSnapshots) {
    const recordIds = batch.records.map((r) => r.id);
    for (const [delegate, table, key, snapshots] of [
      ['importRecord', 'ImportRecord', 'id', batch.sourceReviewSnapshots.records],
      [
        'courseImportAnalysis',
        'CourseImportAnalysis',
        'importRecordId',
        batch.sourceReviewSnapshots.analyses,
      ],
      [
        'importReviewAssignment',
        'ImportReviewAssignment',
        'recordId',
        batch.sourceReviewSnapshots.assignments,
      ],
    ]) {
      await tx.$queryRawUnsafe(
        `SELECT "${key}" FROM "${table}" WHERE "${key}"=ANY($1::text[]) FOR UPDATE`,
        recordIds,
      );
      const actual = await tx[delegate].findMany({ where: { [key]: { in: recordIds } } });
      assert.equal(actual.length, snapshots.length);
      for (const expected of snapshots)
        assert.equal(
          courseBulkHash(actual.find((r) => r[key] === expected[key])),
          courseBulkHash(expected),
          'SOURCE_REVIEW_CHANGED_SINCE_PLAN',
        );
    }
    const payload = batch.records.map((r) => ({
      id: r.id,
      status: r.status,
      promotedEntityId: r.promotedEntityId,
      processingNotes: r.processingNotes,
    }));
    assert.equal(
      await tx.$executeRawUnsafe(
        `UPDATE "ImportRecord" target SET status=source.status,"promotedEntityId"=source."promotedEntityId","processingNotes"=source."processingNotes","updatedAt"=now() FROM jsonb_to_recordset($1::jsonb) source(id text,status text,"promotedEntityId" text,"processingNotes" text) WHERE target.id=source.id`,
        JSON.stringify(payload),
      ),
      recordIds.length,
    );
    assert.equal(
      await tx.$executeRawUnsafe(
        `UPDATE "ImportReviewAssignment" SET state='CLAIMED',"claimedBy"=$2,"claimUntil"=now()+interval '15 minutes',version=version+1,"updatedAt"=now() WHERE "recordId"=ANY($1::text[]) AND "assigneeId"=$2 AND state='ASSIGNED'`,
        recordIds,
        context.actorId,
      ),
      recordIds.length,
    );
  } else {
    await tx.importBatch.create({
      data: {
        id: batch.id,
        sourceSystem: 'MANARATAK_OWNER_REVIEWED_COURSE_MASTERS:' + handoffKey,
        dataType: 'COURSES',
        batchStatus: 'COMPLETED',
        totalRecords: batch.records.length,
        receivedRecords: batch.records.length,
        processedRecords: batch.records.length,
        failedRecords: 0,
        skippedRecords: 0,
        invalidRecords: batch.blocked.length,
        stagingCompletedAt: new Date(),
      },
    });
    await createChunks(
      tx.importRecord,
      batch.records.map((r) => ({ ...r, batchId: batch.id })),
    );
    await createChunks(
      tx.importReviewAssignment,
      batch.records.map((r) => ({
        recordId: r.id,
        batchId: batch.id,
        ownerDomain: 'COURSES',
        assigneeId: context.actorId,
        dueAt: new Date(Date.now() + 86400000),
        state: 'CLAIMED',
        claimedBy: context.actorId,
        claimUntil: new Date(Date.now() + 900000),
        version: 2,
      })),
    );
  }
  await createChunks(tx.course, batch.courses, 500);
  await createChunks(tx.courseSourceIdentity, batch.identities);
  await createChunks(tx.courseSourceUrlHistory, batch.urls);
  if (batch.sourceReviewSnapshots) {
    const keys = [...new Set(batch.analyses.flatMap(Object.keys))].filter(
      (k) => !['id', 'importRecordId', 'createdAt', 'updatedAt'].includes(k),
    );
    assert.ok(keys.every((k) => /^[A-Za-z][A-Za-z0-9]*$/.test(k)));
    assert.equal(
      await tx.$executeRawUnsafe(
        `UPDATE "CourseImportAnalysis" target SET ${keys.map((k) => `"${k}"=source."${k}"`).join(',')},"updatedAt"=now() FROM jsonb_populate_recordset(NULL::"CourseImportAnalysis",$1::jsonb) source WHERE target.id=source.id AND target."importRecordId"=source."importRecordId"`,
        JSON.stringify(batch.analyses),
      ),
      batch.analyses.length,
    );
  } else await createChunks(tx.courseImportAnalysis, batch.analyses);
  await createChunks(tx.courseFieldProvenance, batch.provenance);
  for (let start = 0; start < ids.length; start += 500) {
    await tx.$executeRawUnsafe(
      `INSERT INTO "CourseVersion" (id,"courseId","versionNumber",reason,snapshot,"createdBy","createdAt") SELECT 'bulk-version-'||id,id,version,'COURSE_CREATED',jsonb_build_object('course',to_jsonb(c),'modules','[]'::jsonb,'lessons','[]'::jsonb,'assets','[]'::jsonb,'quizzes','[]'::jsonb,'questionBanks','[]'::jsonb,'questions','[]'::jsonb,'contentBlocks','[]'::jsonb),$2,now() FROM "Course" c WHERE id=ANY($1::text[])`,
      ids.slice(start, start + 500),
      context.actorId,
    );
  }
  if (batch.sourceReviewSnapshots) {
    assert.equal(
      await tx.$executeRawUnsafe(
        `UPDATE "ImportReviewAssignment" SET state='ASSIGNED',"claimedBy"=NULL,"claimUntil"=NULL,version=version+1,"updatedAt"=now() WHERE "recordId"=ANY($1::text[]) AND "claimedBy"=$2 AND state='CLAIMED'`,
        batch.records.map((r) => r.id),
        context.actorId,
      ),
      batch.records.length,
    );
  } else
    await tx.importReviewAssignment.updateMany({
      where: { batchId: batch.id, claimedBy: context.actorId, state: 'CLAIMED' },
      data: { state: 'ASSIGNED', claimedBy: null, claimUntil: null, version: 3 },
    });
  const result = {
    records: batch.records.length,
    created: ids.length,
    preserved: batch.preserved.length,
    blocked: batch.blocked.length,
    publication: false,
  };
  await tx.importScreeningReceipt.create({
    data: { id: randomUUID(), ownerDomain: 'COURSES', handoffKey, requestHash, result },
  });
  return result;
}

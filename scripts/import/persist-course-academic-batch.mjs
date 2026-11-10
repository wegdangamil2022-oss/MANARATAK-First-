import assert from 'node:assert/strict';
import { courseBulkHash } from './persist-external-course-batch.mjs';

/** Apply reviewed, source-attested relationships inside the caller's real
 * authorization/audit/outbox transaction. Never publishes or rewrites content. */
export async function persistCourseAcademicBatch(tx, batch, context) {
  assert.match(context.planHash, /^[a-f0-9]{64}$/);
  const ids = batch.sourceSnapshots.map((row) => row.id);
  assert.ok(ids.length > 0 && ids.length <= 250 && new Set(ids).size === ids.length);
  const key = courseBulkHash('academic:' + context.planHash + ':' + batch.index),
    requestHash = courseBulkHash(batch);
  await tx.$queryRawUnsafe(
    'SELECT pg_advisory_xact_lock(hashtextextended($1,0))::text',
    'courses-academic:' + key,
  );
  const receipt = await tx.importScreeningReceipt.findUnique({
    where: { ownerDomain_handoffKey: { ownerDomain: 'COURSES', handoffKey: key } },
  });
  if (receipt) {
    assert.equal(receipt.requestHash, requestHash, 'ACADEMIC_REPLAY_DRIFT');
    return { ...receipt.result, replayed: true };
  }
  await tx.$queryRawUnsafe(
    'SELECT id FROM "Course" WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE',
    ids,
  );
  if (typeof tx.assertCourseSourceSnapshots === 'function')
    await tx.assertCourseSourceSnapshots(batch.sourceSnapshots);
  else {
    const select = Object.fromEntries(
      Object.keys(batch.sourceSnapshots[0]).map((field) => [field, true]),
    );
    const actual = await tx.course.findMany({ where: { id: { in: ids } }, select });
    assert.equal(actual.length, ids.length);
    for (const expected of batch.sourceSnapshots)
      assert.equal(
        courseBulkHash(actual.find((row) => row.id === expected.id)),
        courseBulkHash(expected),
        'COURSE_CHANGED_SINCE_ACADEMIC_REVIEW',
      );
  }
  const nodeIds = [...new Set(batch.links.map((row) => row.taxonomyNodeId))],
    majorIds = [...new Set(batch.projections.map((row) => row.majorId))];
  const nodes = await tx.$queryRawUnsafe(
    'SELECT id,"canonicalCode","canonicalName",status FROM "AcademicTaxonomyNode" WHERE id=ANY($1::text[]) ORDER BY id FOR SHARE',
    nodeIds,
  );
  for (const id of nodeIds)
    assert.equal(
      courseBulkHash(nodes.find((row) => row.id === id)),
      courseBulkHash(context.nodes.find((row) => row.id === id)),
      'REVIEWED_TAXONOMY_CHANGED',
    );
  if (majorIds.length) {
    const majors = await tx.$queryRawUnsafe(
      'SELECT id,"canonicalName",status FROM "Major" WHERE id=ANY($1::text[]) ORDER BY id FOR SHARE',
      majorIds,
    );
    for (const id of majorIds)
      assert.equal(
        courseBulkHash(majors.find((row) => row.id === id)),
        courseBulkHash(context.majors.find((row) => row.id === id)),
        'REVIEWED_MAJOR_CHANGED',
      );
  }
  for (const table of ['CourseAcademicTaxonomyLink', 'CourseMajorProjection']) {
    const [existing] = await tx.$queryRawUnsafe(
      `SELECT count(*)::int AS count FROM "${table}" WHERE "courseId"=ANY($1::text[])`,
      ids,
    );
    assert.equal(existing.count, 0, 'EXISTING_RELATIONSHIPS_REQUIRE_REVIEW');
  }
  const previousResolutions = await tx.$queryRawUnsafe(
    'SELECT * FROM "CourseTaxonomyResolution" WHERE "courseId"=ANY($1::text[]) ORDER BY id FOR UPDATE',
    ids,
  );
  for (const existing of previousResolutions) {
    const source = batch.sourceSnapshots.find((row) => row.id === existing.courseId);
    assert.ok(
      !existing.reviewedBy &&
        !existing.reviewedAt &&
        ['UNRESOLVED', 'AMBIGUOUS', 'PROPOSED'].includes(existing.status) &&
        existing.matchMethod !== 'ADMIN_REVIEW' &&
        existing.sourceImportRecordId === source.sourceImportRecordId &&
        String(source.shortCourseTopicsRaw ?? '')
          .split(/[•|;\n]/u)
          .map((term) => term.trim())
          .includes(existing.sourceTerm),
      'EXISTING_RESOLUTION_REQUIRES_REVIEW',
    );
  }
  const resolutions = new Map(batch.resolutions.map((row) => [row.id, row]));
  const links = new Map(batch.links.map((row) => [row.id, row]));
  for (const row of batch.links) {
    assert.ok(ids.includes(row.courseId));
    assert.ok(nodeIds.includes(row.taxonomyNodeId));
    assert.equal(row.reviewState, 'APPROVED');
    assert.equal(row.reviewedBy, context.actorId);
    const source = batch.sourceSnapshots.find((course) => course.id === row.courseId);
    const sourceTerms = [
      source.originalSourceTitle,
      source.canonicalName,
      source.displayName,
      ...String(source.shortCourseTopicsRaw ?? '')
        .split(/[•|;\n]/u)
        .map((term) => term.trim()),
    ];
    assert.ok(sourceTerms.includes(row.sourceTerm), 'ACADEMIC_EVIDENCE_NOT_IN_SOURCE');
    assert.equal(resolutions.get(row.sourceResolutionId)?.courseId, row.courseId);
    assert.equal(row.sourceImportRecordId, source.sourceImportRecordId);
    const resolution = resolutions.get(row.sourceResolutionId);
    assert.equal(resolution.status, 'APPROVED');
    assert.equal(resolution.reviewedBy, context.actorId);
    assert.equal(resolution.sourceTerm, row.sourceTerm);
    assert.ok(resolution.candidateTaxonomyNodeIds.includes(row.taxonomyNodeId));
  }
  for (const row of batch.projections) {
    assert.ok(ids.includes(row.courseId));
    assert.ok(majorIds.includes(row.majorId));
    assert.equal(row.projectionState, 'APPROVED');
    assert.equal(row.sourceType, 'DIRECT_REVIEWED');
    assert.equal(row.reviewedBy, context.actorId);
    assert.ok(
      !['ARCHIVED', 'REJECTED'].includes(
        context.majors.find((major) => major.id === row.majorId)?.status,
      ),
    );
    assert.equal(links.get(row.sourceCourseTaxonomyLinkId)?.courseId, row.courseId);
    assert.equal(links.get(row.sourceCourseTaxonomyLinkId)?.taxonomyNodeId, row.taxonomyNodeId);
  }
  // Reuse only unreviewed automatic analyses of the same literal source term.
  // Preserve their full prior state in the CourseVersion snapshot below.
  const reusedResolutionIds = new Map();
  for (const proposed of batch.resolutions) {
    const existing = previousResolutions.find(
      (row) => row.courseId === proposed.courseId && row.normalizedTerm === proposed.normalizedTerm,
    );
    if (!existing) continue;
    assert.equal(existing.sourceTerm, proposed.sourceTerm, 'EXISTING_RESOLUTION_SOURCE_DRIFT');
    reusedResolutionIds.set(proposed.id, existing.id);
    assert.equal(
      await tx.$executeRawUnsafe(
        `UPDATE "CourseTaxonomyResolution" r SET status=p.status,"candidateTaxonomyNodeIds"=p."candidateTaxonomyNodeIds",
        "chosenTaxonomyNodeId"=p."chosenTaxonomyNodeId","matchMethod"=p."matchMethod",confidence=p.confidence,
        "reviewedBy"=p."reviewedBy","reviewedAt"=p."reviewedAt","updatedAt"=now()
       FROM jsonb_populate_record(NULL::"CourseTaxonomyResolution",$1::jsonb) p WHERE r.id=p.id`,
        JSON.stringify({ ...proposed, id: existing.id }),
      ),
      1,
    );
  }
  const effectiveLinks = batch.links.map((row) => ({
    ...row,
    sourceResolutionId: reusedResolutionIds.get(row.sourceResolutionId) ?? row.sourceResolutionId,
  }));
  for (const [delegate, rows] of [
    [
      tx.courseTaxonomyResolution,
      batch.resolutions.filter((row) => !reusedResolutionIds.has(row.id)),
    ],
    [tx.courseAcademicTaxonomyLink, effectiveLinks],
    [tx.courseMajorProjection, batch.projections],
  ]) {
    for (let offset = 0; offset < rows.length; offset += 500) {
      const chunk = rows.slice(offset, offset + 500);
      assert.equal((await delegate.createMany({ data: chunk })).count, chunk.length);
    }
  }
  assert.equal(
    await tx.$executeRawUnsafe(
      'UPDATE "Course" SET version=version+1,"updatedAt"=GREATEST(now(),"updatedAt"+interval \'1 millisecond\') WHERE id=ANY($1::text[])',
      ids,
    ),
    ids.length,
  );
  await tx.$executeRawUnsafe(
    `INSERT INTO "CourseVersion" (id,"courseId","versionNumber",reason,snapshot,"createdBy","createdAt")
    SELECT 'academic-version-'||id||'-'||version,id,version,'ACADEMIC_RELATIONSHIPS_REVIEWED',
      jsonb_build_object('course',to_jsonb(c),'modules','[]'::jsonb,'lessons','[]'::jsonb,'assets','[]'::jsonb,'quizzes','[]'::jsonb,'questionBanks','[]'::jsonb,'questions','[]'::jsonb,'contentBlocks','[]'::jsonb,
        'previousTaxonomyResolutions',(SELECT coalesce(jsonb_agg(r),'[]'::jsonb) FROM jsonb_array_elements($3::jsonb) r WHERE r->>'courseId'=c.id),
        'academicTaxonomyLinks',(SELECT jsonb_agg(to_jsonb(l)) FROM "CourseAcademicTaxonomyLink" l WHERE l."courseId"=c.id),
        'majorProjections',(SELECT jsonb_agg(to_jsonb(p)) FROM "CourseMajorProjection" p WHERE p."courseId"=c.id)),$2,now()
    FROM "Course" c WHERE id=ANY($1::text[])`,
    ids,
    context.actorId,
    JSON.stringify(previousResolutions),
  );
  const result = {
    courses: ids.length,
    fields: batch.links.length,
    majors: batch.projections.length,
    published: 0,
  };
  await tx.importScreeningReceipt.create({
    data: {
      id: 'academic-receipt-' + key,
      ownerDomain: 'COURSES',
      handoffKey: key,
      requestHash,
      result,
    },
  });
  return result;
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { persistCourseAcademicBatch } from '../../scripts/import/persist-course-academic-batch.mjs';

function fixture() {
  const source = { id: 'c1', publicId: 'course-1', canonicalName: 'Business', displayName: 'Business', originalSourceTitle: 'Business', shortCourseTopicsRaw: 'Business & Entrepreneurship • Planning', sourceImportRecordId: 'record-1', status: 'IMPORTED', version: 2, updatedAt: '2026-11-06T00:00:00.000Z' };
  const prior = { id: 'old-resolution', courseId: 'c1', sourceTerm: 'Business & Entrepreneurship', normalizedTerm: 'business & entrepreneurship', status: 'UNRESOLVED', candidateTaxonomyNodeIds: [], chosenTaxonomyNodeId: null, matchMethod: null, reviewedBy: null, reviewedAt: null, sourceImportRecordId: 'record-1' };
  const reviewed = { ...prior, id: 'planned-resolution', status: 'APPROVED', candidateTaxonomyNodeIds: ['field-1'], chosenTaxonomyNodeId: 'field-1', matchMethod: 'ADMIN_REVIEW', reviewedBy: 'owner', reviewedAt: '2026-11-10T00:00:00.000Z' };
  const link = { id: 'link-1', courseId: 'c1', taxonomyNodeId: 'field-1', sourceResolutionId: reviewed.id, sourceTerm: reviewed.sourceTerm, sourceImportRecordId: 'record-1', reviewState: 'APPROVED', reviewedBy: 'owner' };
  const node = { id: 'field-1', canonicalCode: '0413', canonicalName: 'Management', status: 'ACTIVE' };
  const writes = [], created = [], existing = [prior];
  const tx = {
    course: { findMany: async () => [source] },
    importScreeningReceipt: { findUnique: async () => null, create: async ({ data }) => writes.push({ receipt: data }) },
    courseTaxonomyResolution: { createMany: async ({ data }) => { created.push(...data); return { count: data.length }; } },
    courseAcademicTaxonomyLink: { createMany: async ({ data }) => { created.push(...data); return { count: data.length }; } },
    courseMajorProjection: { createMany: async ({ data }) => ({ count: data.length }) },
    $queryRawUnsafe: async (sql) => {
      if (sql.includes('FROM "AcademicTaxonomyNode"')) return [node];
      if (sql.includes('SELECT * FROM "CourseTaxonomyResolution"')) return existing;
      if (sql.includes('count(*)')) return [{ count: 0 }];
      return [];
    },
    $executeRawUnsafe: async (sql, ...parameters) => { writes.push({ sql, parameters }); return 1; },
  };
  return { prior, existing, writes, created, tx, batch: { index: 0, sourceSnapshots: [source], resolutions: [reviewed], links: [link], projections: [] }, context: { planHash: 'a'.repeat(64), actorId: 'owner', nodes: [node], majors: [] } };
}

test('reuses an unreviewed analysis identity and retains the previous state in version history', async () => {
  const f = fixture();
  f.existing.push({ ...f.prior, id: 'other-analysis', normalizedTerm: 'planning', sourceTerm: 'Planning' });
  await persistCourseAcademicBatch(f.tx, f.batch, f.context);
  assert.equal(f.created.length, 1);
  assert.equal(f.created[0].sourceResolutionId, f.prior.id);
  const update = f.writes.find(write => write.sql?.startsWith('UPDATE "CourseTaxonomyResolution"'));
  assert.equal(JSON.parse(update.parameters[0]).id, f.prior.id);
  assert.equal(JSON.parse(update.parameters[0]).status, 'APPROVED');
  const version = f.writes.find(write => write.sql?.includes('INSERT INTO "CourseVersion"'));
  const preserved = JSON.parse(version.parameters[2]);
  assert.equal(preserved.length, 2);
  assert.equal(preserved[0].status, 'UNRESOLVED');
  assert.equal(preserved[1].id, 'other-analysis');
  assert.ok(f.writes.every(write => !write.sql?.includes('DELETE')));
  assert.equal(f.batch.links[0].sourceResolutionId, 'planned-resolution');
});

test('refuses to overwrite any existing manual or reviewed resolution', async () => {
  for (const change of [{ reviewedBy: 'reviewer' }, { reviewedAt: '2026-11-10T00:00:00Z' }, { status: 'APPROVED' }, { status: 'REJECTED' }, { matchMethod: 'ADMIN_REVIEW' }]) {
    const f = fixture();
    Object.assign(f.prior, change);
    await assert.rejects(persistCourseAcademicBatch(f.tx, f.batch, f.context), /EXISTING_RESOLUTION_REQUIRES_REVIEW/);
    assert.equal(f.writes.length, 0);
    assert.equal(f.created.length, 0);
  }
});

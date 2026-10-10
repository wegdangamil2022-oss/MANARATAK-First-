import { describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { AcademicTaxonomyAdminRouter } from '../../../../src/presentation/api/router/AcademicTaxonomyAdminRouter';
import { AcademicTaxonomyPublicRouter } from '../../../../src/presentation/api/router/AcademicTaxonomyPublicRouter';
function admin(authenticated = true) {
  const cases = { bulkReview: vi.fn(async () => ({ canApply: true })), crosswalk: vi.fn(async () => ({ data: [], total: 0 })), diagnostics: vi.fn(async () => ({ data: [], total: 0 })) };
  const imports = { preview: vi.fn(async () => ({ id: 'plan' })), apply: vi.fn(async () => ({ node: { nodeId: 'stable' } })), review: vi.fn() };
  const app = express(); app.use(express.json()); app.use((req, _res, next) => { if (authenticated) req.authUserId = 'owner'; next(); });
  app.use('/admin', AcademicTaxonomyAdminRouter.create({ adminAcademicTaxonomyUseCases: cases as any, academicTaxonomyOwnerImportUseCases: imports as any, degreeLevelUseCases: {} as any, adminMajorUseCases: {} as any }));
  return { app, cases, imports };
}
function publicApp(status = 'ACTIVE') {
  const repo = { getNode: vi.fn(async () => ({ nodeId: 'node', nodeType: 'ACADEMIC_FIELD', canonicalCode: '06', canonicalName: 'ICT', standardType: 'ISCED', status, updatedAt: new Date() })),
    getNodeByCanonicalKey: vi.fn(async () => ({ status })), listNodes: vi.fn(async () => []), relatedNodesPage: vi.fn(async () => ({ data: [] })), listChildren: vi.fn(), listParents: vi.fn() };
  const app = express(); app.use('/public', AcademicTaxonomyPublicRouter.create({ academicTaxonomyRepository: repo as any })); return { app, repo };
}
describe('section 07 source closure route contracts', () => {
  it('requires owner actor and server-side approval revision on import actions', async () => {
    const h = admin(false); expect((await request(h.app).post('/admin/imports/preview').send({ receiptId: 'receipt' })).status).toBe(401); expect(h.imports.preview).not.toHaveBeenCalled();
    const ready = admin(); expect((await request(ready.app).post('/admin/imports/plan/apply').send({ expectedVersion: 1 })).status).toBe(400); expect(ready.imports.apply).not.toHaveBeenCalled();
    expect((await request(ready.app).post('/admin/imports/plan/apply').send({ expectedVersion: 2, previewHash: 'a'.repeat(64), reviewedBy: 'forged' })).status).toBe(400);
  });
  it('passes exact reviewed versions and maps stale owner decisions to conflicts', async () => {
    const h = admin(); h.imports.apply.mockRejectedValueOnce(new Error('TAXONOMY_IMPORT_STALE_PREVIEW'));
    expect((await request(h.app).post('/admin/imports/plan/apply').send({ expectedVersion: 2, previewHash: 'a'.repeat(64) })).status).toBe(409);
    expect(h.imports.apply).toHaveBeenCalledWith('plan', { expectedVersion: 2, previewHash: 'a'.repeat(64) }, expect.objectContaining({ actorId: 'owner' }));
  });
  it('does not allow the bulk review flow to publish or skip dry-run declaration', async () => {
    const h = admin(); const input = { nodes: [{ nodeId: 'n', expectedUpdatedAt: '2026-10-10T01:00:00.000Z' }], reason: 'Reviewed', acknowledgeHistoricalReferences: true, nextStatus: 'ACTIVE', dryRun: false };
    expect((await request(h.app).post('/admin/review/bulk').send(input)).status).toBe(400);
    expect((await request(h.app).post('/admin/review/bulk').send({ ...input, nextStatus: 'READY_TO_REVIEW', dryRun: undefined })).status).toBe(400);
    expect(h.cases.bulkReview).not.toHaveBeenCalled();
  });
  it('whitelists structural rules and bounds crosswalk pagination', async () => {
    const h = admin(); expect((await request(h.app).get('/admin/diagnostics?code=DELETE_ORPHANS')).status).toBe(400);
    expect((await request(h.app).get('/admin/crosswalk?sourceStandard=CIP&targetStandard=ISCED&page=1001')).status).toBe(400);
    expect((await request(h.app).get('/admin/crosswalk?sourceStandard=CIP&targetStandard=ISCED&mappingState=UNMAPPED&minConfidence=0.8')).status).toBe(200);
    expect(h.cases.crosswalk).toHaveBeenCalledWith(expect.objectContaining({ mappingState: 'UNMAPPED', minConfidence: 0.8 }));
  });
  it('hides archived nodes on every direct and hierarchy public path with no catalog cache', async () => {
    const h = publicApp('ARCHIVED');
    for (const path of ['/nodes/node', '/nodes/by-key?nodeType=ACADEMIC_FIELD&canonicalCode=06', '/nodes/node/parents', '/nodes/node/children']) {
      const response = await request(h.app).get(`/public${path}`); expect(response.headers['cache-control']).toBe('no-store, max-age=0');
      if (path.endsWith('/parents') || path.endsWith('/children')) expect(response.body.data).toEqual([]); else expect(response.status).toBe(404);
    }
    expect(h.repo.relatedNodesPage).not.toHaveBeenCalled();
    await request(h.app).get('/public/nodes'); await request(h.app).get('/public/search?q=ICT');
    expect(h.repo.listNodes).toHaveBeenCalledWith(expect.objectContaining({ status: 'ACTIVE', pageSize: 50 }));
  });
  it('bounds public hierarchy reads at the repository and rejects oversized requests', async () => {
    const h = publicApp(); expect((await request(h.app).get('/public/nodes/node/parents?page=2&pageSize=25')).status).toBe(200);
    expect(h.repo.relatedNodesPage).toHaveBeenCalledWith('node', 'parents', { page: 2, pageSize: 25, activeOnly: true });
    expect((await request(h.app).get('/public/nodes/node/children?pageSize=101')).status).toBe(400); expect(h.repo.listChildren).not.toHaveBeenCalled();
  });
});

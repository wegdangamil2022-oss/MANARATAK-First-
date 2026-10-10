import { describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { AcademicTaxonomyAdminRouter } from '../../../../src/presentation/api/router/AcademicTaxonomyAdminRouter';
import { AdminAcademicTaxonomyUseCases } from '@manaratak/application';
const revision = '2026-10-09T00:00:00.000Z';
const node = { nodeId: 'node', nodeType: 'ACADEMIC_FIELD', canonicalCode: '06', canonicalName: 'ICT', standardType: 'ISCED', status: 'ACTIVE', updatedAt: new Date(revision) };
function setup() {
  const report = { kind: 'TAXONOMY_NODE', id: 'node', counts: { courseTaxonomyLinks: 4 }, totalReferences: 4, observedAt: revision };
  const repo = { getNode: async () => node, updateNode: vi.fn(async (_id, data) => ({ ...node, ...data })) };
  const usage = { summarize: vi.fn(async () => report) };
  const owner = new AdminAcademicTaxonomyUseCases(repo as any, undefined, undefined, undefined, usage as any);
  const app = express(); app.use(express.json()); app.use((req, _res, next) => { req.authUserId = 'admin'; next(); });
  app.use('/taxonomy', AcademicTaxonomyAdminRouter.create({ adminAcademicTaxonomyUseCases: owner, degreeLevelUseCases: { getUsage: async () => ({ ...report, kind: 'DEGREE_LEVEL' }) } as any, adminMajorUseCases: {} as any }));
  return { app, repo, usage };
}
describe('academic lifecycle HTTP owner composition', () => {
  it('exposes bounded aggregate impact for both owned reference kinds', async () => {
    const h = setup();
    expect((await request(h.app).get('/taxonomy/nodes/node/usage')).body).toMatchObject({ totalReferences: 4, counts: { courseTaxonomyLinks: 4 } });
    expect((await request(h.app).get('/taxonomy/degree-levels/degree/usage')).body.kind).toBe('DEGREE_LEVEL');
  });
  it('rejects direct status changes without governance', async () => {
    const h = setup();
    expect((await request(h.app).put('/taxonomy/nodes/node').send({ ...node, nodeId: undefined, expectedUpdatedAt: revision, updatedAt: undefined, status: 'ARCHIVED' })).status).toBe(400);
    expect(h.repo.updateNode).not.toHaveBeenCalled();
  });
  it('passes an acknowledged reason to the owner and preserves node identity', async () => {
    const h = setup();
    const response = await request(h.app).put('/taxonomy/nodes/node').send({ ...node, nodeId: undefined, updatedAt: undefined, expectedUpdatedAt: revision, status: 'ARCHIVED', lifecycle: { reason: 'Retired after review', acknowledgeHistoricalReferences: true } });
    expect(response.status).toBe(200); expect(response.body.node.nodeId).toBe('node');
    expect(h.usage.summarize).toHaveBeenCalledWith('TAXONOMY_NODE', 'node');
  });
  it('reports missing impact subjects as 404 rather than an empty count', async () => {
    const h = setup(); h.usage.summarize.mockRejectedValueOnce(new Error('ACADEMIC_USAGE_REFERENCE_NOT_FOUND'));
    expect((await request(h.app).get('/taxonomy/nodes/missing/usage')).status).toBe(404);
  });
});

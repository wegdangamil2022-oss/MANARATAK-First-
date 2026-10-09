import { describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { AcademicTaxonomyAdminRouter } from '../../../../src/presentation/api/router/AcademicTaxonomyAdminRouter';
function setup(authenticated = true) {
  const cases = { editNode: vi.fn(async () => ({ node: { nodeId: 'stable' } })) };
  const app = express(); app.use(express.json());
  app.use((req, _res, next) => { if (authenticated) req.authUserId = 'admin'; next(); });
  app.use('/taxonomy', AcademicTaxonomyAdminRouter.create({ adminAcademicTaxonomyUseCases: cases as any,
    degreeLevelUseCases: {} as any, adminMajorUseCases: {} as any }));
  return { app, cases };
}
const body = { nodeType: 'ACADEMIC_FIELD', canonicalCode: '06', canonicalName: 'ICT', standardType: 'ISCED',
  expectedUpdatedAt: '2026-10-09T00:00:00.000Z' };
describe('taxonomy governed edit HTTP contract', () => {
  it('passes the route identity and exact version to the owner command', async () => {
    const { app, cases } = setup();
    expect((await request(app).put('/taxonomy/nodes/stable').send(body)).status).toBe(200);
    expect(cases.editNode).toHaveBeenCalledWith('stable', expect.objectContaining({ canonicalCode: '06' }), body.expectedUpdatedAt, expect.objectContaining({ actorId: 'admin' }));
  });
  it('requires a version and refuses unrecognized fields', async () => {
    const { app, cases } = setup();
    expect((await request(app).put('/taxonomy/nodes/stable').send({ ...body, expectedUpdatedAt: undefined })).status).toBe(400);
    expect((await request(app).put('/taxonomy/nodes/stable').send({ ...body, newNodeId: 'replacement' })).status).toBe(400);
    expect(cases.editNode).not.toHaveBeenCalled();
  });
  it('reports stale writes as 409', async () => {
    const { app, cases } = setup(); cases.editNode.mockRejectedValueOnce(new Error('TAXONOMY_NODE_VERSION_CONFLICT'));
    expect((await request(app).put('/taxonomy/nodes/stable').send(body)).status).toBe(409);
  });
  it('never invokes an edit without an authenticated actor', async () => {
    const { app, cases } = setup(false);
    await request(app).put('/taxonomy/nodes/stable').send(body);
    expect(cases.editNode).not.toHaveBeenCalled();
  });
});

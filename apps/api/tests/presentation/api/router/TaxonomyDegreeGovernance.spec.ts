import { describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { AcademicTaxonomyAdminRouter } from '../../../../src/presentation/api/router/AcademicTaxonomyAdminRouter';
const body = { expectedUpdatedAt: '2026-10-09T00:00:00.000Z', nameEn: 'Master', nameAr: 'ماجستير' };
function setup() {
  const degree = { update: vi.fn(async () => ({ id: 'degree' })) };
  const taxonomy = { listNodesPage: vi.fn(async () => ({ data: [], total: 0, page: 1, pageSize: 25, totalPages: 0, hasNextPage: false })) };
  const app = express(); app.use(express.json()); app.use((req, _res, next) => { req.authUserId = 'admin'; next(); });
  app.use('/taxonomy', AcademicTaxonomyAdminRouter.create({ adminAcademicTaxonomyUseCases: taxonomy as any, degreeLevelUseCases: degree as any, adminMajorUseCases: {} as any }));
  return { app, degree, taxonomy };
}
describe('degree and pagination HTTP contracts', () => {
  it('requires a degree edit version before invoking the owner', async () => {
    const h = setup(); expect((await request(h.app).put('/taxonomy/degree-levels/degree').send({ nameEn: 'Master', nameAr: 'ماجستير' })).status).toBe(400);
    expect(h.degree.update).not.toHaveBeenCalled();
  });
  it('forwards revision and server actor and returns stale conflict as 409', async () => {
    const h = setup(); h.degree.update.mockRejectedValueOnce(new Error('DEGREE_LEVEL_VERSION_CONFLICT'));
    expect((await request(h.app).put('/taxonomy/degree-levels/degree').send(body)).status).toBe(409);
    expect(h.degree.update).toHaveBeenCalledWith('degree', body, expect.objectContaining({ actorId: 'admin' }));
  });
  it('serves the canonical paged envelope and rejects unbounded pages', async () => {
    const h = setup(); const response = await request(h.app).get('/taxonomy/nodes?pageSize=25');
    expect(response.body).toMatchObject({ data: [], total: 0, hasNextPage: false });
    expect((await request(h.app).get('/taxonomy/nodes?pageSize=101')).status).toBe(400);
    expect(h.taxonomy.listNodesPage).toHaveBeenCalledTimes(1);
  });
});

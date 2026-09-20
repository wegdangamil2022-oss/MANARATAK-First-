import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { AcademicTaxonomyPublicRouter } from '../../../../src/presentation/api/router/AcademicTaxonomyPublicRouter';

describe('AcademicTaxonomyPublicRouter locale contract', () => {
  const node = {
    nodeId: 'node_001', nodeType: 'DISCIPLINE', canonicalCode: '0611', canonicalName: 'Computer Science',
    localizedNames: { ar: 'علوم الحاسوب', en: 'Computer Science' }, status: 'ACTIVE', createdAt: new Date(), updatedAt: new Date(),
  };
  const createRepository = () => ({ listNodes: vi.fn(), getNode: vi.fn(), getNodeByCanonicalKey: vi.fn(), listChildren: vi.fn(), listParents: vi.fn() });
  const createApp = (repository: ReturnType<typeof createRepository>) => {
    const app = express();
    app.use('/academic-taxonomy', AcademicTaxonomyPublicRouter.create({ academicTaxonomyRepository: repository as any }));
    return app;
  };

  it('adds a localized displayName without changing canonical identity', async () => {
    const repository = createRepository();
    repository.listNodes.mockResolvedValue([node]);
    const res = await request(createApp(repository)).get('/academic-taxonomy/nodes?locale=ar');
    expect(res.status).toBe(200);
    expect(res.body.data[0].displayName).toBe('علوم الحاسوب');
    expect(res.body.data[0].canonicalName).toBe('Computer Science');
    expect(res.body.data[0].canonicalCode).toBe('0611');
    expect(res.body.data[0].localizedNames).toBeUndefined();
  });

  it('rejects unsupported locale deterministically', async () => {
    const repository = createRepository();
    const res = await request(createApp(repository)).get('/academic-taxonomy/nodes?locale=fr');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('UNSUPPORTED_LOCALE');
  });
});

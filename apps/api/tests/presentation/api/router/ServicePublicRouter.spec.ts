import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { ServicePublicRouter } from '../../../../src/presentation/api/router/ServicePublicRouter';

describe('ServicePublicRouter', () => {
  const createUseCases = () => ({
    listServices: vi.fn(),
    getService: vi.fn()
  });

  const createApp = (useCases: ReturnType<typeof createUseCases>) => {
    const app = express();
    app.use(express.json());
    app.use('/services', ServicePublicRouter.create({ publicServiceCatalogUseCases: useCases as any }));
    return app;
  };

  it('returns published services with safe filters', async () => {
    const useCases = createUseCases();
    useCases.listServices.mockResolvedValue({ data: [{ slug: 'visa-review', displayName: 'Visa Review' }], total: 1, page: 1, pageSize: 20, totalPages: 1 });
    const app = createApp(useCases);

    const res = await request(app).get('/services?serviceCategory=VISA_SERVICES&pageSize=100');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(useCases.listServices).toHaveBeenCalledWith(expect.objectContaining({
      serviceCategory: 'VISA_SERVICES',
      limit: 20
    }));
  });

  it('maps missing public services to 404', async () => {
    const useCases = createUseCases();
    useCases.getService.mockRejectedValue(new Error('Service not found'));
    const app = createApp(useCases);

    const res = await request(app).get('/services/missing-service');

    expect(res.status).toBe(404);
  });
});

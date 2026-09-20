import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { CareerPublicRouter } from '../../../../src/presentation/api/router/CareerPublicRouter';

describe('CareerPublicRouter', () => {
  it('lists published career opportunities', async () => {
    const careerPublicUseCases = {
      listPublishedJobs: vi.fn().mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 }),
      getPublishedJobBySlug: vi.fn()
    };
    const app = express();
    app.use('/public/careers', CareerPublicRouter.create({ careerPublicUseCases: careerPublicUseCases as any }));

    const response = await request(app).get('/public/careers/jobs?country=Yemen&pageSize=100');

    expect(response.status).toBe(200);
    expect(careerPublicUseCases.listPublishedJobs).toHaveBeenCalledWith(expect.objectContaining({
      country: 'Yemen',
      limit: 20
    }));
  });
});

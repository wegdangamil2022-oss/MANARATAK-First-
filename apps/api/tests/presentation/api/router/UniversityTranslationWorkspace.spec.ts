import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { UniversityAdminRouter } from '../../../../src/presentation/api/router/UniversityAdminRouter';

describe('University translation workspace routes', () => {
  const createUseCases = () => ({
    listTranslations: vi.fn(),
    upsertTranslation: vi.fn(),
  });

  const createApp = (useCases: ReturnType<typeof createUseCases>) => {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.authUserId = 'admin-X';
      next();
    });
    app.use(
      '/admin/universities',
      UniversityAdminRouter.create({ adminUniversityUseCases: useCases as any }),
    );
    return app;
  };

  it('lists translations for the same canonical university id', async () => {
    const useCases = createUseCases();
    useCases.listTranslations.mockResolvedValue([{ locale: 'ar', displayName: 'جامعة الاختبار' }]);
    const response = await request(createApp(useCases)).get(
      '/admin/universities/university-1/translations',
    );

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(useCases.listTranslations).toHaveBeenCalledWith('university-1');
  });

  it('upserts an allowed locale without accepting a replacement canonical id', async () => {
    const useCases = createUseCases();
    useCases.upsertTranslation.mockResolvedValue({
      locale: 'en',
      displayName: 'Test University',
      reviewStatus: 'APPROVED',
    });
    const response = await request(createApp(useCases))
      .put('/admin/universities/university-1/translations/en')
      .send({ displayName: 'Test University', reviewStatus: 'APPROVED', id: 'different-id' });

    expect(response.status).toBe(200);
    expect(useCases.upsertTranslation).toHaveBeenCalledTimes(1);
    const [id, payload] = useCases.upsertTranslation.mock.calls[0];
    expect(id).toBe('university-1');
    expect(payload).toMatchObject({
      locale: 'en',
      displayName: 'Test University',
      reviewStatus: 'APPROVED',
    });
    expect(payload).not.toHaveProperty('id');
    expect(payload).not.toHaveProperty('publicId');
  });

  it('rejects unsupported locales deterministically', async () => {
    const useCases = createUseCases();
    const response = await request(createApp(useCases))
      .put('/admin/universities/university-1/translations/fr')
      .send({ displayName: 'Université' });

    expect(response.status).toBe(400);
    expect(useCases.upsertTranslation).not.toHaveBeenCalled();
  });
});

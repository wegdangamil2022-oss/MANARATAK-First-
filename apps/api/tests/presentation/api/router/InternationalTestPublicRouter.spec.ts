import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { InternationalTestPublicRouter } from '../../../../src/presentation/api/router/InternationalTestPublicRouter';

const testRecord = {
  id: 't1', canonicalName: 'IELTS Academic', displayName: 'IELTS Academic', localizedNameAr: 'آيلتس الأكاديمي', localizedNameEn: 'IELTS Academic',
  status: 'PUBLISHED', testCategory: 'LANGUAGE_PROFICIENCY', providerName: 'IELTS', isPubliclyVisible: true, isSourceVerified: true,
};

describe('InternationalTestPublicRouter locale contract', () => {
  const createRepository = () => ({ listPublished: vi.fn(), findBySlug: vi.fn(), findPublishedBySlug: vi.fn() });
  const createApp = (repository: ReturnType<typeof createRepository>) => {
    const app = express();
    app.use('/public/international-tests', InternationalTestPublicRouter.create({ internationalTestRepository: repository as any }));
    return app;
  };

  it('projects localized test display name', async () => {
    const repository = createRepository();
    repository.findPublishedBySlug.mockResolvedValue(testRecord);
    const res = await request(createApp(repository)).get('/public/international-tests/ielts-academic?locale=ar');
    expect(res.status).toBe(200);
    expect(res.body.displayName).toBe('آيلتس الأكاديمي');
  });

  it('returns 400 for unsupported locale', async () => {
    const repository = createRepository();
    const res = await request(createApp(repository)).get('/public/international-tests?locale=de');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('UNSUPPORTED_LOCALE');
  });
});

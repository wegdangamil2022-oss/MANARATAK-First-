import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { InternationalTestPublicRouter } from '../../../../src/presentation/api/router/InternationalTestPublicRouter';

const testRecord = {
  id: 't1', canonicalName: 'IELTS Academic', displayName: 'IELTS Academic', localizedNameAr: 'آيلتس الأكاديمي', localizedNameEn: 'IELTS Academic',
  status: 'PUBLISHED', testCategory: 'LANGUAGE_PROFICIENCY', providerName: 'IELTS', isPubliclyVisible: true, isSourceVerified: true,
};

describe('InternationalTestPublicRouter locale contract', () => {
  const createRepository = () => ({ listPublished: vi.fn(), findBySlug: vi.fn(), findById: vi.fn(), findPublishedById: vi.fn(), findPublishedBySlug: vi.fn() });
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

  it('opens a canonical requirement outside the catalog page through the public snapshot', async () => {
    const repository = createRepository();
    repository.findPublishedById.mockResolvedValue({ ...testRecord, id: 'toefl-canonical', slug: 'toefl', internalNotes: 'PRIVATE' });
    const res = await request(createApp(repository)).get('/public/international-tests/id/toefl-canonical?locale=en');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('toefl-canonical');
    expect(res.body).not.toHaveProperty('internalNotes');
    expect(res.headers['cache-control']).toBe('no-store');
    expect(repository.listPublished).not.toHaveBeenCalled();
    expect(repository.findById).not.toHaveBeenCalled();
  });

  it('does not fall back to a draft or withdrawn admin record', async () => {
    const repository = createRepository();
    repository.findPublishedById.mockResolvedValue(null);
    repository.findById.mockResolvedValue({ ...testRecord, status: 'NEEDS_REVIEW' });
    const res = await request(createApp(repository)).get('/public/international-tests/id/t1');
    expect(res.status).toBe(404);
    expect(repository.findById).not.toHaveBeenCalled();
  });

  it('rejects a mismatched owner ID and invalid locale on relationship reads', async () => {
    const repository = createRepository();
    repository.findPublishedById.mockResolvedValue({ ...testRecord, id: 'another-test' });
    expect((await request(createApp(repository)).get('/public/international-tests/id/t1')).status).toBe(404);
    expect((await request(createApp(repository)).get('/public/international-tests/id/t1?locale=de')).status).toBe(400);
  });
});

import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { MajorPublicRouter } from '../../../../src/presentation/api/router/MajorPublicRouter';

const major = {
  id: 'm1', publicId: 'MJR-0001', slug: 'computer-science', canonicalName: 'Computer Science', canonicalDedupKey: 'cs',
  displayName: 'Computer Science', localizedNameAr: 'علوم الحاسوب', localizedNameEn: 'Computer Science',
  status: 'PUBLISHED', completenessStatus: 'COMPLETE',
};

describe('MajorPublicRouter locale contract', () => {
  const createRepository = () => ({ listPublished: vi.fn(), findBySlug: vi.fn(), listContentSections: vi.fn() });
  const createApp = (repository: ReturnType<typeof createRepository>) => {
    const app = express();
    app.use('/public/majors', MajorPublicRouter.create({ majorRepository: repository as any }));
    return app;
  };

  it('projects a requested Arabic major name', async () => {
    const repository = createRepository();
    repository.findBySlug.mockResolvedValue(major);
    repository.listContentSections.mockResolvedValue([]);
    const res = await request(createApp(repository)).get('/public/majors/computer-science?locale=ar');
    expect(res.status).toBe(200);
    expect(res.body.displayName).toBe('علوم الحاسوب');
    expect(res.body.publicId).toBe('MJR-0001');
  });

  it('uses canonical default locale when omitted', async () => {
    const repository = createRepository();
    repository.findBySlug.mockResolvedValue(major);
    repository.listContentSections.mockResolvedValue([]);
    const res = await request(createApp(repository)).get('/public/majors/computer-science');
    expect(res.status).toBe(200);
    expect(res.body.displayName).toBe('علوم الحاسوب');
  });
});

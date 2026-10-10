import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { CmsContentType } from '@manaratak/domain';
import { PublicCmsUseCases } from '@manaratak/application';
import { CmsPublicRouter } from '../../../../src/presentation/api/router/CmsPublicRouter';

describe('CmsPublicRouter', () => {
  const createUseCases = () => ({
    listPublished: vi.fn(),
    getBySlug: vi.fn(),
  });

  const createApp = (useCases: ReturnType<typeof createUseCases>) => {
    const app = express();
    app.use(express.json());
    app.use(
      '/cms',
      CmsPublicRouter.create({ publicCmsUseCases: useCases as unknown as PublicCmsUseCases }),
    );
    return app;
  };

  it('lists published CMS content with locale', async () => {
    const useCases = createUseCases();
    useCases.listPublished.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    });
    const app = createApp(useCases);

    const res = await request(app).get('/cms/content?contentType=ARTICLE&locale=en');

    expect(res.status).toBe(200);
    expect(useCases.listPublished).toHaveBeenCalledWith(
      expect.objectContaining({
        contentType: CmsContentType.ARTICLE,
      }),
      'en',
    );
  });

  it('returns 404 for unpublished or missing content', async () => {
    const useCases = createUseCases();
    useCases.getBySlug.mockRejectedValue(new Error('CMS_CONTENT_NOT_FOUND'));
    const app = createApp(useCases);

    const res = await request(app).get('/cms/content/missing');

    expect(res.status).toBe(404);
  });

  it('minimizes public redirect responses and never exposes editorial provenance', async () => {
    const repository = {
      listRedirects: vi.fn().mockResolvedValue([{
        id: 'private-redirect-id', sourcePath: '/ar/articles/old', destinationPath: '/ar/articles/new',
        statusCode: 301, active: true, createdBy: 'private-editor-id',
        reason: 'private review rationale', contentId: 'private-content-id',
      }]),
    };
    const useCases = new PublicCmsUseCases(repository as any);
    const app = createApp(useCases as unknown as ReturnType<typeof createUseCases>);
    const res = await request(app).get('/cms/redirects/resolve?locale=ar&siteIdentifier=manaratak&path=%2Far%2Farticles%2Fold');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ destinationPath: '/ar/articles/new', statusCode: 301 });
    expect(repository.listRedirects).toHaveBeenCalledWith('manaratak', 'ar');
  });

  it('returns a stable ETag and honors conditional delivery', async () => {
    const useCases = createUseCases();
    useCases.listPublished.mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 });
    const app = createApp(useCases);
    const first = await request(app).get('/cms/content?locale=ar');
    const second = await request(app).get('/cms/content?locale=ar').set('If-None-Match', first.headers.etag);

    expect(first.headers.etag).toMatch(/^W\/"cms-/);
    expect(second.status).toBe(304);
    expect(second.text).toBe('');
  });
});

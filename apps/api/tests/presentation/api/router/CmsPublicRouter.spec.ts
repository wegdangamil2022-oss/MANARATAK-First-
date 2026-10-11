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
    resolveRedirect: vi.fn(),
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

  it('delivers actual HTTP 301 for an approved canonical redirect', async () => {
    const useCases = createUseCases();
    useCases.resolveRedirect.mockResolvedValue({destinationPath:'/ar/articles/new',statusCode:301});
    const result = await request(createApp(useCases)).get('/cms/redirects/http-resolve')
      .query({path:'/ar/articles/old'});
    expect(result.status).toBe(301);
    expect(result.headers.location).toBe('/ar/articles/new');
    expect(useCases.resolveRedirect).toHaveBeenCalledWith('manaratak','ar','/ar/articles/old');
  });

  it('rejects traversal and refuses a cross-locale HTTP redirect', async () => {
    const useCases = createUseCases();
    const app = createApp(useCases);
    const invalid = await request(app).get('/cms/redirects/http-resolve')
      .query({path:'/%2e%2e//evil.invalid'});
    expect(invalid.status).toBe(400);
    expect(useCases.resolveRedirect).not.toHaveBeenCalled();
    useCases.resolveRedirect.mockResolvedValue({destinationPath:'/en/articles/evil',statusCode:301});
    const crossLocale = await request(app).get('/cms/redirects/http-resolve')
      .query({path:'/ar/articles/old'});
    expect(crossLocale.status).toBe(422);
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

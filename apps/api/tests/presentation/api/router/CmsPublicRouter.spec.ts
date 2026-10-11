import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { CmsContentType } from '@manaratak/domain';
import { PublicCmsUseCases } from '@manaratak/application';
import { CmsPublicRouter } from '../../../../src/presentation/api/router/CmsPublicRouter';

describe('CmsPublicRouter', () => {
  const createUseCases = () => ({
    listPublished: vi.fn(),
    listIndexableSitemapEntries: vi.fn(),
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

  it('refuses foreign tenant access to published CMS data', async () => {
    const useCases = createUseCases();
    const app = createApp(useCases);
    for (const url of [
      '/cms/content?siteIdentifier=foreign',
      '/cms/content/example?siteIdentifier=foreign',
      '/cms/navigation/HEADER?siteIdentifier=foreign',
      '/cms/blocks?siteIdentifier=foreign',
      '/cms/announcements?siteIdentifier=foreign',
      '/cms/redirects/resolve?siteIdentifier=foreign&locale=ar&path=/ar/articles/old',
    ]) {
      const result = await request(app).get(url);
      expect(result.status).toBe(400);
    }
    expect(useCases.listPublished).not.toHaveBeenCalled();
    expect(useCases.getBySlug).not.toHaveBeenCalled();
    expect(useCases.resolveRedirect).not.toHaveBeenCalled();
  });

  it('serves authoritative live CMS XML with content-bound locale alternates and conditional caching', async () => {
    const previous = process.env.PUBLIC_WEB_URL;
    process.env.PUBLIC_WEB_URL = 'https://manaratak.example';
    try {
      const cms = createUseCases();
      cms.listIndexableSitemapEntries.mockResolvedValue([
        { contentId: 'cms-1', locale: 'ar', canonicalPath: '/ar/news/arabic-news' },
        { contentId: 'cms-1', locale: 'en', canonicalPath: '/en/news/english-news' },
      ]);
      const server = createApp(cms);
      const response = await request(server).get('/cms/sitemap.xml');
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/xml/);
      expect(response.text).toContain('<loc>https://manaratak.example/ar/news/arabic-news</loc>');
      expect(response.text).toContain('hreflang="en" href="https://manaratak.example/en/news/english-news"');
      expect(response.headers['cache-control']).toContain('must-revalidate');
      const notModified = await request(server).get('/cms/sitemap.xml')
        .set('If-None-Match', response.headers.etag);
      expect(notModified.status).toBe(304);
      expect(cms.listIndexableSitemapEntries).toHaveBeenCalledTimes(2);
    } finally {
      if (previous === undefined) delete process.env.PUBLIC_WEB_URL;
      else process.env.PUBLIC_WEB_URL = previous;
    }
  });

  it('fails closed if the public sitemap origin is unsafe or unconfigured', async () => {
    const previous = process.env.PUBLIC_WEB_URL;
    const fallback = process.env.VITE_PUBLIC_WEB_URL;
    delete process.env.VITE_PUBLIC_WEB_URL;
    const cms = createUseCases();
    cms.listIndexableSitemapEntries.mockResolvedValue([]);
    try {
      delete process.env.PUBLIC_WEB_URL;
      expect((await request(createApp(cms)).get('/cms/sitemap.xml')).status).toBe(503);
      expect(cms.listIndexableSitemapEntries).not.toHaveBeenCalled();
      process.env.PUBLIC_WEB_URL = 'http://unsafe.invalid';
      expect((await request(createApp(cms)).get('/cms/sitemap.xml')).status).toBe(503);
    } finally {
      if (previous === undefined) delete process.env.PUBLIC_WEB_URL;
      else process.env.PUBLIC_WEB_URL = previous;
      if (fallback === undefined) delete process.env.VITE_PUBLIC_WEB_URL;
      else process.env.VITE_PUBLIC_WEB_URL = fallback;
    }
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

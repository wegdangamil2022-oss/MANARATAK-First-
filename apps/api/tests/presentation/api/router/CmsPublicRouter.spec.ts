import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { CmsContentType } from '@absheer/domain';
import { PublicCmsUseCases } from '@absheer/application';
import { CmsPublicRouter } from '../../../../src/presentation/api/router/CmsPublicRouter';

describe('CmsPublicRouter', () => {
  const createUseCases = () => ({
    listPublished: vi.fn(),
    listPublishedBlocks: vi.fn().mockResolvedValue([]),
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

  it('delivers fresh HTTP HTML, safe redirects, and 404 after archive without any static fallback', async () => {
    const previous = process.env.PUBLIC_WEB_URL;
    process.env.PUBLIC_WEB_URL = 'https://absheer.example';
    try {
      const cms = createUseCases();
      cms.resolveRedirect.mockResolvedValue(null);
      const content = {
        siteIdentifier: 'absheer',
        locale: 'ar',
        slug: 'fresh-news',
        contentType: CmsContentType.NEWS,
        canonicalUrl: '/ar/news/fresh-news',
        title: 'Approved title',
        summary: 'Approved summary',
        body: '<p>Approved version</p>',
        publishedAt: new Date(),
        availableLocales: [{ locale: 'ar', slug: 'fresh-news' }],
        seoMetadata: { title: 'Fresh SEO', description: 'Fresh description' },
      };
      cms.getBySlug.mockResolvedValue(content);
      const app = createApp(cms);
      const url = '/cms/pages/http-resolve?path=/ar/news/fresh-news';
      const first = await request(app).get(url);
      expect(first.status).toBe(200);
      expect(first.headers['content-type']).toContain('text/html');
      expect(first.headers['cache-control']).toContain('no-store');
      expect(first.headers['content-security-policy']).toContain("script-src 'self'");
      expect(first.headers['content-security-policy']).not.toContain(
        "script-src 'self' 'unsafe-inline'",
      );
      expect(first.text).toContain('id="root"');
      expect(first.text).toContain('src="/cms-app-entry.js"');
      expect(first.text).toContain('Fresh SEO');
      expect(first.text).toContain('Approved version');
      cms.getBySlug.mockResolvedValue({
        ...content,
        body: '<p>Republished version</p>',
        seoMetadata: { title: 'Updated SEO' },
      });
      const updated = await request(app).get(url);
      expect(updated.text).toContain('Updated SEO');
      expect(updated.text).not.toContain('Approved version');
      expect(
        (await request(app).get('/cms/pages/http-resolve?path=/ar/articles/fresh-news')).status,
      ).toBe(404);
      cms.getBySlug.mockRejectedValue(new Error('CMS_CONTENT_NOT_FOUND'));
      const archived = await request(app).get(url);
      expect(archived.status).toBe(404);
      expect(archived.text).not.toContain('Republished version');
      cms.resolveRedirect.mockResolvedValue({
        destinationPath: '/ar/news/new-name',
        statusCode: 308,
      });
      const redirect = await request(app).get(url);
      expect(redirect.status).toBe(308);
      expect(redirect.headers.location).toBe('/ar/news/new-name');
      expect(redirect.headers['cache-control']).toContain('no-store');
      cms.resolveRedirect.mockResolvedValue({
        destinationPath: 'https://attacker.example',
        statusCode: 301,
      });
      expect((await request(app).get(url)).status).toBe(422);
    } finally {
      if (previous === undefined) delete process.env.PUBLIC_WEB_URL;
      else process.env.PUBLIC_WEB_URL = previous;
    }
  });

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
    process.env.PUBLIC_WEB_URL = 'https://absheer.example';
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
      expect(response.text).toContain('<loc>https://absheer.example/ar/news/arabic-news</loc>');
      expect(response.text).not.toContain('hreflang="en"');
      expect(response.headers['cache-control']).toContain('must-revalidate');
      const notModified = await request(server)
        .get('/cms/sitemap.xml')
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
    useCases.resolveRedirect.mockResolvedValue({
      destinationPath: '/ar/articles/new',
      statusCode: 301,
    });
    const result = await request(createApp(useCases))
      .get('/cms/redirects/http-resolve')
      .query({ path: '/ar/articles/old' });
    expect(result.status).toBe(301);
    expect(result.headers.location).toBe('/ar/articles/new');
    expect(useCases.resolveRedirect).toHaveBeenCalledWith('absheer', 'ar', '/ar/articles/old');
  });

  it('rejects traversal and refuses a cross-locale HTTP redirect', async () => {
    const useCases = createUseCases();
    const app = createApp(useCases);
    const invalid = await request(app)
      .get('/cms/redirects/http-resolve')
      .query({ path: '/%2e%2e//evil.invalid' });
    expect(invalid.status).toBe(400);
    expect(useCases.resolveRedirect).not.toHaveBeenCalled();
    useCases.resolveRedirect.mockResolvedValue({
      destinationPath: '/en/articles/evil',
      statusCode: 301,
    });
    const crossLocale = await request(app)
      .get('/cms/redirects/http-resolve')
      .query({ path: '/ar/articles/old' });
    expect(crossLocale.status).toBe(422);
  });

  it('prohibits intermediate caches from re-serving archived CMS article snapshots', async () => {
    const cms = createUseCases();
    cms.listPublished.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    });
    cms.getBySlug.mockResolvedValue({
      slug: 'published-article',
      locale: 'ar',
      publishedAt: new Date(),
    });
    const server = createApp(cms);
    const list = await request(server).get('/cms/content');
    const detail = await request(server).get('/cms/content/published-article');
    expect(list.status).toBe(200);
    expect(detail.status).toBe(200);
    expect(list.headers['cache-control']).toContain('no-store');
    expect(detail.headers['cache-control']).toContain('no-store');
  });

  it('returns a stable ETag and honors conditional delivery', async () => {
    const useCases = createUseCases();
    useCases.listPublished.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    });
    const app = createApp(useCases);
    const first = await request(app).get('/cms/content?locale=ar');
    const second = await request(app)
      .get('/cms/content?locale=ar')
      .set('If-None-Match', first.headers.etag);

    expect(first.headers.etag).toMatch(/^W\/"cms-/);
    expect(second.status).toBe(304);
    expect(second.text).toBe('');
  });
  it('rejects gated English HTML and redirects before canonical owner reads',async()=>{
    const cms=createUseCases();const server=createApp(cms);
    for(const endpoint of ['pages/http-resolve','redirects/http-resolve']){
      const response=await request(server).get('/cms/'+endpoint+'?path=/en/news/english-news');
      expect(response.status).toBe(404);
      expect(response.headers['x-robots-tag']).toBe('noindex, nofollow');
      expect(response.headers['cache-control']).toContain('no-store');
    }
    expect(cms.getBySlug).not.toHaveBeenCalled();
    expect(cms.resolveRedirect).not.toHaveBeenCalled();
  });

});

import { NextFunction, Request, Response, Router } from 'express';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { PublicCmsUseCases, buildCmsSitemapXml } from '@manaratak/application';
import { CmsContentType, CmsDomainTargetType } from '@manaratak/domain';

export class CmsPublicRouter {
  public static create(cradle: { publicCmsUseCases: PublicCmsUseCases }): Router {
    const router = Router();
    const { publicCmsUseCases } = cradle;
    const asyncHandler =
      (fn: (req: Request, res: Response) => Promise<void>) =>
      (req: Request, res: Response, next: NextFunction) =>
        Promise.resolve(fn(req, res)).catch(next);
    const querySchema = z.object({
      contentType: z.nativeEnum(CmsContentType).optional(),
      categorySlug: z.string().optional(),
      tag: z.string().optional(),
      q: z.string().trim().max(200).optional(),
      locale: z.enum(['ar', 'en']).default('ar'),
      siteIdentifier: z.literal('manaratak').default('manaratak'),
      page: z.coerce.number().int().positive().max(500).default(1),
      pageSize: z.coerce.number().int().min(1).max(50).default(20),
    });
    const deliveryHeaders = (req: Request, res: Response, payload: unknown): boolean => {
      const etag = `W/\"cms-${createHash('sha256').update(JSON.stringify(payload)).digest('base64url').slice(0, 24)}\"`;
      res.set({
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
        ETag: etag,
        Vary: 'Accept-Language',
      });
      const publishedAt = (payload as { publishedAt?: string | Date } | null)?.publishedAt;
      if (publishedAt) res.set('Last-Modified', new Date(publishedAt).toUTCString());
      if (req.headers['if-none-match'] === etag) { res.status(304).end(); return true; }
      return false;
    };
    // Served by nginx at /cms-sitemap.xml. Live public snapshots are the
    // authority: a new publish/archive changes discovery without rebuilding
    // the static site. Never derive origin from untrusted Host headers.
    router.get('/sitemap.xml', asyncHandler(async (req, res) => {
      const origin = process.env.PUBLIC_WEB_URL || process.env.VITE_PUBLIC_WEB_URL;
      if (!origin) { res.status(503).json({ error: 'CMS_SITEMAP_PUBLIC_ORIGIN_REQUIRED' }); return; }
      const entries = await publicCmsUseCases.listIndexableSitemapEntries();
      const xml = buildCmsSitemapXml(entries, origin);
      const etag = `"${createHash('sha256').update(xml).digest('base64url')}"`;
      res.set({
        'Content-Type': 'application/xml; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'public, max-age=60, must-revalidate',
        ETag: etag,
      });
      if (req.headers['if-none-match'] === etag) { res.status(304).end(); return; }
      res.status(200).send(xml);
    }));
    router.get(
      '/content',
      asyncHandler(async (req, res) => {
        const { locale, ...filters } = querySchema.parse(req.query);
        const payload = await publicCmsUseCases.listPublished(filters, locale);
        if (deliveryHeaders(req, res, payload)) return;
        res.json(payload);
      }),
    );
    router.get(
      '/content/:slug',
      asyncHandler(async (req, res) => {
        const query = z.object({ locale: z.enum(['ar', 'en']).default('ar'), siteIdentifier: z.literal('manaratak').default('manaratak') }).parse(req.query);
        const payload = await publicCmsUseCases.getBySlug(req.params.slug, query.locale, query.siteIdentifier);
        if (deliveryHeaders(req, res, payload)) return;
        res.json(payload);
      }),
    );

    router.get('/related', asyncHandler(async (req, res) => {
      const query = z.object({
        targetType: z.nativeEnum(CmsDomainTargetType),
        targetId: z.string().trim().uuid(),
        locale: z.enum(['ar', 'en']).default('ar'),
        siteIdentifier: z.literal('manaratak').default('manaratak'),
        limit: z.coerce.number().int().min(1).max(24).default(6),
      }).parse(req.query);
      const data = await publicCmsUseCases.listRelated(query.targetType, query.targetId, query.locale, query.siteIdentifier, query.limit);
      const payload = { data };
      if (deliveryHeaders(req, res, payload)) return;
      res.json(payload);
    }));

    router.get('/navigation/:locationKey', asyncHandler(async (req, res) => {
      const query = z.object({ locale: z.enum(['ar', 'en']).default('ar'), siteIdentifier: z.literal('manaratak').default('manaratak') }).parse(req.query);
      const menus = await publicCmsUseCases.listNavigation(query.siteIdentifier, query.locale);
      const payload = menus.find((menu) => menu.locationKey === req.params.locationKey.toUpperCase()) ?? null;
      if (deliveryHeaders(req, res, payload)) return; res.json(payload);
    }));
    router.get('/blocks', asyncHandler(async (req, res) => {
      const query = z.object({locale:z.enum(['ar','en']).default('ar'),siteIdentifier:z.literal('manaratak').default('manaratak')}).parse(req.query);
      const payload = {data:await publicCmsUseCases.listPublishedBlocks(query.siteIdentifier,query.locale)};
      if (deliveryHeaders(req,res,payload)) return;
      res.json(payload);
    }));
    router.get('/announcements', asyncHandler(async (req, res) => {
      const query = z.object({ locale: z.enum(['ar', 'en']).default('ar'), siteIdentifier: z.literal('manaratak').default('manaratak') }).parse(req.query);
      const data = await publicCmsUseCases.listAnnouncements(query.siteIdentifier, query.locale);
      const payload = { data }; if (deliveryHeaders(req, res, payload)) return; res.json(payload);
    }));
    // This endpoint is consumed by the edge web server and produces a real
    // 301/302/308, not JSON masquerading as a browser redirect.
    router.get('/redirects/http-resolve', asyncHandler(async (req, res) => {
      const { path } = z.object({
        path: z.string().regex(/^\/(ar|en)\/(articles|news|study-guides|checklists|faqs|pages|landing)\/[a-z0-9-]+$/),
      }).strict().parse(req.query);
      const locale = path.split('/')[1];
      const result = await publicCmsUseCases.resolveRedirect('manaratak', locale, path);
      if (!result) { res.status(404).end(); return; }
      if (!result.destinationPath.startsWith(`/${locale}/`) ||
          result.destinationPath.startsWith('//') || ![301, 302, 308].includes(result.statusCode)) {
        res.status(422).end(); return;
      }
      res.set('Cache-Control', 'public, max-age=60, must-revalidate');
      res.set('X-Content-Type-Options', 'nosniff');
      res.redirect(result.statusCode, result.destinationPath);
    }));
    router.get('/redirects/resolve', asyncHandler(async (req, res) => {
      const query = z.object({ locale: z.enum(['ar', 'en']).default('ar'), siteIdentifier: z.literal('manaratak').default('manaratak'), path: z.string().min(1) }).parse(req.query);
      const payload = await publicCmsUseCases.resolveRedirect(query.siteIdentifier, query.locale, query.path);
      if (!payload) { res.status(404).json({ error: 'CMS_REDIRECT_NOT_FOUND' }); return; }
      res.json(payload);
    }));
    router.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
      if (err instanceof z.ZodError)
        return res.status(400).json({ error: 'CMS_VALIDATION_ERROR', details: err.issues });
      if (err instanceof Error && err.message.startsWith('CMS_SITEMAP_')) {
        return res.status(503).json({ error: 'CMS_SITEMAP_UNAVAILABLE' });
      }
      if (err instanceof Error && err.message === 'CMS_CONTENT_NOT_FOUND') {
        return res.status(404).json({ error: 'CMS_CONTENT_NOT_FOUND' });
      }
      return res.status(500).json({ error: 'CMS_REQUEST_FAILED' });
    });
    return router;
  }
}

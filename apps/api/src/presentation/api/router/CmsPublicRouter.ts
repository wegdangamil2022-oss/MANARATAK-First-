import { NextFunction, Request, Response, Router } from 'express';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { PublicCmsUseCases } from '@manaratak/application';
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
      q: z.string().trim().optional(),
      locale: z.enum(['ar', 'en']).default('ar'),
      siteIdentifier: z.string().default('manaratak'),
      page: z.coerce.number().int().positive().default(1),
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
        const query = z.object({ locale: z.enum(['ar', 'en']).default('ar'), siteIdentifier: z.string().default('manaratak') }).parse(req.query);
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
        siteIdentifier: z.string().default('manaratak'),
        limit: z.coerce.number().int().min(1).max(24).default(6),
      }).parse(req.query);
      const data = await publicCmsUseCases.listRelated(query.targetType, query.targetId, query.locale, query.siteIdentifier, query.limit);
      const payload = { data };
      if (deliveryHeaders(req, res, payload)) return;
      res.json(payload);
    }));

    router.get('/navigation/:locationKey', asyncHandler(async (req, res) => {
      const query = z.object({ locale: z.enum(['ar', 'en']).default('ar'), siteIdentifier: z.string().default('manaratak') }).parse(req.query);
      const menus = await publicCmsUseCases.listNavigation(query.siteIdentifier, query.locale);
      const payload = menus.find((menu) => menu.locationKey === req.params.locationKey.toUpperCase()) ?? null;
      if (deliveryHeaders(req, res, payload)) return; res.json(payload);
    }));
    router.get('/announcements', asyncHandler(async (req, res) => {
      const query = z.object({ locale: z.enum(['ar', 'en']).default('ar'), siteIdentifier: z.string().default('manaratak') }).parse(req.query);
      const data = await publicCmsUseCases.listAnnouncements(query.siteIdentifier, query.locale);
      const payload = { data }; if (deliveryHeaders(req, res, payload)) return; res.json(payload);
    }));
    router.get('/redirects/resolve', asyncHandler(async (req, res) => {
      const query = z.object({ locale: z.enum(['ar', 'en']).default('ar'), siteIdentifier: z.string().default('manaratak'), path: z.string().min(1) }).parse(req.query);
      const payload = await publicCmsUseCases.resolveRedirect(query.siteIdentifier, query.locale, query.path);
      if (!payload) { res.status(404).json({ error: 'CMS_REDIRECT_NOT_FOUND' }); return; }
      res.json(payload);
    }));
    router.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
      if (err instanceof z.ZodError)
        return res.status(400).json({ error: 'CMS_VALIDATION_ERROR', details: err.issues });
      if (err instanceof Error && err.message === 'CMS_CONTENT_NOT_FOUND') {
        return res.status(404).json({ error: 'CMS_CONTENT_NOT_FOUND' });
      }
      return res.status(500).json({ error: 'CMS_REQUEST_FAILED' });
    });
    return router;
  }
}

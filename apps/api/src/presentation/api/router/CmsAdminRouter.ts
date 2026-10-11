import { NextFunction, Request, Response, Router } from 'express';
import { z } from 'zod';
import { AdminCmsUseCases } from '@manaratak/application';
import { AuthorizationEvaluatorService, CmsCategoryStatus, CmsContentStatus, CmsContentType, CmsDomainRelationType, CmsDomainTargetType } from '@manaratak/domain';

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const nullableAsset = z.string().trim().min(1).nullable().optional();
const seoSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  keywords: z.array(z.string().trim().min(1)).default([]),
  noIndex: z.boolean().default(false),
  noFollow: z.boolean().default(false),
  openGraphTitle: z.string().trim().nullable().optional(),
  openGraphDescription: z.string().trim().nullable().optional(),
  openGraphAssetId: nullableAsset,
});
const workflowSchema = z.object({
  locale: z.enum(['ar', 'en']),
  expectedVersion: z.number().int().positive(),
  comments: z.string().trim().max(2000).nullable().optional(),
});

export class CmsAdminRouter {
  public static create(cradle: { adminCmsUseCases: AdminCmsUseCases; authEvaluatorService: AuthorizationEvaluatorService }): Router {
    const router = Router();
    const { adminCmsUseCases, authEvaluatorService } = cradle;
    // Administrative authentication is inherited from /admin. Every CMS action
    // requires its own capability; unrecognized mutations fail closed.
    const requiredPermission = (method: string, path: string): string | null => {
      if (method === 'GET' && path === '/operations/failed-schedules') return 'admin:cms:operations:run';
      if (method === 'GET') return 'admin:cms:view';
      if (method === 'POST' && /^\/content\/[^/]+\/(approve|reject)$/.test(path)) return 'admin:cms:review';
      if (method === 'POST' && (/^\/content\/[^/]+\/(publish|archive|schedule|cancel-schedule)$/.test(path)
        || /^\/(navigation|announcements|blocks)\/[^/]+\/(publish|archive)$/.test(path))) return 'admin:cms:publish';
      if (method === 'POST' && path === '/operations/process-due-schedules') return 'admin:cms:operations:run';
      if (method === 'POST' && /^\/operations\/failed-schedules\/[^/]+\/retry$/.test(path)) return 'admin:cms:operations:run';
      if ((method === 'POST' || method === 'PATCH') && /^\/redirects(?:\/[^/]+)?$/.test(path)) return 'admin:cms:redirects:manage';
      if (method === 'PUT' && path === '/navigation') return 'admin:cms:navigation:manage';
      if (method === 'POST' && path === '/block-schemas') return 'admin:cms:schemas:manage';
      if ((method === 'POST' && (path === '/content' || path === '/categories' || path === '/tags'
        || /^\/content\/[^/]+\/(submit-review|change-slug)$/.test(path)
        || /^\/content\/[^/]+\/revisions\/[^/]+\/[^/]+\/restore$/.test(path)))
        || (method === 'PATCH' && /^\/content\/[^/]+$/.test(path))
        || (method === 'PUT' && (path === '/blocks' || path === '/announcements'
          || /^\/content\/[^/]+\/(localized|domain-links)$/.test(path)))) return 'admin:cms:author';
      return null;
    };
    router.use(async (req, res, next) => {
      if (!req.authUserId) { res.status(401).json({ error: 'CMS_AUTHENTICATED_ACTOR_REQUIRED' }); return; }
      const permission = requiredPermission(req.method, req.path);
      if (!permission) { res.status(403).json({ error: 'CMS_CAPABILITY_UNRECOGNIZED' }); return; }
      try {
        const decision = await authEvaluatorService.evaluatePermission(req.authUserId, permission, {
          ip: req.ip || req.socket?.remoteAddress || undefined,
          requestTime: new Date(),
          userAgent: req.headers['user-agent'],
          correlationId: req.headers['x-correlation-id'],
        });
        if (!decision.isGranted) { res.status(403).json({ error: 'CMS_PERMISSION_DENIED', requiredPermission: permission }); return; }
        res.setHeader('X-Admin-Required-Permission', permission);
        next();
      } catch {
        res.status(403).json({ error: 'CMS_PERMISSION_DENIED', requiredPermission: permission });
      }
    });
    const asyncHandler =
      (fn: (req: Request, res: Response) => Promise<void>) =>
      (req: Request, res: Response, next: NextFunction) =>
        Promise.resolve(fn(req, res)).catch(next);
    const actor = (req: Request) => {
      if (!req.authUserId) throw new Error('CMS_AUTHENTICATED_ACTOR_REQUIRED');
      return req.authUserId;
    };
    const querySchema = z.object({
      status: z.preprocess(value => value === '' || value === 'ALL' || value === 'all' ? undefined : value, z.nativeEnum(CmsContentStatus).optional()),
      contentType: z.nativeEnum(CmsContentType).optional(),
      categorySlug: slug.optional(),
      tag: z.string().optional(),
      locale: z.enum(['ar', 'en']).optional(),
      siteIdentifier: z.literal('manaratak').optional(),
      q: z.string().trim().max(200).optional(),
      page: z.coerce.number().int().positive().max(500).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(20),
    });
    const contentSchema = z.object({
      slug,
      siteIdentifier: z.literal('manaratak').default('manaratak'),
      primaryLocale: z.enum(['ar', 'en']).default('ar'),
      contentType: z.nativeEnum(CmsContentType),
      title: z.string().trim().min(1),
      summary: z.string().trim().nullable().optional(),
      categoryId: z.string().trim().nullable().optional(),
      categorySlug: slug.nullable().optional(),
      featuredAssetId: nullableAsset,
      seoMetadata: seoSchema.nullable().optional(),
      editorialMetadata: z.record(z.string(), z.unknown()).nullable().optional(),
      metadata: z.record(z.string(), z.unknown()).nullable().optional(),
    });
    const localizedSchema = z.object({
      locale: z.enum(['ar', 'en']),
      localizedSlug: slug,
      title: z.string().trim().min(1),
      summary: z.string().trim().nullable().optional(),
      body: z.string().trim().min(1),
      readingTimeMinutes: z.number().int().positive().nullable().optional(),
      featuredAssetId: nullableAsset,
      attachmentAssetIds: z.array(z.string().trim().min(1)).max(50).default([]),
      tagIds: z.array(z.string().trim().min(1)).max(30).default([]),
      expectedVersion: z.number().int().positive().optional(),
      seoMetadata: seoSchema.nullable().optional(),
      metadata: z.record(z.string(), z.unknown()).nullable().optional(),
    });
    const categorySchema = z.object({
      slug,
      nameAr: z.string().trim().min(1),
      nameEn: z.string().trim().min(1),
      descriptionAr: z.string().trim().nullable().optional(),
      descriptionEn: z.string().trim().nullable().optional(),
      parentCategoryId: z.string().trim().nullable().optional(),
      status: z.nativeEnum(CmsCategoryStatus).default(CmsCategoryStatus.ACTIVE),
      metadata: z.record(z.string(), z.unknown()).nullable().optional(),
    });
    const tagSchema = z.object({
      normalizedValue: z.string().trim().min(1),
      labelAr: z.string().trim().min(1),
      labelEn: z.string().trim().min(1),
    });

    router.get(
      '/content',
      asyncHandler(async (req, res) => {
        res.json(await adminCmsUseCases.listContent(querySchema.parse(req.query)));
      }),
    );
    router.post(
      '/content',
      asyncHandler(async (req, res) => {
        res
          .status(201)
          .json(await adminCmsUseCases.createContent(contentSchema.parse(req.body), actor(req)));
      }),
    );
    router.get(
      '/content/:id',
      asyncHandler(async (req, res) => {
        res.json(await adminCmsUseCases.getContent(req.params.id));
      }),
    );
    router.patch(
      '/content/:id',
      asyncHandler(async (req, res) => {
        res.json(
          await adminCmsUseCases.updateContent(
            req.params.id,
            contentSchema.pick({ slug: true, contentType: true, title: true, summary: true, categoryId: true, categorySlug: true, featuredAssetId: true, seoMetadata: true, editorialMetadata: true, metadata: true }).partial().extend({ expectedVersion: z.number().int().positive() }).strict().parse(req.body),
            actor(req),
          ),
        );
      }),
    );
    router.put(
      '/content/:id/localized',
      asyncHandler(async (req, res) => {
        res.json(
          await adminCmsUseCases.upsertLocalizedContent(
            { contentId: req.params.id, ...localizedSchema.parse(req.body) },
            actor(req),
          ),
        );
      }),
    );

    router.get('/content/:id/domain-links', asyncHandler(async (req, res) => {
      res.json({ data: await adminCmsUseCases.listDomainLinks(req.params.id) });
    }));
    router.put('/content/:id/domain-links', asyncHandler(async (req, res) => {
      const body = z.object({
        links: z.array(z.object({
          targetType: z.nativeEnum(CmsDomainTargetType),
          targetId: z.string().trim().uuid(),
          relationType: z.nativeEnum(CmsDomainRelationType).default(CmsDomainRelationType.RELATED),
          sortOrder: z.number().int().nonnegative().optional(),
          metadata: z.record(z.string(), z.unknown()).nullable().optional(),
        })).max(50),
      }).parse(req.body);
      res.json({ data: await adminCmsUseCases.replaceDomainLinks(req.params.id, body.links, actor(req)) });
    }));

    router.get(
      '/content/:id/readiness/:locale',
      asyncHandler(async (req, res) => {
        res.json(
          await adminCmsUseCases.getReadiness(
            req.params.id,
            z.enum(['ar', 'en']).parse(req.params.locale),
          ),
        );
      }),
    );
    router.get(
      '/content/:id/revisions/:locale',
      asyncHandler(async (req, res) => {
        res.json({
          data: await adminCmsUseCases.listRevisions(
            req.params.id,
            z.enum(['ar', 'en']).parse(req.params.locale),
          ),
        });
      }),
    );
    router.post(
      '/content/:id/revisions/:locale/:revisionId/restore',
      asyncHandler(async (req, res) => {
        const body = z
          .object({ expectedVersion: z.number().int().positive().optional() })
          .parse(req.body);
        res.json(
          await adminCmsUseCases.restoreRevision(
            req.params.id,
            z.enum(['ar', 'en']).parse(req.params.locale),
            req.params.revisionId,
            actor(req),
            body.expectedVersion,
          ),
        );
      }),
    );
    const workflow = (
      method: 'submitForReview' | 'approveReview' | 'rejectReview' | 'publish' | 'archive',
    ) =>
      asyncHandler(async (req, res) => {
        const body = workflowSchema.parse(req.body);
        if (method === 'rejectReview' && !body.comments)
          throw new Error('CMS_REJECTION_REASON_REQUIRED');
        let result;
        if (method === 'rejectReview')
          result = await adminCmsUseCases.rejectReview(
            req.params.id,
            body.locale,
            actor(req),
            body.comments!,
            body.expectedVersion,
          );
        else if (method === 'submitForReview' || method === 'approveReview')
          result = await adminCmsUseCases[method](
            req.params.id,
            body.locale,
            actor(req),
            body.expectedVersion,
            body.comments,
          );
        else
          result = await adminCmsUseCases[method](
            req.params.id,
            body.locale,
            actor(req),
            body.expectedVersion,
          );
        res.json(result);
      });
    router.post('/content/:id/submit-review', workflow('submitForReview'));
    router.post('/content/:id/approve', workflow('approveReview'));
    router.post('/content/:id/reject', workflow('rejectReview'));
    router.post('/content/:id/publish', workflow('publish'));
    router.post('/content/:id/archive', workflow('archive'));
    router.post(
      '/content/:id/schedule',
      asyncHandler(async (req, res) => {
        const body = workflowSchema.extend({ scheduledAt: z.coerce.date() }).parse(req.body);
        res.json(
          await adminCmsUseCases.schedule(
            req.params.id,
            body.locale,
            actor(req),
            body.scheduledAt,
            body.expectedVersion,
          ),
        );
      }),
    );
    router.post('/content/:id/cancel-schedule', asyncHandler(async (req, res) => {
      const body = workflowSchema.parse(req.body);
      res.json(await adminCmsUseCases.cancelSchedule(req.params.id, body.locale, actor(req), body.expectedVersion));
    }));
    router.get(
      '/categories',
      asyncHandler(async (_req, res) => {
        res.json({ data: await adminCmsUseCases.listCategories() });
      }),
    );
    router.post(
      '/categories',
      asyncHandler(async (req, res) => {
        res
          .status(201)
          .json(await adminCmsUseCases.createCategory(categorySchema.parse(req.body), actor(req)));
      }),
    );
    router.get(
      '/tags',
      asyncHandler(async (_req, res) => {
        res.json({ data: await adminCmsUseCases.listTags() });
      }),
    );
    router.post(
      '/tags',
      asyncHandler(async (req, res) => {
        res
          .status(201)
          .json(await adminCmsUseCases.createTag(tagSchema.parse(req.body), actor(req)));
      }),
    );
    router.get('/content/:id/preview', asyncHandler(async (req, res) => {
      res.set({ 'Cache-Control': 'no-store, private', 'X-Robots-Tag': 'noindex, nofollow' });
      res.json(await adminCmsUseCases.getContent(req.params.id));
    }));
    router.post('/content/:id/change-slug', asyncHandler(async (req, res) => {
      const body = z.object({ locale: z.enum(['ar', 'en']), newSlug: slug, reason: z.string().trim().min(3), expectedVersion: z.number().int().positive() }).parse(req.body);
      res.json(await adminCmsUseCases.changeLocalizedSlug(req.params.id, body.locale, body.newSlug, body.reason, body.expectedVersion, actor(req)));
    }));
    router.get('/redirects', asyncHandler(async (req, res) => {
      const query = z.object({
        siteIdentifier: z.literal('manaratak').default('manaratak'),
        locale: z.enum(['ar', 'en']).optional(),
        q: z.string().trim().max(200).optional(),
        active: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
        page: z.coerce.number().int().min(1).max(1000).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(20),
      }).strict().parse(req.query);
      res.json(await adminCmsUseCases.searchRedirects(query));
    }));
    router.post('/redirects', asyncHandler(async (req, res) => {
      const body = z.object({ siteIdentifier: z.literal('manaratak').default('manaratak'), locale: z.enum(['ar', 'en']), sourcePath: z.string().min(2), destinationPath: z.string().min(2), statusCode: z.union([z.literal(301), z.literal(302), z.literal(308)]).default(301), reason: z.string().trim().min(3), active: z.boolean().default(true) }).parse(req.body);
      res.status(201).json(await adminCmsUseCases.createRedirect(body, actor(req)));
    }));
    router.patch('/redirects/:id', asyncHandler(async (req, res) => {
      const data = z.object({
        expectedVersion: z.number().int().positive(),
        destinationPath: z.string().min(2).optional(),
        statusCode: z.union([z.literal(301), z.literal(302), z.literal(308)]).optional(),
        active: z.boolean().optional(),
        reason: z.string().trim().min(3).max(2000),
      }).strict().parse(req.body);
      res.json(await adminCmsUseCases.updateRedirect(req.params.id, data, actor(req)));
    }));
    router.get('/navigation', asyncHandler(async (req, res) => {
      const query = z.object({ siteIdentifier: z.literal('manaratak').default('manaratak'), locale: z.enum(['ar', 'en']).default('ar') }).parse(req.query);
      res.json({ data: await adminCmsUseCases.listNavigation(query.siteIdentifier, query.locale) });
    }));
    router.put('/navigation', asyncHandler(async (req, res) => {
      const body = z.object({ id: z.string().optional(), expectedVersion: z.number().int().positive().optional(), siteIdentifier: z.literal('manaratak').default('manaratak'), locale: z.enum(['ar', 'en']), locationKey: z.enum(['HEADER', 'FOOTER', 'SIDEBAR', 'OTHER']), nodes: z.array(z.object({ id: z.string().optional(), parentNodeId: z.string().nullable().optional(), displayText: z.string().trim().min(1), targetType: z.enum(['CMS_CONTENT', 'EXTERNAL_URL', 'DOMAIN_REFERENCE']), targetValue: z.string().trim().min(1), sortOrder: z.number().int().nonnegative(), openInNewWindow: z.boolean(), metadata: z.record(z.string(), z.unknown()).nullable().optional() })).max(200) }).parse(req.body);
      res.json(await adminCmsUseCases.saveNavigation(body, actor(req)));
    }));
    router.post('/navigation/:id/publish', asyncHandler(async (req, res) => {
      const body = z.object({ expectedVersion: z.number().int().positive() }).parse(req.body);
      res.json(await adminCmsUseCases.publishNavigation(req.params.id, body.expectedVersion, actor(req)));
    }));
    router.get('/block-schemas', asyncHandler(async (_req, res) => { res.json({ data: await adminCmsUseCases.listBlockSchemas() }); }));
    router.post('/block-schemas', asyncHandler(async (req, res) => {
      const body = z.object({ key: z.string().regex(/^[A-Z][A-Z0-9_]+$/), version: z.number().int().positive(), nameAr: z.string().min(1), nameEn: z.string().min(1), fieldSchema: z.record(z.string(), z.unknown()), localizedFields: z.array(z.string()), assetFields: z.array(z.string()), status: z.enum(['ACTIVE','INACTIVE']) }).parse(req.body);
      res.status(201).json(await adminCmsUseCases.createBlockSchema(body, actor(req)));
    }));
    router.get('/blocks', asyncHandler(async (req, res) => {
      const query = z.object({ siteIdentifier: z.literal('manaratak').default('manaratak'), locale: z.enum(['ar', 'en']).default('ar') }).parse(req.query);
      res.json({ data: await adminCmsUseCases.listBlocks(query.siteIdentifier, query.locale) });
    }));
    router.put('/blocks', asyncHandler(async (req, res) => {
      const body = z.object({ id: z.string().optional(), expectedVersion: z.number().int().positive().optional(), siteIdentifier: z.literal('manaratak').default('manaratak'), locale: z.enum(['ar', 'en']), schemaId: z.string(), name: z.string().trim().min(1), payload: z.record(z.string(), z.unknown()), status: z.nativeEnum(CmsContentStatus).default(CmsContentStatus.DRAFT) }).parse(req.body);
      res.json(await adminCmsUseCases.saveBlock(body, actor(req)));
    }));
    router.post('/blocks/:id/publish', asyncHandler(async (req, res) => {
      const body = z.object({expectedVersion:z.number().int().positive()}).strict().parse(req.body);
      res.json(await adminCmsUseCases.publishBlock(req.params.id,body.expectedVersion,actor(req)));
    }));
    router.get('/announcements', asyncHandler(async (req, res) => {
      const query = z.object({ siteIdentifier: z.literal('manaratak').default('manaratak'), locale: z.enum(['ar', 'en']).default('ar') }).parse(req.query);
      res.json({ data: await adminCmsUseCases.listAnnouncements(query.siteIdentifier, query.locale) });
    }));
    router.put('/announcements', asyncHandler(async (req, res) => {
      const body = z.object({ id: z.string().optional(), expectedVersion: z.number().int().positive().optional(), siteIdentifier: z.literal('manaratak').default('manaratak'), locale: z.enum(['ar', 'en']), title: z.string().trim().min(1), body: z.string().trim().min(1), urgency: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']), audience: z.string().nullable().optional(), startsAt: z.coerce.date(), expiresAt: z.coerce.date().nullable().optional() }).parse(req.body);
      res.json(await adminCmsUseCases.saveAnnouncement(body, actor(req)));
    }));
    router.post('/announcements/:id/publish', asyncHandler(async (req, res) => {
      const body = z.object({ expectedVersion: z.number().int().positive() }).parse(req.body);
      res.json(await adminCmsUseCases.publishAnnouncement(req.params.id, body.expectedVersion, actor(req)));
    }));
    router.post('/announcements/:id/archive', asyncHandler(async (req, res) => {
      const body = z.object({ expectedVersion: z.number().int().positive() }).parse(req.body);
      res.json(await adminCmsUseCases.archiveAnnouncement(req.params.id, body.expectedVersion, actor(req)));
    }));
    router.get('/operations/failed-schedules', asyncHandler(async (req, res) => {
      const query = z.object({
        siteIdentifier: z.literal('manaratak').default('manaratak'),
        locale: z.enum(['ar', 'en']).optional(),
        limit: z.coerce.number().int().min(1).max(100).default(50),
      }).strict().parse(req.query);
      res.json({ data: await adminCmsUseCases.listFailedSchedules(query.siteIdentifier, query.locale, query.limit) });
    }));
    router.post('/operations/failed-schedules/:id/retry', asyncHandler(async (req, res) => {
      const data = z.object({
        expectedAttemptCount: z.number().int().min(1),
        reason: z.string().trim().min(3).max(2000),
      }).strict().parse(req.body);
      res.json(await adminCmsUseCases.retryFailedSchedule(req.params.id, data.expectedAttemptCount, actor(req), data.reason));
    }));
    router.post('/operations/process-due-schedules', asyncHandler(async (req, res) => {
      const body = z.object({ limit: z.number().int().min(1).max(100).optional() }).strict().parse(req.body);
      res.json(await adminCmsUseCases.processDueSchedules(actor(req), new Date(), body.limit));
    }));
    router.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
      if (err instanceof z.ZodError)
        return res.status(400).json({ error: 'CMS_VALIDATION_ERROR', details: err.issues });
      const message = err instanceof Error ? err.message : 'CMS_REQUEST_FAILED';
      const status = message.includes('NOT_FOUND')
        ? 404
        : message.includes('AUTHENTICATED') || message.includes('MAKER_CHECKER')
          ? 403
          : message.includes('CONFLICT') ||
              message.includes('IMMUTABLE') ||
              message.includes('LOCKED') || message.includes('REVIEW_REQUIRED')
            ? 409
            : message.includes('NOT_READY') ||
                message.includes('TRANSITION') ||
                message.includes('APPROVAL')
              ? 422
              : 400;
      return res.status(status).json({ error: message });
    });
    return router;
  }
}

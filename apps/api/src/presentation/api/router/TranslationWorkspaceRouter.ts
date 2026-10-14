import { Router, type ErrorRequestHandler } from 'express';
import { z } from 'zod';
import type { AuthorizationEvaluatorService } from '@manaratak/domain';
import {
  assertTranslationContentAuthoringEnabled,
  TranslationContentMutationDisabledError,
} from '@manaratak/shared';
import type {
  ITranslationWorkspaceReadGateway,
  TranslationOwnerPublisher,
} from '@manaratak/application';
const grants = {
  UNIVERSITY: 'admin:universities:manage',
  MAJOR: 'admin:majors:manage',
  INTERNATIONAL_TEST: 'admin:international-tests:manage',
  SCHOLARSHIP: 'admin:scholarships:manage',
  COURSE: 'admin:courses:manage',
} as const;
export function createTranslationWorkspaceRouter(
  reader: ITranslationWorkspaceReadGateway,
  authorization: AuthorizationEvaluatorService,
  writer?: TranslationOwnerPublisher,
): Router {
  const router = Router();
  router.get('/workspace', async (req, res, next) => {
    try {
      if (!req.authUserId) {
        res.status(401).json({ error: { code: 'ADMIN_AUTH_REQUIRED' } });
        return;
      }
      const input = z
        .object({
          domain: z.enum(['UNIVERSITY', 'MAJOR', 'INTERNATIONAL_TEST', 'SCHOLARSHIP', 'COURSE']),
          page: z.coerce.number().int().min(1).max(10000).default(1),
          pageSize: z.coerce.number().int().min(1).max(100).default(40),
          q: z.string().trim().max(120).optional(),
          coverage: z.enum(['ALL', 'MISSING_AR', 'MISSING_EN', 'COMPLETE']).default('ALL'),
          locale: z.enum(['ar', 'en']).default('en'),
          reviewState: z.enum(['ALL', 'NEEDS_REVIEW', 'PUBLISHED']).default('ALL'),
          updatedFrom: z.coerce.date().optional(),
        })
        .strict()
        .parse(req.query);
      if (
        !(
          await authorization.evaluatePermission(req.authUserId, grants[input.domain], {
            ip: req.ip,
            requestTime: new Date(),
          })
        ).isGranted
      ) {
        res.status(403).json({ error: { code: 'TRANSLATION_OWNER_PERMISSION_DENIED' } });
        return;
      }
      res.json(await reader.search(input));
    } catch (error) {
      next(error);
    }
  });
  router.get('/owners/:domain/:publicId/:locale/publication-target', async (req, res, next) => {
    try {
      if (!req.authUserId) {
        res.status(401).json({ error: { code: 'ADMIN_AUTH_REQUIRED' } });
        return;
      }
      const params = z
        .object({
          domain: z.enum(['UNIVERSITY', 'MAJOR']),
          publicId: z.string().min(1).max(100),
          locale: z.enum(['ar', 'en']),
        })
        .parse(req.params);
      const query = z
        .object({ fieldKey: z.enum(['displayName', 'description']).default('displayName') })
        .strict()
        .parse(req.query);
      if (params.domain === 'MAJOR' && query.fieldKey === 'description')
        throw new Error('UNSUPPORTED_TARGET_OWNER');
      const grant =
        params.domain === 'UNIVERSITY' ? 'admin:universities:manage' : 'admin:majors:manage';
      if (
        !(
          await authorization.evaluatePermission(req.authUserId, grant, {
            ip: req.ip,
            requestTime: new Date(),
          })
        ).isGranted
      ) {
        res.status(403).json({ error: { code: 'TRANSLATION_OWNER_PERMISSION_DENIED' } });
        return;
      }
      if (!writer) throw new Error('TRANSLATION_OWNER_PUBLISHER_UNAVAILABLE');
      const target = await writer.resolveExact({
        entityKind: params.domain,
        entityPublicId: params.publicId,
        locale: params.locale,
        fieldKey: query.fieldKey,
        fieldKind: query.fieldKey === 'displayName' ? 'DISPLAY_NAME' : 'DESCRIPTION',
      });
      if (!target) {
        res.status(404).json({ error: { code: 'TRANSLATION_CANONICAL_TARGET_NOT_FOUND' } });
        return;
      }
      res.json(target);
    } catch (error) {
      next(error);
    }
  });
  router.post('/owners/:domain/:publicId/:locale/publish', async (req, res, next) => {
    try {
      if (!req.authUserId) {
        res.status(401).json({ error: { code: 'ADMIN_AUTH_REQUIRED' } });
        return;
      }
      const params = z
        .object({
          domain: z.enum(['UNIVERSITY', 'MAJOR']),
          publicId: z.string().min(1).max(100),
          locale: z.enum(['ar', 'en']),
        })
        .parse(req.params);
      const permission =
        params.domain === 'UNIVERSITY' ? 'admin:universities:manage' : 'admin:majors:manage';
      if (
        !(
          await authorization.evaluatePermission(req.authUserId, permission, {
            ip: req.ip,
            requestTime: new Date(),
          })
        ).isGranted
      ) {
        res.status(403).json({ error: { code: 'TRANSLATION_OWNER_PERMISSION_DENIED' } });
        return;
      }
      // Feature mode is enforced before an owner lookup; this route cannot activate authoring.
      assertTranslationContentAuthoringEnabled(params.domain);
      if (!writer) throw new Error('TRANSLATION_OWNER_PUBLISHER_UNAVAILABLE');
      const body = z
        .object({
          fieldKey: z.enum(['displayName', 'description']),
          expectedRevision: z.string().min(1).max(100),
          expectedSourceDigest: z.string().length(64),
          approvalId: z.string().min(1).max(120),
          reviewedBy: z.string().min(1).max(240),
        })
        .strict()
        .parse(req.body);
      if (params.domain === 'MAJOR' && body.fieldKey === 'description')
        throw new Error('UNSUPPORTED_TARGET_OWNER');
      const target = await writer.resolveExact({
        entityKind: params.domain,
        entityPublicId: params.publicId,
        locale: params.locale,
        fieldKind: body.fieldKey === 'displayName' ? 'DISPLAY_NAME' : 'DESCRIPTION',
        fieldKey: body.fieldKey,
      });
      if (
        !target ||
        target.ownerRevision !== body.expectedRevision ||
        target.sourceDigest !== body.expectedSourceDigest
      )
        throw new Error('TRANSLATION_STALE_DIFF_REVIEW_REQUIRED');
      res.json(
        await writer.publishApproved(target, {
          decision: 'APPLY',
          actorId: req.authUserId,
          reviewedBy: body.reviewedBy,
          approvalId: body.approvalId,
        }),
      );
    } catch (error) {
      next(error);
    }
  });
  const errors: ErrorRequestHandler = (error, _req, res, next) => {
    if (error instanceof z.ZodError) {
      res
        .status(400)
        .json({ error: { code: 'TRANSLATION_VALIDATION_ERROR', details: error.issues } });
      return;
    }
    if (error instanceof TranslationContentMutationDisabledError) {
      res.status(403).json({ error: { code: 'TRANSLATION_CONTENT_AUTHORING_DISABLED' } });
      return;
    }
    const code = error instanceof Error ? error.message.split(':')[0] : '';
    const statuses: Record<string, number> = {
      UNSUPPORTED_TARGET_OWNER: 422,
      TRANSLATION_OWNER_PUBLISHER_UNAVAILABLE: 503,
      TRANSLATION_CANONICAL_TARGET_NOT_FOUND: 404,
      TRANSLATION_STALE_DIFF_REVIEW_REQUIRED: 409,
      TRANSLATION_OWNER_PERMISSION_DENIED: 403,
      TRANSLATION_TRUSTED_INDEPENDENT_APPROVAL_REQUIRED: 403,
      GOVERNANCE_APPROVAL_REQUIRED: 403,
      GOVERNANCE_APPROVAL_DENIED: 403,
    };
    if (statuses[code]) {
      res.status(statuses[code]).json({ error: { code } });
      return;
    }
    next(error);
  };
  router.use(errors);
  return router;
}

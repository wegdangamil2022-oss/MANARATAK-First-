import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { ManageSettingsUseCase } from '@manaratak/application';
import { ResponseFormatter } from '../response/ResponseFormatter.js';
import { z } from 'zod';
import { ValueType, ScopeLevel, IAuditRecordRepository } from '@manaratak/domain';
import { requireAuthenticatedPrincipal } from '../../security/AuthenticatedPrincipal.js';
import { AuditHelper } from '../../audit/AuditHelper.js';

export class SettingsAdminRouter {
  public static create({
    manageSettingsUseCase,
    auditRecordRepo,
  }: {
    manageSettingsUseCase: ManageSettingsUseCase;
    auditRecordRepo?: IAuditRecordRepository;
  }): Router {
    const router = Router();
    const responseFormatter = new ResponseFormatter('v1');

    const asyncHandler =
      (fn: RequestHandler) => (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
      };

    const actor = (req: Request): string => requireAuthenticatedPrincipal(req).principalId;
    const context = (req: Request) => ({
      actorId: actor(req),
      actorType: requireAuthenticatedPrincipal(req).actorType,
      correlationId:
        typeof req.headers['x-correlation-id'] === 'string'
          ? req.headers['x-correlation-id']
          : undefined,
      source: 'admin-settings-api',
    });
    const identifier = z.string().trim().min(1).max(240);

    const validationRulesSchema = z.object({
      min: z.number().finite().optional(), max: z.number().finite().optional(),
      integer: z.boolean().optional(),
      minLength: z.number().int().min(0).max(100000).optional(),
      maxLength: z.number().int().min(0).max(100000).optional(),
      allowedValues: z.array(z.union([z.string(), z.number().finite(), z.boolean()])).min(1).max(50).optional(),
    }).strict();

    const createDefinitionSchema = z
      .object({
        id: identifier,
        key: identifier.regex(/^[a-zA-Z0-9_\-.]+$/),
        valueType: z.nativeEnum(ValueType),
        description: z.string().max(2000).optional(),
        defaultValue: z.unknown().optional(),
        validationRules: validationRulesSchema.optional(),
        isFeatureFlag: z.boolean().optional(),
        isSecret: z.boolean().optional(),
      })
      .strict().superRefine((value, ctx) => {
        if (value.isFeatureFlag && (value.valueType !== ValueType.Boolean || value.isSecret || typeof value.defaultValue !== 'boolean')) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['defaultValue'], message: 'Feature flags require an explicit non-secret Boolean default.' });
        }
      });

    const changeReason = z.string().trim().min(3).max(1000).regex(/^[^\u0000-\u001f\u007f]*$/);
    const assignValueSchema = z
      .object({
        assignmentId: identifier,
        key: identifier.regex(/^[a-zA-Z0-9_\-.]+$/),
        level: z.nativeEnum(ScopeLevel),
        scopeId: identifier.optional(),
        versionId: identifier,
        value: z.unknown(),
        type: z.nativeEnum(ValueType),
        expectedCurrentVersionId: identifier.nullable().optional(),
        changeReason: changeReason.optional(),
      })
      .strict()
      .superRefine((value, ctx) => {
        if (value.level !== ScopeLevel.GLOBAL && !value.scopeId) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['scopeId'],
            message: `scopeId is required for ${value.level} scope`,
          });
        }
        if (value.level === ScopeLevel.GLOBAL && value.scopeId) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['scopeId'],
            message: 'scopeId must be omitted for GLOBAL scope',
          });
        }
      });

    const rollbackValueSchema = z
      .object({
        assignmentId: identifier,
        previousVersionId: identifier,
        changeReason,
        newVersionId: identifier,
        expectedCurrentVersionId: identifier.optional(),
      })
      .strict();

    const pageFields = { q: z.string().trim().min(1).max(200).optional(),
      limit: z.coerce.number().int().min(1).max(100).default(50), cursor: identifier.optional() };
    const listAssignmentsSchema = z.object({ ...pageFields,
      key: identifier.regex(/^[a-zA-Z0-9_\-.]+$/).optional(), level: z.nativeEnum(ScopeLevel).optional(), scopeId: identifier.optional() }).strict();
    const listDefinitionsSchema = z.object({ ...pageFields,
      cursor: identifier.regex(/^[a-zA-Z0-9_\-.]+$/).optional(),
      classification: z.enum(['ALL', 'SETTING', 'FLAG', 'SECRET', 'DEPRECATED']).default('ALL') }).strict();

    router.get('/definitions', asyncHandler(async (req, res) => {
      const query = listDefinitionsSchema.parse(req.query);
      res.setHeader('Cache-Control', 'no-store');
      res.json(responseFormatter.success(await manageSettingsUseCase.definitionPage(query)));
    }));
    router.get('/assignments', asyncHandler(async (req, res) => {
      const query = listAssignmentsSchema.parse(req.query);
      res.setHeader('Cache-Control', 'no-store');
      res.json(responseFormatter.success(await manageSettingsUseCase.assignmentPage(query)));
    }));
    router.get('/assignments/context', asyncHandler(async (req, res) => {
      const query = z.object({ key: identifier.regex(/^[a-zA-Z0-9_\-.]+$/),
        level: z.nativeEnum(ScopeLevel), scopeId: identifier.optional() }).strict().superRefine((value, ctx) => {
          if (value.level === ScopeLevel.GLOBAL && value.scopeId !== undefined)
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['scopeId'], message: 'GLOBAL must omit scopeId' });
          if (value.level !== ScopeLevel.GLOBAL && !value.scopeId)
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['scopeId'], message: 'scopeId required for this scope' });
        }).parse(req.query);
      res.setHeader('Cache-Control', 'no-store');
      res.json(responseFormatter.success(await manageSettingsUseCase.assignmentContext(query.key, query.level, query.scopeId)));
    }));

    router.get('/assignments/:id/history', asyncHandler(async (req, res) => {
      const id = identifier.parse(req.params.id);
      const query = z.object({ expectedCurrentVersionId: identifier,
        limit: z.coerce.number().int().min(1).max(100).default(50), cursor: identifier.optional() }).strict().parse(req.query);
      res.setHeader('Cache-Control', 'no-store');
      res.json(responseFormatter.success(await manageSettingsUseCase.assignmentHistory(
        id, query.expectedCurrentVersionId, query.limit, query.cursor)));
    }));

    const updateDefinitionSchema = z.object({ key: identifier.regex(/^[a-zA-Z0-9_\-.]+$/),
      expectedRevision: z.string().datetime(), description: z.string().max(2000).optional(),
      isDeprecated: z.literal(true).optional(), changeReason }).strict().refine(
        value => value.description !== undefined || value.isDeprecated === true, 'No metadata change supplied');
    const clearOverrideSchema = z.object({ assignmentId: identifier, newVersionId: identifier,
      expectedCurrentVersionId: identifier, changeReason }).strict();

    router.get('/definitions/:key/impact', asyncHandler(async (req, res) => {
      const key = identifier.regex(/^[a-zA-Z0-9_\-.]+$/).parse(req.params.key);
      res.setHeader('Cache-Control', 'no-store');
      res.json(responseFormatter.success(await manageSettingsUseCase.definitionImpact(key)));
    }));
    router.post('/definitions/update', asyncHandler(async (req, res) => {
      try {
        const input = updateDefinitionSchema.parse(req.body);
        await manageSettingsUseCase.updateDefinition(input, context(req));
        res.json(responseFormatter.success({ message: 'Setting definition updated' }));
      } catch (error) {
        await AuditHelper.recordMutation(auditRecordRepo, req, { action: 'UPDATE_SETTING_DEFINITION', category: 'SETTINGS',
          targetType: 'SETTING_DEFINITION', targetId: req.body?.key, result: 'FAILURE', error });
        throw error;
      }
    }));
    router.post('/assignments/clear', asyncHandler(async (req, res) => {
      try {
        const input = clearOverrideSchema.parse(req.body);
        const assignmentId = await manageSettingsUseCase.clearOverride({ ...input, authorId: actor(req) }, context(req));
        res.json(responseFormatter.success({ assignmentId, versionId: input.newVersionId, message: 'Override cleared; inheritance restored' }));
      } catch (error) {
        await AuditHelper.recordMutation(auditRecordRepo, req, { action: 'CLEAR_SETTING_OVERRIDE', category: 'SETTINGS',
          targetType: 'SETTING_ASSIGNMENT', targetId: req.body?.assignmentId, result: 'FAILURE', error });
        throw error;
      }
    }));

    router.post(
      '/definitions',
      asyncHandler(async (req: Request, res: Response) => {
        try {
          const input = createDefinitionSchema.parse(req.body);
          await manageSettingsUseCase.createDefinition(input, context(req));
          res
            .status(201)
            .json(responseFormatter.success({ message: 'Setting definition created' }));
        } catch (error: any) {
          await AuditHelper.recordMutation(auditRecordRepo, req, {
            action: 'CREATE_SETTING_DEFINITION',
            category: 'SETTINGS',
            targetType: 'SETTING_DEFINITION',
            targetId: req.body?.key,
            result: 'FAILURE',
            error,
          });
          throw error;
        }
      }),
    );

    router.post(
      '/assignments',
      asyncHandler(async (req: Request, res: Response) => {
        try {
          const input = assignValueSchema.parse(req.body);
          const assignmentId = await manageSettingsUseCase.assignValue(
            { ...input, authorId: actor(req) },
            context(req),
          );
          res
            .status(201)
            .json(
              responseFormatter.success({
                assignmentId,
                versionId: input.versionId,
                message: 'Setting value assigned',
              }),
            );
        } catch (error: any) {
          await AuditHelper.recordMutation(auditRecordRepo, req, {
            action: 'ASSIGN_SETTING_VALUE',
            category: 'SETTINGS',
            targetType: 'SETTING_ASSIGNMENT',
            targetId: req.body?.assignmentId,
            result: 'FAILURE',
            error,
          });
          throw error;
        }
      }),
    );

    router.post(
      '/assignments/rollback',
      asyncHandler(async (req: Request, res: Response) => {
        try {
          const input = rollbackValueSchema.parse(req.body);
          const assignmentId = await manageSettingsUseCase.rollbackValue(
            { ...input, authorId: actor(req) },
            context(req),
          );
          res
            .status(200)
            .json(
              responseFormatter.success({
                assignmentId,
                versionId: input.newVersionId,
                message: 'Setting value rolled back',
              }),
            );
        } catch (error: any) {
          await AuditHelper.recordMutation(auditRecordRepo, req, {
            action: 'ROLLBACK_SETTING_VALUE',
            category: 'SETTINGS',
            targetType: 'SETTING_ASSIGNMENT',
            targetId: req.body?.assignmentId,
            result: 'FAILURE',
            error,
          });
          throw error;
        }
      }),
    );

    router.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      if (err instanceof z.ZodError) {
        return res
          .status(400)
          .json(
            responseFormatter.error({
              code: 'VALIDATION_ERROR',
              message: 'Validation Error',
              details: { issues: err.issues },
            }),
          );
      }
      const message = err?.message || 'Settings operation failed';
      const conflict =
        /already exists|cannot be mutated|SETTINGS_VERSION_CONFLICT|SETTINGS_ASSIGNMENT_CONFLICT|SETTINGS_DEFINITION_CONFLICT|SETTINGS_OVERRIDE_ALREADY_CLEARED|SETTINGS_DEFINITION_NOT_WRITABLE|already belongs/i.test(message);
      const known = /^SETTINGS_[A-Z_]+/.exec(message)?.[0];
      const missing = /_NOT_FOUND$/.test(known ?? '') || /not found/i.test(message);
      const unavailable = /SETTINGS_(ATOMIC|IMPACT|DURABLE)/.test(known ?? '');
      const rejected = known || /already exists|cannot be mutated|already belongs|Secret |Feature flags|deprecated|not found|Type mismatch|Value must/.test(message);
      res
        .status(conflict ? 409 : missing ? 404 : unavailable ? 503 : !rejected ? 503 : 400)
        .json(
          responseFormatter.error({
            code: conflict ? 'SETTINGS_CONFLICT' : missing ? 'SETTINGS_NOT_FOUND' : unavailable || !rejected ? 'SETTINGS_UNAVAILABLE' : 'SETTINGS_OPERATION_REJECTED',
            message: conflict ? 'Settings changed; reload before retrying.' : !rejected || unavailable ? 'Settings operation unavailable.' : known ?? 'Settings operation rejected.',
          }),
        );
    });

    return router;
  }
}

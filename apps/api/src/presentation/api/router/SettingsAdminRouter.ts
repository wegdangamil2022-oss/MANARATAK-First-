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

    const createDefinitionSchema = z
      .object({
        id: identifier,
        key: identifier.regex(/^[a-zA-Z0-9_\-.]+$/),
        valueType: z.nativeEnum(ValueType),
        description: z.string().max(2000).optional(),
        defaultValue: z.unknown().optional(),
        isFeatureFlag: z.boolean().optional(),
        isSecret: z.boolean().optional(),
      })
      .strict();

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
        newVersionId: identifier,
        expectedCurrentVersionId: identifier.optional(),
      })
      .strict();

    const listAssignmentsSchema = z
      .object({
        key: identifier.regex(/^[a-zA-Z0-9_\-.]+$/).optional(),
        level: z.nativeEnum(ScopeLevel).optional(),
        scopeId: identifier.optional(),
      })
      .strict();

    router.get(
      '/definitions',
      asyncHandler(async (_req: Request, res: Response) => {
        const definitions = await manageSettingsUseCase.listDefinitions();
        res.status(200).json(responseFormatter.success({ definitions }));
      }),
    );

    router.get(
      '/assignments',
      asyncHandler(async (req: Request, res: Response) => {
        const filters = listAssignmentsSchema.parse(req.query);
        const assignments = await manageSettingsUseCase.listAssignments(filters);
        res.status(200).json(responseFormatter.success({ assignments }));
      }),
    );

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
        /already exists|cannot be mutated|SETTINGS_VERSION_CONFLICT|already belongs/i.test(message);
      res
        .status(conflict ? 409 : 400)
        .json(
          responseFormatter.error({
            code: conflict ? 'SETTINGS_CONFLICT' : 'SETTINGS_OPERATION_REJECTED',
            message,
          }),
        );
    });

    return router;
  }
}

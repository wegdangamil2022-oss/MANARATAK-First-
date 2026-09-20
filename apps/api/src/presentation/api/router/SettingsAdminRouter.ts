import { Router, Request, Response, NextFunction } from 'express';
import { ManageSettingsUseCase } from '@manaratak/application';
import { ResponseFormatter } from '../response/ResponseFormatter.js';
import { z } from 'zod';
import { ValueType, ScopeLevel, IAuditRecordRepository } from '@manaratak/domain';
import { AuditHelper } from '../../audit/AuditHelper.js';

export class SettingsAdminRouter {
  public static create({ manageSettingsUseCase, auditRecordRepo }: { manageSettingsUseCase: ManageSettingsUseCase, auditRecordRepo?: IAuditRecordRepository }): Router {
    const router = Router();
    const responseFormatter = new ResponseFormatter('v1');

    const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };

    const actor = (req: Request): string => {
      if (!req.authUserId) throw new Error('AUTHENTICATED_ADMIN_ACTOR_REQUIRED');
      return req.authUserId;
    };

    const createDefinitionSchema = z.object({
      id: z.string().min(1),
      key: z.string().min(1),
      valueType: z.nativeEnum(ValueType),
      description: z.string().max(2000).optional(),
      defaultValue: z.unknown().optional(),
      isFeatureFlag: z.boolean().optional(),
      isSecret: z.boolean().optional(),
    });

    const assignValueSchema = z.object({
      assignmentId: z.string().min(1),
      key: z.string().min(1),
      level: z.nativeEnum(ScopeLevel),
      scopeId: z.string().min(1).optional(),
      versionId: z.string().min(1),
      value: z.unknown(),
      type: z.nativeEnum(ValueType),
    }).superRefine((value, ctx) => {
      if (value.level !== ScopeLevel.GLOBAL && !value.scopeId) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['scopeId'], message: `scopeId is required for ${value.level} scope` });
      }
      if (value.level === ScopeLevel.GLOBAL && value.scopeId) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['scopeId'], message: 'scopeId must be omitted for GLOBAL scope' });
      }
    });

    const rollbackValueSchema = z.object({
      assignmentId: z.string().min(1),
      previousVersionId: z.string().min(1),
      newVersionId: z.string().min(1),
    });

    const listAssignmentsSchema = z.object({
      key: z.string().min(1).optional(),
      level: z.nativeEnum(ScopeLevel).optional(),
      scopeId: z.string().min(1).optional(),
    });

    router.get('/definitions', asyncHandler(async (_req: Request, res: Response) => {
      const definitions = await manageSettingsUseCase.listDefinitions();
      res.status(200).json(responseFormatter.success({ definitions }));
    }));

    router.get('/assignments', asyncHandler(async (req: Request, res: Response) => {
      const filters = listAssignmentsSchema.parse(req.query);
      const assignments = await manageSettingsUseCase.listAssignments(filters);
      res.status(200).json(responseFormatter.success({ assignments }));
    }));

    router.post('/definitions', asyncHandler(async (req: Request, res: Response) => {
      try {
        const input = createDefinitionSchema.parse(req.body);
        actor(req);
        await manageSettingsUseCase.createDefinition(input);
        await AuditHelper.recordMutation(auditRecordRepo, req, {
          action: 'CREATE_SETTING_DEFINITION',
          category: 'SETTINGS',
          targetType: 'SETTING_DEFINITION',
          targetId: input.key,
          result: 'SUCCESS',
          metadata: { key: input.key, valueType: input.valueType, isSecret: input.isSecret, isFeatureFlag: input.isFeatureFlag }
        });
        res.status(201).json(responseFormatter.success({ message: 'Setting definition created' }));
      } catch (error: any) {
        await AuditHelper.recordMutation(auditRecordRepo, req, {
          action: 'CREATE_SETTING_DEFINITION', category: 'SETTINGS', targetType: 'SETTING_DEFINITION', targetId: req.body?.key, result: 'FAILURE', error
        });
        throw error;
      }
    }));

    router.post('/assignments', asyncHandler(async (req: Request, res: Response) => {
      try {
        const input = assignValueSchema.parse(req.body);
        await manageSettingsUseCase.assignValue({ ...input, authorId: actor(req) });
        await AuditHelper.recordMutation(auditRecordRepo, req, {
          action: 'ASSIGN_SETTING_VALUE',
          category: 'SETTINGS',
          targetType: 'SETTING_ASSIGNMENT',
          targetId: input.assignmentId,
          result: 'SUCCESS',
          metadata: { assignmentId: input.assignmentId, key: input.key, level: input.level, scopeId: input.scopeId, versionId: input.versionId }
        });
        res.status(201).json(responseFormatter.success({ message: 'Setting value assigned' }));
      } catch (error: any) {
        await AuditHelper.recordMutation(auditRecordRepo, req, {
          action: 'ASSIGN_SETTING_VALUE', category: 'SETTINGS', targetType: 'SETTING_ASSIGNMENT', targetId: req.body?.assignmentId, result: 'FAILURE', error
        });
        throw error;
      }
    }));

    router.post('/assignments/rollback', asyncHandler(async (req: Request, res: Response) => {
      try {
        const input = rollbackValueSchema.parse(req.body);
        await manageSettingsUseCase.rollbackValue({ ...input, authorId: actor(req) });
        await AuditHelper.recordMutation(auditRecordRepo, req, {
          action: 'ROLLBACK_SETTING_VALUE',
          category: 'SETTINGS',
          targetType: 'SETTING_ASSIGNMENT',
          targetId: input.assignmentId,
          result: 'SUCCESS',
          metadata: { assignmentId: input.assignmentId, previousVersionId: input.previousVersionId, newVersionId: input.newVersionId }
        });
        res.status(200).json(responseFormatter.success({ message: 'Setting value rolled back' }));
      } catch (error: any) {
        await AuditHelper.recordMutation(auditRecordRepo, req, {
          action: 'ROLLBACK_SETTING_VALUE', category: 'SETTINGS', targetType: 'SETTING_ASSIGNMENT', targetId: req.body?.assignmentId, result: 'FAILURE', error
        });
        throw error;
      }
    }));

    router.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      if (err instanceof z.ZodError) {
        return res.status(400).json(responseFormatter.error({ code: 'VALIDATION_ERROR', message: 'Validation Error', details: { issues: err.issues } }));
      }
      const message = err?.message || 'Settings operation failed';
      const conflict = /already exists|cannot be mutated/i.test(message);
      res.status(conflict ? 409 : 400).json(responseFormatter.error({ code: conflict ? 'SETTINGS_CONFLICT' : 'SETTINGS_OPERATION_REJECTED', message }));
    });

    return router;
  }
}

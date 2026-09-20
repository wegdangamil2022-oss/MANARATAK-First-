import { Router, Request, Response, NextFunction } from 'express';
import { ValidationException } from '@manaratak/core';
import { StudentToolExecutionUseCases, StudentToolRegistryUseCases } from '@manaratak/application';
import { StudentToolLifecycleStatus } from '@manaratak/domain';
import {
  parseStrict,
  studentToolAdminListQuerySchema,
  studentToolAdminTestSchema,
  studentToolAvailabilitySchema,
  studentToolFlagsSchema,
  studentToolLifecycleParamSchema,
  studentToolMetadataPatchSchema,
  toolKeyParamSchema,
} from '../../validation/StrictControlPlaneSchemas.js';
export class StudentToolsAdminRouter {
  static create(cradle: {
    studentToolRegistryUseCases: StudentToolRegistryUseCases;
    studentToolExecutionUseCases: StudentToolExecutionUseCases;
  }) {
    const router = Router();
    const actor = (req: Request) => {
      if (!req.authUserId) throw new Error('AUTHENTICATED_ADMIN_ACTOR_REQUIRED');
      return req.authUserId;
    };
    const safe =
      (fn: (req: Request, res: Response) => Promise<unknown>) =>
      (req: Request, res: Response, next: NextFunction) =>
        Promise.resolve(fn(req, res)).catch(next);
    router.get(
      '/overview',
      safe(async (_req, res) => {
        const [tools, telemetry] = await Promise.all([
          cradle.studentToolRegistryUseCases.listAdminTools(),
          cradle.studentToolRegistryUseCases.telemetry(),
        ]);
        res.json({
          data: {
            total: tools.length,
            implemented: tools.filter((item) => item.implementationStatus === 'IMPLEMENTED').length,
            active: tools.filter(
              (item) => item.lifecycle === 'ACTIVE' && item.visibility === 'ACTIVE',
            ).length,
            planned: tools.filter((item) => item.implementationStatus === 'PLANNED').length,
            telemetry,
          },
        });
      }),
    );
    router.get(
      '/',
      safe(async (req, res) => {
        res.json({
          data: await cradle.studentToolRegistryUseCases.listAdminTools(
            parseStrict(studentToolAdminListQuerySchema, req.query),
          ),
        });
      }),
    );
    router.get(
      '/:toolKey',
      safe(async (req, res) => {
        const { toolKey } = parseStrict(toolKeyParamSchema, req.params);
        const tool = await cradle.studentToolRegistryUseCases.findTool(toolKey);
        if (!tool) return void res.status(404).json({ error: 'TOOL_NOT_FOUND' });
        const [telemetry, executions, audit, operations] = await Promise.all([
          cradle.studentToolRegistryUseCases.telemetry(toolKey),
          cradle.studentToolRegistryUseCases.executions(toolKey, 1, 25),
          cradle.studentToolRegistryUseCases.audit(toolKey),
          cradle.studentToolRegistryUseCases.operationalStatus(tool),
        ]);
        res.json({ data: { tool, telemetry, executions, audit, ...operations } });
      }),
    );
    router.patch(
      '/:toolKey/metadata',
      safe(async (req, res) => {
        const { toolKey } = parseStrict(toolKeyParamSchema, req.params);
        const patch = parseStrict(studentToolMetadataPatchSchema, req.body);
        res.json({
          data: await cradle.studentToolRegistryUseCases.update(
            toolKey,
            patch,
            actor(req),
          ),
        });
      }),
    );
    router.patch(
      '/:toolKey/availability',
      safe(async (req, res) => {
        const { toolKey } = parseStrict(toolKeyParamSchema, req.params);
        const body = parseStrict(studentToolAvailabilitySchema, req.body);
        const { semanticVersion, changeNote, ...availability } = body;
        res.json({
          data: await cradle.studentToolRegistryUseCases.updateVersionedConfiguration(
            toolKey,
            { availability },
            { semanticVersion, changeNote },
            actor(req),
          ),
        });
      }),
    );
    router.patch(
      '/:toolKey/flags',
      safe(async (req, res) => {
        const { toolKey } = parseStrict(toolKeyParamSchema, req.params);
        const featureFlags = parseStrict(studentToolFlagsSchema, req.body);
        res.json({
          data: await cradle.studentToolRegistryUseCases.update(
            toolKey,
            { featureFlags },
            actor(req),
          ),
        });
      }),
    );
    router.post(
      '/:toolKey/lifecycle/:action',
      safe(async (req, res) => {
        const { toolKey, action } = parseStrict(studentToolLifecycleParamSchema, req.params);
        const actions: Record<typeof action, StudentToolLifecycleStatus> = {
          activate: StudentToolLifecycleStatus.ACTIVE,
          testing: StudentToolLifecycleStatus.TESTING,
          deprecate: StudentToolLifecycleStatus.DEPRECATED,
          retire: StudentToolLifecycleStatus.RETIRED,
        };
        const lifecycle = actions[action];
        res.json({
          data: await cradle.studentToolRegistryUseCases.transition(
            toolKey,
            lifecycle,
            actor(req),
          ),
        });
      }),
    );
    router.post(
      '/:toolKey/test',
      safe(async (req, res) => {
        actor(req);
        const { toolKey } = parseStrict(toolKeyParamSchema, req.params);
        const body = parseStrict(studentToolAdminTestSchema, req.body);
        const result = await cradle.studentToolExecutionUseCases.execute(toolKey, {
          input: body.input,
          locale: body.locale ?? 'ar',
          consumerType: 'ADMIN_TEST',
          authenticatedStudentReference: req.authUserId,
          isTest: true,
        });
        res.json({ data: result });
      }),
    );
    router.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
      if (error instanceof ValidationException)
        return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.errors });
      const code = error instanceof Error ? error.message : 'STUDENT_TOOL_ADMIN_ERROR';
      const status = code.includes('NOT_FOUND') ? 404 : code.includes('QUOTA_STORE_UNAVAILABLE') ? 503 : code.includes('RATE_LIMITED') ? 429 : 400;
      res.status(status).json({ error: code });
    });
    return router;
  }
}

import { testDiscoveryOwnerRouter } from './TestDiscoveryOwnerRouter.js';
import type {TestDiscoveryOwnerUseCases} from '@absheer/application';
import { Router, Request, Response, NextFunction } from 'express';
import { ValidationException } from '@absheer/core';
import { StudentToolExecutionUseCases, StudentToolRegistryUseCases } from '@absheer/application';
import { z } from 'zod';
import { AuthorizationEvaluatorService } from '@absheer/domain';
import { StudentToolExecutionStatus, StudentToolLifecycleStatus } from '@absheer/domain';
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
    studentToolTestDiscovery?:TestDiscoveryOwnerUseCases;
    authEvaluatorService: AuthorizationEvaluatorService;
    studentToolRegistryUseCases: StudentToolRegistryUseCases;
    studentToolExecutionUseCases: StudentToolExecutionUseCases;
  }) {
    const router = Router();
    if(cradle.studentToolTestDiscovery)router.use('/:ownerKey/test-discovery',testDiscoveryOwnerRouter(cradle.studentToolTestDiscovery,cradle.authEvaluatorService,{view:'admin:student-tools:view',propose:'admin:student-tools:manage-availability',review:'admin:student-tools:approve-release'}));
    router.use(async (req, res, next) => {
      if (!req.authUserId) return void res.status(401).json({ error: 'TOOL_AUTH_REQUIRED' });
      const suffix =
        req.method === 'GET'
          ? /\/(executions|audit)$/.test(req.path)
            ? 'view-executions'
            : 'view'
          : req.path.endsWith('/metadata')
            ? 'edit-metadata'
            : req.path.endsWith('/test')
              ? 'run-test'
              : /\/release\/(APPROVE|REJECT|ACTIVATE)$/.test(req.path)
                ? 'approve-release'
                : 'manage-availability';
      const permission = `admin:student-tools:${suffix}`;
      try {
        const result = await cradle.authEvaluatorService.evaluatePermission(
          req.authUserId,
          permission,
          { ip: req.ip, requestTime: new Date() },
        );
        if (!result.isGranted)
          return void res
            .status(403)
            .json({ error: 'TOOL_PERMISSION_DENIED', requiredPermission: permission });
        res.setHeader('X-Admin-Required-Permission', permission);
        next();
      } catch {
        res.status(403).json({ error: 'TOOL_PERMISSION_DENIED', requiredPermission: permission });
      }
    });
    const revision = z
      .object({
        expectedRevision: z.number().int().min(0),
        reason: z.string().trim().min(3).max(2000),
      })
      .strict();
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
        res.json(
          await cradle.studentToolRegistryUseCases.listAdminPage(
            parseStrict(studentToolAdminListQuerySchema, req.query),
          ),
        );
      }),
    );
    const pageQuery = {
      page: z.coerce.number().int().min(1).max(10000).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(25),
    };
    const trace = z.string().trim().min(1).max(200).optional();
    router.get(
      '/:toolKey/executions',
      safe(async (req, res) => {
        const { toolKey } = parseStrict(toolKeyParamSchema, req.params);
        const query = z
          .object({
            ...pageQuery,
            status: z
              .nativeEnum(StudentToolExecutionStatus)
              .optional(),
            isTest: z
              .enum(['true', 'false'])
              .transform((value) => value === 'true')
              .optional(),
            traceId: trace,
            correlationId: trace,
          })
          .strict()
          .parse(req.query);
        const { page, pageSize, ...filters } = query;
        res.json({
          ...(await cradle.studentToolRegistryUseCases.executions(
            toolKey,
            page,
            pageSize,
            filters,
          )),
          page,
          pageSize,
        });
      }),
    );
    router.get(
      '/:toolKey/audit',
      safe(async (req, res) => {
        const { toolKey } = parseStrict(toolKeyParamSchema, req.params);
        const { page, pageSize, ...filters } = z
          .object({ ...pageQuery, action: trace, correlationId: trace })
          .strict()
          .parse(req.query);
        res.json(
          await cradle.studentToolRegistryUseCases.auditPage(toolKey, page, pageSize, filters),
        );
      }),
    );
    router.post(
      '/:toolKey/eligibility',
      safe(async (req, res) => {
        const { toolKey } = parseStrict(toolKeyParamSchema, req.params);
        const body = z
          .object({
            consumerType: z.enum(['ANONYMOUS', 'AUTHENTICATED_STUDENT']),
            locale: z.enum(['ar', 'en']),
            region: z.string().max(3).optional(),
          })
          .strict()
          .parse(req.body);
        res.json({ data: await cradle.studentToolRegistryUseCases.eligibility(toolKey, body) });
      }),
    );
    router.post(
      '/:toolKey/release/:action',
      safe(async (req, res) => {
        const { toolKey } = parseStrict(toolKeyParamSchema, { toolKey: req.params.toolKey });
        const action = z
          .enum(['PROPOSE', 'APPROVE', 'REJECT', 'ACTIVATE'])
          .parse(req.params.action);
        const body = revision.parse(req.body);
        res.json({
          data: await cradle.studentToolRegistryUseCases.release(
            toolKey,
            action,
            actor(req),
            body.expectedRevision,
            body.reason,
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
          Promise.resolve({ data: [], total: 0 }),
          Promise.resolve([]),
          cradle.studentToolRegistryUseCases.operationalStatus(tool),
        ]);
        res.json({ data: { tool, telemetry, executions, audit, ...operations } });
      }),
    );
    router.patch(
      '/:toolKey/metadata',
      safe(async (req, res) => {
        const { toolKey } = parseStrict(toolKeyParamSchema, req.params);
        const { expectedRevision, reason, ...patch } = parseStrict(
          studentToolMetadataPatchSchema,
          req.body,
        );
        res.json({
          data: await cradle.studentToolRegistryUseCases.update(
            toolKey,
            patch,
            actor(req),
            expectedRevision,
            reason,
          ),
        });
      }),
    );
    router.patch(
      '/:toolKey/availability',
      safe(async (req, res) => {
        const { toolKey } = parseStrict(toolKeyParamSchema, req.params);
        const body = parseStrict(studentToolAvailabilitySchema, req.body);
        const { semanticVersion, changeNote, expectedRevision, ...availability } = body;
        res.json({
          data: await cradle.studentToolRegistryUseCases.updateVersionedConfiguration(
            toolKey,
            { availability },
            { semanticVersion, changeNote, expectedRevision },
            actor(req),
          ),
        });
      }),
    );
    router.patch(
      '/:toolKey/flags',
      safe(async (req, res) => {
        const { toolKey } = parseStrict(toolKeyParamSchema, req.params);
        const { semanticVersion, changeNote, expectedRevision, ...featureFlags } = parseStrict(
          studentToolFlagsSchema,
          req.body,
        );
        res.json({
          data: await cradle.studentToolRegistryUseCases.updateVersionedConfiguration(
            toolKey,
            { featureFlags },
            { semanticVersion, changeNote, expectedRevision },
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
        const body = revision.parse(req.body);
        res.json({
          data: await cradle.studentToolRegistryUseCases.transition(
            toolKey,
            lifecycle,
            actor(req),
            body.expectedRevision,
            body.reason,
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
        if (body.costApproved && body.fixturePolicy !== 'SYNTHETIC_ONLY')
          throw new Error('TOOL_TEST_FIXTURE_REQUIRED');
        const result = await cradle.studentToolExecutionUseCases.execute(toolKey, {
          input: body.input,
          locale: body.locale ?? 'ar',
          consumerType: 'ADMIN_TEST',
          authenticatedStudentReference: req.authUserId,
          isTest: true,
          adminTestCostApproved: body.costApproved,
          privacyConsent: body.privacyConsent,
          idempotencyKey: z.string().min(8).max(200).parse(req.header('Idempotency-Key')),
        });
        res.json({ data: result });
      }),
    );
    router.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
      if (error instanceof z.ZodError) return res.status(400).json({ error: 'TOOL_INPUT_INVALID' });
      if (error instanceof ValidationException)
        return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.errors });
      const code = error instanceof Error ? error.message : 'STUDENT_TOOL_ADMIN_ERROR';
      const status =
        code.includes('CONFLICT') || code.includes('STALE')
          ? 409
          : code.includes('NOT_FOUND')
            ? 404
            : code.includes('QUOTA_STORE_UNAVAILABLE')
              ? 503
              : code.includes('RATE_LIMITED')
                ? 429
                : 400;
      res.status(status).json({ error: code });
    });
    return router;
  }
}

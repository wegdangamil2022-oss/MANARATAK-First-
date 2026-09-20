import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  StudentToolAnonymousSessionService,
  StudentToolExecutionUseCases,
  StudentToolRegistryUseCases,
} from '@manaratak/application';
import type { PrismaApiIdempotencyStore } from '@manaratak/infrastructure';
import { createCanonicalIdempotencyMiddleware } from '../../middleware/CanonicalIdempotencyMiddleware.js';

export class StudentToolsPublicRouter {
  static create(cradle: {
    studentToolRegistryUseCases: StudentToolRegistryUseCases;
    studentToolExecutionUseCases: StudentToolExecutionUseCases;
    studentToolAnonymousSessionService: StudentToolAnonymousSessionService;
    apiIdempotencyStore: PrismaApiIdempotencyStore;
  }) {
    const router = Router();
    const safe =
      (fn: (req: Request, res: Response) => Promise<unknown>) =>
      (req: Request, res: Response, next: NextFunction) =>
        Promise.resolve(fn(req, res)).catch(next);
    const query = z.object({
      category: z.string().optional(),
      visibility: z.string().optional(),
      implementationStatus: z.string().optional(),
      search: z.string().optional(),
    });
    router.use(createCanonicalIdempotencyMiddleware({
      store: cradle.apiIdempotencyStore,
      requireKey: true,
      principalResolver: (req) => req.authUserId
        || req.header('x-student-tools-session')
        || `anonymous-network:${req.ip || req.socket.remoteAddress || 'unknown'}`,
    }));

    const anonymousIdentity = (req: Request, res: Response) => {
      const networkReference = req.ip || req.socket.remoteAddress || 'unknown';
      const resolved = cradle.studentToolAnonymousSessionService.resolve(
        req.header('x-student-tools-session') ?? undefined,
        networkReference,
      );
      if (resolved.newlyIssued) {
        res.setHeader('x-student-tools-session', resolved.token);
        res.setHeader('x-student-tools-session-expires-at', resolved.expiresAt.toISOString());
      }
      return {
        anonymousSessionReference: resolved.sessionReference,
        trustedNetworkReference: networkReference,
      };
    };

    router.get(
      '/',
      safe(async (req, res) => {
        res.json({
          data: await cradle.studentToolRegistryUseCases.listPublicTools(query.parse(req.query)),
        });
      }),
    );
    router.get(
      '/executions/:executionId',
      safe(async (req, res) => {
        const authenticated = !!req.authUserId;
        const anonymous = authenticated ? null : anonymousIdentity(req, res);
        const value = await cradle.studentToolExecutionUseCases.findExecutionForRequester(
          req.params.executionId,
          {
            consumerType: authenticated ? 'AUTHENTICATED_STUDENT' : 'ANONYMOUS',
            authenticatedStudentReference: req.authUserId,
            anonymousSessionReference: anonymous?.anonymousSessionReference,
          },
        );
        if (!value) return void res.status(404).json({ error: 'TOOL_EXECUTION_NOT_FOUND' });
        res.json({ data: value });
      }),
    );
    router.post(
      '/executions/:executionId/save',
      safe(async (req, res) => {
        if (!req.authUserId) return void res.status(401).json({ error: 'TOOL_AUTH_REQUIRED' });
        res.status(201).json({
          data: await cradle.studentToolExecutionUseCases.saveExecutionForStudent(
            req.params.executionId,
            req.authUserId,
          ),
        });
      }),
    );
    router.post(
      '/executions/:executionId/claim',
      safe(async (req, res) => {
        if (!req.authUserId) return void res.status(401).json({ error: 'TOOL_AUTH_REQUIRED' });
        const presentedAnonymousSession = req.header('x-student-tools-session')?.trim();
        if (!presentedAnonymousSession) {
          return void res.status(400).json({ error: 'TOOL_ANONYMOUS_SESSION_REQUIRED' });
        }
        const networkReference = req.ip || req.socket.remoteAddress || 'unknown';
        const anonymous = cradle.studentToolAnonymousSessionService.resolve(
          presentedAnonymousSession,
          networkReference,
        );
        res.status(201).json({
          data: await cradle.studentToolExecutionUseCases.claimAnonymousExecutionForStudent(
            req.params.executionId,
            anonymous.sessionReference,
            req.authUserId,
          ),
        });
      }),
    );
    router.get(
      '/:toolKey',
      safe(async (req, res) => {
        const value = await cradle.studentToolRegistryUseCases.findPublicTool(req.params.toolKey);
        if (!value) return void res.status(404).json({ error: 'TOOL_NOT_FOUND' });
        res.json({ data: value });
      }),
    );
    router.get(
      '/:toolKey/availability',
      safe(async (req, res) => {
        const value = await cradle.studentToolRegistryUseCases.findPublicTool(req.params.toolKey);
        if (!value) return void res.status(404).json({ error: 'TOOL_NOT_FOUND' });
        res.json({
          data: {
            toolKey: value.toolKey,
            implementationStatus: value.implementationStatus,
            lifecycle: value.lifecycle,
            visibility: value.visibility,
            availability: value.availability,
            featureFlags: value.featureFlags,
          },
        });
      }),
    );
    router.post(
      '/:toolKey/execute',
      safe(async (req, res) => {
        const body = z
          .object({
            input: z.unknown(),
            locale: z.enum(['ar', 'en']).optional(),
            idempotencyKey: z.string().max(200).optional(),
          })
          .parse(req.body);
        const authenticated = !!req.authUserId;
        const anonymous = authenticated ? null : anonymousIdentity(req, res);
        const result = await cradle.studentToolExecutionUseCases.execute(req.params.toolKey, {
          input: body.input,
          locale: body.locale,
          idempotencyKey: body.idempotencyKey,
          requestId: String(req.header('x-request-id') ?? ''),
          consumerType: authenticated ? 'AUTHENTICATED_STUDENT' : 'ANONYMOUS',
          authenticatedStudentReference: req.authUserId,
          anonymousSessionReference: anonymous?.anonymousSessionReference,
          trustedNetworkReference: anonymous?.trustedNetworkReference,
        });
        res.json({ data: result });
      }),
    );
    router.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
      if (error instanceof z.ZodError)
        return res.status(400).json({ error: 'TOOL_INPUT_INVALID', details: error.issues });
      const rawCode = error instanceof Error ? error.message : 'TOOL_EXECUTION_FAILED';
      const code = /^[A-Z][A-Z0-9_]{2,80}$/.test(rawCode) ? rawCode : 'TOOL_EXECUTION_FAILED';
      const status = code.includes('NOT_FOUND')
        ? 404
        : code.includes('AUTH_REQUIRED')
          ? 401
          : code.includes('QUOTA_STORE_UNAVAILABLE')
            ? 503
          : code.includes('RATE_LIMITED')
            ? 429
            : code.includes('RESULT_EXPIRED')
              ? 409
              : code.includes('NOT_ACTIVE') || code.includes('NOT_IMPLEMENTED')
                ? 409
                : 400;
      res.status(status).json({ error: code });
    });
    return router;
  }
}

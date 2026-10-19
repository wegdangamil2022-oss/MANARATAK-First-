import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AIExecutionOrchestrator } from '@absheer/application';

const capabilityRequestSchema = z.object({
  capabilityKey: z
    .string()
    .trim()
    .min(1)
    .max(160)
    .regex(/^[a-zA-Z0-9_.:-]+$/),
  input: z.string().min(1).max(100_000),
  locale: z.enum(['ar', 'en']).optional().nullable(),
  dataClassification: z
    .enum(['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'STUDENT_PRIVATE', 'HIGHLY_SENSITIVE'])
    .default('INTERNAL'),
  idempotencyKey: z.string().min(1).max(200).optional().nullable(),
  structuredOutputSchema: z.record(z.string(), z.unknown()).optional().nullable(),
});

/**
 * Privileged operator gateway. Business domains use the Phase 17 consumer port directly;
 * this HTTP surface never accepts prompt, model, provider, consumer, or requester overrides.
 */
export class AIGatewayRouter {
  public static create(cradle: { aiExecutionUseCases: AIExecutionOrchestrator }): Router {
    const router = Router();
    const { aiExecutionUseCases } = cradle;
    const asyncHandler =
      (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
      (req: Request, res: Response, next: NextFunction) =>
        Promise.resolve(fn(req, res, next)).catch(next);
    const actor = (req: Request) => {
      if (!req.authUserId) throw new Error('AI_AUTHENTICATED_REQUESTER_REQUIRED');
      return req.authUserId;
    };

    router.post(
      '/execute',
      asyncHandler(async (req, res) => {
        const payload = capabilityRequestSchema.parse(req.body);
        res.json(
          await aiExecutionUseCases.executeCapability({
            ...payload,
            consumerKey: 'admin-ai-playground',
            requesterReferenceId: actor(req),
            sourceDomain: 'AdminAIPlayground',
          }),
        );
      }),
    );

    router.post(
      '/executions',
      asyncHandler(async (req, res) => {
        const payload = capabilityRequestSchema.parse(req.body);
        const job = await aiExecutionUseCases.submitAsyncCapability({
          ...payload,
          consumerKey: 'admin-ai-playground',
          requesterReferenceId: actor(req),
          sourceDomain: 'AdminAIPlayground',
        });
        res.status(202).json({
          publicId: job.publicId,
          status: job.status,
          createdAt: job.createdAt,
        });
      }),
    );

    router.get(
      '/executions/:publicId',
      asyncHandler(async (req, res) => {
        const requester = actor(req);
        const value = req.params.publicId.startsWith('aij_')
          ? await aiExecutionUseCases.findAsyncForRequester(req.params.publicId, requester)
          : await aiExecutionUseCases.findForRequester(req.params.publicId, requester);
        if (!value) return res.status(404).json({ error: 'AI_EXECUTION_NOT_FOUND' });
        return res.json(value);
      }),
    );

    // Strictly requester-owned protected output; never returned by execution list/trace.
    router.get(
      '/executions/:publicId/result',
      asyncHandler(async (req, res) => {
        const requester = actor(req);
        res.setHeader('Cache-Control', 'no-store, private');
        res.setHeader('Pragma', 'no-cache');
        if (!req.params.publicId.startsWith('aij_'))
          return res.status(404).json({ error: 'AI_ASYNC_RESULT_NOT_FOUND' });
        const result = await aiExecutionUseCases.findAsyncResultForRequester(
          req.params.publicId,
          requester,
        );
        if (!result) return res.status(404).json({ error: 'AI_ASYNC_RESULT_NOT_FOUND' });
        return res.json(result);
      }),
    );

    router.post(
      '/executions/:publicId/cancel',
      asyncHandler(async (req, res) => {
        const requester = actor(req);
        if (req.params.publicId.startsWith('aij_'))
          return res.json(await aiExecutionUseCases.cancelAsync(req.params.publicId, requester));
        const value = await aiExecutionUseCases.findForRequester(req.params.publicId, requester);
        if (!value) return res.status(404).json({ error: 'AI_EXECUTION_NOT_FOUND' });
        return res.json(await aiExecutionUseCases.cancel(value.publicId, requester));
      }),
    );

    router.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
      if (err instanceof z.ZodError)
        return res.status(400).json({ error: 'AI_INPUT_INVALID', details: err.issues });
      // HTTP errors carry bounded operational codes, never raw provider/DB text.
      const candidate = err instanceof Error ? err.message.slice(0, 128).split(':', 1)[0] : '';
      const code = /^AI_[A-Z0-9_]{1,100}$/.test(candidate) ? candidate : 'AI_EXECUTION_FAILED';
      const status =
        code === 'AI_EXECUTION_FAILED'
          ? 500
          : code === 'AI_ASYNC_RESULT_NOT_AVAILABLE'
            ? 404
            : code === 'AI_ASYNC_RESULT_NOT_READY'
              ? 409
              : code.includes('AUTHENTICATED')
                ? 401
                : code === 'AI_EXECUTION_IN_FLIGHT_CANCELLATION_UNSUPPORTED' ||
                    code === 'AI_EXECUTION_STATE_CONFLICT'
                  ? 409
                  : code.includes('NOT_CONFIGURED')
                    ? 503
                    : 400;
      return res.status(status).json({ error: code });
    });

    return router;
  }
}

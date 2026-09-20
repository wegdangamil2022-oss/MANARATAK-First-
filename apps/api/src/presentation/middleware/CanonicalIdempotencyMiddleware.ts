import { createHash } from 'node:crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { PrismaApiIdempotencyStore } from '@manaratak/infrastructure';
import { problemDetails } from '../http/ProblemDetails.js';

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function stable(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map(key => `${JSON.stringify(key)}:${stable(object[key])}`).join(',')}}`;
}

function normalizedRoute(req: Request): string {
  const raw = `${req.baseUrl || ''}${req.path || ''}` || req.originalUrl.split('?')[0] || '/';
  return raw
    .replace(/\/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, '/:id')
    .replace(/\/\d+(?=\/|$)/g, '/:id')
    .replace(/\/{2,}/g, '/');
}

export function createCanonicalIdempotencyMiddleware(input: {
  store: PrismaApiIdempotencyStore;
  requireKey: boolean;
  principalFallback?: string;
  principalResolver?: (req: Request) => string | null | undefined;
  ttlSeconds?: number;
  leaseSeconds?: number;
}): RequestHandler {
  const ttlSeconds = input.ttlSeconds ?? 24 * 60 * 60;
  const leaseSeconds = input.leaseSeconds ?? 120;

  return async (req: Request, res: Response, next: NextFunction) => {
    if (!['POST', 'PUT', 'PATCH'].includes(req.method.toUpperCase())) return next();

    const rawKey = req.header('Idempotency-Key')?.trim();
    if (!rawKey) {
      if (!input.requireKey) return next();
      return void res.status(400).type('application/problem+json').json(problemDetails({
        status: 400,
        code: 'IDEMPOTENCY_KEY_REQUIRED',
        detail: 'Idempotency-Key is required for this mutation.',
        instance: req.originalUrl,
        traceId: String((req as any).traceId || req.headers['x-correlation-id'] || 'unknown'),
      }));
    }
    if (rawKey.length < 8 || rawKey.length > 200) {
      return void res.status(400).type('application/problem+json').json(problemDetails({
        status: 400,
        code: 'IDEMPOTENCY_KEY_INVALID',
        detail: 'Idempotency-Key must contain between 8 and 200 characters.',
        instance: req.originalUrl,
        traceId: String((req as any).traceId || req.headers['x-correlation-id'] || 'unknown'),
      }));
    }

    const resolvedPrincipal = input.principalResolver?.(req) || (req as any).authUserId || input.principalFallback;
    const principalId = String(resolvedPrincipal || 'ANONYMOUS');
    const routeKey = normalizedRoute(req);
    const keyHash = sha256(rawKey);
    const requestFingerprint = sha256(`${req.method.toUpperCase()}\n${routeKey}\n${stable(req.body ?? null)}`);
    const scopeHash = sha256(`${principalId}\n${req.method.toUpperCase()}\n${routeKey}\n${keyHash}`);

    try {
      const decision = await input.store.begin({
        scopeHash,
        principalId,
        method: req.method.toUpperCase(),
        routeKey,
        keyHash,
        requestFingerprint,
        ttlSeconds,
        leaseSeconds,
      });
      if (decision.kind === 'REPLAY') {
        res.setHeader('Idempotency-Replayed', 'true');
        return void res.status(decision.statusCode).json(decision.responseBody);
      }
      if (decision.kind === 'CONFLICT') {
        return void res.status(409).json(problemDetails({
          status: 409,
          code: 'IDEMPOTENCY_KEY_PAYLOAD_CONFLICT',
          detail: 'This Idempotency-Key was already used with a different request payload.',
          instance: req.originalUrl,
          traceId: String((req as any).traceId || req.headers['x-correlation-id'] || 'unknown'),
        }));
      }
      if (decision.kind === 'IN_PROGRESS') {
        res.setHeader('Retry-After', '2');
        return void res.status(409).json(problemDetails({
          status: 409,
          code: 'IDEMPOTENCY_REQUEST_IN_PROGRESS',
          detail: 'An identical command is already being processed.',
          instance: req.originalUrl,
          traceId: String((req as any).traceId || req.headers['x-correlation-id'] || 'unknown'),
        }));
      }

      const originalJson = res.json.bind(res);
      let finalized = false;
      res.json = ((body: unknown) => {
        if (finalized) return originalJson(body);
        finalized = true;
        // Persist the terminal semantic result before it becomes visible to the client.
        void input.store.complete({
          scopeHash: decision.scopeHash,
          leaseToken: decision.leaseToken,
          statusCode: res.statusCode,
          responseBody: body,
        }).then(() => originalJson(body)).catch(next);
        return res;
      }) as Response['json'];
      next();
    } catch (error) {
      next(error);
    }
  };
}

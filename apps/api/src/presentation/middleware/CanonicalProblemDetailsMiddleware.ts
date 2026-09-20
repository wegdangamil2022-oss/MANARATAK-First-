import type { NextFunction, Request, Response } from 'express';
import { isProblemDetails, legacyErrorToProblem } from '../http/ProblemDetails.js';

/**
 * Canonical outer HTTP error boundary for API v1.
 * Existing routers may migrate incrementally; clients still receive one RFC 7807 shape.
 */
export function canonicalProblemDetailsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    if (res.statusCode >= 400) {
      const traceId = String((req as any).traceId || req.headers['x-correlation-id'] || 'unknown');
      const canonical = isProblemDetails(body)
        ? body
        : legacyErrorToProblem({
          body,
          status: res.statusCode,
          instance: req.originalUrl || req.url || '/',
          traceId,
        });
      res.type('application/problem+json');
      return originalJson(canonical);
    }
    return originalJson(body);
  }) as Response['json'];
  next();
}

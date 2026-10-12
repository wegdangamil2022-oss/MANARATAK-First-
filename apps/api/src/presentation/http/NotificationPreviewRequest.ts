import type { Request } from 'express';
/** Exact reviewed read-only command; never exempts create/clone/retry or arbitrary preview-like suffixes. */
export function isNotificationPreviewRequest(
  req: Pick<Request, 'method' | 'originalUrl'>,
): boolean {
  return (
    req.method.toUpperCase() === 'POST' &&
    /^\/(?:api\/v1\/)?notifications\/templates\/[^/]+\/preview\/?$/.test(
      req.originalUrl.split('?')[0],
    )
  );
}

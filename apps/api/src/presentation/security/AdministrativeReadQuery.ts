import type { Request } from 'express';
/** These exact POSTs are read-only query contracts. CSRF, authentication, MFA
 * enrollment/session and owner authorization still apply. Never extend by prefix. */
export function isAdministrativeReadQuery(req: Pick<Request, 'method' | 'originalUrl'>): boolean {
  return (
    req.method === 'POST' &&
    /^\/api\/v1\/admin\/(?:review-workspace\/query|authorization\/change-preview)\/?$/.test(
      req.originalUrl.split('?')[0],
    )
  );
}

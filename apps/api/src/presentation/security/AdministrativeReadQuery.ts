import type { Request } from 'express';
/** This one POST is a read-only search contract. CSRF, authentication, MFA
 * enrollment/session and owner authorization still apply. Never extend by prefix. */
export function isAdministrativeReadQuery(req: Pick<Request, 'method' | 'originalUrl'>): boolean {
  return (
    req.method === 'POST' &&
    /^\/api\/v1\/admin\/review-workspace\/query\/?$/.test(req.originalUrl.split('?')[0])
  );
}

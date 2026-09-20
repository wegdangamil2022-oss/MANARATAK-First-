import type { Request } from 'express';

export interface AuthenticatedPrincipal {
  readonly principalId: string;
  readonly actorType: 'IDENTITY';
}

export function getAuthenticatedPrincipal(req: Request): AuthenticatedPrincipal | null {
  const principalId = req.authUserId?.trim();
  return principalId ? { principalId, actorType: 'IDENTITY' } : null;
}

export function requireAuthenticatedPrincipal(req: Request): AuthenticatedPrincipal {
  const principal = getAuthenticatedPrincipal(req);
  if (!principal) throw new Error('AUTHENTICATED_PRINCIPAL_REQUIRED');
  return principal;
}

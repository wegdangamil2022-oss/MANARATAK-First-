import { firstAllowedAdminPath } from '@manaratak/shared';

export interface TrustedSessionIdentity {
  principalId: string;
  displayName: string;
  primaryEmail?: string;
  roles?: string[];
  roleNames?: string[];
  effectivePermissions?: string[];
}

export type AuthDestination =
  | { kind: 'student'; path: '/student' }
  | { kind: 'admin'; path: string }
  | { kind: 'denied'; reason: 'NO_ALLOWED_ROLE' };

const normalized = (value: string) => value.trim().toLowerCase().replace(/[\s_-]+/g, ' ');

export function hasStudentRole(roleNames: string[] = []): boolean {
  return roleNames.some((role) => {
    const value = normalized(role);
    return value === 'student' || value === 'طالب';
  });
}

export function resolveAuthenticatedDestination(
  identity: TrustedSessionIdentity,
  adminBaseUrl?: string,
): AuthDestination {
  const allowed = firstAllowedAdminPath(identity.effectivePermissions);
  if (allowed) {
    const raw = (adminBaseUrl || '').trim();
    if (/^https?:\/\//.test(raw)) {
      const base = new URL(raw);
      return { kind: 'admin', path: `${base.origin}${base.pathname.replace(/\/$/, '')}${allowed}` };
    }
    return { kind: 'admin', path: `/admin${allowed}` };
  }
  if (identity.roles?.includes('student') || hasStudentRole(identity.roleNames)) return { kind: 'student', path: '/student' };
  return { kind: 'denied', reason: 'NO_ALLOWED_ROLE' };
}

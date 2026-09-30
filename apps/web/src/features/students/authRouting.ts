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
): AuthDestination {
  if (identity.roles?.includes('student') || hasStudentRole(identity.roleNames)) return { kind: 'student', path: '/student' };
  return { kind: 'denied', reason: 'NO_ALLOWED_ROLE' };
}

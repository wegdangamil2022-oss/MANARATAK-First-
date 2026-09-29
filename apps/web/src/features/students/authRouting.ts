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

export function hasAdminAuthority(permissions: string[] = []): boolean {
  return permissions.some((permission) => permission === '*' || permission === 'admin:*' || permission.startsWith('admin:'));
}

export function hasAdministrativeRole(roleNames: string[] = []): boolean {
  const allowed = new Set(['owner', 'admin', 'administrator', 'super admin', 'superadmin', 'manager', 'مدير', 'مدير النظام', 'المالك']);
  return roleNames.some((role) => allowed.has(normalized(role)));
}

export function hasStudentRole(roleNames: string[] = []): boolean {
  return roleNames.some((role) => {
    const value = normalized(role);
    return value === 'student' || value === 'طالب';
  });
}

export function isPlatformOwner(identity: TrustedSessionIdentity): boolean {
  const email = identity.primaryEmail?.toLowerCase().trim();
  if (email && (email === 'wegdangamil2022@gmail.com' || email === 'wgdangameel1234@gmail.com')) return true;
  return identity.roleNames?.some((r) => normalized(r) === 'owner') || identity.roles?.includes('owner') || false;
}

export function resolveAuthenticatedDestination(
  identity: TrustedSessionIdentity,
  adminBaseUrl?: string,
): AuthDestination {
  if (isPlatformOwner(identity) || hasAdminAuthority(identity.effectivePermissions) || hasAdministrativeRole(identity.roleNames)) {
    const raw = (adminBaseUrl || '').trim();
    return { kind: 'admin', path: raw && raw !== '/admin' ? raw.replace(/\/$/, '') : '/admin/dashboard' };
  }
  if (identity.roles?.includes('student') || hasStudentRole(identity.roleNames)) return { kind: 'student', path: '/student' };
  return { kind: 'denied', reason: 'NO_ALLOWED_ROLE' };
}

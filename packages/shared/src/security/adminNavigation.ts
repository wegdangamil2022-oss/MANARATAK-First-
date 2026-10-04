export interface AdminRoutePermissionMapping {
  readonly path: string;
  readonly requiredPermission: string;
}

export const ADMIN_ROUTE_PERMISSIONS: readonly AdminRoutePermissionMapping[] = [
  { path: '/dashboard', requiredPermission: 'admin:platform:manage' },
  { path: '/review-queue', requiredPermission: 'admin:platform:manage' },
  { path: '/health-readiness', requiredPermission: 'admin:platform:manage' },
  { path: '/notifications', requiredPermission: 'admin:platform:manage' },
  { path: '/scholarships', requiredPermission: 'admin:scholarships:manage' },
  { path: '/universities', requiredPermission: 'admin:universities:manage' },
  { path: '/majors', requiredPermission: 'admin:majors:manage' },
  { path: '/international-tests', requiredPermission: 'admin:international-tests:manage' },
  { path: '/courses', requiredPermission: 'admin:courses:manage' },
  { path: '/study-destinations', requiredPermission: 'admin:reference-data:manage' },
  { path: '/translations', requiredPermission: 'admin:cms:manage' },
  { path: '/cms', requiredPermission: 'admin:cms:manage' },
  { path: '/imports', requiredPermission: 'admin:imports:manage' },
  { path: '/certificates', requiredPermission: 'admin:certificates:view' },
  { path: '/services', requiredPermission: 'admin:services:manage' },
  { path: '/finance', requiredPermission: 'admin:finance:manage' },
  { path: '/careers', requiredPermission: 'admin:careers:manage' },
  { path: '/ai', requiredPermission: 'admin:ai:manage' },
  { path: '/student-tools', requiredPermission: 'admin:student-tools:manage' },
  { path: '/academic-taxonomy', requiredPermission: 'admin:academic-taxonomy:manage' },
  { path: '/authorization', requiredPermission: 'admin:authorization:manage' },
  { path: '/audit', requiredPermission: 'admin:audit:manage' },
  { path: '/assets', requiredPermission: 'admin:assets:manage' },
  { path: '/students', requiredPermission: 'admin:students:support' },
  { path: '/settings', requiredPermission: 'admin:settings:manage' },
] as const;

export function checkPermission(grantedPermissions: readonly string[], requiredPermission: string): boolean {
  if (!requiredPermission) return true;
  for (const granted of grantedPermissions) {
    if (granted === '*' || granted === requiredPermission) return true;
    if (granted.endsWith(':*') && requiredPermission.startsWith(granted.slice(0, -1))) return true;
  }
  return false;
}

export function firstAllowedAdminPath(permissions: readonly string[]): string | null {
  if (!permissions || permissions.length === 0) return null;
  // If user has platform manager or wildcard authority, prioritize dashboard
  if (checkPermission(permissions, 'admin:platform:manage')) {
    return '/dashboard';
  }
  for (const route of ADMIN_ROUTE_PERMISSIONS) {
    if (checkPermission(permissions, route.requiredPermission)) {
      return route.path;
    }
  }
  return null;
}

export function canAccessAdminPath(requestedPath: string, permissions: readonly string[]): boolean {
  if (!permissions || permissions.length === 0) return false;
  if (!requestedPath) return false;

  const cleanPath = requestedPath.split('?')[0].split('#')[0];
  const normalized = cleanPath.replace(/^\/admin(?=\/|$)/, '') || '/dashboard';

  for (const route of ADMIN_ROUTE_PERMISSIONS) {
    if (normalized === route.path || normalized.startsWith(route.path + '/')) {
      return checkPermission(permissions, route.requiredPermission);
    }
  }

  if (normalized === '/' || normalized === '') {
    return firstAllowedAdminPath(permissions) !== null;
  }

  return false;
}

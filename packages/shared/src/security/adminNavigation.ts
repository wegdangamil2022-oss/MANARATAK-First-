import { ADMIN_SECTIONS, canAccessAdminPath as canonicalCanAccess, grantsAdminPermission } from '../authorization/adminAccess';
export { firstAllowedAdminPath } from '../authorization/adminAccess';

export interface AdminRoutePermissionMapping {
  readonly path: string;
  readonly requiredPermission: string;
}

export const ADMIN_ROUTE_PERMISSIONS: readonly AdminRoutePermissionMapping[] = ADMIN_SECTIONS.map(
  ([path, requiredPermission]) => ({ path, requiredPermission }),
);

export function checkPermission(permissions: readonly string[], requiredPermission: string): boolean {
  return !requiredPermission || grantsAdminPermission(permissions, requiredPermission);
}

/** Compatibility for Admin-relative routes; authorization uses the canonical policy. */
export function canAccessAdminPath(path: string, permissions: readonly string[]): boolean {
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\') || path.includes('://')) return false;
  const canonicalPath = /^\/(?:ar\/|en\/)?admin(?:[/?#]|$)/i.test(path) ? path : '/admin' + path;
  return canonicalCanAccess(canonicalPath, permissions);
}

import { describe, expect, it } from 'vitest';
import {
  canAccessAdminPath,
  checkPermission,
  firstAllowedAdminPath,
  ADMIN_ROUTE_PERMISSIONS,
} from '../../src/security/adminNavigation';

describe('admin navigation security authority', () => {
  it('correctly matches wildcard and exact permissions', () => {
    expect(checkPermission(['*'], 'admin:platform:manage')).toBe(true);
    expect(checkPermission(['admin:*'], 'admin:platform:manage')).toBe(true);
    expect(checkPermission(['admin:*'], 'admin:finance:manage')).toBe(true);
    expect(checkPermission(['admin:finance:manage'], 'admin:finance:manage')).toBe(true);
    expect(checkPermission(['admin:finance:manage'], 'admin:platform:manage')).toBe(false);
    expect(checkPermission([], 'admin:platform:manage')).toBe(false);
  });

  it('determines first allowed admin path based on granted permissions', () => {
    // Super administrator / wildcard
    expect(firstAllowedAdminPath(['admin:*'])).toBe('/dashboard');
    expect(firstAllowedAdminPath(['*'])).toBe('/dashboard');

    // Specific administrator role
    expect(firstAllowedAdminPath(['admin:platform:manage'])).toBe('/dashboard');
    expect(firstAllowedAdminPath(['admin:scholarships:manage'])).toBe('/scholarships');
    expect(firstAllowedAdminPath(['admin:finance:manage'])).toBe('/finance');
    expect(firstAllowedAdminPath(['admin:cms:manage'])).toBe('/translations');

    // Empty or non-admin permissions
    expect(firstAllowedAdminPath([])).toBeNull();
    expect(firstAllowedAdminPath(['student', 'student:courses:view'])).toBeNull();
  });

  it('evaluates access to requested admin paths correctly', () => {
    const adminPermissions = ['admin:platform:manage'];
    const scholarshipPermissions = ['admin:scholarships:manage'];

    // Platform admin access
    expect(canAccessAdminPath('/dashboard', adminPermissions)).toBe(true);
    expect(canAccessAdminPath('/admin/dashboard', adminPermissions)).toBe(true);
    expect(canAccessAdminPath('/admin/dashboard?tab=overview', adminPermissions)).toBe(true);
    expect(canAccessAdminPath('/scholarships', adminPermissions)).toBe(false);

    // Scholarship admin access
    expect(canAccessAdminPath('/scholarships', scholarshipPermissions)).toBe(true);
    expect(canAccessAdminPath('/admin/scholarships', scholarshipPermissions)).toBe(true);
    expect(canAccessAdminPath('/admin/scholarships/12345', scholarshipPermissions)).toBe(true);
    expect(canAccessAdminPath('/admin/dashboard', scholarshipPermissions)).toBe(false);

    // Wildcard administrator
    expect(canAccessAdminPath('/admin/dashboard', ['admin:*'])).toBe(true);
    expect(canAccessAdminPath('/admin/finance', ['admin:*'])).toBe(true);
    expect(canAccessAdminPath('/admin/settings', ['admin:*'])).toBe(true);

    // Students / unauthorized
    expect(canAccessAdminPath('/admin/dashboard', [])).toBe(false);
    expect(canAccessAdminPath('/admin/dashboard', ['student'])).toBe(false);
  });

  it('registers comprehensive route catalog', () => {
    expect(ADMIN_ROUTE_PERMISSIONS.length).toBeGreaterThan(15);
    const paths = ADMIN_ROUTE_PERMISSIONS.map(r => r.path);
    expect(paths).toContain('/dashboard');
    expect(paths).toContain('/scholarships');
    expect(paths).toContain('/finance');
    expect(paths).toContain('/settings');
  });
});

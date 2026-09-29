import { describe, expect, it } from 'vitest';
import { canAccessAdminPath, firstAllowedAdminPath, isAdministrativePath } from '../../src/authorization/adminAccess';

describe('current admin section permissions', () => {
  it('routes a single-section employee to the first permitted section', () => {
    const permissions = ['admin:universities:manage'];
    expect(firstAllowedAdminPath(permissions)).toBe('/universities');
    expect(canAccessAdminPath('/admin/universities/123', permissions)).toBe(true);
    expect(canAccessAdminPath('/admin/dashboard', permissions)).toBe(false);
    expect(canAccessAdminPath('/admin/finance', permissions)).toBe(false);
    expect(canAccessAdminPath('/ar/admin/universities', permissions)).toBe(true);
  });
  it('rejects an old admin return path for a student in the same browser', () => {
    expect(firstAllowedAdminPath([])).toBeNull();
    expect(canAccessAdminPath('/admin/dashboard', [])).toBe(false);
  });
  it('rejects unknown, external, and misleading paths', () => {
    expect(canAccessAdminPath('//evil.test/admin', ['admin:*'])).toBe(false);
    expect(canAccessAdminPath('/admin/unknown', ['admin:*'])).toBe(false);
    expect(canAccessAdminPath('/admin/settings/reference-data', ['admin:settings:manage'])).toBe(false);
    expect(isAdministrativePath('/en/admin/dashboard')).toBe(true);
    expect(isAdministrativePath('/student')).toBe(false);
  });
});

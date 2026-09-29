import { describe, expect, it } from 'vitest';
import { resolveAuthenticatedDestination } from './authRouting';

const baseIdentity = { principalId: 'identity-1', displayName: 'User' };

describe('trusted post-login routing', () => {
  it('routes the canonical Student role even when its display name is localized', () => {
    expect(resolveAuthenticatedDestination({ ...baseIdentity, roles: ['student'], roleNames: ['طالب مسجل'] })).toEqual({ kind: 'student', path: '/student' });
  });

  it('routes persisted Owner permission through the same administrative destination', () => {
    expect(resolveAuthenticatedDestination({ ...baseIdentity, roleNames: ['Owner'], effectivePermissions: ['admin:*'] })).toEqual({ kind: 'admin', path: '/admin/dashboard' });
  });

  it('does not infer Student persona from a Staff role label containing student', () => {
    expect(resolveAuthenticatedDestination({ ...baseIdentity, roleNames: ['student-support-staff'] })).toEqual({ kind: 'denied', reason: 'NO_ALLOWED_ROLE' });
  });
  it('routes a student session to the student workspace', () => {
    expect(resolveAuthenticatedDestination({ ...baseIdentity, roleNames: ['student'], effectivePermissions: [] })).toEqual({ kind: 'student', path: '/student' });
  });

  it.each(['owner', 'admin', 'super_admin', 'manager'])('does not promote the %s role label without a current permission', (role) => {
    expect(resolveAuthenticatedDestination({ ...baseIdentity, primaryEmail: 'wegdangamil2022@gmail.com', roleNames: [role], effectivePermissions: [] })).toEqual({ kind: 'denied', reason: 'NO_ALLOWED_ROLE' });
  });

  it('routes server-issued admin permissions even when the role label is custom', () => {
    expect(resolveAuthenticatedDestination({ ...baseIdentity, roleNames: ['operations'], effectivePermissions: ['admin:universities:manage'] })).toEqual({ kind: 'admin', path: '/admin/universities' });
  });

  it('routes the server-issued admin wildcard permission to administration', () => {
    expect(resolveAuthenticatedDestination({ ...baseIdentity, roleNames: ['operations'], effectivePermissions: ['admin:*'] })).toEqual({ kind: 'admin', path: '/admin/dashboard' });
  });

  it('denies a session with no allowed role instead of guessing from email', () => {
    expect(resolveAuthenticatedDestination({ ...baseIdentity, primaryEmail: 'admin@example.test', roleNames: [], effectivePermissions: [] })).toEqual({ kind: 'denied', reason: 'NO_ALLOWED_ROLE' });
  });

  it('treats missing/expired session data as denied at the routing boundary', () => {
    expect(resolveAuthenticatedDestination({ ...baseIdentity, roleNames: undefined, effectivePermissions: undefined })).toEqual({ kind: 'denied', reason: 'NO_ALLOWED_ROLE' });
  });
});

import { describe, expect, it } from 'vitest';
import { resolveAuthenticatedDestination } from './authRouting';

const baseIdentity = { principalId: 'identity-1', displayName: 'User' };

describe('trusted post-login routing', () => {
  it('routes a student session to the student workspace', () => {
    expect(resolveAuthenticatedDestination({ ...baseIdentity, roleNames: ['student'], effectivePermissions: [] })).toEqual({ kind: 'student', path: '/student' });
  });

  it.each(['admin', 'super_admin', 'manager'])('routes trusted %s role to the configured admin app', (role) => {
    expect(resolveAuthenticatedDestination({ ...baseIdentity, roleNames: [role], effectivePermissions: [] }, 'https://admin.manaratak.test')).toEqual({ kind: 'admin', path: 'https://admin.manaratak.test' });
  });

  it('routes server-issued admin permissions even when the role label is custom', () => {
    expect(resolveAuthenticatedDestination({ ...baseIdentity, roleNames: ['operations'], effectivePermissions: ['admin:universities:read'] })).toEqual({ kind: 'admin', path: '/admin/dashboard' });
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

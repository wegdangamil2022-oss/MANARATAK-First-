import { describe, expect, it } from 'vitest';
import { authenticateAccount, type TrustedAuthClient } from './authenticateAccount';

function clientWith(identity: Awaited<ReturnType<TrustedAuthClient['getCurrentSessionIdentity']>>): TrustedAuthClient {
  return {
    async login() { return { ok: true }; },
    async getCurrentSessionIdentity() { return identity; },
  };
}

describe('unified authentication flow', () => {
  it('logs in once and routes a trusted student session to /student', async () => {
    let loginCalls = 0;
    const client: TrustedAuthClient = {
      async login() { loginCalls += 1; return { ok: true }; },
      async getCurrentSessionIdentity() {
        return { principalId: 'student-1', displayName: 'Student', roleNames: ['student'], effectivePermissions: [] };
      },
    };
    await expect(authenticateAccount('student@example.test', 'secret', undefined, client)).resolves.toEqual({ kind: 'student', path: '/student' });
    expect(loginCalls).toBe(1);
  });

  it.each(['admin', 'super_admin', 'manager'])('routes trusted %s authority to the admin app', async (role) => {
    const client = clientWith({ principalId: 'admin-1', displayName: 'Admin', roleNames: [role], effectivePermissions: [] });
    await expect(authenticateAccount('account@example.test', 'secret', 'https://admin.manaratak.test', client)).resolves.toEqual({ kind: 'admin', path: 'https://admin.manaratak.test' });
  });

  it('denies an authenticated user without an allowed server role', async () => {
    const client = clientWith({ principalId: 'user-1', displayName: 'User', primaryEmail: 'admin@example.test', roleNames: [], effectivePermissions: [] });
    await expect(authenticateAccount('admin@example.test', 'secret', undefined, client)).resolves.toEqual({ kind: 'denied', reason: 'NO_ALLOWED_ROLE' });
  });

  it('propagates an expired /auth/me session instead of guessing a destination', async () => {
    const expired: TrustedAuthClient = {
      async login() { return { ok: true }; },
      async getCurrentSessionIdentity() { throw new Error('SESSION_EXPIRED'); },
    };
    await expect(authenticateAccount('user@example.test', 'secret', undefined, expired)).rejects.toThrow('SESSION_EXPIRED');
  });

  it('propagates authentication failure without attempting a second login surface', async () => {
    let meCalls = 0;
    const failed: TrustedAuthClient = {
      async login() { throw new Error('AUTH_FAILED'); },
      async getCurrentSessionIdentity() { meCalls += 1; throw new Error('unexpected'); },
    };
    await expect(authenticateAccount('user@example.test', 'wrong', undefined, failed)).rejects.toThrow('AUTH_FAILED');
    expect(meCalls).toBe(0);
  });
});

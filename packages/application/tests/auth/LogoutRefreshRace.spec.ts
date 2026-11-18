import { describe, expect, it } from 'vitest';
import { AuthService } from '../../src/auth/AuthService';
import { InMemorySessionManager } from '../../src/auth/InMemorySessionManager';

describe('logout and concurrent refresh', () => {
  it('revokes the rotated descendant while keeping another login active', async () => {
    class RacingSessions extends InMemorySessionManager {
      override async revokeSessionFamilyByRefreshToken(token: string, expectedUserId?: string) {
        // Model a refresh winning before logout's store transaction starts.
        if (token === 'synthetic-parent-token') {
          await this.consumeAndRotateRefreshSession(token, 'synthetic-child-token', 'child-session');
        }
        return super.revokeSessionFamilyByRefreshToken(token, expectedUserId);
      }
    }
    const sessions = new RacingSessions();
    await sessions.createSession('student-1', 'synthetic-parent-token', 'parent-session');
    await sessions.createSession('student-1', 'synthetic-other-token', 'other-session');
    const auth = new AuthService(
      { validateRefreshToken: async () => {} } as never,
      sessions,
      { isAuthenticationAllowed: async () => true },
    );

    await auth.logoutCurrentSession('synthetic-parent-token');

    expect(await sessions.isSessionActive('student-1', 'child-session')).toBe(false);
    expect(await sessions.isSessionActive('student-1', 'other-session')).toBe(true);
  });

  it('accepts an unexpired rotated parent if refresh completed before logout began', async () => {
    const sessions = new InMemorySessionManager();
    await sessions.createSession('student-1', 'synthetic-parent-token', 'parent-session');
    await sessions.createSession('student-1', 'synthetic-other-token', 'other-session');
    await sessions.createSession('student-2', 'synthetic-other-user-token', 'other-user-session');
    await sessions.consumeAndRotateRefreshSession('synthetic-parent-token', 'synthetic-child-token', 'child-session');
    const auth = new AuthService({ validateRefreshToken: async () => {} } as never, sessions,
      { isAuthenticationAllowed: async () => true });
    await auth.logoutCurrentSession('synthetic-parent-token');
    expect(await sessions.isSessionActive('student-1', 'child-session')).toBe(false);
    expect(await sessions.isSessionActive('student-1', 'other-session')).toBe(true);
    expect(await sessions.isSessionActive('student-2', 'other-user-session')).toBe(true);
  });

  it('rejects an expired, directly revoked, or another user’s token', async () => {
    const sessions = new InMemorySessionManager();
    await sessions.createSession('student-1', 'expired', 'expired-session', -1);
    await sessions.createSession('student-1', 'revoked', 'revoked-session');
    await sessions.createSession('student-2', 'other-user', 'other-user-session');
    await sessions.revokeSession('student-1', 'revoked');
    expect(await sessions.revokeSessionFamilyByRefreshToken('expired')).toBe(false);
    expect(await sessions.findRefreshSession('expired')).toBeNull();
    expect(await sessions.isSessionActive('student-1', 'expired-session')).toBe(false);
    expect(await sessions.consumeAndRotateRefreshSession('expired', 'expired-child', 'expired-child-session')).toBeNull();
    expect(await sessions.revokeSessionFamilyByRefreshToken('revoked')).toBe(false);
    expect(await sessions.revokeSessionFamilyByRefreshToken('other-user', 'student-1')).toBe(false);
    expect(await sessions.revokeSessionFamilyByRefreshToken('other-user', '')).toBe(false);
    expect(await sessions.isSessionActive('student-2', 'other-user-session')).toBe(true);
  });
});

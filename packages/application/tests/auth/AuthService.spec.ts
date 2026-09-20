import { describe, expect, it } from 'vitest';
import { AuthService } from '../../src/auth/AuthService';
import type { IPrincipalAccessValidator, ITokenProvider, TokenPayload, AuthTokens } from '@manaratak/core';
import { InMemorySessionManager } from '../../src/auth/InMemorySessionManager';
import { ICredentialVerifier } from '../../src/auth/ICredentialVerifier';



const allowPrincipal: IPrincipalAccessValidator = {
  isAuthenticationAllowed: async () => true,
};

class TestTokenProvider implements ITokenProvider {
  private counter = 0;
  async generateAccessToken(payload: TokenPayload): Promise<string> {
    this.counter += 1;
    return `access:${payload.userId}:${payload.sessionId ?? 'none'}:${this.counter}`;
  }
  async generateRefreshToken(): Promise<string> {
    this.counter += 1;
    return `mrt_${'A'.repeat(42)}${String(this.counter % 10)}`;
  }
  async generateTokens(payload: TokenPayload): Promise<AuthTokens> {
    return {
      accessToken: await this.generateAccessToken(payload),
      refreshToken: await this.generateRefreshToken(),
    };
  }
  async verifyAccessToken(token: string): Promise<TokenPayload> {
    const [, userId] = token.split(':');
    if (!token.startsWith('access:') || !userId) throw new Error('Invalid access token');
    return { userId };
  }
  async validateRefreshToken(token: string): Promise<void> {
    if (!token.startsWith('mrt_')) throw new Error('Invalid refresh token');
  }
}

describe('AuthService and Package Helpers', () => {
  describe('ICredentialVerifier and Login', () => {
    it('login without credential fails', async () => {
      const tokenProvider = new TestTokenProvider();
      const sessionManager = new InMemorySessionManager();
      const authService = new AuthService(tokenProvider, sessionManager, allowPrincipal);

      await expect(authService.login('user-123')).rejects.toThrow('Credential required for verification');
    });

    it('login with known email but invalid credential fails', async () => {
      const tokenProvider = new TestTokenProvider();
      const sessionManager = new InMemorySessionManager();
      const fakeVerifier: ICredentialVerifier = {
        verify: async (_userId, credentialValue) => credentialValue === 'correct-password',
      };
      const authService = new AuthService(tokenProvider, sessionManager, allowPrincipal, fakeVerifier);

      await expect(authService.login('user-123', 'wrong-password')).rejects.toThrow('Credential verification failed');
    });

    it('login with known email and verified credential succeeds using injected fake verifier', async () => {
      const tokenProvider = new TestTokenProvider();
      const sessionManager = new InMemorySessionManager();
      const fakeVerifier: ICredentialVerifier = {
        verify: async (_userId, credentialValue) => credentialValue === 'correct-password',
      };
      const authService = new AuthService(tokenProvider, sessionManager, allowPrincipal, fakeVerifier);

      const tokens = await authService.login('user-123', 'correct-password');
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
    });
  });

  it('refresh fails closed and revokes sessions when principal lifecycle is no longer active', async () => {
    const tokenProvider = new TestTokenProvider();
    const sessionManager = new InMemorySessionManager();
    const lifecycle = { isAuthenticationAllowed: async () => false };
    const authService = new AuthService(tokenProvider, sessionManager, lifecycle);
    const refreshToken = `mrt_${'C'.repeat(43)}`;

    await sessionManager.createSession('user-123', refreshToken, 'session-123');

    await expect(authService.refreshTokens(refreshToken)).rejects.toThrow('Session revoked, expired, replayed, or invalid');
    expect(await sessionManager.findRefreshSession(refreshToken)).toBeNull();
    expect(await sessionManager.isSessionActive('user-123', 'session-123')).toBe(false);
  });

  describe('InMemorySessionManager Hashing', () => {
    it('raw refresh tokens are not stored directly in InMemorySessionManager internals', async () => {
      const sessionManager = new InMemorySessionManager() as any;
      const userId = 'user-123';
      const rawRefreshToken = `mrt_${'B'.repeat(43)}`;

      await sessionManager.createSession(userId, rawRefreshToken);

      const rawState = JSON.stringify(Array.from(sessionManager.sessionsById.values()));
      expect(rawState).not.toContain(rawRefreshToken);
      const session = await sessionManager.findRefreshSession(rawRefreshToken);
      expect(session?.userId).toBe(userId);
    });

    it('logout revokes session', async () => {
      const sessionManager = new InMemorySessionManager();
      const userId = 'user-123';
      const rawRefreshToken = `mrt_${'B'.repeat(43)}`;

      await sessionManager.createSession(userId, rawRefreshToken);
      expect(await sessionManager.findRefreshSession(rawRefreshToken)).not.toBeNull();

      await sessionManager.revokeSession(userId, rawRefreshToken);
      expect(await sessionManager.findRefreshSession(rawRefreshToken)).toBeNull();
    });

    it('tracks the access token session identifier and invalidates it on logout', async () => {
      const sessionManager = new InMemorySessionManager();
      await sessionManager.createSession('user-123', 'refresh-token', 'session-123');
      expect(await sessionManager.isSessionActive('user-123', 'session-123')).toBe(true);

      await sessionManager.revokeSession('user-123', 'refresh-token');
      expect(await sessionManager.isSessionActive('user-123', 'session-123')).toBe(false);
    });
  });

});

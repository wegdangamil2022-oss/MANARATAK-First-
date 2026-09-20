import {
  IAuthService,
  ITokenProvider,
  ISessionManager,
  AuthTokens,
  InvalidTokenException,
  IPrincipalAccessValidator,
} from '@manaratak/core';
import { ICredentialVerifier, DenyAllCredentialVerifier } from './ICredentialVerifier';
import { randomUUID } from 'node:crypto';

export * from './InMemorySessionManager';
export * from './ICredentialVerifier';

export class AuthService implements IAuthService {
  constructor(
    private readonly tokenProvider: ITokenProvider,
    private readonly sessionManager: ISessionManager,
    private readonly principalAccessValidator: IPrincipalAccessValidator,
    private readonly credentialVerifier: ICredentialVerifier = new DenyAllCredentialVerifier(),
  ) {}

  public async login(userId: string, credential?: string): Promise<AuthTokens> {
    if (!await this.principalAccessValidator.isAuthenticationAllowed(userId)) throw new Error('Authentication not permitted');
    if (!credential) throw new Error('Credential required for verification');
    if (!await this.credentialVerifier.verify(userId, credential)) throw new Error('Credential verification failed');

    const sessionId = randomUUID();
    const tokens = await this.tokenProvider.generateTokens({ userId, sessionId });
    await this.sessionManager.createSession(userId, tokens.refreshToken, sessionId);
    return tokens;
  }

  public async logout(userId: string, refreshToken: string): Promise<void> {
    await this.tokenProvider.validateRefreshToken(refreshToken);
    await this.sessionManager.revokeSession(userId, refreshToken);
  }

  public async logoutCurrentSession(refreshToken: string): Promise<void> {
    await this.tokenProvider.validateRefreshToken(refreshToken);
    const session = await this.sessionManager.findRefreshSession(refreshToken);
    if (!session) throw new InvalidTokenException('Session revoked or invalid');
    await this.sessionManager.revokeSession(session.userId, refreshToken);
  }

  public async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    await this.tokenProvider.validateRefreshToken(refreshToken);

    const nextRefreshToken = await this.tokenProvider.generateRefreshToken();
    const nextSessionId = randomUUID();
    const currentSession = await this.sessionManager.findRefreshSession(refreshToken);
    if (!currentSession || !await this.principalAccessValidator.isAuthenticationAllowed(currentSession.userId)) {
      if (currentSession) await this.sessionManager.revokeAllSessions(currentSession.userId);
      throw new InvalidTokenException('Session revoked, expired, replayed, or invalid');
    }

    const rotated = await this.sessionManager.consumeAndRotateRefreshSession(
      refreshToken,
      nextRefreshToken,
      nextSessionId,
    );

    if (!rotated) throw new InvalidTokenException('Session revoked, expired, replayed, or invalid');

    // Re-check after the atomic consume to close the race where an identity is
    // suspended between preflight validation and rotation commit.
    if (!await this.principalAccessValidator.isAuthenticationAllowed(rotated.userId)) {
      await this.sessionManager.revokeAllSessions(rotated.userId);
      throw new InvalidTokenException('Authentication not permitted');
    }

    try {
      const accessToken = await this.tokenProvider.generateAccessToken({ userId: rotated.userId, sessionId: nextSessionId });
      return { accessToken, refreshToken: nextRefreshToken };
    } catch (error) {
      // Access-token signing should be startup-validated, but fail closed and
      // remove the newly-created child session if signing unexpectedly fails.
      await this.sessionManager.revokeSession(rotated.userId, nextRefreshToken);
      throw error;
    }
  }
}

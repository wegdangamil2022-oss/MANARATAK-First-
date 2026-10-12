import type { MfaUseCases } from '@manaratak/application';
import { Request, Response, NextFunction } from 'express';
import {
  IPrincipalAccessValidator,
  ISessionManager,
  ITokenProvider,
  UnauthorizedException,
} from '@manaratak/core';
import { readAccessCookie } from '../security/HttpOnlyAuthCookies.js';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      authUserId?: string;
      authSessionId?: string;
    }
  }
}

/**
 * Canonical authenticated-user boundary.
 *
 * Access tokens are session-bound and identity lifecycle is revalidated on
 * every request so suspend/archive/purge take effect immediately even if a
 * server-side revocation write is delayed or fails.
 */
export class AuthMiddleware {
  constructor(
    private readonly tokenProvider: ITokenProvider,
    private readonly sessionManager: ISessionManager,
    private readonly principalAccessValidator: IPrincipalAccessValidator,
    private readonly mfa?: MfaUseCases,
  ) {}

  public generate = () => {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const authHeader = req.headers.authorization;
        const token = readAccessCookie(req) || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '');
        if (!token) throw new UnauthorizedException('Authentication required');

        const payload = await this.tokenProvider.verifyAccessToken(token);
        if (!payload.sessionId) throw new UnauthorizedException('Session-bound access token required');
        if (!await this.sessionManager.isSessionActive(payload.userId, payload.sessionId)) {
          throw new UnauthorizedException('Authentication required');
        }
        if (!await this.principalAccessValidator.isAuthenticationAllowed(payload.userId)) {
          await this.sessionManager.revokeAllSessions(payload.userId);
          throw new UnauthorizedException('Authentication required');
        }

        if (this.mfa && !await this.mfa.sessionAuthenticated(payload.userId, payload.sessionId)) throw new UnauthorizedException('MFA session required');
        req.authSessionId = payload.sessionId;
        req.authUserId = payload.userId;
        next();
      } catch {
        res.status(401).json({ message: 'Unauthorized' });
      }
    };
  }
}

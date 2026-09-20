import type { NextFunction, Request, RequestHandler, Response } from 'express';
import {
  type IPrincipalAccessValidator,
  type ISessionManager,
  type ITokenProvider,
  UnauthorizedException,
} from '@manaratak/core';
import { readAccessCookie } from '../security/HttpOnlyAuthCookies.js';

/**
 * Canonical optional-auth boundary for public journeys that can operate both
 * anonymously and as an authenticated student.
 *
 * No credential => anonymous request proceeds.
 * Any presented credential => it MUST validate as a live, lifecycle-allowed,
 * session-bound principal. Invalid/revoked/suspended credentials fail closed
 * and are never silently downgraded to anonymous.
 */
export class OptionalAuthMiddleware {
  constructor(
    private readonly tokenProvider: ITokenProvider,
    private readonly sessionManager: ISessionManager,
    private readonly principalAccessValidator: IPrincipalAccessValidator,
  ) {}

  public generate = (): RequestHandler => {
    return async (req: Request, res: Response, next: NextFunction) => {
      const authHeader = req.headers.authorization;
      const cookieToken = readAccessCookie(req);
      const bearerToken = authHeader?.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : '';
      const token = cookieToken || bearerToken;

      if (!token) return next();

      try {
        const payload = await this.tokenProvider.verifyAccessToken(token);
        if (!payload.sessionId) {
          throw new UnauthorizedException('Session-bound access token required');
        }
        if (!await this.sessionManager.isSessionActive(payload.userId, payload.sessionId)) {
          throw new UnauthorizedException('Authentication required');
        }
        if (!await this.principalAccessValidator.isAuthenticationAllowed(payload.userId)) {
          await this.sessionManager.revokeAllSessions(payload.userId);
          throw new UnauthorizedException('Authentication required');
        }

        req.authUserId = payload.userId;
        return next();
      } catch {
        return void res.status(401).json({
          error: 'AUTHENTICATION_INVALID',
          message: 'Presented authentication credentials are invalid or no longer active.',
        });
      }
    };
  };
}

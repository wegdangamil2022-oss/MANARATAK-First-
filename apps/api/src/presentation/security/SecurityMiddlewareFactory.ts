import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { IPrincipalAccessValidator, ISecurityService, ISessionManager, ITokenProvider } from '@manaratak/core';
import { AuthorizationEvaluatorService } from '@manaratak/domain';
import { container } from '../../infrastructure/di/container.js';
import { readAccessCookie, readRefreshCookie } from './HttpOnlyAuthCookies.js';
import { CANONICAL_API_EXPOSED_HEADERS, CANONICAL_API_REQUEST_HEADERS } from './CanonicalApiCorsPolicy.js';

export interface CorsOptions {
  allowedOrigins: string[];
}

export interface CspOptions {
  enabled: boolean;
}

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export interface CsrfGuardOptions {
  headerName?: string;
  exemptPaths?: string[];
  exemptBearerAuth?: boolean;
}

export interface AdminGuardOptions {
  mode: 'strict';
  tokenProvider?: ITokenProvider;
  sessionManager?: ISessionManager;
  principalAccessValidator?: IPrincipalAccessValidator;
  authEvaluatorService?: AuthorizationEvaluatorService;
}

export interface AdminRuntimeContext {
  readonly authMode: 'strict';
  readonly principalId: string;
}

export class SecurityMiddlewareFactory {
  public static createSecurityHeaders(options: CspOptions) {
    return helmet({
      contentSecurityPolicy: options.enabled ? {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          styleSrcAttr: ["'none'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
          frameAncestors: ["'none'"]
        }
      } : false,
      crossOriginEmbedderPolicy: true,
      crossOriginOpenerPolicy: true,
      crossOriginResourcePolicy: true,
      dnsPrefetchControl: true,
      frameguard: { action: 'deny' },
      hidePoweredBy: true,
      hsts: true,
      ieNoOpen: true,
      noSniff: true,
      permittedCrossDomainPolicies: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      xssFilter: true
    });
  }

  public static createCors(options: CorsOptions) {
    return cors({
      origin: options.allowedOrigins.includes('*') ? '*' : options.allowedOrigins,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [...CANONICAL_API_REQUEST_HEADERS],
      exposedHeaders: [...CANONICAL_API_EXPOSED_HEADERS],
      credentials: true,
      maxAge: 86400
    });
  }

  public static createRateLimiter(securityService: ISecurityService, options: RateLimitOptions) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const ip = req.ip || req.socket?.remoteAddress || 'unknown';
      const result = await securityService.getRateLimiter().consume(ip, options.limit, options.windowMs);
      
      res.setHeader('X-RateLimit-Limit', options.limit);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', result.resetTime);

      if (!result.allowed) {
        res.status(429).json({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please try again later.'
          },
          meta: {
            timestamp: new Date().toISOString()
          }
        });
        return;
      }
      
      next();
    };
  }

  public static createCsrfGuard(securityService: ISecurityService, options: CsrfGuardOptions = {}) {
    const headerName = options.headerName || 'x-csrf-token';
    const exemptPaths = options.exemptPaths || [];
    const exemptBearerAuth = options.exemptBearerAuth ?? false;

    return (req: Request, res: Response, next: NextFunction) => {
      const method = req.method.toUpperCase();

      // Safe HTTP methods (GET, HEAD, OPTIONS) do not mutate state and are allowed without CSRF token
      if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        next();
        return;
      }

      // Check for exempted path prefixes if provided
      if (exemptPaths.some((p) => req.path.startsWith(p))) {
        next();
        return;
      }

      // If configured, requests carrying a Bearer token in the Authorization header may be exempted
      if (exemptBearerAuth && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        next();
        return;
      }

      const sessionSecret = readRefreshCookie(req);
      // Cookie-authenticated writes must provide a header token. Request bodies and query strings
      // are intentionally not accepted: they are easier to leak through logs and redirects.
      const token = req.get(headerName) || req.get('x-csrf-token');

      // Requests authenticated with an Authorization bearer token remain supported for API clients.
      // CSRF is a browser-cookie concern; no cookie means no ambient browser credential to protect.
      if (!sessionSecret) {
        next();
        return;
      }

      if (!token || !securityService.validateCsrfToken(token, sessionSecret)) {
        res.status(403).json({
          error: {
            code: 'CSRF_TOKEN_INVALID',
            message: 'Invalid or missing CSRF token.',
          },
          meta: {
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      next();
    };
  }

  public static resolveAdminAuthMode(env: Record<string, string | undefined> = process.env): 'strict' {
    const rawMode = env.ADMIN_AUTH_MODE;
    if (!rawMode || rawMode === 'strict') {
      return 'strict';
    }

    throw new Error(`[Security Guardrail] Invalid ADMIN_AUTH_MODE value: '${rawMode}'. Only persisted-RBAC strict mode is supported.`);
  }

  public static createAdminGuard(options: AdminGuardOptions) {
    return async (req: Request, res: Response, next: NextFunction) => {
      let principalId: string | null = req.authUserId || null;

      if (!principalId) {
        const receivedToken = readAccessCookie(req) || extractBearerToken(req.headers.authorization);
        if (receivedToken && options.tokenProvider) {
          try {
            const provider = options.tokenProvider as ITokenProvider & {
              verifyAccessTokenSync?: (token: string) => { userId?: string; sessionId?: string };
            };
            const payload = provider.verifyAccessTokenSync
              ? provider.verifyAccessTokenSync(receivedToken)
              : await provider.verifyAccessToken(receivedToken);
            if (
              payload?.userId
              && payload.sessionId
              && options.sessionManager
              && options.principalAccessValidator
              && await options.sessionManager.isSessionActive(payload.userId, payload.sessionId)
              && await options.principalAccessValidator.isAuthenticationAllowed(payload.userId)
            ) {
              principalId = payload.userId;
            }
          } catch (e) {
            // Invalid or expired tokens remain unauthenticated.
          }
        }
      }

      if (!principalId) {
        res.status(401).json({
          error: {
            code: 'ADMIN_AUTH_REQUIRED',
            message: 'Admin authentication is required.',
          },
          meta: {
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      if (!options.principalAccessValidator || !await options.principalAccessValidator.isAuthenticationAllowed(principalId)) {
        if (options.sessionManager) await options.sessionManager.revokeAllSessions(principalId);
        res.status(401).json({
          error: { code: 'ADMIN_SESSION_NOT_ACTIVE', message: 'Admin authentication is required.' },
          meta: { timestamp: new Date().toISOString() },
        });
        return;
      }

      // Canonical Admin access is server-session-bound. Stateless/service bearer
      // access requires a separately declared service-principal boundary rather
      // than silently omitting session/lifecycle dependencies here.
      req.authUserId = principalId;
      assignAdminContext(res, {
        authMode: options.mode,
        principalId,
      });
      res.setHeader('X-Admin-Auth-Mode', options.mode);
      next();
    };
  }

  public static createAdminPermissionGuard(requiredPermission: string, evaluatorOverride?: AuthorizationEvaluatorService) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const principalId = req.authUserId;
      if (!principalId) {
        res.status(401).json({
          error: {
            code: 'ADMIN_AUTH_REQUIRED',
            message: 'Admin authentication is required.',
          },
          meta: {
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      try {
        let evaluator = evaluatorOverride;
        if (!evaluator) {
          try {
            evaluator = container.resolve<AuthorizationEvaluatorService>('authEvaluatorService');
          } catch (e) {
            // Container resolution fallback
          }
        }

        if (!evaluator) {
          res.status(500).json({
            error: {
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Authorization evaluator service is unavailable.',
            },
          });
          return;
        }

        const decision = await evaluator.evaluatePermission(principalId, requiredPermission, {
          ip: req.ip || req.socket?.remoteAddress || undefined,
          requestTime: new Date(),
          userAgent: req.headers['user-agent'],
          correlationId: req.headers['x-correlation-id'],
        });

        const correlationId = (req.headers['x-correlation-id'] as string) || (req as any).id || 'N/A';
        if (process.env.NODE_ENV !== 'test') {
          console.log(`[Authorization] correlationId=${correlationId} principalId=${principalId} requiredPermission=${requiredPermission} decision=${decision.isGranted ? 'ALLOW' : 'DENY'}`);
        }

        if (!decision.isGranted) {
          res.status(403).json({
            error: {
              code: 'ADMIN_PERMISSION_DENIED',
              message: 'Admin permission is denied.',
            },
            meta: {
              timestamp: new Date().toISOString(),
              requiredPermission,
            },
          });
          return;
        }

        res.setHeader('X-Admin-Required-Permission', requiredPermission);
        next();
      } catch (err: any) {
        res.status(403).json({
          error: {
            code: 'ADMIN_PERMISSION_DENIED',
            message: 'Admin permission evaluation failed.',
          },
          meta: {
            timestamp: new Date().toISOString(),
            requiredPermission,
          },
        });
      }
    };
  }
}

function assignAdminContext(res: Response, context: AdminRuntimeContext): void {
  res.locals.adminContext = context;
}

function getAdminContext(res: Response): AdminRuntimeContext | null {
  return res.locals.adminContext ?? null;
}

function extractBearerToken(value: string | undefined): string | null {
  if (!value) return null;
  const [scheme, token] = value.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}

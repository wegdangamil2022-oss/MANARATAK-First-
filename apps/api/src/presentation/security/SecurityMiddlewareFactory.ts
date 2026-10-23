import type { MfaUseCases } from '@manaratak/application';
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
  allowedOrigins?: readonly string[];
}

export interface AdminGuardOptions {
  mfaUseCases?: MfaUseCases;
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
      let result;
      try {
        result = await securityService.getRateLimiter().consume(ip, options.limit, options.windowMs);
      } catch (error) {
        next(error);
        return;
      }

      res.setHeader('X-RateLimit-Limit', options.limit);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', result.resetTime);

      if (!result.allowed) {
        const retryAfterSeconds = Math.max(1, Math.ceil((result.resetTime - Date.now()) / 1000));
        res.setHeader('Retry-After', String(retryAfterSeconds));
        res.status(429).json({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please try again later.'
          },
          meta: {
            timestamp: new Date().toISOString(),
            retryAfter: retryAfterSeconds,
            resetTime: result.resetTime
          }
        });
        return;
      }
      
      next();
    };
  }

  public static createCsrfGuard(securityService: ISecurityService, options: CsrfGuardOptions = {}) {
    const headerName = options.headerName || 'x-csrf-token';
    const publicAuthPaths = ['login', 'register', 'verify-email', 'resend-verification', 'forgot-password', 'reset-password'];
    const normalizePath = (path: string) => path.replace(/\/+$/, '').toLowerCase() || '/';
    const exemptPaths = new Set([
      ...publicAuthPaths.flatMap(action => [`/auth/${action}`, `/api/v1/auth/${action}`]),
      ...(options.exemptPaths ?? []),
    ].map(normalizePath));
    const exemptBearerAuth = options.exemptBearerAuth ?? true;
    const allowedOrigins = options.allowedOrigins && new Set(options.allowedOrigins.map(value => {
      try { return new URL(value).origin; } catch { return ''; }
    }).filter(value => value && value !== 'null'));

    return (req: Request, res: Response, next: NextFunction) => {
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method.toUpperCase())) return next();
      const reject = (code: string, message: string) => {
        res.status(403).json({ error: { code, message }, meta: { timestamp: new Date().toISOString() } });
      };
      // CORS alone does not prevent a cross-origin request from mutating state.
      // This app-level policy also covers sessionless login/registration requests.
      if (allowedOrigins) {
        const origin = req.get('origin');
        const sameOrigin = `${req.protocol}://${req.get('host')}`;
        if ((origin && origin !== sameOrigin && !allowedOrigins.has(origin)) ||
            (!origin && req.get('sec-fetch-site') === 'cross-site')) {
          reject('CSRF_ORIGIN_DENIED', 'Request origin is not allowed.'); return;
        }
      }
      const path = normalizePath(`${req.baseUrl ?? ''}${req.path}`);
      if (exemptPaths.has(path)) return next();

      const sessionSecret = readRefreshCookie(req);
      const accessCookie = readAccessCookie(req);
      const hasBearer = /^Bearer\s+\S+$/i.test(req.headers.authorization ?? '');
      // Cookie credentials take precedence in our authenticators. A forged or
      // valid Authorization header must never exempt an ambient cookie session.
      if (!sessionSecret) {
        if (accessCookie || (hasBearer && !exemptBearerAuth)) {
          reject('CSRF_SESSION_REQUIRED', 'A cookie session is required for CSRF protection.'); return;
        }
        // No ambient credential: authentication is still enforced by the route.
        return next();
      }
      const token = req.get(headerName);
      if (!token || !securityService.validateCsrfToken(token, sessionSecret)) {
        reject('CSRF_TOKEN_INVALID', 'Invalid or missing CSRF token.'); return;
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
      let principalValidated = false;

      if (!principalId) {
        const receivedToken = readAccessCookie(req) || extractBearerToken(req.headers.authorization);
        if (receivedToken && options.tokenProvider) {
          let checkingStorage = false;
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
            ) {
              checkingStorage = true;
              if (await options.sessionManager.isSessionActive(payload.userId, payload.sessionId)
                  && await options.principalAccessValidator.isAuthenticationAllowed(payload.userId)) {
                principalId = payload.userId;
                principalValidated = true;
                req.authSessionId = payload.sessionId;
              }
            }
          } catch (e) {
            if (checkingStorage) {
              res.status(503).json({error:{code:'ADMIN_AUTH_UNAVAILABLE',message:'Admin authentication is temporarily unavailable.'}});
              return;
            }
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

      try {
        // A token authenticated above has already passed the current lifecycle
        // check. This flag lives only for this request; never cache across requests.
        if (!principalValidated && (!options.principalAccessValidator || !await options.principalAccessValidator.isAuthenticationAllowed(principalId))) {
          if (options.sessionManager) await options.sessionManager.revokeAllSessions(principalId);
          res.status(401).json({
            error: { code: 'ADMIN_SESSION_NOT_ACTIVE', message: 'Admin authentication is required.' },
            meta: { timestamp: new Date().toISOString() },
          });
          return;
        }
      } catch {
        res.status(503).json({
          error: { code: 'ADMIN_AUTH_UNAVAILABLE', message: 'Admin authentication is temporarily unavailable.' },
          meta: { timestamp: new Date().toISOString() },
        });
        return;
      }

      // Canonical Admin access is server-session-bound. Stateless/service bearer
      // access requires a separately declared service-principal boundary rather
      // than silently omitting session/lifecycle dependencies here.
      if (options.mfaUseCases) {
        try {
          if (!await options.mfaUseCases.sessionAuthenticated(principalId, req.authSessionId ?? '')) {
            res.status(401).json({ error: { code: 'MFA_SESSION_REQUIRED' } }); return;
          }
          if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) await options.mfaUseCases.assertFresh(principalId, req.authSessionId);
        } catch (error) {
          const stepUp = error instanceof Error && ['MFA_STEP_UP_REQUIRED','MFA_ENROLLMENT_REQUIRED'].includes(error.message);
          res.status(stepUp ? 403 : 503).json({ error: { code: stepUp && error instanceof Error ? error.message : 'MFA_AUTH_UNAVAILABLE' } }); return;
        }
      }
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

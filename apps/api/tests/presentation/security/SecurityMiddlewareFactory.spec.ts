import { describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { SecurityMiddlewareFactory } from '../../../src/presentation/security/SecurityMiddlewareFactory';
import { DefaultRateLimiter, SecurityService } from '@manaratak/infrastructure';
import { getResponseErrorCode } from '../../support/responsePayload';

function createResponse() {
  return {
    statusCode: 200,
    headers: {} as Record<string, string>,
    locals: {} as Record<string, unknown>,
    payload: undefined as unknown,
    setHeader: vi.fn(function (this: any, key: string, value: string) {
      this.headers[key] = value;
    }),
    status: vi.fn(function (this: any, code: number) {
      this.statusCode = code;
      return this;
    }),
    json: vi.fn(function (this: any, payload: unknown) {
      this.payload = payload;
      return this;
    }),
  };
}

import { AccessDecision } from '@manaratak/domain';

describe('SecurityMiddlewareFactory production headers', () => {
  it('emits the complete hardened header baseline when CSP is enabled', async () => {
    const app = express();
    app.use(SecurityMiddlewareFactory.createSecurityHeaders({ enabled: true }));
    app.get('/headers', (_req, res) => res.status(204).end());

    const response = await request(app).get('/headers');

    expect(response.headers['strict-transport-security']).toContain('max-age=');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    expect(response.headers['content-security-policy']).not.toContain("'unsafe-eval'");
    expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['cross-origin-embedder-policy']).toBe('require-corp');
    expect(response.headers['cross-origin-opener-policy']).toBe('same-origin');
    expect(response.headers['cross-origin-resource-policy']).toBe('same-origin');
  });
});

describe('SecurityMiddlewareFactory admin guard', () => {
  const activeSessionManager = {
    isSessionActive: vi.fn().mockResolvedValue(true),
    revokeAllSessions: vi.fn().mockResolvedValue(undefined),
  } as any;
  const activePrincipalAccessValidator = {
    isAuthenticationAllowed: vi.fn().mockResolvedValue(true),
  } as any;
  it('rejects unauthenticated requests in strict mode', async () => {
    const guard = SecurityMiddlewareFactory.createAdminGuard({ mode: 'strict' });
    const response = createResponse();
    const req = { headers: {} } as any;
    const next = vi.fn();

    await guard(req, response as any, next);

    expect(next).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(401);
  });

  it('rejects strict mode without a valid bearer token', async () => {
    const guard = SecurityMiddlewareFactory.createAdminGuard({
      mode: 'strict',
    });
    const response = createResponse();

    await guard({ headers: {} } as any, response as any, vi.fn());

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.payload).toEqual(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'ADMIN_AUTH_REQUIRED' }),
      }),
    );
  });

  it('allows strict mode with a valid access token identity', async () => {
    const token = 'signed-access-token';
    const guard = SecurityMiddlewareFactory.createAdminGuard({
      mode: 'strict',
      tokenProvider: {
        verifyAccessToken: vi
          .fn()
          .mockResolvedValue({ userId: 'owner-01', sessionId: 'session-01' }),
      } as any,
      sessionManager: activeSessionManager,
      principalAccessValidator: activePrincipalAccessValidator,
    });
    const response = createResponse();
    const req = { headers: { authorization: `Bearer ${token}` } } as any;
    const next = vi.fn();

    await guard(req, response as any, next);

    expect(next).toHaveBeenCalled();
    expect(response.headers['X-Admin-Auth-Mode']).toBe('strict');
    expect(req.authUserId).toBe('owner-01');
    expect(response.locals.adminContext).toEqual(
      expect.objectContaining({
        authMode: 'strict',
        principalId: 'owner-01',
      }),
    );
  });

  it('rejects a valid token when the current administrator account is suspended', async () => {
    const guard = SecurityMiddlewareFactory.createAdminGuard({
      mode: 'strict',
      tokenProvider: {
        verifyAccessToken: vi
          .fn()
          .mockResolvedValue({ userId: 'owner-01', sessionId: 'session-01' }),
      } as any,
      sessionManager: activeSessionManager,
      principalAccessValidator: {
        isAuthenticationAllowed: vi.fn().mockResolvedValue(false),
      } as any,
    });
    const response = createResponse();
    const next = vi.fn();

    await guard(
      { headers: { authorization: 'Bearer signed-token' } } as any,
      response as any,
      next,
    );

    expect(next).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(401);
    expect((response.payload as any).error.code).toBe('ADMIN_AUTH_REQUIRED');
  });

  it('allows admin permission guard when permission is granted by evaluator', async () => {
    const mockEvaluator = {
      evaluatePermission: vi.fn().mockResolvedValue(AccessDecision.granted('Granted')),
    } as any;
    const guard = SecurityMiddlewareFactory.createAdminPermissionGuard(
      'admin:scholarships:manage',
      mockEvaluator,
    );
    const response = createResponse();
    const req = { authUserId: 'admin-root', headers: {} } as any;
    const next = vi.fn();

    await guard(req, response as any, next);

    expect(next).toHaveBeenCalled();
    expect(response.headers['X-Admin-Required-Permission']).toBe('admin:scholarships:manage');
  });

  it('rejects admin permission guard when unauthenticated', async () => {
    const guard = SecurityMiddlewareFactory.createAdminPermissionGuard('admin:finance:manage');
    const response = createResponse();

    await guard({ headers: {} } as any, response as any, vi.fn());

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.payload).toEqual(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'ADMIN_AUTH_REQUIRED' }),
      }),
    );
  });

  it('rejects admin permission guard when permission is denied by evaluator', async () => {
    const mockEvaluator = {
      evaluatePermission: vi
        .fn()
        .mockResolvedValue(AccessDecision.denied('Insufficient permissions')),
    } as any;
    const guard = SecurityMiddlewareFactory.createAdminPermissionGuard(
      'admin:finance:manage',
      mockEvaluator,
    );
    const response = createResponse();
    const req = { authUserId: 'user-123', headers: {} } as any;

    await guard(req, response as any, vi.fn());

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.payload).toEqual(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'ADMIN_PERMISSION_DENIED' }),
      }),
    );
  });
});

describe('SecurityMiddlewareFactory resolveAdminAuthMode', () => {
  it('defaults to strict mode when ADMIN_AUTH_MODE is missing', () => {
    expect(
      SecurityMiddlewareFactory.resolveAdminAuthMode({
        NODE_ENV: 'production',
      }),
    ).toBe('strict');
  });

  it('throws configuration error when production uses ADMIN_AUTH_MODE=demo', () => {
    expect(() =>
      SecurityMiddlewareFactory.resolveAdminAuthMode({
        NODE_ENV: 'production',
        ADMIN_AUTH_MODE: 'demo',
      }),
    ).toThrowError(/Only persisted-RBAC strict mode is supported/);
  });

  it('defaults to strict mode in non-production when ADMIN_AUTH_MODE is missing', () => {
    const mode = SecurityMiddlewareFactory.resolveAdminAuthMode({
      NODE_ENV: 'development',
    });
    expect(mode).toBe('strict');
  });

  it('resolves strict mode when NODE_ENV=production and ADMIN_AUTH_MODE=strict', () => {
    const mode = SecurityMiddlewareFactory.resolveAdminAuthMode({
      NODE_ENV: 'production',
      ADMIN_AUTH_MODE: 'strict',
    });
    expect(mode).toBe('strict');
  });

  it('rejects legacy bearer mode', () => {
    expect(() =>
      SecurityMiddlewareFactory.resolveAdminAuthMode({
        NODE_ENV: 'production',
        ADMIN_AUTH_MODE: 'bearer',
      }),
    ).toThrowError(/Only persisted-RBAC strict mode is supported/);
  });
});

describe('SecurityMiddlewareFactory rate limiter middleware', () => {
  it('allows requests within rate limit and sets rate limit headers', async () => {
    const rateLimiter = new DefaultRateLimiter();
    const securityService = new SecurityService(rateLimiter);
    const middleware = SecurityMiddlewareFactory.createRateLimiter(securityService, {
      limit: 5,
      windowMs: 60000,
    });

    const response = createResponse();
    const next = vi.fn();
    const req = { ip: '1.2.3.4' } as any;

    await middleware(req, response as any, next);

    expect(next).toHaveBeenCalled();
    expect(response.headers['X-RateLimit-Limit']).toBe(5);
    expect(response.headers['X-RateLimit-Remaining']).toBe(4);
    expect(Number(response.headers['X-RateLimit-Reset'])).toBeGreaterThan(Date.now());
  });

  it('returns HTTP 429 Too Many Requests when rate limit is exceeded', async () => {
    const rateLimiter = new DefaultRateLimiter();
    const securityService = new SecurityService(rateLimiter);
    const limit = 2;
    const middleware = SecurityMiddlewareFactory.createRateLimiter(securityService, {
      limit,
      windowMs: 60000,
    });

    const req = { ip: '1.2.3.4' } as any;

    // First request - allowed
    const res1 = createResponse();
    const next1 = vi.fn();
    await middleware(req, res1 as any, next1);
    expect(next1).toHaveBeenCalled();
    expect(res1.headers['X-RateLimit-Remaining']).toBe(1);

    // Second request - allowed
    const res2 = createResponse();
    const next2 = vi.fn();
    await middleware(req, res2 as any, next2);
    expect(next2).toHaveBeenCalled();
    expect(res2.headers['X-RateLimit-Remaining']).toBe(0);

    // Third request - blocked with HTTP 429
    const res3 = createResponse();
    const next3 = vi.fn();
    await middleware(req, res3 as any, next3);

    expect(next3).not.toHaveBeenCalled();
    expect(res3.statusCode).toBe(429);
    expect(res3.headers['X-RateLimit-Remaining']).toBe(0);
    expect(res3.payload).toEqual({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later.',
      },
      meta: {
        timestamp: expect.any(String),
      },
    });
  });

  it('tracks rate limits independently per IP address', async () => {
    const rateLimiter = new DefaultRateLimiter();
    const securityService = new SecurityService(rateLimiter);
    const middleware = SecurityMiddlewareFactory.createRateLimiter(securityService, {
      limit: 1,
      windowMs: 60000,
    });

    const reqIp1 = { ip: '192.168.0.1' } as any;
    const reqIp2 = { ip: '192.168.0.2' } as any;

    // IP 1 uses its limit
    const resIp1First = createResponse();
    const nextIp1First = vi.fn();
    await middleware(reqIp1, resIp1First as any, nextIp1First);
    expect(nextIp1First).toHaveBeenCalled();

    // IP 1 blocked on second attempt
    const resIp1Second = createResponse();
    const nextIp1Second = vi.fn();
    await middleware(reqIp1, resIp1Second as any, nextIp1Second);
    expect(nextIp1Second).not.toHaveBeenCalled();
    expect(resIp1Second.statusCode).toBe(429);

    // IP 2 is allowed
    const resIp2First = createResponse();
    const nextIp2First = vi.fn();
    await middleware(reqIp2, resIp2First as any, nextIp2First);
    expect(nextIp2First).toHaveBeenCalled();
    expect(resIp2First.statusCode).toBe(200);
  });
});

describe('SecurityMiddlewareFactory CSRF guard middleware', () => {
  const sessionSecret = 'test-session-secret-999';

  function createMockRequest(method: string, headers: Record<string, string> = {}, body?: any) {
    const normalizedHeaders: Record<string, string> = {};
    for (const [k, v] of Object.entries(headers)) {
      normalizedHeaders[k.toLowerCase()] = v;
    }

    return {
      method,
      path: '/api/v1/resource',
      headers: normalizedHeaders,
      get: (headerName: string) => normalizedHeaders[headerName.toLowerCase()],
      body: body || {},
      query: {},
    } as any;
  }

  it('allows safe methods (GET, HEAD, OPTIONS) without a CSRF token', async () => {
    const securityService = new SecurityService(undefined, {
      signingSecret: 'test-csrf-signing-secret-with-at-least-32-characters',
    });
    const middleware = SecurityMiddlewareFactory.createCsrfGuard(securityService);

    for (const method of ['GET', 'HEAD', 'OPTIONS']) {
      const req = createMockRequest(method);
      const res = createResponse();
      const next = vi.fn();

      await middleware(req, res as any, next);

      expect(next).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
    }
  });

  it('rejects cookie-authenticated mutations when the CSRF header is missing', async () => {
    const securityService = new SecurityService(undefined, {
      signingSecret: 'test-csrf-signing-secret-with-at-least-32-characters',
    });
    const middleware = SecurityMiddlewareFactory.createCsrfGuard(securityService);

    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      const req = createMockRequest(method, { Cookie: `manaratak_refresh=${sessionSecret}` });
      const res = createResponse();
      const next = vi.fn();

      await middleware(req, res as any, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(403);
      expect(res.payload).toEqual({
        error: {
          code: 'CSRF_TOKEN_INVALID',
          message: 'Invalid or missing CSRF token.',
        },
        meta: {
          timestamp: expect.any(String),
        },
      });
    }
  });

  it('rejects state-mutating requests with invalid, malformed, or tampered CSRF tokens with HTTP 403', async () => {
    const securityService = new SecurityService(undefined, {
      signingSecret: 'test-csrf-signing-secret-with-at-least-32-characters',
    });
    const middleware = SecurityMiddlewareFactory.createCsrfGuard(securityService);

    const invalidTokens = [
      'invalid-token-string',
      'demo-token',
      '12345.67890',
      '12345.abc.def.ghi',
    ];

    for (const token of invalidTokens) {
      const req = createMockRequest('POST', {
        Cookie: `manaratak_refresh=${sessionSecret}`,
        'X-CSRF-Token': token,
      });
      const res = createResponse();
      const next = vi.fn();

      await middleware(req, res as any, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(403);
      expect(getResponseErrorCode(res.payload)).toBe('CSRF_TOKEN_INVALID');
    }
  });

  it('allows state-mutating requests when a valid CSRF token is provided in X-CSRF-Token header', async () => {
    const securityService = new SecurityService(undefined, {
      signingSecret: 'test-csrf-signing-secret-with-at-least-32-characters',
    });
    const middleware = SecurityMiddlewareFactory.createCsrfGuard(securityService);

    const validToken = securityService.generateCsrfToken(sessionSecret);

    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      const req = createMockRequest(method, {
        Cookie: `manaratak_refresh=${sessionSecret}`,
        'X-CSRF-Token': validToken,
      });
      const res = createResponse();
      const next = vi.fn();

      await middleware(req, res as any, next);

      expect(next).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
    }
  });

  it('allows state-mutating requests when path is explicitly in exemptPaths', async () => {
    const securityService = new SecurityService(undefined, {
      signingSecret: 'test-csrf-signing-secret-with-at-least-32-characters',
    });
    const middleware = SecurityMiddlewareFactory.createCsrfGuard(securityService, {
      exemptPaths: ['/api/v1/public/webhook'],
    });

    const req = {
      method: 'POST',
      path: '/api/v1/public/webhook/stripe',
      headers: {},
      get: () => undefined,
      body: {},
      query: {},
    } as any;
    const res = createResponse();
    const next = vi.fn();

    await middleware(req, res as any, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  it('does not accept CSRF tokens from request bodies or query strings', async () => {
    const securityService = new SecurityService(undefined, {
      signingSecret: 'test-csrf-signing-secret-with-at-least-32-characters',
    });
    const middleware = SecurityMiddlewareFactory.createCsrfGuard(securityService);
    const validToken = securityService.generateCsrfToken(sessionSecret);
    const req = createMockRequest(
      'POST',
      { Cookie: `manaratak_refresh=${sessionSecret}` },
      { _csrf: validToken },
    );
    req.query = { _csrf: validToken };
    const res = createResponse();
    const next = vi.fn();

    await middleware(req, res as any, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });

  it('allows state-mutating requests with Authorization Bearer header when exemptBearerAuth is true', async () => {
    const securityService = new SecurityService(undefined, {
      signingSecret: 'test-csrf-signing-secret-with-at-least-32-characters',
    });
    const middleware = SecurityMiddlewareFactory.createCsrfGuard(securityService, {
      exemptBearerAuth: true,
    });

    const req = {
      method: 'POST',
      path: '/api/v1/admin/action',
      headers: { authorization: 'Bearer test-bearer-token-val' },
      get: (h: string) =>
        h.toLowerCase() === 'authorization' ? 'Bearer test-bearer-token-val' : undefined,
      body: {},
      query: {},
    } as any;
    const res = createResponse();
    const next = vi.fn();

    await middleware(req, res as any, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });
});

import { describe, expect, it, vi, beforeEach } from 'vitest';
import express from 'express';
import supertest from 'supertest';
import { AuthRouter } from '../../../../src/presentation/api/router/AuthRouter';

describe('AuthRouter API endpoints', () => {
  let app: express.Express;
  let mockAuthService: any;
  let mockIdentityRepository: any;
  let mockSecurityService: any;
  let mockTokenProvider: any;
  let mockSessionManager: any;
  let mockPrincipalAccessValidator: any;

  beforeEach(() => {
    mockAuthService = {
      login: vi.fn(),
      logout: vi.fn(),
      logoutCurrentSession: vi.fn(),
      refreshTokens: vi.fn(),
    };

    mockIdentityRepository = {
      findByEmail: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        status: 'PROVISIONED',
        account: { accessState: 'Active' },
        user: {
          profile: { props: { displayName: 'Admin User' } },
          contactRegistry: { primaryEmail: 'admin@manaratak.local' },
        },
      }),
    };

    mockSecurityService = {
      generateCsrfToken: vi.fn().mockReturnValue('signed-csrf-token'),
      getRateLimiter: vi.fn().mockReturnValue({
        consume: vi.fn().mockResolvedValue({ allowed: true, remaining: 7, resetTime: Date.now() + 60_000 }),
      }),
    };

    mockTokenProvider = {
      verifyAccessToken: vi.fn().mockResolvedValue({ userId: 'user-123', sessionId: 'session-123' }),
      validateRefreshToken: vi.fn().mockResolvedValue(undefined),
      getJwks: vi.fn().mockReturnValue({ keys: [] }),
    };
    mockSessionManager = {
      findRefreshSession: vi.fn().mockResolvedValue({ userId: 'user-123', sessionId: 'session-123', familyId: 'session-123' }),
      isSessionActive: vi.fn().mockResolvedValue(true),
      revokeAllSessions: vi.fn().mockResolvedValue(undefined),
    };
    mockPrincipalAccessValidator = {
      isAuthenticationAllowed: vi.fn().mockResolvedValue(true),
    };

    app = express();
    app.use(express.json());
    app.use('/api/v1/auth', AuthRouter.create({
      authService: mockAuthService,
      identityRepository: mockIdentityRepository,
      securityService: mockSecurityService,
      tokenProvider: mockTokenProvider,
      sessionManager: mockSessionManager,
      principalAccessValidator: mockPrincipalAccessValidator,
    }));
  });

  describe('GET /api/v1/auth/me', () => {
    it('accepts a protected access cookie tied to an active server session', async () => {
      const response = await supertest(app)
        .get('/api/v1/auth/me')
        .set('Cookie', 'manaratak_access=access-token');

      expect(response.status).toBe(200);
      expect(response.body.data.principalId).toBe('user-123');
      expect(mockSessionManager.isSessionActive).toHaveBeenCalledWith('user-123', 'session-123');
    });

    it('rejects a stale session when the current identity is suspended', async () => {
      mockPrincipalAccessValidator.isAuthenticationAllowed.mockResolvedValue(false);
      const response = await supertest(app)
        .get('/api/v1/auth/me')
        .set('Cookie', 'manaratak_access=access-token');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('does not grant owner permissions from the email address alone', async () => {
      mockIdentityRepository.findById.mockResolvedValue({
        user: { profile: { props: { displayName: 'Owner' } }, contactRegistry: { primaryEmail: 'wegdangamil2022@gmail.com' } },
      });
      const response = await supertest(app).get('/api/v1/auth/me').set('Cookie', 'manaratak_access=access-token');
      expect(response.status).toBe(200);
      expect(response.body.data.effectivePermissions).toEqual([]);
      expect(response.body.data.roles).toEqual([]);
    });

    it('returns administrative authority only from a persisted role assignment', async () => {
      const roleAssignmentRepository = { findByIdentityId: vi.fn().mockResolvedValue([{ roleId: 'administrator' }]) };
      const roleRepository = { findById: vi.fn().mockResolvedValue({ name: 'Administrator', permissions: [{ value: 'admin:*' }] }) };
      const assignedApp = express();
      assignedApp.use('/api/v1/auth', AuthRouter.create({
        authService: mockAuthService, identityRepository: mockIdentityRepository, securityService: mockSecurityService,
        tokenProvider: mockTokenProvider, sessionManager: mockSessionManager, principalAccessValidator: mockPrincipalAccessValidator,
        roleAssignmentRepository: roleAssignmentRepository as any, roleRepository: roleRepository as any,
      }));
      const response = await supertest(assignedApp).get('/api/v1/auth/me').set('Cookie', 'manaratak_access=access-token');
      expect(response.status).toBe(200);
      expect(response.body.data.effectivePermissions).toEqual(['admin:*']);
      expect(roleAssignmentRepository.findByIdentityId).toHaveBeenCalledWith('user-123');
    });

    it('omits a persisted permission when its attached policy denies the current request', async () => {
      const evaluator = { evaluatePermission: vi.fn().mockResolvedValue({ isGranted: false }) };
      const policyApp = express();
      policyApp.use('/api/v1/auth', AuthRouter.create({
        authService: mockAuthService, identityRepository: mockIdentityRepository, securityService: mockSecurityService,
        tokenProvider: mockTokenProvider, sessionManager: mockSessionManager, principalAccessValidator: mockPrincipalAccessValidator,
        roleAssignmentRepository: { findByIdentityId: async () => [{ roleId: 'office-editor' }] } as any,
        roleRepository: { findById: async () => ({ name: 'Office editor', permissions: [{ value: 'admin:universities:manage' }], policyIds: ['office-only'] }) } as any,
        authEvaluatorService: evaluator as any,
      }));
      const response = await supertest(policyApp).get('/api/v1/auth/me').set('Cookie', 'manaratak_access=access-token');
      expect(response.status).toBe(200);
      expect(response.body.data.effectivePermissions).toEqual([]);
      expect(evaluator.evaluatePermission).toHaveBeenCalledWith('user-123', 'admin:universities:manage', expect.any(Object));
    });
  });

  describe('GET /api/v1/auth/csrf-token', () => {
    it('returns a token generated by the configured security service', async () => {
      const response = await supertest(app)
        .get('/api/v1/auth/csrf-token')
        .set('Cookie', 'manaratak_refresh=test-refresh-token');

      expect(response.status).toBe(200);
      expect(response.body.data.csrfToken).toBe('signed-csrf-token');
      expect(mockSecurityService.generateCsrfToken).toHaveBeenCalledWith('test-refresh-token');
      expect(mockTokenProvider.validateRefreshToken).toHaveBeenCalledWith('test-refresh-token');
      expect(mockSessionManager.findRefreshSession).toHaveBeenCalledWith('test-refresh-token');
    });

    it('fails closed when no authenticated cookie session is available', async () => {
      const response = await supertest(app).get('/api/v1/auth/csrf-token');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('CSRF_SESSION_REQUIRED');
      expect(mockSecurityService.generateCsrfToken).not.toHaveBeenCalled();
    });

    it.each(['invalid-token', 'missing-session', 'inactive-identity'])('rejects a cookie whose server session cannot authenticate: %s', async (failure) => {
      if (failure === 'invalid-token') mockTokenProvider.validateRefreshToken.mockRejectedValue(new Error('Expired token'));
      if (failure === 'missing-session') mockSessionManager.findRefreshSession.mockResolvedValue(null);
      if (failure === 'inactive-identity') mockPrincipalAccessValidator.isAuthenticationAllowed.mockResolvedValue(false);
      const response = await supertest(app).get('/api/v1/auth/csrf-token').set('Cookie', 'manaratak_refresh=invalid-session');
      expect(response.status).toBe(401); expect(response.body.error.code).toBe('CSRF_SESSION_REQUIRED');
      expect(mockSecurityService.generateCsrfToken).not.toHaveBeenCalled(); expect(response.headers['x-csrf-token']).toBeUndefined();
      if (failure === 'inactive-identity') expect(mockSessionManager.revokeAllSessions).toHaveBeenCalledWith('user-123');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('validates payload and rejects invalid email format', async () => {
      const response = await supertest(app)
        .post('/api/v1/auth/login')
        .send({ email: 'not-an-email', password: 'some-password' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.data).toBeNull();
    });

    it('login without credential (email-only) fails with validation error and never returns tokens', async () => {
      const response = await supertest(app)
        .post('/api/v1/auth/login')
        .send({ email: 'user@manaratak.local' }); // no password

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(mockAuthService.login).not.toHaveBeenCalled();
    });

    it('returns unauthorized error for non-existent/unknown email identity', async () => {
      mockIdentityRepository.findByEmail.mockResolvedValue(null);

      const response = await supertest(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nonexistent@manaratak.local', password: 'some-password' });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.data).toBeNull();
    });

    it('rate limits by a hashed account key without exposing the submitted email', async () => {
      const limiter = mockSecurityService.getRateLimiter();
      limiter.consume.mockResolvedValue({ allowed: false, remaining: 0, resetTime: Date.now() + 60_000 });
      const response = await supertest(app)
        .post('/api/v1/auth/login')
        .send({ email: 'target@manaratak.local', password: 'some-password' });

      expect(response.status).toBe(429);
      expect(response.body.error.code).toBe('AUTH_RATE_LIMITED');
      const keys = limiter.consume.mock.calls.map(([key]: [string]) => key);
      expect(keys.every((key: string) => !key.includes('target@manaratak.local'))).toBe(true);
      expect(mockIdentityRepository.findByEmail).not.toHaveBeenCalled();
    });

    it('returns unauthorized error when email is known but password verification fails', async () => {
      const mockIdentity = {
        id: 'user-123',
        user: { contactRegistry: { primaryEmail: 'user@manaratak.local' } }
      };
      mockIdentityRepository.findByEmail.mockResolvedValue(mockIdentity);
      mockAuthService.login.mockRejectedValue(new Error('Credential verification failed'));

      const response = await supertest(app)
        .post('/api/v1/auth/login')
        .send({ email: 'user@manaratak.local', password: 'wrong-password' });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.error.message).toBe('Invalid credentials or identity not found');
      expect(response.body.data).toBeNull();
    });

    it('sets HttpOnly cookies and never returns raw tokens on successful login', async () => {
      const mockIdentity = {
        id: 'user-123',
        user: { contactRegistry: { primaryEmail: 'user@manaratak.local' } }
      };
      mockIdentityRepository.findByEmail.mockResolvedValue(mockIdentity);
      mockAuthService.login.mockResolvedValue({
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456'
      });

      const response = await supertest(app)
        .post('/api/v1/auth/login')
        .send({ email: 'user@manaratak.local', password: 'correct-password' });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual({ authenticated: true });
      expect(response.body.data.accessToken).toBeUndefined();
      expect(response.body.data.refreshToken).toBeUndefined();
      const cookies = response.headers['set-cookie'] as unknown as string[];
      expect(cookies.some((value) => value.startsWith('manaratak_access=access-token-123') && value.includes('HttpOnly'))).toBe(true);
      expect(cookies.some((value) => value.startsWith('manaratak_refresh=refresh-token-456') && value.includes('HttpOnly'))).toBe(true);
      // Confirm safe fields only - no secrets or credentials leaked
      expect(response.body.data.password).toBeUndefined();
      expect(response.body.data.passwordHash).toBeUndefined();
      expect(response.body.data.jwtSecret).toBeUndefined();
      expect(response.body.data.JWT_SECRET).toBeUndefined();
      expect(response.body.data.ADMIN_BEARER_TOKEN).toBeUndefined();
      expect(response.body.data.DATABASE_URL).toBeUndefined();
    });

    it('returns safe error without stack traces or secrets on login failure', async () => {
      mockIdentityRepository.findByEmail.mockRejectedValue(new Error('Sensitive database query failed or timeout'));

      const response = await supertest(app)
        .post('/api/v1/auth/login')
        .send({ email: 'user@manaratak.local', password: 'some-password' });

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(response.body.error.message).toBe('An unexpected error occurred during login');
      expect(response.body.error.stack).toBeUndefined();
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('rejects a body token when no protected cookie exists', async () => {
      const response = await supertest(app).post('/api/v1/auth/refresh').send({ refreshToken: 'body-token', rememberMe: true });
      expect(response.status).toBe(401);
      expect(mockAuthService.refreshTokens).not.toHaveBeenCalled();
    });

    it('uses the cookie token and does not let a body flag extend a session lifetime', async () => {
      mockAuthService.refreshTokens.mockResolvedValue({ accessToken: 'new-access', refreshToken: 'new-refresh' });
      const response = await supertest(app).post('/api/v1/auth/refresh')
        .set('Cookie', 'manaratak_refresh=cookie-token').send({ refreshToken: 'body-token', rememberMe: true });
      expect(response.status).toBe(200);
      expect(mockAuthService.refreshTokens).toHaveBeenCalledWith('cookie-token');
      const refreshCookie = (response.headers['set-cookie'] as unknown as string[]).find(value => value.startsWith('manaratak_refresh='));
      expect(refreshCookie).toBeDefined();
      expect(refreshCookie).not.toContain('Max-Age');
    });
    it('rejects refresh without the protected refresh cookie', async () => {
      const response = await supertest(app)
        .post('/api/v1/auth/refresh')
        .send({});

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('returns new tokens on successful refresh', async () => {
      mockAuthService.refreshTokens.mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token'
      });

      const response = await supertest(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', 'manaratak_refresh=valid-refresh-token');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual({ authenticated: true });
      expect(mockAuthService.refreshTokens).toHaveBeenCalledWith('valid-refresh-token');
    });

    it('returns safe invalid token error on refresh failure', async () => {
      mockAuthService.refreshTokens.mockRejectedValue(new Error('Token revoked'));

      const response = await supertest(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', 'manaratak_refresh=invalid-or-revoked-token');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
      expect(response.body.error.message).toBe('Session revoked, expired, or invalid refresh token');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('does not revoke a token supplied through the request body', async () => {
      const response = await supertest(app).post('/api/v1/auth/logout').send({ refreshToken: 'body-token' });
      expect(response.status).toBe(200);
      expect(mockAuthService.logoutCurrentSession).not.toHaveBeenCalled();
    });
    it('is idempotent when there is no active refresh cookie', async () => {
      const response = await supertest(app)
        .post('/api/v1/auth/logout')
        .send({});

      expect(response.status).toBe(200);
      expect(mockAuthService.logoutCurrentSession).not.toHaveBeenCalled();
    });

    it('returns success message on successful logout', async () => {
      mockAuthService.logoutCurrentSession.mockResolvedValue(undefined);

      const response = await supertest(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', 'manaratak_refresh=valid-refresh-token');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual({
        message: 'Successfully logged out'
      });
      expect(mockAuthService.logoutCurrentSession).toHaveBeenCalledWith('valid-refresh-token');
    });

    it('returns safe error on logout failure', async () => {
      mockAuthService.logoutCurrentSession.mockRejectedValue(new Error('Some logout internal error'));

      const response = await supertest(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', 'manaratak_refresh=some-refresh-token');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('LOGOUT_FAILED');
    });
  });
});

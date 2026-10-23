import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { IAuthService, IPrincipalAccessValidator, ISecurityService, ISessionManager, ITokenProvider } from '@manaratak/core';
import type { MfaUseCases, ICredentialVerifier, RegisterUserUseCase, VerifyEmailUseCase, ResendVerificationUseCase } from '@manaratak/application';
import type { ForgotPasswordUseCase, ResetPasswordUseCase } from '@manaratak/application';
import { AuthorizationEvaluatorService, IIdentityRepository, IRoleAssignmentRepository, IRoleRepository } from '@manaratak/domain';
import { ResponseFormatter } from '../response/ResponseFormatter.js';
import { clearAuthCookies, readAccessCookie, readRefreshCookie, setAuthCookies, readRememberMeCookie } from '../../security/HttpOnlyAuthCookies.js';
import type { ChangePasswordUseCase, DisablePasswordCredentialUseCase } from '@manaratak/application';
import { AuthMiddleware } from '../../middleware/AuthMiddleware.js';
import { SecurityMiddlewareFactory } from '../../security/SecurityMiddlewareFactory.js';
import { KNOWN_ADMIN_PERMISSIONS } from '../../security/AdminPermissionCatalog.js';

export class AuthRouter {
  public static create(cradle: { 
    mfaUseCases?: MfaUseCases;
    authService: IAuthService; 
    identityRepository: IIdentityRepository; 
    securityService: ISecurityService;
    roleAssignmentRepository?: IRoleAssignmentRepository;
    roleRepository?: IRoleRepository;
    authEvaluatorService?: AuthorizationEvaluatorService;
    tokenProvider?: ITokenProvider;
    sessionManager?: ISessionManager;
    principalAccessValidator: IPrincipalAccessValidator;
    credentialVerifier?: ICredentialVerifier;
    forgotPasswordUseCase: ForgotPasswordUseCase;
    resetPasswordUseCase: ResetPasswordUseCase;
    authRateLimitKey: (value: string) => string;
    registerUserUseCase?: RegisterUserUseCase;
    verifyEmailUseCase?: VerifyEmailUseCase;
    resendVerificationUseCase?: ResendVerificationUseCase;
    changePasswordUseCase?: ChangePasswordUseCase;
    disablePasswordCredentialUseCase?: DisablePasswordCredentialUseCase;
  }): Router {
    const { authService, identityRepository, securityService, roleAssignmentRepository, roleRepository, tokenProvider, sessionManager, principalAccessValidator, credentialVerifier } = cradle;
    const router = Router();
    router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
    const responseFormatter = new ResponseFormatter('v1');
    const credentialCsrfGuard = (req: Request, res: Response, next: NextFunction) => {
      if (readAccessCookie(req) && !readRefreshCookie(req)) {
        res.status(403).json({ error: { code: 'CSRF_SESSION_REQUIRED' } }); return;
      }
      return SecurityMiddlewareFactory.createCsrfGuard(securityService)(req, res, next);
    };

    const { forgotPasswordUseCase, resetPasswordUseCase, authRateLimitKey } = cradle;
    if (!forgotPasswordUseCase || !resetPasswordUseCase || !authRateLimitKey) {
      throw new Error('AUTH_DEPENDENCIES_REQUIRED');
    }
    const authBudget = (action: string, budget: number, windowMs: number, identifier: (req: Request) => string | undefined) =>
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const ip = req.ip || req.socket.remoteAddress || 'unknown';
          const account = identifier(req);
          const limits = await Promise.all([
            securityService.getRateLimiter().consume(`auth:${action}:ip:${ip}`, Math.max(10, budget * 4), windowMs),
            ...(account ? [securityService.getRateLimiter().consume(`auth:${action}:account:${authRateLimitKey(account)}`, budget, windowMs)] : []),
          ]);
          if (limits.some(limit => !limit.allowed)) {
            const retryAfter = Math.max(1, Math.ceil((Math.max(...limits.map(limit => limit.resetTime)) - Date.now()) / 1000));
            res.setHeader('Retry-After', String(retryAfter));
            res.status(429).json(responseFormatter.error({ code: 'AUTH_RATE_LIMITED', message: 'Too many authentication attempts. Please try again later.' }));
            return;
          }
          next();
        } catch {
          res.status(503).json(responseFormatter.error({ code: 'AUTH_UNAVAILABLE', message: 'Authentication is temporarily unavailable.' }));
        }
      };
    const emailKey = (field: string) => (req: Request) => typeof req.body?.[field] === 'string'
      ? req.body[field].trim().toLowerCase().slice(0, 255) : undefined;
    const tokenKey = (req: Request) => typeof req.body?.token === 'string' ? req.body.token.trim().slice(0, 512) : undefined;

    router.post('/change-password',
      (req, res, next) => {
        if (!tokenProvider || !sessionManager) { res.status(401).json({ message: 'Unauthorized' }); return; }
        return new AuthMiddleware(tokenProvider, sessionManager, principalAccessValidator, cradle.mfaUseCases).generate()(req, res, next);
      },
      credentialCsrfGuard,
      async (req, res) => {
        try {
          const limit = await securityService.getRateLimiter().consume(`auth:change-password:${req.authUserId}`, 5, 15 * 60 * 1000);
          if (!limit.allowed) { res.status(429).json({ error: { code: 'AUTH_RATE_LIMITED' } }); return; }
          const input = z.object({ currentPassword: z.string().min(1).max(128), newPassword: z.string().min(8).max(128) }).strict().safeParse(req.body);
          if (!input.success) { res.status(400).json({ error: { code: 'VALIDATION_ERROR' } }); return; }
          if (!cradle.changePasswordUseCase) { res.status(503).json({ error: { code: 'AUTH_UNAVAILABLE' } }); return; }
          await cradle.changePasswordUseCase.execute(req.authUserId!, input.data);
          clearAuthCookies(res);
          res.status(200).json(responseFormatter.success({ loginRequired: true }));
        } catch {
          res.status(400).json({ error: { code: 'PASSWORD_CHANGE_DENIED' } });
        }
      });

    router.post('/credentials/:identityId/disable',
      (req, res, next) => {
        if (!tokenProvider || !sessionManager) { res.status(401).json({ message: 'Unauthorized' }); return; }
        return new AuthMiddleware(tokenProvider, sessionManager, principalAccessValidator, cradle.mfaUseCases).generate()(req, res, next);
      },
      credentialCsrfGuard,
      async (req, res) => {
        try {
          const input = z.object({ changeId: z.string().trim().min(6) }).strict().safeParse(req.body);
          if (!input.success) { res.status(400).json({ error: { code: 'VALIDATION_ERROR' } }); return; }
          if (!cradle.disablePasswordCredentialUseCase) { res.status(503).json({ error: { code: 'AUTH_UNAVAILABLE' } }); return; }
          await cradle.disablePasswordCredentialUseCase.execute(req.authUserId!, String(req.params.identityId), input.data.changeId);
          res.status(200).json(responseFormatter.success({ disabled: true }));
        } catch {
          res.status(403).json({ error: { code: 'CREDENTIAL_OPERATION_DENIED' } });
        }
      });


    const authenticateMfa = (req: Request, res: Response, next: NextFunction) => {
      if (!tokenProvider || !sessionManager) { res.status(401).json({ error: { code: 'SESSION_REQUIRED' } }); return; }
      return new AuthMiddleware(tokenProvider, sessionManager, principalAccessValidator, cradle.mfaUseCases).generate()(req, res, next);
    };
    const mfaFailure = (res: Response, error: unknown) => {
      const code = error instanceof Error ? error.message : '';
      const unavailable = /UNAVAILABLE|TRANSACTION_REQUIRED/.test(code);
      res.status(unavailable ? 503 : 400).json({ error: { code: unavailable ? 'MFA_UNAVAILABLE' : 'MFA_OPERATION_DENIED' } });
    };
    router.get('/mfa', authenticateMfa, async (req, res) => {
      try { if (!cradle.mfaUseCases) throw new Error('MFA_UNAVAILABLE');
        res.json(responseFormatter.success(await cradle.mfaUseCases.status(req.authUserId!, req.authSessionId)));
      } catch (error) { mfaFailure(res, error); }
    });
    router.post('/mfa/enroll', authenticateMfa, credentialCsrfGuard, async (req, res) => {
      try { if (!cradle.mfaUseCases) throw new Error('MFA_UNAVAILABLE');
        const limit = await securityService.getRateLimiter().consume(`mfa:enroll:${req.authUserId}`, 5, 15 * 60_000);
        if (!limit.allowed) { res.status(429).json({ error: { code: 'AUTH_RATE_LIMITED' } }); return; }
        const body = z.object({ password: z.string().min(1).max(128) }).strict().parse(req.body);
        res.json(responseFormatter.success(await cradle.mfaUseCases.begin(req.authUserId!, body.password)));
      } catch (error) { mfaFailure(res, error); }
    });
    router.post('/mfa/confirm', authenticateMfa, credentialCsrfGuard, async (req, res) => {
      try { if (!cradle.mfaUseCases) throw new Error('MFA_UNAVAILABLE');
        const limit = await securityService.getRateLimiter().consume(`mfa:confirm:${req.authUserId}`, 5, 15 * 60_000);
        if (!limit.allowed) { res.status(429).json({ error: { code: 'AUTH_RATE_LIMITED' } }); return; }
        const body = z.object({ code: z.string().regex(/^\d{6}$/) }).strict().parse(req.body);
        await cradle.mfaUseCases.confirm(req.authUserId!, body.code); clearAuthCookies(res);
        res.json(responseFormatter.success({ enabled: true, loginRequired: true }));
      } catch (error) { mfaFailure(res, error); }
    });
    router.post('/mfa/disable', authenticateMfa, credentialCsrfGuard, async (req, res) => {
      try { if (!cradle.mfaUseCases) throw new Error('MFA_UNAVAILABLE');
        const limit = await securityService.getRateLimiter().consume(`mfa:disable:${req.authUserId}`, 5, 15 * 60_000);
        if (!limit.allowed) { res.status(429).json({ error: { code: 'AUTH_RATE_LIMITED' } }); return; }
        const body = z.object({ password: z.string().min(1).max(128), code: z.string().regex(/^\d{6}$/) }).strict().parse(req.body);
        await cradle.mfaUseCases.disable(req.authUserId!, body.password, body.code); clearAuthCookies(res);
        res.json(responseFormatter.success({ enabled: false, loginRequired: true }));
      } catch (error) { mfaFailure(res, error); }
    });
    router.post('/mfa/step-up', authenticateMfa, credentialCsrfGuard, async (req, res) => {
      try { if (!cradle.mfaUseCases) throw new Error('MFA_UNAVAILABLE');
        const limit = await securityService.getRateLimiter().consume(`mfa:step-up:${req.authUserId}`, 5, 15 * 60_000);
        if (!limit.allowed) { res.status(429).json({ error: { code: 'AUTH_RATE_LIMITED' } }); return; }
        const body = z.object({ password: z.string().min(1).max(128), code: z.string().regex(/^\d{6}$/) }).strict().parse(req.body);
        await cradle.mfaUseCases.stepUp(req.authUserId!, req.authSessionId!, body.password, body.code);
        res.json(responseFormatter.success({ stepUpFresh: true }));
      } catch (error) { mfaFailure(res, error); }
    });

    // Public verification contract for asymmetric access-token consumers.
    router.get('/jwks.json', (_req: Request, res: Response) => {
      if (!tokenProvider?.getJwks) {
        res.status(503).json(responseFormatter.error({ code: 'JWKS_UNAVAILABLE', message: 'Token verification keys are unavailable' }));
        return;
      }
      res.status(200).json(tokenProvider.getJwks());
    });

    // 0. GET /csrf-token
    router.get('/csrf-token', async (req: Request, res: Response) => {
      if (!securityService) {
        res.status(503).json(responseFormatter.error({
          code: 'SECURITY_SERVICE_UNAVAILABLE',
          message: 'CSRF protection is unavailable'
        }));
        return;
      }
      const refreshToken = readRefreshCookie(req);
      if (!refreshToken || !tokenProvider || !sessionManager) {
        res.status(401).json(responseFormatter.error({
          code: 'CSRF_SESSION_REQUIRED',
          message: 'An authenticated session is required'
        }));
        return;
      }
      try {
        await tokenProvider.validateRefreshToken(refreshToken);
        const refreshSession = await sessionManager.findRefreshSession(refreshToken);
        if (!refreshSession || !await sessionManager.isSessionActive(refreshSession.userId, refreshSession.sessionId) || !await principalAccessValidator.isAuthenticationAllowed(refreshSession.userId)) {
          if (refreshSession) await sessionManager.revokeAllSessions(refreshSession.userId);
          throw new Error('Inactive session');
        }
        const token = securityService.generateCsrfToken(refreshToken);
        res.setHeader('X-CSRF-Token', token);
        res.status(200).json(responseFormatter.success({ csrfToken: token }));
      } catch {
        clearAuthCookies(res);
        res.status(401).json(responseFormatter.error({
          code: 'CSRF_SESSION_REQUIRED',
          message: 'An authenticated session is required'
        }));
      }
    });

    // 0.1 GET /me (Permission-aware current-user contract)
    router.get('/me', async (req: Request, res: Response) => {
      try {
        let principalId: string | null = (req as any).authUserId || null;
        let principalValidated = false;

        if (!principalId) {
          const authHeader = req.headers.authorization;
          const token = readAccessCookie(req) || (authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null);
          if (token && tokenProvider) {
            try {
              const provider = tokenProvider as ITokenProvider & {
                verifyAccessTokenSync?: (value: string) => { userId?: string; sessionId?: string };
              };
              const payload = provider.verifyAccessTokenSync
                ? provider.verifyAccessTokenSync(token)
                : await provider.verifyAccessToken(token);
              if (
                payload?.userId
                && payload.sessionId
                && sessionManager
                && await sessionManager.isSessionActive(payload.userId, payload.sessionId)
                && await principalAccessValidator.isAuthenticationAllowed(payload.userId)
                && (!cradle.mfaUseCases || await cradle.mfaUseCases.sessionAuthenticated(payload.userId,payload.sessionId))
              ) {
                principalId = payload.userId;
                principalValidated = true;
              }
            } catch (e) {
              // Invalid or expired tokens remain unauthenticated.
            }
          }
        }

        if (!principalId) {
          res.status(401).json(responseFormatter.error({
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }));
          return;
        }

        if (!principalValidated && !await principalAccessValidator.isAuthenticationAllowed(principalId)) {
          if (sessionManager) await sessionManager.revokeAllSessions(principalId);
          res.status(401).json(responseFormatter.error({ code: 'SESSION_NOT_ACTIVE', message: 'Authentication required' }));
          return;
        }
        const identity = await identityRepository.findById(principalId);
        if (!identity) {
          res.status(401).json(responseFormatter.error({ code: 'SESSION_NOT_ACTIVE', message: 'Authentication required' }));
          return;
        }
        const displayName = identity.user?.profile.props.displayName || principalId;
        const primaryEmail = identity.user?.contactRegistry.primaryEmail || '';

        const roles: string[] = [];
        const roleNames: string[] = [];
        const effectivePermissions = new Set<string>();

        if (roleAssignmentRepository && roleRepository) {
          const assignments = await roleAssignmentRepository.findByIdentityId(principalId);
          for (const assign of assignments) {
            roles.push(assign.roleId);
            const role = await roleRepository.findById(assign.roleId);
            if (role) {
              roleNames.push(role.name);
              for (const permRef of role.permissions) {
                const permVal = typeof permRef === 'string'
                  ? permRef
                  : ((permRef as any)?.permission || (permRef as any)?.value || String(permRef));
                if (!permVal) continue;
                if (!role.policyIds?.length) {
                  effectivePermissions.add(permVal);
                  continue;
                }
                if (!cradle.authEvaluatorService) continue;
                const prefix = permVal === '*' ? '' : permVal.endsWith(':*') ? permVal.slice(0, -1) : null;
                const candidates = prefix === null ? [permVal] : KNOWN_ADMIN_PERMISSIONS.filter(value => value.startsWith(prefix));
                for (const candidate of candidates) {
                  const decision = await cradle.authEvaluatorService.evaluatePermission(principalId, candidate, {
                    ip: req.ip || req.socket?.remoteAddress || undefined,
                    requestTime: new Date(), userAgent: req.headers['user-agent'],
                    correlationId: req.headers['x-correlation-id'],
                  });
                  if (decision.isGranted) effectivePermissions.add(candidate);
                }
              }
            }
          }
        }

        res.status(200).json(responseFormatter.success({
          principalId,
          displayName,
          primaryEmail,
          roles,
          roleNames,
          effectivePermissions: Array.from(effectivePermissions)
        }));
      } catch (error: any) {
        res.status(500).json(responseFormatter.error({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve current user session'
        }));
      }
    });

    // 1. POST /login
    router.post('/login', async (req: Request, res: Response) => {
      try {
        const schema = z.object({
          email: z.string().email('Invalid email address'),
          password: z.string().min(1, 'Password is required'),
          rememberMe: z.boolean().optional(),
          mfaCode: z.string().regex(/^\d{6}$/).optional()
        });

        const parseResult = schema.safeParse(req.body);
        if (!parseResult.success) {
          res.status(400).json(responseFormatter.error({
            code: 'VALIDATION_ERROR',
            message: parseResult.error.issues[0]?.message || 'Validation failed'
          }));
          return;
        }

        const { email, password, rememberMe, mfaCode } = parseResult.data;
        const accountKey = authRateLimitKey(email.trim().toLowerCase());
        const remoteAddress = req.ip || req.socket.remoteAddress || 'unknown';
        const [accountLimit, accountIpLimit] = await Promise.all([
          securityService.getRateLimiter().consume(`auth:account:${accountKey}`, 20, 15 * 60 * 1000),
          securityService.getRateLimiter().consume(`auth:account-ip:${accountKey}:${remoteAddress}`, 8, 15 * 60 * 1000),
        ]);
        if (!accountLimit.allowed || !accountIpLimit.allowed) {
          res.status(429).json(responseFormatter.error({
            code: 'AUTH_RATE_LIMITED',
            message: 'Too many authentication attempts. Please try again later.'
          }));
          return;
        }
        const identity = await identityRepository.findByEmail(email);

        if (!identity) {
          await credentialVerifier?.verifyDummy?.(password);
          res.status(401).json(responseFormatter.error({
            code: 'UNAUTHORIZED',
            message: 'Invalid credentials or identity not found'
          }));
          return;
        }

        let tokens;
        try {
          const sessionTtlSeconds = rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60;
          tokens = await (authService as any).login(identity.id.toString(), password, sessionTtlSeconds, mfaCode);
        } catch (authError) {
          if (authError instanceof Error && authError.message === 'MFA_REQUIRED') {
            res.status(401).json(responseFormatter.error({ code: 'MFA_REQUIRED', message: 'MFA_REQUIRED' })); return;
          }
          res.status(401).json(responseFormatter.error({
            code: 'UNAUTHORIZED',
            message: 'Invalid credentials or identity not found'
          }));
          return;
        }
        
        setAuthCookies(res, tokens, !!rememberMe);
        res.status(200).json(responseFormatter.success({
          authenticated: true,
        }));
      } catch (error: any) {
        res.status(500).json(responseFormatter.error({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred during login'
        }));
      }
    });

    // 2. POST /refresh
    router.post('/refresh', credentialCsrfGuard, async (req: Request, res: Response) => {
      try {
        const refreshToken = readRefreshCookie(req);
        if (!refreshToken) {
          res.status(401).json(responseFormatter.error({ code: 'INVALID_TOKEN', message: 'Session is unavailable' }));
          return;
        }
        const rememberMe = readRememberMeCookie(req);
        const tokens = await authService.refreshTokens(refreshToken);
        setAuthCookies(res, tokens, rememberMe);
        res.status(200).json(responseFormatter.success({
          authenticated: true,
        }));
      } catch {
        clearAuthCookies(res);
        res.status(401).json(responseFormatter.error({
          code: 'INVALID_TOKEN',
          message: 'Session revoked, expired, or invalid refresh token'
        }));
      }
    });

    // 3. POST /logout
    router.post('/logout', credentialCsrfGuard, async (req: Request, res: Response) => {
      let failed = false;
      try {
        const refreshToken = readRefreshCookie(req);
        if (refreshToken && authService) {
          try {
            await authService.logoutCurrentSession(refreshToken);
          } catch {
            failed = true;
          }
        }
      } finally {
        clearAuthCookies(res);
      }
      if (failed) {
        res.status(401).json(responseFormatter.error({ code: 'LOGOUT_FAILED', message: 'Session logout could not be confirmed' }));
      } else {
        res.status(200).json(responseFormatter.success({ message: 'Successfully logged out' }));
      }
    });

    router.post('/register', authBudget('register', 5, 60 * 60_000, emailKey('primaryEmail')), async (req: Request, res: Response) => {
      const parsed = z.object({
        displayName: z.string().trim().min(1),
        primaryEmail: z.string().trim().email().max(255),
        password: z.string().min(8).max(128),
        preferredLanguage: z.string().optional(),
      }).strict().safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(responseFormatter.error({ code: 'VALIDATION_ERROR', message: 'Invalid registration input' }));
        return;
      }
      if (!cradle.registerUserUseCase) {
        res.status(503).json(responseFormatter.error({ code: 'AUTH_UNAVAILABLE', message: 'Registration unavailable' }));
        return;
      }
      try {
        await cradle.registerUserUseCase.execute(parsed.data);
        res.status(202).json(responseFormatter.success({ registrationPending: true, message: 'If registration can proceed, check your email for the next step.' }));
      } catch (error: any) {
        if (error.code === 'EMAIL_ALREADY_EXISTS') {
          await credentialVerifier?.verifyDummy?.(parsed.data.password);
          res.status(202).json(responseFormatter.success({ registrationPending: true, message: 'If registration can proceed, check your email for the next step.' }));
          return;
        }
        res.status(500).json(responseFormatter.error({
          code: error.code || 'REGISTRATION_FAILED', message: 'Registration failed',
        }));
      }
    });

    router.post('/verify-email', authBudget('verify-email', 10, 15 * 60_000, tokenKey), async (req: Request, res: Response) => {
      const parsed = z.object({ token: z.string().trim().min(1).max(512) }).strict().safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(responseFormatter.error({ code: 'VALIDATION_ERROR', message: 'Verification token is required' }));
        return;
      }
      if (!cradle.verifyEmailUseCase) {
        res.status(503).json(responseFormatter.error({ code: 'AUTH_UNAVAILABLE', message: 'Verification unavailable' }));
        return;
      }
      try {
        const result = await cradle.verifyEmailUseCase.execute(parsed.data);
        res.status(200).json(responseFormatter.success({ ...result, verified: result.isEmailVerified }));
      } catch (error: any) {
        res.status(error.code ? 400 : 500).json(responseFormatter.error({
          code: error.code || 'VERIFICATION_FAILED', message: 'Email verification failed',
        }));
      }
    });

    router.post('/resend-verification', authBudget('resend-verification', 1, 60_000, emailKey('email')), async (req: Request, res: Response) => {
      const parsed = z.object({ email: z.string().trim().email() }).strict().safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(responseFormatter.error({ code: 'VALIDATION_ERROR', message: 'Invalid email address' }));
        return;
      }
      if (!cradle.resendVerificationUseCase) {
        res.status(503).json(responseFormatter.error({ code: 'AUTH_UNAVAILABLE', message: 'Verification unavailable' }));
        return;
      }
      try {
        res.status(200).json(responseFormatter.success(await cradle.resendVerificationUseCase.execute(parsed.data)));
      } catch {
        res.status(500).json(responseFormatter.error({ code: 'VERIFICATION_FAILED', message: 'Unable to resend verification' }));
      }
    });

    // 7. POST /forgot-password
    router.post('/forgot-password', async (req: Request, res: Response) => {
      try {
        const schema = z.union([
          z.object({ primaryEmail: z.string().trim().email('Invalid email address').max(255) }).strict(),
          z.object({ email: z.string().trim().email('Invalid email address').max(255) }).strict(),
          z.object({
            primaryEmail: z.string().trim().email('Invalid email address').max(255).optional(),
            email: z.string().trim().email('Invalid email address').max(255).optional(),
          }).refine(data => !!(data.primaryEmail || data.email), {
            message: 'Email address is required'
          })
        ]);
        const parseResult = schema.safeParse(req.body);
        if (!parseResult.success) {
          res.status(400).json(responseFormatter.error({
            code: 'VALIDATION_ERROR',
            message: parseResult.error.issues[0]?.message || 'Validation failed'
          }));
          return;
        }
        const data = parseResult.data as { primaryEmail?: string; email?: string };
        const rawEmail = (data.primaryEmail || data.email)!.trim().toLowerCase();
        const remoteAddress = req.ip || req.socket.remoteAddress || 'unknown';
        const rateLimit = await securityService.getRateLimiter().consume(`auth:forgot-password:${remoteAddress}`, 10, 15 * 60 * 1000);
        if (!rateLimit.allowed) {
          res.status(429).json(responseFormatter.error({
            code: 'AUTH_RATE_LIMITED',
            message: 'Too many password reset requests. Please try again later.'
          }));
          return;
        }
        const result = await forgotPasswordUseCase.execute({ primaryEmail: rawEmail });
        res.status(200).json(responseFormatter.success({
          message: result.message
        }));
      } catch (error) {
        res.status(500).json(responseFormatter.error({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred'
        }));
      }
    });

    // 8. POST /reset-password
    router.post('/reset-password', authBudget('reset-password', 5, 15 * 60_000, tokenKey), async (req: Request, res: Response) => {
      try {
        const schema = z.object({
          token: z.string().trim().min(1, 'Reset token is required').max(512),
          newPassword: z.string().min(8, 'Password must be at least 8 characters long').max(128),
        }).strict();
        const parseResult = schema.safeParse(req.body);
        if (!parseResult.success) {
          res.status(400).json(responseFormatter.error({
            code: 'VALIDATION_ERROR',
            message: parseResult.error.issues[0]?.message || 'Validation failed'
          }));
          return;
        }
        const result = await resetPasswordUseCase.execute(parseResult.data);
        res.status(200).json(responseFormatter.success({
          message: result.message
        }));
      } catch (error: any) {
        const code = error.code || 'RESET_PASSWORD_FAILED';
        res.status(400).json(responseFormatter.error({
          code,
          message: error.message || 'Password reset failed'
        }));
      }
    });

    return router;
  }
}
export default AuthRouter;

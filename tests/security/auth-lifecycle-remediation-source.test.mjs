import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('MNT-AUD-0076 lifecycle denial revokes sessions and is enforced at authentication boundaries', () => {
  for (const file of [
    'packages/application/src/identity/SuspendIdentityUseCase.ts',
    'packages/application/src/identity/ArchiveIdentityUseCase.ts',
    'packages/application/src/identity/PurgeIdentityUseCase.ts',
  ]) {
    const source = read(file);
    assert.match(source, /sessionManager\.revokeAllSessions\(input\.identityId\)/);
  }

  const authService = read('packages/application/src/auth/AuthService.ts');
  assert.match(authService, /principalAccessValidator\.isAuthenticationAllowed\(currentSession\.userId\)/);
  assert.match(authService, /principalAccessValidator\.isAuthenticationAllowed\(rotated\.userId\)/);

  const middleware = read('apps/api/src/presentation/middleware/AuthMiddleware.ts');
  assert.match(middleware, /Session-bound access token required/);
  assert.match(middleware, /principalAccessValidator\.isAuthenticationAllowed\(payload\.userId\)/);
  assert.match(middleware, /sessionManager\.revokeAllSessions\(payload\.userId\)/);

  const authRouter = read('apps/api/src/presentation/api/router/AuthRouter.ts');
  assert.match(authRouter, /principalAccessValidator\.isAuthenticationAllowed\(refreshSession\.userId\)/);
  assert.match(authRouter, /principalAccessValidator\.isAuthenticationAllowed\(payload\.userId\)/);
});

test('MNT-AUD-0065 compatibility control plane uses the same strict session and lifecycle boundary', () => {
  const app = read('apps/api/src/app.ts');
  assert.match(app, /const protectControlPlane = [\s\S]*createAdminGuard\(\{ mode: adminAuthMode, tokenProvider: adminTokenProvider, sessionManager: adminSessionManager, principalAccessValidator \}\)/);

  const guard = read('apps/api/src/presentation/security/SecurityMiddlewareFactory.ts');
  assert.match(guard, /payload\.sessionId/);
  assert.match(guard, /options\.sessionManager/);
  assert.match(guard, /options\.principalAccessValidator/);
  assert.doesNotMatch(guard, /Legacy bearer clients can remain usable until their access token expires/);
});

test('MNT-AUD-0062 AI operator gateway is reachable only through authenticated privileged composition', () => {
  const app = read('apps/api/src/app.ts');
  assert.match(app, /v1Router\.use\('\/admin\/ai\/operator', requireAdminPermission\('admin:ai:manage'\), lazyRouter\('aiGatewayRouter'\)\)/);
  assert.match(app, /v1Router\.use\('\/ai', \.\.\.protectControlPlane\('admin:ai:manage', 'aiGatewayRouter'\)\)/);
  assert.doesNotMatch(app, /v1Router\.use\('\/ai', requireAdminPermission\('admin:ai:manage'\), lazyRouter\('aiGatewayRouter'\)\)/);
});

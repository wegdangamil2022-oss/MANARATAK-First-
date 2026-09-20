import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');

test('canonical token provider is asymmetric and refresh credentials are opaque', () => {
  const source = read('packages/infrastructure/src/auth/JwtTokenProvider.ts');
  assert.match(source, /alg: 'RS256'/);
  assert.match(source, /crypto\.sign\('RSA-SHA256'/);
  assert.match(source, /crypto\.verify\('RSA-SHA256'/);
  assert.match(source, /REFRESH_TOKEN_BYTES = 32/);
  assert.match(source, /randomBytes\(REFRESH_TOKEN_BYTES\)/);
  assert.doesNotMatch(source, /HS256|createHmac\([^)]*JWT/);
});

test('access-token TTL is capped at 15 minutes in config and provider', () => {
  const provider = read('packages/infrastructure/src/auth/JwtTokenProvider.ts');
  const config = read('packages/config/src/AppConfig.ts');
  assert.match(provider, /ACCESS_TOKEN_MAX_TTL_SECONDS = 15 \* 60/);
  assert.match(config, /max\(900\)\.default\(900\)/);
});

test('refresh rotation is atomic at the persistence boundary with lineage and replay response', () => {
  const manager = read('packages/infrastructure/src/auth/PrismaSessionManager.ts');
  const schema = read('packages/infrastructure/prisma/schema.prisma');
  assert.match(manager, /consumeAndRotateRefreshSession/);
  assert.match(manager, /this\.prisma\.\$transaction/);
  assert.match(manager, /consumed\.count !== 1/);
  assert.match(manager, /familyId: parent\.familyId/);
  assert.match(manager, /parentSessionId: parent\.id/);
  assert.match(schema, /familyId\s+String/);
  assert.match(schema, /parentSessionId\s+String\?/);
  assert.match(schema, /rotatedAt\s+DateTime\?/);
});

test('active runtime no longer reads JWT_SECRET and publishes a JWKS contract', () => {
  const container = read('apps/api/src/infrastructure/di/container.ts');
  const router = read('apps/api/src/presentation/api/router/AuthRouter.ts');
  const env = read('.env.example');
  assert.doesNotMatch(container, /JWT_SECRET/);
  assert.doesNotMatch(env, /^JWT_SECRET=/m);
  assert.match(container, /JWT_PRIVATE_KEY_PEM/);
  assert.match(router, /\/jwks\.json/);
  assert.match(router, /getJwks/);
});

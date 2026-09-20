import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');

test('boolean environment parsing is explicit and never uses z.coerce.boolean', () => {
  const source = read('packages/config/src/AppConfig.ts');
  assert.doesNotMatch(source, /z\.coerce\.boolean\(\)/);
  assert.match(source, /normalized === 'false' \|\| normalized === '0'/);
  assert.match(source, /normalized === 'true' \|\| normalized === '1'/);
});

test('readiness consumes normalized AppConfig and worker uses ConfigurationRegistry', () => {
  const readiness = read('packages/config/src/ProductionReadinessValidator.ts');
  const app = read('apps/api/src/app.ts');
  const server = read('apps/api/src/server.ts');
  assert.match(readiness, /loadAppConfig\(process\.env\)/);
  assert.match(app, /ProductionReadinessValidator\.validate\(normalizedRuntimeConfig\)/);
  assert.doesNotMatch(server, /process\.env\.CERTIFICATE_COMPLETION_WORKER_/);
  assert.match(server, /config\.getOptional<boolean>\('CERTIFICATE_COMPLETION_WORKER_ENABLED'\)/);
});

test('production environment templates declare managed Redis and startup-blocking controls', () => {
  for (const file of ['.env.example', 'apps/api/.env.example']) {
    const source = read(file);
    for (const key of ['REDIS_URL','JWT_ISSUER','JWT_AUDIENCE','SECURE_COOKIE','TRUST_PROXY_HOPS','PUBLIC_WEB_URL','ADMIN_WEB_URL','SECURITY_CSP_ENABLED','CERTIFICATE_COMPLETION_WORKER_ENABLED','CERTIFICATE_COMPLETION_WORKER_INTERVAL_MS']) {
      assert.match(source, new RegExp(`^${key}=`, 'm'), `${file} missing ${key}`);
    }
    assert.doesNotMatch(source, /REDIS[^\n]*OPTIONAL|in-memory rate limiting/i);
  }
});

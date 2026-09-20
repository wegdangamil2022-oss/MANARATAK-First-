import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = (file) => fs.readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');

test('local compose exposes dependencies only on loopback with authentication and development gate', () => {
  const compose = read('docker-compose.yml');
  assert.match(compose, /profiles: \["development"\]/);
  assert.match(compose, /development-safety-gate/);
  assert.match(compose, /MANARATAK_COMPOSE_ENVIRONMENT.*development/);
  assert.match(compose, /127\.0\.0\.1:\$\{POSTGRES_PORT:-5432\}:5432/);
  assert.match(compose, /127\.0\.0\.1:\$\{REDIS_PORT:-6379\}:6379/);
  assert.doesNotMatch(compose, /POSTGRES_PASSWORD:\s*(password|root)/i);
  assert.match(compose, /POSTGRES_PASSWORD: \$\{POSTGRES_PASSWORD:\?/);
  assert.match(compose, /--requirepass/);
  assert.match(compose, /REDIS_PASSWORD: \$\{REDIS_PASSWORD:\?/);
});

test('local compose credentials are generated into ignored file and production-like launch is rejected', () => {
  const init = read('scripts/dev/init-compose-env.mjs');
  const wrapper = read('scripts/dev/compose-safe.mjs');
  const gitignore = read('.gitignore');
  assert.match(init, /randomBytes/);
  assert.match(init, /mode: 0o600/);
  assert.match(gitignore, /^\.env\.\*$/m);
  assert.match(wrapper, /runtime === 'production' \|\| runtime === 'staging'/);
  assert.match(wrapper, /MANARATAK_COMPOSE_ENVIRONMENT !== 'development'/);
  assert.match(wrapper, /value\.length < 20/);
});

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyStudioRuntimeDefaults } from '../../scripts/aistudio/runtime-defaults.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const launcher = path.join(root, 'scripts/aistudio/run.mjs');

test('Studio build exits unsuccessfully when Vite rejects its configuration', () => {
  const env = Object.fromEntries(Object.entries(process.env).filter(([name]) =>
    /^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|PATHEXT|LOCALAPPDATA)$/i.test(name)));
  env.VITE_LOCAL_ADMIN_READ_ONLY = 'true';
  const result = spawnSync(process.execPath, [launcher, 'admin', 'build'], {
    cwd: root,
    env,
    encoding: 'utf8',
    timeout: 30_000,
  });
  assert.equal(result.error, undefined);
  assert.notEqual(result.status, 0, 'A rejected build must not report success');
  assert.match(result.stdout + result.stderr, /VITE_LOCAL_ADMIN_READ_ONLY is forbidden/);
});

test('Studio defaults use a short access token and only configured public origins', () => {
  const noOrigin = {};
  applyStudioRuntimeDefaults(noOrigin);
  assert.equal(noOrigin.ACCESS_TOKEN_TTL_SECONDS, '900');
  assert.equal(noOrigin.SESSION_TTL_SECONDS, '2592000');
  assert.equal(noOrigin.PUBLIC_WEB_URL, undefined);
  assert.equal(noOrigin.VITE_PUBLIC_WEB_URL, undefined);

  const withOrigin = { APP_URL: 'https://studio.example.invalid' };
  applyStudioRuntimeDefaults(withOrigin);
  assert.equal(withOrigin.PUBLIC_WEB_URL, withOrigin.APP_URL);
  assert.equal(withOrigin.VITE_PUBLIC_WEB_URL, withOrigin.APP_URL);

  const explicit = {
    APP_URL: 'https://studio.example.invalid',
    PUBLIC_WEB_URL: 'https://web.example.invalid',
    VITE_PUBLIC_WEB_URL: 'https://preview.example.invalid',
    ACCESS_TOKEN_TTL_SECONDS: '600',
  };
  applyStudioRuntimeDefaults(explicit);
  assert.equal(explicit.PUBLIC_WEB_URL, 'https://web.example.invalid');
  assert.equal(explicit.VITE_PUBLIC_WEB_URL, 'https://preview.example.invalid');
  assert.equal(explicit.ACCESS_TOKEN_TTL_SECONDS, '600');
});

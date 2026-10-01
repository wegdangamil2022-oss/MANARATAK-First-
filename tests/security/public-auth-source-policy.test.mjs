import assert from 'node:assert/strict';
import test from 'node:test';
import { hasClientAuthStorage } from '../../scripts/lib/public-auth-source-policy.mjs';

test('rejects client auth reads/writes including multiline calls', () => {
  for (const storage of ['localStorage', 'sessionStorage']) {
    for (const operation of ['getItem', 'setItem']) {
      for (const key of ['role', 'permissions', 'admin_access', 'user_email', 'access_token']) {
        assert.equal(hasClientAuthStorage(`${storage}.${operation}(\n '${key}', 'x')`), true);
      }
    }
  }
  assert.equal(hasClientAuthStorage('localStorage.role = identity.role;'), true);
});

test('allows deletion and ordinary preferences, but still rejects adjacent authority writes', () => {
  assert.equal(hasClientAuthStorage("localStorage.removeItem('access_token'); sessionStorage.removeItem('admin_access');"), false);
  assert.equal(hasClientAuthStorage("window.localStorage?.removeItem('access_token');"), false);
  assert.equal(hasClientAuthStorage("localStorage.setItem('theme', 'dark');"), false);
  assert.equal(hasClientAuthStorage("localStorage.removeItem('token'); localStorage.setItem('role', 'admin');"), true);
});

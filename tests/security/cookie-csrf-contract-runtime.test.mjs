import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = fs.readFileSync(new URL('../../packages/infrastructure/src/security/SecurityService.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
class DefaultRateLimiter { async consume() { return { allowed: true, remaining: 1, resetTime: Date.now() }; } }
const sandbox = { module: { exports: {} }, exports: {}, console, Buffer, require(specifier) {
  if (specifier === '@manaratak/core') return {};
  if (specifier === './DefaultRateLimiter') return { DefaultRateLimiter };
  if (specifier === 'node:crypto') return require('node:crypto');
  throw new Error(`unexpected require: ${specifier}`);
}};
sandbox.exports = sandbox.module.exports;
vm.runInNewContext(compiled, sandbox, { filename: 'SecurityService.js' });
const { SecurityService } = sandbox.module.exports;

test('CSRF token is bound to both deployment key and refresh session', () => {
  const a = new SecurityService(undefined, { signingSecret: 'A'.repeat(32) });
  const b = new SecurityService(undefined, { signingSecret: 'B'.repeat(32) });
  const token = a.generateCsrfToken('refresh-session-A');
  assert.equal(a.validateCsrfToken(token, 'refresh-session-A'), true);
  assert.equal(a.validateCsrfToken(token, 'refresh-session-B'), false);
  assert.equal(b.validateCsrfToken(token, 'refresh-session-A'), false);
});

test('CSRF service fails closed without a server-owned signing key', () => {
  const service = new SecurityService();
  assert.throws(() => service.generateCsrfToken('refresh'), /CSRF_SIGNING_SECRET_REQUIRED/);
});

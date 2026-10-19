import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = fs.readFileSync(new URL('../../apps/api/src/presentation/security/CanonicalApiCorsPolicy.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const sandbox = { module: { exports: {} }, exports: {}, console };
sandbox.exports = sandbox.module.exports;
vm.runInNewContext(compiled, sandbox, { filename: 'CanonicalApiCorsPolicy.js' });
const { CANONICAL_API_REQUEST_HEADERS, buildCanonicalCorsOrigins } = sandbox.module.exports;

test('canonical preflight headers include idempotency and correlation contracts', () => {
  const normalized = CANONICAL_API_REQUEST_HEADERS.map(value => value.toLowerCase());
  for (const header of ['idempotency-key', 'x-correlation-id', 'x-request-id', 'x-csrf-token']) {
    assert.equal(normalized.includes(header), true, `${header} missing`);
  }
});

test('canonical origins include distinct public and admin applications and deduplicate', () => {
  const origins = buildCanonicalCorsOrigins({
    corsOrigin: 'https://app.absheer.org',
    publicWebUrl: 'https://app.absheer.org',
    adminWebUrl: 'https://admin.absheer.org',
    additionalOrigins: 'https://partner.example, https://admin.absheer.org',
  });
  assert.deepEqual([...origins], ['https://app.absheer.org', 'https://admin.absheer.org', 'https://partner.example']);
});

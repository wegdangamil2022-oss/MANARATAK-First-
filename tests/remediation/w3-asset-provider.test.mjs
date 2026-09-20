import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = path.resolve(import.meta.dirname, '../..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
function load(rel) {
  const js = ts.transpileModule(read(rel), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const m = { exports: {} };
  vm.runInThisContext(`(function(require,exports,module){${js}\n})`, { filename: rel })(require, m.exports, m);
  return m.exports;
}
const { SignedProviderHttpClient } = load('packages/infrastructure/src/provider-http/SignedProviderHttpClient.ts');

test('MNT-AUD-0011 signed provider transport requires HTTPS and a strong signing secret', () => {
  assert.throws(() => new SignedProviderHttpClient({ baseUrl: 'http://provider.internal/', apiKey: 'k', signingSecret: 'x'.repeat(32) }), /PROVIDER_HTTPS_REQUIRED/);
  assert.throws(() => new SignedProviderHttpClient({ baseUrl: 'https://provider.internal/', apiKey: 'k', signingSecret: 'short' }), /PROVIDER_SIGNING_SECRET_TOO_SHORT/);
});

test('MNT-AUD-0011 provider requests are body-bound, nonce/timestamp signed and base-path confined', async () => {
  let captured;
  const fetchImpl = async (input, init) => {
    captured = { url: String(input), init };
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const client = new SignedProviderHttpClient({
    baseUrl: 'https://provider.internal/asset-api/',
    apiKey: 'provider-key',
    signingSecret: '0123456789abcdef0123456789abcdef',
    fetchImpl,
    now: () => new Date('2026-09-07T00:00:00.000Z'),
  });
  const result = await client.json('POST', '/v1/assets/ping', { a: 1 }, { idempotencyKey: 'idem-1' });
  assert.deepEqual(result, { ok: true });
  assert.equal(captured.url, 'https://provider.internal/asset-api/v1/assets/ping');
  const headers = new Headers(captured.init.headers);
  assert.equal(headers.get('x-manaratak-provider-key'), 'provider-key');
  assert.equal(headers.get('x-manaratak-timestamp'), '2026-09-07T00:00:00.000Z');
  assert.match(headers.get('x-manaratak-nonce'), /^[0-9a-f-]{36}$/i);
  assert.match(headers.get('x-manaratak-content-sha256'), /^[a-f0-9]{64}$/);
  assert.match(headers.get('x-manaratak-signature'), /^[a-f0-9]{64}$/);
  assert.equal(headers.get('idempotency-key'), 'idem-1');
});

test('MNT-AUD-0011 lifecycle source makes sanitizer output canonical and forbids client-selected clean locators', () => {
  const lifecycle = read('packages/application/src/asset-platform/use-cases/ProcessAssetLifecycleUseCase.ts');
  const router = read('apps/api/src/presentation/api/router/AssetPlatformRouter.ts');
  assert.match(lifecycle, /completeSanitization\(result\.metadata, result\.sanitizedLocator\)/);
  assert.match(lifecycle, /storageGateway\.moveToCleanZone\(record\.locator\)/);
  assert.doesNotMatch(lifecycle, /dto\.cleanBucketName|dto\.cleanPathKey/);
  assert.match(router, /const activateAssetSchema = z\.object\(\{\}\)\.strict\(\)/);
  assert.match(router, /const sanitizeAssetSchema = z\.object\(\{\}\)\.strict\(\)/);
  assert.match(router, /delivery-grant/);
});

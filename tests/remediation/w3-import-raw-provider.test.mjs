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
function transpile(rel) {
  return ts.transpileModule(read(rel), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
}
function evaluate(rel, customRequire = require) {
  const m = { exports: {} };
  vm.runInThisContext(`(function(require,exports,module){${transpile(rel)}\n})`, { filename: rel })(customRequire, m.exports, m);
  return m.exports;
}
const providerModule = evaluate('packages/infrastructure/src/provider-http/SignedProviderHttpClient.ts');
const importStoreModule = evaluate('packages/infrastructure/src/import-foundation/HttpImportRawSnapshotStore.ts', (id) => {
  if (id === '../provider-http/SignedProviderHttpClient') return providerModule;
  return require(id);
});
const { HttpImportRawSnapshotStore } = importStoreModule;

const secret = '0123456789abcdef0123456789abcdef';
const acquisition = {
  sourceId: 'source-a',
  connectorId: 'official-api',
  connectorVersion: '2.0.0',
  rawBytes: new TextEncoder().encode('{"hello":"world"}'),
  fetchedAt: new Date('2026-09-07T01:00:00.000Z'),
  requestedUrl: 'https://source.example/api',
  finalUrl: 'https://source.example/api',
  statusCode: 200,
  contentType: 'application/json',
  etag: 'etag-1',
};

function createStore({ corruptRead = false } = {}) {
  const calls = [];
  const fetchImpl = async (input, init = {}) => {
    const url = new URL(String(input));
    const body = init.body ? JSON.parse(new TextDecoder().decode(init.body)) : undefined;
    const headers = new Headers(init.headers);
    calls.push({ url, body, headers, method: init.method });
    if (url.pathname.endsWith('/v1/import-raw-snapshots/lookup')) {
      return new Response(JSON.stringify({ snapshot: null }), { status: 200 });
    }
    if (url.pathname.endsWith('/v1/import-raw-snapshots/read')) {
      const raw = corruptRead ? new TextEncoder().encode('tampered') : acquisition.rawBytes;
      return new Response(JSON.stringify({ artifactId: body.artifactId, contentHash: 'b'.repeat(64), rawBase64: Buffer.from(raw).toString('base64') }), { status: 200 });
    }
    const artifactId = body.artifactId;
    return new Response(JSON.stringify({
      artifactId,
      rawArtifactReference: `provider://import-raw/${artifactId}`,
      contentHash: body.contentHash,
      byteSize: body.byteSize,
      storedAt: body.requestedAt,
      retentionExpiresAt: body.retentionExpiresAt,
      sourceId: body.sourceId,
      connectorId: body.connectorId,
      connectorVersion: body.connectorVersion,
      fetchedAt: body.fetchedAt,
      requestedUrl: body.requestedUrl,
      finalUrl: body.finalUrl,
      statusCode: body.statusCode,
      contentType: body.contentType,
      etag: body.etag,
    }), { status: 200 });
  };
  const store = new HttpImportRawSnapshotStore({
    baseUrl: 'https://provider.internal/api/', apiKey: 'provider-key', signingSecret: secret,
    retentionDays: 365, fetchImpl, now: () => new Date('2026-09-07T01:00:01.000Z'),
  });
  return { store, calls };
}

test('MNT-AUD-0012 immutable provider snapshot is content-hashed, provenance-scoped and retention-bound', async () => {
  const { store, calls } = createStore();
  const snapshot = await store.store(acquisition);
  assert.match(snapshot.artifactId, /^raw_[a-f0-9]{64}$/);
  assert.match(snapshot.contentHash, /^[a-f0-9]{64}$/);
  assert.notEqual(snapshot.artifactId, `raw_${snapshot.contentHash}`);
  assert.equal(snapshot.retentionExpiresAt.toISOString(), '2027-09-07T01:00:00.000Z');
  const call = calls[0];
  assert.equal(call.method, 'PUT');
  assert.equal(call.body.rawBase64, Buffer.from(acquisition.rawBytes).toString('base64'));
  assert.equal(call.headers.get('idempotency-key'), `import-raw:${snapshot.artifactId.slice(4)}`);
  assert.equal(call.body.retentionClass, 'IMPORT_RAW_PROVENANCE');
});

test('MNT-AUD-0012 same bytes from a different provenance produce a distinct immutable snapshot identity', async () => {
  const { store } = createStore();
  const first = await store.store(acquisition);
  const second = await store.store({ ...acquisition, sourceId: 'source-b' });
  assert.equal(first.contentHash, second.contentHash);
  assert.notEqual(first.artifactId, second.artifactId);
});

test('MNT-AUD-0012 retrieval verifies bytes against provider content hash and rejects corruption', async () => {
  const { store } = createStore({ corruptRead: true });
  const snapshot = await store.store(acquisition);
  await assert.rejects(() => store.read(snapshot.artifactId), /IMPORT_RAW_PROVIDER_READ_HASH_MISMATCH/);
});

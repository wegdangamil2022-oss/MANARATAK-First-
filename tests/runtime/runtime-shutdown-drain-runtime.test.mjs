import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const ts = createRequire(import.meta.url)('typescript');
const serverSource = fs.readFileSync(new URL('../../apps/api/src/server.ts', import.meta.url), 'utf8');
// Execute the actual shutdown body with isolated resources; bootstrap never runs.
const shutdownSource = serverSource.slice(serverSource.indexOf('  let shutdownPromise:'), serverSource.indexOf("  process.once('SIGTERM'"));
assert.ok(shutdownSource.includes('const gracefulShutdown'));
const compiled = ts.transpileModule(`${shutdownSource}\nglobalThis.shutdown = gracefulShutdown;`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText;

function fixture(pollingDrain, httpDrain = true) {
  const calls = [];
  let expire;
  const context = {
    process: { exitCode: 0 }, console: { log() {}, error() {} }, SHUTDOWN_TIMEOUT_MS: 100,
    stopPollingWorkers: () => { calls.push('polling-stop'); return pollingDrain; },
    backgroundWorker: { beginDrain: () => calls.push('background-stop'), drain: async () => calls.push('background-drain') },
    runtimeResources: { beginShutdown: () => calls.push('readiness-down'), closeAll: async () => calls.push('resources-close') },
    monitoringProviderRuntime: undefined,
    server: {
      closeIdleConnections: () => calls.push('http-idle-close'),
      close: (callback) => { calls.push('http-stop'); if (httpDrain) callback(); },
      closeAllConnections: () => calls.push('http-force-close'),
    },
    setTimeout: (callback) => { expire = callback; return { unref() {} }; },
    clearTimeout: () => calls.push('timeout-cleared'),
  };
  vm.runInNewContext(compiled, context);
  return { context, calls, expire: () => expire() };
}

test('a stuck polling worker cannot prevent the HTTP stop or shutdown deadline', async () => {
  const f = fixture(new Promise(() => {}));
  const shutdown = f.context.shutdown('SIGTERM');
  assert.ok(f.calls.includes('http-stop'));
  assert.equal(f.calls.includes('resources-close'), false);
  f.expire(); await shutdown;
  assert.equal(f.context.process.exitCode, 1);
  assert.ok(f.calls.indexOf('http-force-close') < f.calls.indexOf('resources-close'));
});

test('successful shutdown waits for polling drain and is idempotent across signals', async () => {
  let release;
  const f = fixture(new Promise(resolve => { release = resolve; }));
  const shutdown = f.context.shutdown('SIGTERM');
  assert.equal(f.context.shutdown('SIGINT'), shutdown);
  assert.equal(f.calls.includes('resources-close'), false);
  release(); await shutdown;
  assert.equal(f.context.process.exitCode, 0);
  assert.equal(f.calls.filter(call => call === 'resources-close').length, 1);
  assert.equal(f.calls.includes('http-force-close'), false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = fs.readFileSync(new URL('../../packages/infrastructure/src/monitoring/MonitoringService.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const HealthStatus = Object.freeze({ UP: 'UP', DOWN: 'DOWN', DEGRADED: 'DEGRADED' });
const sandbox = {
  module: { exports: {} }, exports: {}, console, process,
  require(specifier) {
    if (specifier === '@manaratak/core') return { HealthStatus };
    throw new Error(`unexpected require: ${specifier}`);
  },
};
sandbox.exports = sandbox.module.exports;
vm.runInNewContext(compiled, sandbox, { filename: 'MonitoringService.js' });
const { MonitoringService } = sandbox.module.exports;

const down = async () => ({ status: HealthStatus.DOWN, timestamp: new Date().toISOString(), error: 'dependency down' });

test('a required Redis indicator makes readiness DOWN', async () => {
  const service = new MonitoringService();
  service.registerIndicator({ name: 'redis', isOptional: false, checkHealth: down });
  const result = await service.getReadiness();
  assert.equal(result.status, HealthStatus.DOWN);
  assert.equal(result.details.redis.status, HealthStatus.DOWN);
});

test('an explicitly optional Redis indicator degrades detail but does not fail readiness', async () => {
  const service = new MonitoringService();
  service.registerIndicator({ name: 'redis', isOptional: true, checkHealth: down });
  const result = await service.getReadiness();
  assert.equal(result.status, HealthStatus.UP);
  assert.equal(result.details.redis.status, HealthStatus.DEGRADED);
  assert.equal(result.details.redis.optional, true);
});

test('indicator name alone never changes dependency criticality', async () => {
  for (const name of ['redis', 'cache', 'notifications']) {
    const service = new MonitoringService();
    service.registerIndicator({ name, isOptional: false, checkHealth: down });
    const result = await service.getReadiness();
    assert.equal(result.status, HealthStatus.DOWN, `${name} was incorrectly treated as optional`);
  }
});

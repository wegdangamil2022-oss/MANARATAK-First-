import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { runBoundedReadProbe, validateReadProbe } from '../../scripts/performance/BoundedReadProbe.mjs';
const sha = 'a'.repeat(40);
const plan = url => ({ url, sourceSha: sha, durationSeconds: 0.01, requestsPerSecond: 2,
  maximumRequests: 1, timeoutMs: 1000, maximumCpuPercent: 80,
  maximumResidentMemoryBytes: 10000000, maximumConnections: 3 });
const healthy = async () => ({ cpuPercent: 0, residentMemoryBytes: 1000, activeConnections: 1 });
async function server(t, handler) {
  const s = http.createServer(handler); await new Promise(resolve => s.listen(0, '127.0.0.1', resolve));
  t.after(() => { s.closeAllConnections(); s.close(); });
  return `http://127.0.0.1:${s.address().port}/api/v1/search/public?q=test`;
}
test('R11 read probe rejects external origins, arbitrary paths and excessive budgets', () => {
  for (const url of ['https://example.com/api/v1/search/public', 'http://localhost:3000/api/v1/search/public', 'http://127.0.0.1:3000/api/v1/admin/courses']) {
    assert.throws(() => validateReadProbe(plan(url)), /PLAN_INVALID/);
  }
  assert.throws(() => validateReadProbe({ ...plan('http://127.0.0.1:3000/api/v1/search/public'), requestsPerSecond: 100 }), /PLAN_INVALID/);
});
test('R11 read probe records real response bytes and latency without claiming SLO', async t => {
  const url = await server(t, (_req, res) => { res.setHeader('x-manaratak-source-sha', sha); res.end('{}'); });
  const result = await runBoundedReadProbe(plan(url), { sampleResources: healthy });
  assert.equal(result.status, 'COMPLETED_DIAGNOSTIC'); assert.equal(result.sampleCount, 1);
  assert.equal(result.transferBytes, 2); assert.ok(result.p99Ms >= 0); assert.equal(result.sloAcceptance, false);
});
test('R11 resource ceiling aborts before sending traffic; missing observation fails closed', async t => {
  let requests = 0;
  const url = await server(t, (_req, res) => { requests++; res.end('{}'); });
  const result = await runBoundedReadProbe(plan(url), { sampleResources: async () => ({ ...await healthy(), cpuPercent: 99 }) });
  assert.equal(result.abortReason, 'RESOURCE_BUDGET_EXCEEDED'); assert.equal(requests, 0);
  const invalid = await runBoundedReadProbe(plan(url), { sampleResources: async () => ({}) });
  assert.equal(invalid.abortReason, 'RESOURCE_OBSERVER_INVALID'); assert.equal(requests, 0);
});
test('R11 stops at first rate limit or revision mismatch and does not follow redirect', async t => {
  for (const status of [429, 200, 302]) {
    const url = await server(t, (_req, res) => { res.statusCode = status; if (status === 429) res.setHeader('x-manaratak-source-sha', sha); res.setHeader('location', 'https://example.invalid/'); res.end('{}'); });
    const result = await runBoundedReadProbe(plan(url), { sampleResources: healthy });
    assert.equal(result.status, 'ABORTED'); assert.equal(result.sampleCount, 1);
    assert.equal(result.abortReason, status === 302 ? 'REQUEST_FAILED' : status === 429 ? 'RATE_LIMIT_REACHED' : 'SOURCE_SHA_MISMATCH');
    assert.equal(result.errorCount, 1);
  }
});

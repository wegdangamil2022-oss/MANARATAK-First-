import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runBoundedScenario } from '../../scripts/performance/BoundedScenarioProbe.mjs';
const plan = { category: 'student-writes', sourceSha: 'a'.repeat(40), maximumOperations: 1,
  durationSeconds: 0.1, operationsPerSecond: 0.5, operationTimeoutMs: 100,
  maximumCpuPercent: 80, maximumResidentMemoryBytes: 1000000, maximumConnections: 5 };
const healthy = async () => ({ cpuPercent: 1, residentMemoryBytes: 1000, activeConnections: 1 });
test('R11 scenario refuses excessive budgets and stops before mutation on resource breach', async () => {
  let calls = 0; const step = async () => { calls++; return { verified: true }; };
  await assert.rejects(runBoundedScenario({ ...plan, maximumOperations: 31 }, { step, sampleResources: healthy }), /PLAN_INVALID/);
  const result = await runBoundedScenario(plan, { step, sampleResources: async () => ({ ...await healthy(), cpuPercent: 99 }) });
  assert.equal(result.abortReason, 'RESOURCE_BUDGET_EXCEEDED'); assert.equal(calls, 0);
});
test('R11 scenario requires verified effects and keeps diagnostic acceptance separate', async () => {
  const bad = await runBoundedScenario(plan, { step: async () => ({}), sampleResources: healthy });
  assert.equal(bad.abortReason, 'INVARIANT_UNVERIFIED');
  const good = await runBoundedScenario(plan, { step: async () => ({ verified: true, persistedRows: 1 }), sampleResources: healthy });
  assert.equal(good.sampleCount, 1); assert.equal(good.sloAcceptance, false);
});
test('R11 timed-out mutation settles before returning; no second operation is started', async () => {
  let settled = false, calls = 0;
  const result = await runBoundedScenario({ ...plan, operationTimeoutMs: 10 }, { sampleResources: healthy,
    step: async () => { calls++; await new Promise(resolve => setTimeout(resolve, 30)); settled = true; return { verified: true }; } });
  assert.equal(settled, true); assert.equal(calls, 1); assert.equal(result.abortReason, 'OPERATION_TIMEOUT');
});

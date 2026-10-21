import test from 'node:test';
import assert from 'node:assert/strict';
import { createDiagnosticRequestBudget } from '../../scripts/release/lib/DiagnosticRequestBudget.mjs';

test('concurrent synthetic contexts share a reserved rolling budget without changing server limits', async () => {
  let clock = 1000;
  const delays = [], pending = [];
  const budget = createDiagnosticRequestBudget({ now: () => clock, sleep: ms => { delays.push(ms); return new Promise(resolve => pending.push(resolve)); } });
  const requests = Array.from({ length: 121 }, () => budget.acquire());
  assert.equal(delays.length, 61);
  assert.deepEqual(delays.slice(0, 60), Array(60).fill(61000));
  assert.equal(delays[60], 122000);
  for (const resolve of pending) resolve();
  await Promise.all(requests);
  clock = 184000;
  await budget.acquire();
  assert.equal(delays.length, 61);
  assert.equal(budget.snapshot().count, 122);
  assert.equal(budget.snapshot().serverLimitsChanged, false);
  assert.equal(budget.snapshot().rejectedRequestsRetried, false);
});

test('synthetic budget rejects settings that exceed its reviewed local request ceiling', () => {
  for (const options of [{ maximumRequests: 61 }, { maximumRequests: 0 }, { windowMilliseconds: 60000 }, { maximumRequests: NaN }]) assert.throws(() => createDiagnosticRequestBudget(options), /DIAGNOSTIC_REQUEST_BUDGET_INVALID/);
});

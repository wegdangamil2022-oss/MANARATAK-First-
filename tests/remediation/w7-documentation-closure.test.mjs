import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractDeclaredComposeServices,
  findProductionReadyStatusClaims,
  hasRebaselineOpenStatusRows,
  parseComposeServiceNames,
} from '../../scripts/lib/w7-documentation-contracts.mjs';

test('readiness guard rejects Production Ready only when used as an active status claim', () => {
  const findings = findProductionReadyStatusClaims([
    { file: 'bad.md', text: '**Status:** Baselined / Production Ready' },
    { file: 'requirements.md', text: 'A future production-ready deployment must have runtime evidence.' },
  ]);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].file, 'bad.md');
});

test('readiness guard accepts SOURCE_COMPLETE with runtime pending', () => {
  const findings = findProductionReadyStatusClaims([{ file: 'ok.md', text: '**Status:** BASELINED / SOURCE_COMPLETE — RUNTIME_EVIDENCE_PENDING' }]);
  assert.deepEqual(findings, []);
});

test('compose parser extracts only top-level service keys', () => {
  const compose = `services:\n  gate:\n    image: alpine\n  postgres:\n    environment:\n      A: B\nvolumes:\n  data:\n`;
  assert.deepEqual(parseComposeServiceNames(compose), ['gate', 'postgres']);
});

test('manual compose claims parser is exact and regression-safe', () => {
  const manual = `contains exactly:\n\n- \`postgres\`\n- \`redis\`\n\nThere are no app services.`;
  assert.deepEqual(extractDeclaredComposeServices(manual), ['postgres', 'redis']);
});

test('matrix guard detects a stale Rebaseline Open status row', () => {
  assert.equal(hasRebaselineOpenStatusRows('| X-001 | owner | Rebaseline Open | proof |'), true);
  assert.equal(hasRebaselineOpenStatusRows('| X-001 | owner | Runtime Pending | proof |'), false);
});

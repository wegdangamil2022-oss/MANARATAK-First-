import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  extractDeclaredComposeServices,
  findProductionReadyStatusClaims,
  hasRebaselineOpenStatusRows,
  parseComposeServiceNames,
  sourceCiBrowserBoundaryDeclared,
} from '../../scripts/lib/w7-documentation-contracts.mjs';

test('readiness guard rejects Production Ready only when used as an active status claim', () => {
  const findings = findProductionReadyStatusClaims([
    { file: 'bad.md', text: '**Status:** Baselined / Production Ready' },
    { file: 'requirements.md', text: 'A future production-ready deployment must have runtime evidence.' },
  ]);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].file, 'bad.md');
});

test('source CI permits only the explicitly authorized dependency-gated Linux browser lab',()=>{
  const ci=fs.readFileSync(new URL('../../.github/workflows/ci.yml',import.meta.url),'utf8');
  assert.equal(sourceCiBrowserBoundaryDeclared(ci),true);
  for(const altered of [
    ci.replace('needs: [source-quality, artifact-retrieval]','needs: source-quality'),
    ci.replace("POST28_LINUX_RUNTIME_REVIEW: 'YES'","POST28_LINUX_RUNTIME_REVIEW: 'NO'"),
    ci.replace('playwright install --with-deps chromium','playwright test'),
    ci.replace('run: npm run quality:source','run: npx playwright test'),
    ci.replace('  linux-runtime-review:','  unrestricted-browser:'),
  ])assert.equal(sourceCiBrowserBoundaryDeclared(altered),false);
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

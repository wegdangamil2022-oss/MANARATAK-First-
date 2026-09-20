import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFinalReport,
  declaresSupportedNodeEngine,
  normalizeBaseUrl,
  renderFinalMarkdown,
  validateMemoryResult,
} from '../../scripts/wp-ic-10-runtime-lib.mjs';

test('node engine gate accepts supported minimum versions without pinning Node 20', () => {
  assert.equal(declaresSupportedNodeEngine('>=20'), true);
  assert.equal(declaresSupportedNodeEngine('>=22.16.0 <23'), true);
  assert.equal(declaresSupportedNodeEngine('>=18 <19'), false);
  assert.equal(declaresSupportedNodeEngine(''), false);
});

test('normalizeBaseUrl requires HTTPS for non-local runtime targets', () => {
  assert.equal(normalizeBaseUrl('https://example.org/'), 'https://example.org');
  assert.equal(normalizeBaseUrl('http://localhost:3000/'), 'http://localhost:3000');
  assert.throws(() => normalizeBaseUrl('http://example.org'), /HTTPS_REQUIRED/);
  assert.throws(() => normalizeBaseUrl('https://user:pass@example.org'), /CREDENTIALS_FORBIDDEN/);
});

test('memory validation enforces row/header and memory bounds', () => {
  const base = {
    rowsExpected: 3663,
    rowsObserved: 3663,
    headersExpected: ['a', 'b'],
    headersObserved: ['a', 'b'],
    rssAfterMb: 300,
    rssDeltaMb: 100,
    maxRssMb: 1024,
    maxDeltaMb: 512,
  };
  assert.deepEqual(validateMemoryResult(base), { pass: true, failures: [] });
  const failed = validateMemoryResult({ ...base, rowsObserved: 3662, rssDeltaMb: 600 });
  assert.equal(failed.pass, false);
  assert.deepEqual(failed.failures, ['ROW_COUNT_MISMATCH', 'RSS_DELTA_LIMIT_EXCEEDED']);
});

test('source-phase report requires only pre-Google-Studio evidence', () => {
  const pass = { pass: true, detail: 'ok', gitSha: 'sha-a' };
  const report = buildFinalReport({ ciClosure: pass, security: pass, memory: pass }, { phase: 'source', runtimeGitSha: 'sha-a' });
  assert.equal(report.pass, true);
  assert.equal(report.runtimeClosureState, 'CODE_COMPLETE_READY_FOR_GOOGLE_STUDIO_INTEGRATION');
  assert.equal(report.gates.find((item) => item.name === 'database')?.state, 'DEFERRED_TO_GOOGLE_STUDIO');
  assert.match(renderFinalMarkdown(report), /intentionally deferred/);
});

test('source-phase report blocks when a required source artifact is missing', () => {
  const pass = { pass: true, detail: 'ok', gitSha: 'sha-a' };
  const report = buildFinalReport({ ciClosure: pass, security: pass }, { phase: 'source', runtimeGitSha: 'sha-a' });
  assert.equal(report.pass, false);
  assert.equal(report.gates.find((item) => item.name === 'memory')?.state, 'NOT_RUN');
});

test('runtime phase closes only after Google Studio runtime gates pass', () => {
  const pass = { pass: true, detail: 'ok', gitSha: 'sha-a' };
  const report = buildFinalReport({
    ciClosure: pass, security: pass, memory: pass, database: pass, backupRestore: pass, browserE2E: pass, runtimeSmoke: pass,
  }, { phase: 'runtime', runtimeGitSha: 'sha-a' });
  assert.equal(report.pass, true);
  assert.equal(report.runtimeClosureState, 'GOOGLE_STUDIO_RUNTIME_VERIFIED');
});

test('failed Google Studio runtime smoke blocks runtime verification', () => {
  const pass = { pass: true, detail: 'ok', gitSha: 'sha-a' };
  const fail = { pass: false, detail: 'readiness DOWN', gitSha: 'sha-a' };
  const report = buildFinalReport({
    ciClosure: pass, security: pass, memory: pass, database: pass, backupRestore: pass, browserE2E: pass, runtimeSmoke: fail,
  }, { phase: 'runtime', runtimeGitSha: 'sha-a' });
  assert.equal(report.pass, false);
  assert.equal(report.runtimeClosureState, 'BLOCKED');
});

test('finalization blocks missing or mixed evidence Git SHAs', () => {
  const good = { pass: true, detail: 'ok', gitSha: 'sha-a' };
  const mixed = buildFinalReport({ ciClosure: good, security: { ...good, gitSha: 'sha-b' }, memory: good }, { phase: 'source', runtimeGitSha: 'sha-a' });
  assert.equal(mixed.pass, false);
  const missing = buildFinalReport({ ciClosure: good, security: { pass: true }, memory: good }, { phase: 'source', runtimeGitSha: 'sha-a' });
  assert.equal(missing.pass, false);
});

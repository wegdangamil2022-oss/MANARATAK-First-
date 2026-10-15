import {readFileSync, existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const base = 'docs/remediation/';
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const status = read(`${base}ARCHITECTURAL_SECURITY_EXECUTION_STATUS_2026-10-15.json`);
const findings = read(`${base}ARCHITECTURAL_SECURITY_CLOSURE_REGISTER_2026-10-15.json`);
const phases = read(`${base}ARCHITECTURAL_SECURITY_PHASE_STATUS_2026-10-15.json`);
const audit = readFileSync('docs/reviews/ARCHITECTURAL_SECURITY_VERIFIED_FINDINGS_2026-10-15.md', 'utf8');
const expected = [...audit.matchAll(/^\| ((?:ARCH|FK|REL|A2A|ADM|SYNC|SEC)-\d{2}) \|/gm)].map(match => match[1]);
const assert = (condition, message) => {if (!condition) throw new Error(`B14_SOURCE_RECONCILIATION:${message}`);};
assert(expected.length === 49, 'original review identifier coverage changed');
assert(findings.findings.length === 54 && new Set(findings.findings.map(row => row.id)).size === 54, 'expected 49 original + 5 additional unique findings');
for (const id of [...expected, ...Array.from({length: 5}, (_, i) => `NEW-0${i + 1}`)]) {
  const row = findings.findings.find(item => item.id === id);
  assert(row && row.disposition && row.reports.length && /^[a-f0-9]{40}$/.test(row.evidenceCommit), `missing disposition/commit/evidence for ${id}`);
  execFileSync('git', ['merge-base', '--is-ancestor', row.evidenceCommit, 'HEAD'], {stdio: 'pipe'});
  for (const path of row.reports) assert(existsSync(path), `missing finding report ${path}`);
  assert(row.productionStatus === 'NOT_VERIFIED', `unsupported production claim for ${id}`);
}
assert(phases.phases.length === 24, 'phase count changed');
for (let i = 1; i <= 24; i++) {
  const phase = phases.phases.find(row => row.phase === `P${String(i).padStart(2, '0')}`);
  assert(phase?.sourceStatus && phase.isolatedVerification && phase.runtimeStatus && phase.productionStatus === 'NOT_VERIFIED', `phase ${i} lacks separate statuses`);
  for (const path of phase.sourceEvidence) assert(existsSync(path), `missing phase report ${path}`);
}
assert(status.B12.productScopeDecision === 'BOOKING_DEFERRED_OUT_OF_CURRENT_RELEASE', 'session deferral lost');
assert(status.B13.nativeCommandChecks.passed === 22 && status.B13.nativeCommandChecks.failed === 2 && status.B13.nativeCommandChecks.correctionsRerun === false, 'original corrected-but-unrechecked result hidden');
assert(!existsSync('apps/admin/src/pages/ScholarshipDetailPage.tsx'), 'unused legacy page returned');
assert(existsSync('apps/admin/src/pages/AIGovernanceOperations.tsx') && readFileSync('apps/admin/src/pages/AIGovernancePage.tsx', 'utf8').includes("from './AIGovernanceOperations'"), 'used AI operations removed');
for (const path of ['docs/reviews/section-27-task-status.json', 'docs/reviews/section-28-task-status.json']) assert(read(path).sectionClosed === false, `open section gate overwritten: ${path}`);
assert(read('docs/reviews/section-28-task-status.json').productionDecision === 'NO_GO', 'production gate changed');
console.log('B14_SOURCE_RECONCILIATION=PASS findings=54 phases=24 runtime=PENDING production=NOT_VERIFIED');

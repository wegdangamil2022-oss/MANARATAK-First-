#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), detail });

const registerPath = 'docs/governance/audits/remediation/MANARATAK_MASTER_DEEP_AUDIT_REGISTER_PHASES_2_TO_19_v1.2.md';
const closurePath = 'docs/governance/audits/remediation/W16_FINAL_SOURCE_CLOSURE_AND_RUNTIME_HANDOFF.md';
const evidencePath = 'docs/governance/audits/remediation/W16_FINAL_SOURCE_CLOSURE_EVIDENCE.json';
const w15ClosurePath = 'docs/governance/audits/remediation/W15_SOURCE_REMEDIATION_CLOSURE.md';
const phase2Path = 'docs/phases/phase-02-solution-architecture/phase-2-arb-compliance-report.md';
const phase4Path = 'docs/phases/phase-04-architecture-governance/baselines/phase-04-21-report.md';

for (const p of [registerPath, closurePath, evidencePath, w15ClosurePath, phase2Path, phase4Path]) {
  check(`exists:${p}`, exists(p));
}

const register = read(registerPath);
const closure = read(closurePath);
const w15 = read(w15ClosurePath);
const phase2 = read(phase2Path);
const phase4 = read(phase4Path);
let evidence = {};
try {
  evidence = JSON.parse(read(evidencePath));
  check('evidence_json_valid', true);
} catch (error) {
  check('evidence_json_valid', false, String(error));
}

check('register_authoritative_findings_153', register.includes('AUTHORITATIVE_SOURCE_FINDINGS = 153'));
check('register_w16_not_finding_wave', register.includes('W16 handoff (not a remediation finding wave)'));
check('register_new_w16_findings_zero', register.includes('NEW_W16_FINDINGS = 0'));
check('register_final_source_gate', register.includes('FINAL-SOURCE-GATE'));
check('register_runtime_r0_r7', register.includes('R0 — Environment identity / safety') && register.includes('R7 — Full platform closure'));
check('closure_official_waves_w0_w15', closure.includes('Official finding waves:** `W0 → W15`'));
check('closure_source_not_runtime', closure.includes('Source closure is not runtime closure.'));
check('closure_pending_google_studio', closure.includes('PENDING_GOOGLE_STUDIO'));
check('w15_two_final_findings', w15.includes('P2-GOV-001') && w15.includes('P4-GOV-001'));
check('phase2_outbox_source_reconciled', phase2.includes('W15 source-truth reconciliation') && phase2.includes('PrismaTransactionalOutboxStore') && phase2.includes('TransactionalOutboxDispatcher'));
check('phase4_outbox_source_reconciled', phase4.includes('Current source now contains outbox persistence/migration, store/dispatcher, and atomic integration paths'));
check('phase4_runtime_proof_preserved', phase4.includes('RUNTIME_PROOF_REQUIRED'));

check('evidence_stage_w16', evidence.stage === 'W16');
check('evidence_classification', evidence.classification === 'FINAL_SOURCE_CLOSURE_AND_RUNTIME_HANDOFF');
check('evidence_official_waves', evidence.official_remediation_waves === 'W0_TO_W15');
check('evidence_findings_153', evidence.authoritative_source_findings === 153);
check('evidence_new_findings_zero', evidence.new_findings === 0);
check('evidence_runtime_pending', evidence.runtime_boundary === 'PENDING_GOOGLE_STUDIO');
check('evidence_runtime_sequence_complete', Array.isArray(evidence.runtime_sequence) && evidence.runtime_sequence.join(',') === 'R0,R1,R2,R3,R4,R5,R6,R7');
const mutations = evidence.w16_runtime_mutations || {};
check('evidence_no_runtime_mutations', Object.values(mutations).length === 10 && Object.values(mutations).every((v) => v === false));

let verifiersPresent = true;
let verifiersGreen = true;
const verifierFailures = [];
for (let n = 0; n <= 15; n += 1) {
  const verifier = `scripts/verify-w${n}-source.mjs`;
  if (!exists(verifier)) {
    verifiersPresent = false;
    verifiersGreen = false;
    verifierFailures.push(`${verifier}:MISSING`);
    continue;
  }
  try {
    execFileSync(process.execPath, [path.join(root, verifier)], { cwd: root, stdio: 'pipe' });
  } catch (error) {
    verifiersGreen = false;
    verifierFailures.push(`${verifier}:EXIT_${error?.status ?? 1}`);
  }
}
check('all_w0_w15_verifiers_present', verifiersPresent);
check('all_w0_w15_verifiers_execute_green', verifiersGreen, verifierFailures.join(','));
check('no_w16_source_finding_verifier_name', !exists('scripts/verify-w16-source.mjs'));

for (const item of checks) {
  console.log(`${item.name}=${item.ok ? 'PASS' : 'FAIL'}${item.detail ? ` ${item.detail}` : ''}`);
}
const failed = checks.filter((item) => !item.ok);
if (failed.length) {
  console.error(`W16_FINAL_CLOSURE_VERIFIER=FAIL (${checks.length - failed.length}/${checks.length})`);
  process.exit(1);
}
console.log(`W16_FINAL_CLOSURE_VERIFIER=PASS (${checks.length}/${checks.length})`);

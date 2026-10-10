#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const overrideIndex = process.argv.indexOf('--verifier-dir');
const verifierDir = overrideIndex >= 0 ? path.resolve(process.argv[overrideIndex + 1]) : path.join(root, 'scripts');
const verifiers = [
  ...Array.from({ length: 16 }, (_, index) => `verify-w${index}-source.mjs`),
  'verify-w16-final-closure.mjs',
];
const passed = [];
const failed = [];

for (const verifier of verifiers) {
  // Final closure reruns every source wave: execute it only once all prior waves pass.
  // On failure, still examine every remaining source-only wave to report all blockers.
  if (verifier === 'verify-w16-final-closure.mjs' && failed.length) {
    console.log('REMEDIATION_FINAL_CLOSURE=SKIPPED_UNTIL_SOURCE_WAVES_PASS');
    break;
  }
  const result = spawnSync(process.execPath, [path.join(verifierDir, verifier)], { cwd: root, stdio: 'inherit' });
  if (result.error || result.status !== 0) {
    const detail = result.error ? `ERROR=${result.error.message}` : `EXIT_CODE=${result.status ?? 1}`;
    failed.push(verifier);
    console.error(`REMEDIATION_VERIFIER_FAILED=${verifier} ${detail}`);
    continue;
  }
  passed.push(verifier);
}

console.log(`REMEDIATION_VERIFIER_ORDER=${verifiers.join(' -> ')}`);
if (failed.length) {
  console.error(`REMEDIATION_VERIFIERS=FAIL passed=${passed.length} failed=${failed.length}`);
  console.error(`REMEDIATION_FAILED_WAVES=${failed.join(',')}`);
  process.exitCode = 1;
} else {
  console.log(`REMEDIATION_VERIFIERS=PASS ${passed.length}/${verifiers.length}`);
}


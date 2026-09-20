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

for (const verifier of verifiers) {
  const result = spawnSync(process.execPath, [path.join(verifierDir, verifier)], { cwd: root, stdio: 'inherit' });
  if (result.error) {
    console.error(`REMEDIATION_VERIFIER_FAILED=${verifier} ERROR=${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`REMEDIATION_VERIFIER_FAILED=${verifier} EXIT_CODE=${result.status ?? 1}`);
    process.exit(result.status ?? 1);
  }
  passed.push(verifier);
}

console.log(`REMEDIATION_VERIFIERS=PASS ${passed.length}/${verifiers.length}`);
console.log(`REMEDIATION_VERIFIER_ORDER=${verifiers.join(' -> ')}`);


#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const result = spawnSync(process.execPath, ['scripts/verify-w7-documentation-closure.mjs'], { encoding: 'utf8' });
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.status !== 0) process.exit(result.status ?? 1);

const required = [
  'PASS MNT-AUD-0003',
  'PASS MNT-AUD-0019',
  'PASS MNT-AUD-0023',
  'PASS MNT-AUD-0051',
  'PASS MNT-AUD-0052',
  'PASS MNT-AUD-0004',
];
const output = result.stdout ?? '';
const missing = required.filter((token) => !output.includes(token));
for (const token of required) console.log(`${missing.includes(token) ? 'FAIL' : 'PASS'} ORDERED_${token.replace('PASS ','')}`);
console.log(`W7_PLAN_SOURCE_VERIFIER=${missing.length ? 'FAIL' : 'PASS'} ${required.length-missing.length}/${required.length}`);
if (missing.length) process.exit(1);

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const workflowDir = path.join(root, '.github/workflows');
const SHA = /^[0-9a-f]{40}$/i;
const failures = [];
const refs = [];
for (const name of fs.readdirSync(workflowDir).filter((x) => /\.ya?ml$/.test(x)).sort()) {
  const relative = `.github/workflows/${name}`;
  const source = fs.readFileSync(path.join(workflowDir, name), 'utf8');
  for (const match of source.matchAll(/\buses:\s*([^\s#]+)/g)) {
    const ref = match[1].trim();
    if (ref.startsWith('./')) continue;
    const at = ref.lastIndexOf('@');
    if (at < 1 || !SHA.test(ref.slice(at + 1))) failures.push(`${relative}: external action is not pinned to a full commit SHA: ${ref}`);
    refs.push({ workflow: relative, ref });
  }
}
if (!refs.length) failures.push('No external GitHub Action references were found.');
if (failures.length) {
  console.error('GITHUB_ACTION_PIN_GATE=FAIL');
  failures.forEach((x) => console.error(`FAIL: ${x}`));
  process.exit(1);
}
console.log(`GITHUB_ACTION_PIN_GATE=PASS refs=${refs.length}`);

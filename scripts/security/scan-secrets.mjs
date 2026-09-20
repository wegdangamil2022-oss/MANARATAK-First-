import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const tracked = spawnSync('git', ['ls-files', '-z'], { encoding: 'utf8' });
if (tracked.status !== 0) {
  console.error('SECRET_SCAN_FAILED=TRACKED_FILE_ENUMERATION');
  process.exit(2);
}

const signatures = [
  ['PRIVATE_KEY', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g],
  ['OPENAI_KEY', /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g],
  ['GITHUB_TOKEN', /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g],
  ['AWS_ACCESS_KEY', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  ['GOOGLE_API_KEY', /\bAIza[0-9A-Za-z_-]{35}\b/g],
];

const findings = [];
for (const file of tracked.stdout.split('\0').filter(Boolean)) {
  let source;
  try {
    source = readFileSync(file, 'utf8');
  } catch {
    continue;
  }

  for (const [kind, signature] of signatures) {
    signature.lastIndex = 0;
    for (const match of source.matchAll(signature)) {
      const line = source.slice(0, match.index).split(/\r?\n/).length;
      findings.push(`${kind} ${file}:${line}`);
    }
  }
}

if (findings.length > 0) {
  console.error('SECRET_SCAN_FAILED=HIGH_CONFIDENCE_SIGNATURE');
  for (const finding of findings) console.error(finding);
  process.exit(1);
}

console.log(`SECRET_SCAN_PASS=YES TRACKED_FILES=${tracked.stdout.split('\0').filter(Boolean).length}`);

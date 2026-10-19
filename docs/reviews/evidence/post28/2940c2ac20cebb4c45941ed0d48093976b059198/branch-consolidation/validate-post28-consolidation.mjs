import fs from 'node:fs';
import path from 'node:path';
import {spawnSync, execFileSync} from 'node:child_process';
const root = process.cwd();
const output = path.resolve(process.argv[2]);
fs.mkdirSync(output, {recursive: false});
const sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).trim();
if (execFileSync('git', ['status', '--porcelain'], {encoding: 'utf8'}).trim()) throw Error('Clean validation source required');
const tests = [
  'tests/database/post28-r05-trust-policy.test.mjs',
  'tests/database/post28-r05-known-source.test.mjs',
  'tests/remediation/post28-native-lab-policy.test.mjs',
  'tests/database/post28-isolation.test.mjs',
  'tests/database/post28-backup-contract.test.mjs',
  'tests/database/post28-lab-profile.test.mjs',
  'tests/database/post28-upgrade-candidate.test.mjs',
];
const jobs = [
  ['targeted-node', ['--test', ...tests]],
  ['source-quality', ['scripts/quality/verify-source-quality.mjs']],
  ['environment-inventory', ['scripts/aistudio/environment.mjs', '--check']],
  ['secret-scan', ['scripts/security/scan-secrets.mjs']],
  ['targeted-eslint', ['node_modules/eslint/bin/eslint.js',
    'scripts/database/initialize-post28-upgrade.mjs',
    'scripts/database/post28-r05-known-source.mjs',
    'scripts/database/post28-r05-trust-policy.mjs',
    'scripts/database/verify-post28-upgrade-backup.mjs',
    'tests/database/post28-r05-known-source.test.mjs',
    'tests/database/post28-r05-trust-policy.test.mjs',
    'tests/database/post28-isolation.test.mjs']],
];
const results = [];
for (const [name, args] of jobs) {
  const startedAt = new Date().toISOString();
  const started = Date.now();
  const result = spawnSync(process.execPath, args, {cwd: root, encoding: 'utf8', windowsHide: true, timeout: 240000, maxBuffer: 32*1024*1024});
  const log = (result.stdout ?? '') + (result.stderr ?? '');
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(log)) throw Error('Private material in diagnostic log');
  fs.writeFileSync(path.join(output, name + '.log'), log);
  const row = {name, args, startedAt, durationMs: Date.now()-started, exitCode: result.status, signal: result.signal, errorCode: result.error?.code ?? null};
  if (name === 'targeted-node') {
    row.counts = Object.fromEntries(['tests','pass','fail','cancelled','skipped','todo'].map(key => [key, Number(log.match(new RegExp('^# '+key+' (\\d+)$','m'))?.[1] ?? NaN)]));
  }
  results.push(row);
  fs.writeFileSync(path.join(output, 'validation.json'), JSON.stringify({kind:'POST28_BRANCH_CONSOLIDATION_SOURCE_VALIDATION', sourceSha, cleanSourceAtStart:true, tests, results, databaseCreated:false, databaseConnected:false, newRuntimeAcceptance:false}, null, 2)+'\n');
  console.log(JSON.stringify(row));
}
process.exitCode = results.some(row => row.exitCode !== 0) ? 1 : 0;

import { spawnSync } from 'node:child_process';

// Run cross-cutting source contracts before expensive builds. No database/provider access.
const checks = [
  ['scripts/architecture/verify-source-architecture-guards.mjs'],
  ['scripts/architecture/verify-di-reachability.mjs'],
  ['scripts/architecture/verify-admin-audit-coverage.mjs'],
  ['scripts/aistudio/environment.mjs', '--check'],
  ['--test', 'tests/architecture/ci-runtime-regressions.test.mjs', 'tests/remediation/w2-migration-recovery-source.test.mjs', 'tests/remediation/m10-recovery-gate-exit.test.mjs', 'tests/security/admin-audit-coverage.test.mjs', 'tests/translation/dictionary-source.test.mjs'],
];
for (const args of checks) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log('SOURCE_PREFLIGHT=PASS');

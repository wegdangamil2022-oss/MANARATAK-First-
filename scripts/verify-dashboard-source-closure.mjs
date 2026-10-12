// Dashboard consumer/owner-projection fixtures only; no section-25 suite or live providers.
import { spawnSync } from 'node:child_process';
const result = spawnSync(
  process.execPath,
  ['--import', 'tsx', '--test', 'tests/dashboard/section26.test.ts'],
  { stdio: 'inherit', env: { ...process.env, TSX_TSCONFIG_PATH: 'apps/admin/tsconfig.json' } },
);
if (result.error) console.error('DASHBOARD_SOURCE_CHECK_START_FAILED');
process.exit(result.status ?? 1);

// Section27 isolated source/contract fixtures: no DB, E2E, providers or section25 suite.
import { spawnSync } from 'node:child_process';
const result = spawnSync(
  process.execPath,
  ['--import', 'tsx', '--test', 'tests/integration/section27/section27.test.ts', 'tests/integration/section27/test-discovery.test.ts', 'tests/integration/section27/certificate-affiliation.test.ts', 'tests/integration/section27/private-saved-items.test.ts', 'tests/integration/section27/academic-program-explorer.test.ts', 'tests/integration/section27/graph-owner-labels.test.ts'],
  {
    stdio: 'inherit',
    env: { ...process.env, TSX_TSCONFIG_PATH: 'tests/integration/section27/tsconfig.json' },
  },
);
if (result.error) console.error('CROSS_MODULE_SOURCE_CHECK_START_FAILED');
process.exit(result.status ?? 1);

import { readdirSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const tests = readdirSync(path.join(root, 'tests'), { recursive: true })
  .filter(file => /\.test\.(mjs|cjs)$/.test(file))
  .sort()
  .map(file => path.join('tests', file));

if (tests.length === 0) throw new Error('NODE_UNIT_TESTS_NOT_FOUND');

// Workspace exports include TypeScript sources; use the existing TS loader.
const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', ...tests], {
  cwd: root,
  stdio: 'inherit',
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;

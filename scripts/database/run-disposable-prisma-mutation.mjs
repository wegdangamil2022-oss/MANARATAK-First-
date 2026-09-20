import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { requireDisposableDatabaseTarget } from '../lib/disposable-database-target-guard.mjs';

const root = process.cwd();
const mode = process.argv[2];
const schema = path.join(root, 'packages/infrastructure/prisma/schema.prisma');
const commands = {
  push: ['db', 'push', '--schema', schema],
  'migrate-dev': ['migrate', 'dev', '--schema', schema],
};
if (!commands[mode]) throw new Error('DISPOSABLE_PRISMA_MODE_INVALID');
const gate = requireDisposableDatabaseTarget(`prisma-${mode}`);
console.log(JSON.stringify({ mode: 'DISPOSABLE_PRISMA_MUTATION_APPROVED', operation: mode, environment: gate.environment, target: gate.target }));
const cli = path.join(root, 'node_modules/prisma/build/index.js');
const result = spawnSync(process.execPath, [cli, ...commands[mode]], { cwd: root, stdio: 'inherit', env: process.env });
process.exit(result.status ?? 1);

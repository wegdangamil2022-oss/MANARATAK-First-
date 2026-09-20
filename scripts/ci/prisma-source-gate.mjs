#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
const root = process.cwd();
const schema = path.join(root, 'packages/infrastructure/prisma/schema.prisma');
const prismaBin = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'prisma.cmd' : 'prisma');
const require = createRequire(path.join(root, 'package.json'));
const sourceDatabaseUrl = 'postgresql://127.0.0.1:5432/manaratak_source_gate?schema=public';
if (!fs.existsSync(schema)) { console.error('PRISMA_SOURCE_GATE=FAIL reason=schema-missing'); process.exit(2); }
if (!fs.existsSync(prismaBin)) { console.error('PRISMA_SOURCE_GATE=FAIL reason=prisma-cli-not-installed'); console.error('Run npm ci first. The source gate never downloads tools implicitly.'); process.exit(2); }
const env = { ...process.env, DATABASE_URL: sourceDatabaseUrl, DIRECT_URL: sourceDatabaseUrl, DATABASE_MUTATIONS_ALLOWED: 'false', RUN_DATABASE_INTEGRATION_TESTS: 'false' };
const prismaCli = require.resolve('prisma/build/index.js');
for (const command of ['validate', 'generate']) {
  const result = spawnSync(process.execPath, [prismaCli, command, `--schema=${schema}`], { cwd: root, env, stdio: 'inherit' });
  if (result.error || result.status !== 0) { console.error(`PRISMA_SOURCE_GATE=FAIL command=${command} exit=${result.status ?? 1}`); process.exit(result.status ?? 1); }
}
console.log('PRISMA_SOURCE_GATE=PASS');
console.log('PRISMA_SOURCE_GATE_DB_CONNECTION=NONE');
console.log('PRISMA_SOURCE_GATE_COMMANDS=validate,generate');

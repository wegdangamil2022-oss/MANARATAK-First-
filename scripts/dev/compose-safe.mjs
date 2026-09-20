#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const envFile = path.join(root, '.env.compose');
if (!fs.existsSync(envFile)) {
  console.error('Missing .env.compose. Run: npm run compose:init');
  process.exit(1);
}
const parsed = Object.fromEntries(fs.readFileSync(envFile, 'utf8').split(/\r?\n/).filter(Boolean).filter(line => !line.startsWith('#')).map(line => {
  const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)];
}));
const runtime = (process.env.NODE_ENV || parsed.NODE_ENV || '').toLowerCase();
if (runtime === 'production' || runtime === 'staging' || parsed.MANARATAK_COMPOSE_ENVIRONMENT !== 'development') {
  console.error('Refusing to run local Docker Compose outside MANARATAK_COMPOSE_ENVIRONMENT=development.');
  process.exit(1);
}
for (const key of ['POSTGRES_PASSWORD', 'REDIS_PASSWORD']) {
  const value = parsed[key] || '';
  if (value.length < 20 || /^(password|root|postgres|redis|change-?me|generate)/i.test(value)) {
    console.error(`${key} is missing or weak. Regenerate .env.compose.`);
    process.exit(1);
  }
}
const action = process.argv[2] || 'up';
const args = action === 'down'
  ? ['compose', '--env-file', '.env.compose', '--profile', 'development', 'down', '-v']
  : ['compose', '--env-file', '.env.compose', '--profile', 'development', 'up', '-d'];
const result = spawnSync('docker', args, { cwd: root, stdio: 'inherit', env: { ...process.env, ...parsed } });
if (result.error) {
  console.error(`Docker invocation failed: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);

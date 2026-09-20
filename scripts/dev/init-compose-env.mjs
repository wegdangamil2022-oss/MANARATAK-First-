#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';

const root = process.cwd();
const target = path.join(root, '.env.compose');
if (fs.existsSync(target)) {
  console.error('Refusing to overwrite existing .env.compose');
  process.exit(1);
}
const secret = (bytes = 24) => randomBytes(bytes).toString('base64url');
const content = [
  'MANARATAK_COMPOSE_ENVIRONMENT=development',
  'POSTGRES_USER=manaratak_dev',
  `POSTGRES_PASSWORD=${secret(24)}`,
  'POSTGRES_DB=manaratak_dev',
  'POSTGRES_PORT=5432',
  `REDIS_PASSWORD=${secret(32)}`,
  'REDIS_PORT=6379',
  '',
].join('\n');
fs.writeFileSync(target, content, { mode: 0o600, flag: 'wx' });
console.log('Created ignored .env.compose with generated local-only credentials (mode 0600).');

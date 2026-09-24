#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';

const root = process.cwd();
const target = path.join(root, '.env.compose');
const runtimeTarget = path.join(root, '.env.runtime.local');
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
  'MAILPIT_SMTP_PORT=1025',
  'MAILPIT_UI_PORT=8025',
  '',
].join('\n');
if (fs.existsSync(runtimeTarget)) throw new Error('Refusing to overwrite existing .env.runtime.local');
const values = Object.fromEntries(content.split('\n').filter(Boolean).map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)]; }));
const db = `postgresql://${encodeURIComponent(values.POSTGRES_USER)}:${encodeURIComponent(values.POSTGRES_PASSWORD)}@127.0.0.1:${values.POSTGRES_PORT}/${encodeURIComponent(values.POSTGRES_DB)}`;
const redis = `redis://:${encodeURIComponent(values.REDIS_PASSWORD)}@127.0.0.1:${values.REDIS_PORT}`;
const runtime = [
  'NODE_ENV=development', `DATABASE_URL=${db}`, `DIRECT_URL=${db}`, `REDIS_URL=${redis}`,
  'REDIS_NAMESPACE=manaratak:', 'EMAIL_DELIVERY_PROVIDER=smtp', 'SMTP_HOST=127.0.0.1',
  `SMTP_PORT=${values.MAILPIT_SMTP_PORT}`, 'SMTP_SECURE=false',
  'SMTP_FROM=MANARATAK <no-reply@localhost>', '',
].join('\n');
fs.writeFileSync(target, content, { mode: 0o600, flag: 'wx' });
fs.writeFileSync(runtimeTarget, runtime, { mode: 0o600, flag: 'wx' });
console.log('Created ignored .env.compose and .env.runtime.local (mode 0600 where supported).');

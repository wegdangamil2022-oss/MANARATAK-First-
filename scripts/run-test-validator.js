import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { loadEnv } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = { ...loadEnv('aistudio', root, ['MANARATAK_', 'VITE_']), ...process.env };

if (!env.DATABASE_URL && env.DB_APPLICATION_PASSWORD && env.SQL_HOST && env.SQL_DB_NAME) {
  const role = env.DB_APPLICATION_ROLE || 'manaratak_application';
  const pass = encodeURIComponent(env.DB_APPLICATION_PASSWORD);
  const host = encodeURIComponent(env.SQL_HOST);
  const db = encodeURIComponent(env.SQL_DB_NAME);
  env.DATABASE_URL = `postgresql://${role}:${pass}@localhost:5432/${db}?host=${host}`;
}

const child = spawn('npx', ['tsx', 'scripts/test-validator.ts'], {
  env: { ...process.env, ...env },
  stdio: 'inherit'
});

child.on('close', (code) => {
  process.exit(code || 0);
});

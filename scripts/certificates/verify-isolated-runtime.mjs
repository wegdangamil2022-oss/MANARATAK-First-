import { spawnSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
// Manual-only entry point. Refuse existing databases, even on localhost.
const url = new URL(process.env.DATABASE_URL ?? '');
if (
  process.env.CERTIFICATE_RUNTIME_ISOLATED !== '1' ||
  !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
  url.pathname !== '/absheer_certificate_verification' ||
  process.env.DIRECT_URL !== process.env.DATABASE_URL ||
  !['postgres:', 'postgresql:'].includes(url.protocol)
)
  throw new Error('CERTIFICATE_DISPOSABLE_DATABASE_REQUIRED');
const db = new PrismaClient();
try {
  const tables =
    await db.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'`;
  if (tables.length)
    throw new Error(
      'CERTIFICATE_DATABASE_MUST_BE_EMPTY_NO_EXISTING_DATABASE_CHANGES',
    );
} finally {
  await db.$disconnect();
}
const run = (args) => {
  const result = spawnSync(process.execPath, args, {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'test' },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
};
// Shown in docs; nothing invokes this script from application startup or push/PR CI.
run([
  'node_modules/prisma/build/index.js',
  'migrate',
  'deploy',
  '--schema',
  'packages/infrastructure/prisma/schema.prisma',
]);
run([
  'node_modules/vitest/vitest.mjs',
  'run',
  '--config',
  '.certificates-isolated-vitest.config.ts',
  '--reporter=default',
  '--reporter=json',
  '--outputFile.json=certificate-isolated-results.json',
]);

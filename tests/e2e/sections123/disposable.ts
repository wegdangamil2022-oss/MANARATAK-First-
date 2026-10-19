import { PrismaClient } from '@prisma/client';

// Fail rather than skip: this suite must never silently turn blocked DB evidence green.
export function disposableClient() {
  const expected = 'postgresql://eap_ci:eap_ci_disposable_only@127.0.0.1:55432/absheer_eap_ci_test?schema=public';
  if (process.env.DATABASE_URL !== expected || process.env.DIRECT_URL !== expected ||
      process.env.DATABASE_MUTATIONS_ALLOWED !== 'true' ||
      process.env.RUN_DATABASE_INTEGRATION_TESTS !== 'true') {
    throw new Error('SECTION123_FRESH_DISPOSABLE_LOCALHOST_DATABASE_REQUIRED');
  }
  return new PrismaClient();
}

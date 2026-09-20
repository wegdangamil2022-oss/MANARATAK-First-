/**
 * Archived diagnostic helper. It intentionally has no connection fallback:
 * callers must provide disposable database URLs explicitly.
 */
import { PrismaClient } from '@prisma/client';

const adminUrl = process.env.TEST_SESSION_ADMIN_DATABASE_URL;
const appUrl = process.env.TEST_SESSION_APP_DATABASE_URL;

if (!adminUrl || !appUrl) {
  throw new Error(
    'TEST_SESSION_DATABASE_URLS_REQUIRED: set TEST_SESSION_ADMIN_DATABASE_URL and TEST_SESSION_APP_DATABASE_URL.',
  );
}

async function verifySessionDatabases(): Promise<void> {
  const adminPrisma = new PrismaClient({ datasources: { db: { url: adminUrl } } });
  const appPrisma = new PrismaClient({ datasources: { db: { url: appUrl } } });
  try {
    await Promise.all([
      adminPrisma.$queryRawUnsafe('SELECT 1'),
      appPrisma.$queryRawUnsafe('SELECT 1'),
    ]);
    console.log('[ARCHIVED SESSION CHECK] Both explicitly configured databases are reachable.');
  } finally {
    await Promise.all([adminPrisma.$disconnect(), appPrisma.$disconnect()]);
  }
}

void verifySessionDatabases();

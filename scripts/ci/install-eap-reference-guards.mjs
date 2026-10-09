// Disposable GitHub Actions service only. Never run against a real deployment.
import { readFile } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
const expectedUrl = 'postgresql://eap_ci:eap_ci_disposable_only@127.0.0.1:5432/manaratak_eap_ci_test?schema=public';
if (process.env.GITHUB_ACTIONS !== 'true' || process.env.DATABASE_MUTATIONS_ALLOWED !== 'true' ||
    process.env.EAP_EPHEMERAL_DB_TESTS !== 'true' || process.env.RUN_DATABASE_INTEGRATION_TESTS !== 'true' ||
    process.env.DATABASE_URL !== expectedUrl || process.env.DIRECT_URL !== expectedUrl) {
  throw new Error('EAP_DISPOSABLE_GITHUB_POSTGRES_REQUIRED');
}
const sql = await readFile(new URL('../../packages/infrastructure/prisma/migrations/20261009010000_eap_asset_reference_serialization/migration.sql', import.meta.url), 'utf8');
const prisma = new PrismaClient();
try {
  await prisma.$transaction(async tx => {
    const identity = await tx.$queryRaw`SELECT current_database() AS database, current_user AS role`;
    if (identity[0]?.database !== 'manaratak_eap_ci_test' || identity[0]?.role !== 'eap_ci') throw new Error('EAP_DISPOSABLE_DATABASE_IDENTITY_REQUIRED');
    for (const statement of sql.split('-- statement-breakpoint')) {
      if (/(?:^|\n)BEGIN;\s*$/.test(statement) || /^\s*COMMIT;\s*$/.test(statement)) continue;
      await tx.$executeRawUnsafe(statement);
    }
  }, { timeout: 30000 });
  process.stdout.write('EAP_REFERENCE_GUARDS_INSTALLED_ON_DISPOSABLE_CI_DATABASE\n');
} finally { await prisma.$disconnect(); }

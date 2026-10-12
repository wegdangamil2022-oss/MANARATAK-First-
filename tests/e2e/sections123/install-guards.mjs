// Explicitly isolated local rehearsal; the existing GitHub-only installer is preserved.
import { readFile } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
const expected = 'postgresql://eap_ci:eap_ci_disposable_only@127.0.0.1:55432/manaratak_eap_ci_test?schema=public';
if (process.env.DATABASE_URL !== expected || process.env.DIRECT_URL !== expected ||
    process.env.DATABASE_MUTATIONS_ALLOWED !== 'true' || process.env.RUN_DATABASE_INTEGRATION_TESTS !== 'true' ||
    process.env.EAP_EPHEMERAL_DB_TESTS !== 'true') throw new Error('SECTION123_FRESH_DISPOSABLE_LOCALHOST_DATABASE_REQUIRED');
const names = ['20261009010000_eap_asset_reference_serialization', '20261009020000_eap_restore_operation_barrier', '20261009030000_eap_archive_operation_barrier'];
const sql = (await Promise.all(names.map(name => readFile(new URL(`../../../packages/infrastructure/prisma/migrations/${name}/migration.sql`, import.meta.url), 'utf8')))).join('\n-- statement-breakpoint\n');
const db = new PrismaClient();
try {
  await db.$transaction(async tx => {
    const identity = await tx.$queryRaw`SELECT current_database() AS database, current_user AS role`;
    if (identity[0]?.database !== 'manaratak_eap_ci_test' || identity[0]?.role !== 'eap_ci') throw new Error('DISPOSABLE_DATABASE_IDENTITY_REQUIRED');
    for (const statement of sql.split('-- statement-breakpoint')) {
      if (/(?:^|\n)BEGIN;\s*$/.test(statement) || /^\s*COMMIT;\s*$/.test(statement)) continue;
      await tx.$executeRawUnsafe(statement);
    }
  }, { timeout: 30000 });
  console.log('PASS: three EAP guard migrations rehearsed on fresh local disposable database only');
} finally { await db.$disconnect(); }

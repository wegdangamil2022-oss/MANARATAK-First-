import { Prisma, PrismaClient } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { databaseIntegrationEnabled, withDisposablePrisma } from './DisposablePostgresHarness';

export const PERSISTED_DOMAIN_REGISTRY = Object.freeze([
  ['P07', 'Reference Data', 'ReferenceCountry'],
  ['P08', 'Academic Taxonomy', 'AcademicTaxonomyNode'],
  ['P09', 'International Tests', 'InternationalTest'],
  ['P10', 'Majors', 'Major'],
  ['P11', 'Universities', 'University'],
  ['P12', 'Scholarships', 'Scholarship'],
  ['P13', 'Learning', 'Course'],
  ['P14', 'Certificates', 'Certificate'],
  ['P15', 'Student Workspace', 'StudentWorkspace'],
  ['P16', 'CMS', 'CmsContentNode'],
  ['P17', 'AI Platform', 'AIExecutionRecord'],
  ['P18', 'Student Tools', 'StudentToolDefinitionRecord'],
  ['P19', 'Finance', 'FinanceInvoiceRecord'],
  ['P20', 'Services', 'ServiceRequestRecord'],
  ['P21', 'Career', 'CareerProfileRecord'],
] as const);

const dbDescribe = databaseIntegrationEnabled() ? describe : describe.skip;

dbDescribe('W6 real PostgreSQL whole-platform persistence contract', () => {
  it('has a generated Prisma model and a live PostgreSQL table for every P07-P21 owner', async () => {
    const modelMap = new Map(Prisma.dmmf.datamodel.models.map((model) => [model.name, model]));
    await withDisposablePrisma(async (prisma) => {
      const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
        SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
      `;
      const tableSet = new Set(tables.map((row) => row.table_name));
      for (const [phase, , modelName] of PERSISTED_DOMAIN_REGISTRY) {
        const model = modelMap.get(modelName);
        expect(model, `${phase}:${modelName} must exist in Prisma DMMF`).toBeTruthy();
        const dbName = model?.dbName ?? modelName;
        expect(tableSet.has(dbName), `${phase}:${dbName} must exist in PostgreSQL`).toBe(true);
      }
    });
  });

  it('enforces primary/unique/foreign-key constraints across the persisted schema', async () => {
    await withDisposablePrisma(async (prisma) => {
      const rows = await prisma.$queryRaw<Array<{ contype: string; count: bigint }>>`
        SELECT contype, COUNT(*)::bigint AS count
        FROM pg_constraint
        WHERE connamespace = 'public'::regnamespace
        GROUP BY contype
      `;
      const counts = new Map(rows.map((row) => [row.contype, Number(row.count)]));
      expect(counts.get('p') ?? 0).toBeGreaterThan(0);
      expect(counts.get('u') ?? 0).toBeGreaterThan(0);
      expect(counts.get('f') ?? 0).toBeGreaterThan(0);
    });
  });

  it('proves PostgreSQL transaction rollback and advisory-lock concurrency primitives', async () => {
    await withDisposablePrisma(async (prisma) => {
      await prisma.$executeRawUnsafe('CREATE TEMP TABLE IF NOT EXISTS w6_tx_probe (id integer primary key, value text unique)');
      await prisma.$executeRawUnsafe('TRUNCATE TABLE w6_tx_probe');
      await expect(prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe("INSERT INTO w6_tx_probe(id,value) VALUES (1,'rollback')");
        await tx.$queryRawUnsafe('SELECT pg_advisory_xact_lock(606606)');
        throw new Error('EXPECTED_ROLLBACK');
      })).rejects.toThrow('EXPECTED_ROLLBACK');
      const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>('SELECT COUNT(*)::bigint AS count FROM w6_tx_probe');
      expect(Number(rows[0]?.count ?? 0n)).toBe(0);
    });
  });

  it('keeps outbox, idempotency and lease-bearing job models inside the database contract', () => {
    const names = new Set(Prisma.dmmf.datamodel.models.map((model) => model.name));
    for (const required of ['TransactionalOutboxRecord', 'ApiIdempotencyRecord', 'BackgroundJobRecord', 'BackgroundJobExecutionRecord']) {
      expect(names.has(required), required).toBe(true);
    }
  });
});

import fs from 'node:fs/promises';
import { z } from 'zod';

const binding = z.object({ sourceReferenceId: z.string().regex(/^INS-[A-Z0-9]+(?:-[A-Z0-9]+)+$/),
  receiptId: z.string().min(1), requestHash: z.string().regex(/^[a-f0-9]{64}$/), assetId: z.string().min(1), artifactSha256: z.string().regex(/^[a-f0-9]{64}$/) }).strict();

async function main() {
  const [input, output, extra] = process.argv.slice(2);
  if (!input || !output || extra || !['development', 'test'].includes(process.env.NODE_ENV ?? '')
    || !process.env.UNIVERSITY_IMPORT_ACTOR_ID?.trim() || !process.env.DATABASE_URL) throw new Error('UNIVERSITY_SCREENING_PREVIEW_INPUT_REQUIRED');
  const bytes = await fs.readFile(input);
  if (bytes.length > 32 * 1024) throw new Error('UNIVERSITY_SCREENING_PREVIEW_INPUT_TOO_LARGE');
  const bindings = z.array(binding).min(1).max(5).parse(JSON.parse(bytes.toString('utf8')));
  const { PrismaClient } = await import('@prisma/client');
  const { PrismaUniversityImportChangeExecutorGateway } = await import('@manaratak/infrastructure');
  const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
  try {
    const report = await new PrismaUniversityImportChangeExecutorGateway(prisma).previewScreenedSources(bindings, process.env.UNIVERSITY_IMPORT_ACTOR_ID);
    await fs.writeFile(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify({ state: report.state, readyToWrite: false, plans: report.plans.length, databaseWrites: 0 }));
  } finally { await prisma.$disconnect(); }
}
main().catch(error => {
  console.error(error instanceof Error && /^UNIVERSITY_[A-Z_]+$/.test(error.message) ? error.message : 'UNIVERSITY_SCREENING_PREVIEW_FAILED_REDACTED');
  process.exitCode = 1;
});

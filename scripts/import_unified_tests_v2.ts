import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { InternationalTestImportChangeExecutor, validateInternationalTestImportPlan, type InternationalTestImportApproval } from '@manaratak/application';
import { prepareReviewedTestImport, verifyReviewedTestSources } from './import/reviewed-test-import-source';
import { requireDatabaseMutationGate } from './lib/database-mutation-gate.mjs';

const modes = ['prepare', 'inspect', 'dry-run', 'approved-write', 'rollback', 'reconcile'];
const readJson = async (file: string) => JSON.parse(await readFile(resolve(file), 'utf8')) as unknown;
const saveJson = (file: string, value: unknown) => writeFile(resolve(file), `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });

/** prepare/inspect are entirely offline. dry-run/reconcile explicitly read the
 * operator's database; there is no simulator fallback and no legacy execute. */
export async function runReviewedTestImport(args: string[], env = process.env): Promise<void> {
  const [mode, input, output, extra] = args;
  if (!modes.includes(mode) || !input || extra || (['prepare', 'dry-run'].includes(mode) ? !output : !!output)) throw new Error('TEST_IMPORT_USAGE_INVALID');
  if (mode === 'prepare') {
    const plan = await prepareReviewedTestImport(await readJson(input), process.cwd());
    await saveJson(output, plan);
    console.log(JSON.stringify({ state: 'PREPARED', changeSetId: plan.changeSetId, planHash: plan.planHash, entries: plan.entries.length, databaseWrites: 0 }));
    return;
  }
  const plan = validateInternationalTestImportPlan(await readJson(input));
  await verifyReviewedTestSources(plan, process.cwd());
  if (mode === 'inspect') {
    console.log(JSON.stringify({ state: 'SOURCE_VALIDATED', planHash: plan.planHash, entries: plan.entries.map(entry => ({ targetId: entry.targetId, resolution: entry.resolution, sourceHash: entry.sourceHash })), databaseWrites: 0, runtime: 'RUNTIME_UNTESTED' }));
    return;
  }
  const actorId = env.TEST_IMPORT_ACTOR_ID?.trim();
  if (!actorId) throw new Error('TEST_IMPORT_ACTOR_REQUIRED');
  let approval: InternationalTestImportApproval | undefined;
  if (mode === 'approved-write' || mode === 'rollback') {
    approval = { actorId, approval: env.TEST_IMPORT_APPROVAL as InternationalTestImportApproval['approval'], planHash: env.TEST_IMPORT_APPROVAL_PLAN_HASH ?? '', previewHash: env.TEST_IMPORT_APPROVAL_PREVIEW_HASH ?? '', recoveryGateToken: env.DATABASE_RECOVERY_GATE_TOKEN ?? '', recoveryEvidenceReference: env.TEST_IMPORT_RECOVERY_EVIDENCE ?? '' };
    // Fail before loading Prisma or opening any connection, including on a retry.
    if (approval.approval !== (mode === 'rollback' ? 'APPROVE_ROLLBACK' : 'APPROVE_WRITE') || approval.planHash !== plan.planHash || !/^[a-f0-9]{64}$/.test(approval.previewHash) || !approval.recoveryGateToken.trim() || !approval.recoveryEvidenceReference.trim()) throw new Error('TEST_IMPORT_EXACT_APPROVAL_AND_RECOVERY_REQUIRED');
    try { requireDatabaseMutationGate('reviewed-international-test-import', { allowedPurposes: ['import'] }, env); }
    catch { throw new Error('TEST_IMPORT_DATABASE_MUTATION_GATE_BLOCKED'); }
  }
  if (!env.DATABASE_URL) throw new Error('TEST_IMPORT_DATABASE_URL_REQUIRED');
  const { PrismaClient } = await import('@prisma/client');
  const { PrismaInternationalTestImportChangeGateway } = await import('@manaratak/infrastructure');
  const prisma = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } });
  try {
    const executor = new InternationalTestImportChangeExecutor(new PrismaInternationalTestImportChangeGateway(prisma));
    if (mode === 'dry-run') {
      const report = await executor.preview(plan, actorId);
      await saveJson(output, report);
      console.log(JSON.stringify(report));
      if (report.issues.length) process.exitCode = 1;
    } else if (mode === 'reconcile') {
      const report = await executor.reconcile(plan, actorId);
      console.log(JSON.stringify(report));
      if (report.state !== 'PASS') process.exitCode = 1;
    } else console.log(JSON.stringify(mode === 'rollback' ? await executor.rollback(plan, approval!) : await executor.commit(plan, approval!)));
  } finally { await prisma.$disconnect(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runReviewedTestImport(process.argv.slice(2)).catch(error => {
    // Prisma/FS/Zod errors can contain connection strings, paths or source data.
    const message = error instanceof Error && /^TEST_IMPORT_[A-Z_]+$/.test(error.message) ? error.message : 'TEST_IMPORT_FAILED_REDACTED';
    console.error(message);
    process.exitCode = 1;
  });
}

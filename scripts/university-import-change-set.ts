import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import {
  UniversityImportChangeExecutor,
  type UniversityImportChangePlan,
} from '@manaratak/application';
import { PrismaUniversityImportChangeExecutorGateway } from '@manaratak/infrastructure';

const [mode, planPath] = process.argv.slice(2);
if (!['inspect', 'commit', 'rollback'].includes(mode ?? '') || !planPath) {
  throw new Error(
    'Usage: tsx scripts/university-import-change-set.ts inspect|commit|rollback <change-plan.json>',
  );
}
const resolved = path.resolve(planPath);
const plan = JSON.parse(fs.readFileSync(resolved, 'utf8')) as {
  changeSetId?: string;
  stage?: string;
  sourceArtifactId?: string;
  databaseWrites?: number;
  validationIssues?: unknown[];
  changes?: unknown[];
};
if (
  !plan.changeSetId ||
  !plan.stage ||
  !plan.sourceArtifactId ||
  plan.databaseWrites !== 0 ||
  !Array.isArray(plan.validationIssues) ||
  !Array.isArray(plan.changes)
) {
  throw new Error('INVALID_UNIVERSITY_CHANGE_PLAN');
}

if (mode === 'inspect') {
  console.log(
    JSON.stringify(
      {
        mode: 'READ_ONLY',
        changeSetId: plan.changeSetId,
        changes: plan.changes.length,
        blockingIssues: plan.validationIssues.length,
        databaseWrites: 0,
      },
      null,
      2,
    ),
  );
} else {
  const requiredApproval = mode === 'commit' ? 'APPROVE_COMMIT' : 'APPROVE_ROLLBACK';
  if (process.env.UNIVERSITY_IMPORT_APPROVAL !== requiredApproval)
    throw new Error(`UNIVERSITY_IMPORT_${mode.toUpperCase()}_APPROVAL_REQUIRED`);
  if (!process.env.DATABASE_RECOVERY_GATE_TOKEN) throw new Error('DATABASE_RECOVERY_GATE_REQUIRED');
  const databaseUrl = process.env.DATABASE_URL ?? '';
  if (
    !databaseUrl ||
    /placeholder|production/i.test(databaseUrl) ||
    process.env.NODE_ENV === 'production'
  ) {
    throw new Error('EXPLICIT_DEVELOPMENT_DATABASE_REQUIRED');
  }
  const actorId = process.env.UNIVERSITY_IMPORT_ACTOR_ID;
  if (!actorId) throw new Error('UNIVERSITY_IMPORT_ACTOR_ID_REQUIRED');
  const prisma = new PrismaClient();
  try {
    const executor = new UniversityImportChangeExecutor(
      new PrismaUniversityImportChangeExecutorGateway(prisma),
    );
    const result =
      mode === 'commit'
        ? await executor.commit(plan as UniversityImportChangePlan, {
            actorId,
            recoveryGateToken: process.env.DATABASE_RECOVERY_GATE_TOKEN,
            approval: 'APPROVE_COMMIT',
          })
        : await executor.rollback(plan.changeSetId, {
            actorId,
            recoveryGateToken: process.env.DATABASE_RECOVERY_GATE_TOKEN,
            approval: 'APPROVE_ROLLBACK',
          });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

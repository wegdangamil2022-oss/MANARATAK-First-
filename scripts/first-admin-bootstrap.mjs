import { pathToFileURL } from 'node:url';
import { requireDatabaseMutationGate } from './lib/database-mutation-gate.mjs';

export function validateFirstAdminRequest(env) {
  requireDatabaseMutationGate('controlled-first-admin', { allowedPurposes: ['maintenance'] }, env);
  if (!['staging', 'production'].includes(env.NODE_ENV) || env.FIRST_ADMIN_CONFIRM !== 'PROMOTE_EXISTING_VERIFIED_IDENTITY_ONCE') {
    throw new Error('FIRST_ADMIN_EXPLICIT_CONFIRMATION_REQUIRED');
  }
  const input = { identityId: env.FIRST_ADMIN_IDENTITY_ID, roleId: env.FIRST_ADMIN_ROLE_ID,
    actorId: env.FIRST_ADMIN_ACTOR_ID, approverId: env.FIRST_ADMIN_APPROVER_ID, changeId: env.DATABASE_PRODUCTION_CHANGE_ID };
  if (Object.values(input).some(value => !value?.trim()) || input.actorId === input.approverId || input.changeId.length < 6) {
    throw new Error('FIRST_ADMIN_APPROVAL_REQUIRED');
  }
  return input;
}

async function main() {
  const input = validateFirstAdminRequest(process.env);
  // No connection/client construction is possible before all operator gates pass.
  const { PrismaClient } = await import('@prisma/client');
  const { ControlledFirstAdminBootstrap } = await import('../packages/infrastructure/dist/authorization/ControlledFirstAdminBootstrap.js');
  const prisma = new PrismaClient();
  try { await new ControlledFirstAdminBootstrap(prisma).execute(input); }
  finally { await prisma.$disconnect(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => { console.error('FIRST_ADMIN_BOOTSTRAP_FAILED'); process.exitCode = 1; });
}

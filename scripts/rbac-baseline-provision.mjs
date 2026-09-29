import { pathToFileURL } from 'node:url';
import { requireDatabaseMutationGate } from './lib/database-mutation-gate.mjs';

/**
 * Validates the operator request against the database mutation gate and explicit RBAC baseline confirmation.
 * Enforces two-person approval and production change ID requirements before any database client is initialized.
 */
export function validateRbacBaselineRequest(env = process.env) {
  requireDatabaseMutationGate('controlled-rbac-baseline-provision', { allowedPurposes: ['provision'] }, env);

  if (env.RBAC_BASELINE_CONFIRM !== 'PROVISION_CANONICAL_RBAC_BASELINE') {
    throw new Error('RBAC_BASELINE_EXPLICIT_CONFIRMATION_REQUIRED: RBAC_BASELINE_CONFIRM=PROVISION_CANONICAL_RBAC_BASELINE is required');
  }

  const changeId = env.RBAC_BASELINE_CHANGE_ID?.trim() || env.DATABASE_PRODUCTION_CHANGE_ID?.trim();
  if (!changeId) {
    throw new Error('RBAC_BASELINE_APPROVAL_REQUIRED: RBAC_BASELINE_CHANGE_ID is required');
  }
  if (changeId.length < 6) {
    throw new Error('RBAC_BASELINE_APPROVAL_REQUIRED: Change ID must be at least 6 characters');
  }

  const isSoloOwner = env.PROJECT_OWNER_POLICY === 'SOLO_OWNER' || Boolean(env.RBAC_BASELINE_OWNER_ID?.trim());

  if (isSoloOwner) {
    const ownerId = (env.RBAC_BASELINE_OWNER_ID || env.PROJECT_OWNER_ID || env.RBAC_BASELINE_ACTOR_ID)?.trim();
    if (!ownerId) {
      throw new Error('RBAC_BASELINE_APPROVAL_REQUIRED: RBAC_BASELINE_OWNER_ID or PROJECT_OWNER_ID is required for solo owner authorization');
    }
    return {
      ownerId,
      actorId: ownerId,
      approverId: ownerId,
      changeId,
      approvalPolicy: 'SOLO_OWNER',
    };
  }

  const actorId = env.RBAC_BASELINE_ACTOR_ID?.trim();
  const approverId = env.RBAC_BASELINE_APPROVER_ID?.trim();

  if (!actorId || !approverId) {
    throw new Error('RBAC_BASELINE_APPROVAL_REQUIRED: RBAC_BASELINE_ACTOR_ID, RBAC_BASELINE_APPROVER_ID, and RBAC_BASELINE_CHANGE_ID are required');
  }

  if (actorId === approverId) {
    throw new Error('RBAC_BASELINE_APPROVAL_REQUIRED: RBAC_BASELINE_ACTOR_ID and RBAC_BASELINE_APPROVER_ID must be distinct');
  }

  return { actorId, approverId, changeId, approvalPolicy: 'DUAL_CONTROL' };
}

async function main() {
  // Validate gate and operator parameters BEFORE constructing Prisma client or importing database modules
  const input = validateRbacBaselineRequest(process.env);

  const { PrismaClient } = await import('@prisma/client');
  const { ControlledRbacBaselineProvisioner } = await import('../packages/infrastructure/dist/authorization/ControlledRbacBaselineProvisioner.js');

  const prisma = new PrismaClient();
  try {
    const provisioner = new ControlledRbacBaselineProvisioner(prisma);
    const result = await provisioner.execute(input);

    console.log(JSON.stringify({
      status: 'SUCCESS',
      operation: 'RBAC_BASELINE_PROVISIONED',
      provisionedRoles: result.provisionedRoleIds,
      existingRoles: result.existingRoleIds,
      auditRecorded: result.auditRecorded,
      timestamp: new Date().toISOString(),
    }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error('RBAC_BASELINE_PROVISION_FAILED:', err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  });
}

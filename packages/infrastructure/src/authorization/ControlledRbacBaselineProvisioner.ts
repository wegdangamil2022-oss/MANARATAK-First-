import type { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

export interface CanonicalRoleDefinition {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  policyIds: string[];
}

export const CANONICAL_STUDENT_ROLE: CanonicalRoleDefinition = {
  id: 'student',
  name: 'Student',
  description: 'Default authenticated student persona',
  permissions: [],
  policyIds: [],
};

export const CANONICAL_ADMINISTRATOR_ROLE: CanonicalRoleDefinition = {
  id: 'administrator',
  name: 'Administrator',
  description: 'Full administrative authority',
  permissions: ['admin:*'],
  policyIds: [],
};

export const CANONICAL_RBAC_ROLES: readonly CanonicalRoleDefinition[] = [
  CANONICAL_STUDENT_ROLE,
  CANONICAL_ADMINISTRATOR_ROLE,
] as const;

export const RBAC_BASELINE_AUDIT_REFERENCE = 'RBAC_BASELINE_PROVISION_V1';

export interface ControlledRbacProvisionInput {
  actorId?: string;
  approverId?: string;
  ownerId?: string;
  changeId: string;
  approvalPolicy?: 'DUAL_CONTROL' | 'SOLO_OWNER';
}

export interface ControlledRbacProvisionResult {
  provisionedRoleIds: string[];
  existingRoleIds: string[];
  auditRecorded: boolean;
}

function areJsonArraysEqual(a: unknown, b: readonly string[]): boolean {
  if (!Array.isArray(a)) return false;
  if (a.length !== b.length) return false;
  return a.every((val, idx) => val === b[idx]);
}

/**
 * Controlled RBAC Baseline Provisioner.
 * 
 * Safely provisions ONLY canonical 'student' and 'administrator' RoleRecords.
 * Never creates identities, users, credentials, accounts, or role assignments.
 * Enforces serializable isolation and fails closed on conflicting definitions.
 */
export class ControlledRbacBaselineProvisioner {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: ControlledRbacProvisionInput): Promise<ControlledRbacProvisionResult> {
    const changeId = input.changeId?.trim();
    if (!changeId) {
      throw new Error('RBAC_BASELINE_APPROVAL_REQUIRED: changeId is required');
    }
    if (changeId.length < 6) {
      throw new Error('RBAC_BASELINE_APPROVAL_REQUIRED: changeId must be at least 6 characters');
    }

    const isSoloOwner = input.approvalPolicy === 'SOLO_OWNER' || Boolean(input.ownerId);
    let actorId: string;
    let approverId: string;

    if (isSoloOwner) {
      const owner = (input.ownerId || input.actorId)?.trim();
      if (!owner) {
        throw new Error('RBAC_BASELINE_APPROVAL_REQUIRED: ownerId is required for solo owner authorization');
      }
      actorId = owner;
      approverId = owner;
    } else {
      actorId = input.actorId?.trim() || '';
      approverId = input.approverId?.trim() || '';
      if (!actorId || !approverId) {
        throw new Error('RBAC_BASELINE_APPROVAL_REQUIRED: actorId, approverId, and changeId are required');
      }
      if (actorId === approverId) {
        throw new Error('RBAC_BASELINE_APPROVAL_REQUIRED: actorId and approverId must be distinct');
      }
    }

    return await this.prisma.$transaction(async tx => {
      const existingRoles = await tx.roleRecord.findMany({
        where: {
          id: {
            in: CANONICAL_RBAC_ROLES.map(r => r.id),
          },
        },
      });

      const existingMap = new Map(existingRoles.map(r => [r.id, r]));
      const rolesToCreate: CanonicalRoleDefinition[] = [];
      const matchingExistingRoleIds: string[] = [];

      for (const canonical of CANONICAL_RBAC_ROLES) {
        const existing = existingMap.get(canonical.id);
        if (!existing) {
          rolesToCreate.push(canonical);
        } else {
          const nameMatches = existing.name === canonical.name;
          const descMatches = existing.description === canonical.description;
          const permsMatch = areJsonArraysEqual(existing.permissions, canonical.permissions);
          const policiesMatch = areJsonArraysEqual(existing.policyIds, canonical.policyIds);

          if (!nameMatches || !descMatches || !permsMatch || !policiesMatch) {
            throw new Error(
              `RBAC_BASELINE_CONFLICT: Existing role '${canonical.id}' conflicts with canonical baseline configuration.`
            );
          }
          matchingExistingRoleIds.push(canonical.id);
        }
      }

      const existingAudit = await tx.auditRecord.findUnique({
        where: { reference: RBAC_BASELINE_AUDIT_REFERENCE },
      });

      const createdRoleIds: string[] = [];
      for (const role of rolesToCreate) {
        await tx.roleRecord.create({
          data: {
            id: role.id,
            name: role.name,
            description: role.description,
            permissions: role.permissions,
            policyIds: role.policyIds,
          },
        });
        createdRoleIds.push(role.id);
      }

      let auditRecorded = false;
      if (!existingAudit && createdRoleIds.length > 0) {
        await tx.auditRecord.create({
          data: {
            id: randomUUID(),
            reference: RBAC_BASELINE_AUDIT_REFERENCE,
            action: 'RBAC_BASELINE_PROVISIONED',
            category: 'AUTHORIZATION',
            severity: 'CRITICAL',
            actorId,
            actorType: isSoloOwner ? 'PROJECT_OWNER' : 'OPERATOR',
            targetId: 'role-baseline',
            targetType: 'SYSTEM',
            source: 'controlled-rbac-baseline-provisioner',
            timestamp: new Date(),
            correlationReference: changeId,
            contextMetadata: {
              ...(isSoloOwner ? { ownerId: actorId, approvalPolicy: 'SOLO_OWNER' } : { approverId, approvalPolicy: 'DUAL_CONTROL' }),
              changeId,
              createdRoleIds,
              canonicalRoleIds: CANONICAL_RBAC_ROLES.map(r => r.id),
            },
          },
        });
        auditRecorded = true;
      }

      return {
        provisionedRoleIds: createdRoleIds,
        existingRoleIds: matchingExistingRoleIds,
        auditRecorded,
      };
    }, { isolationLevel: 'Serializable' });
  }
}

import type { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

/** Offline operator path only. The CLI must pass the database mutation gate before constructing Prisma. */
export class ControlledFirstAdminBootstrap {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: { identityId: string; roleId: string; actorId: string; approverId: string; changeId: string }): Promise<void> {
    if (!input.identityId || !input.roleId || !input.actorId || !input.approverId
      || input.actorId === input.approverId || input.changeId.trim().length < 6) throw new Error('FIRST_ADMIN_APPROVAL_REQUIRED');
    await this.prisma.$transaction(async tx => {
      if (await tx.auditRecord.findUnique({ where: { reference: 'FIRST_ADMIN_BOOTSTRAP_ONCE' } })) throw new Error('FIRST_ADMIN_ALREADY_BOOTSTRAPPED');
      const roles = await tx.roleRecord.findMany();
      const adminRoles = roles.filter(role => Array.isArray(role.permissions) && role.permissions.some(value =>
        value === '*' || value === 'admin:*' || value === 'admin:authorization:manage'));
      if (!adminRoles.some(role => role.id === input.roleId)) throw new Error('FIRST_ADMIN_ROLE_NOT_CONFIGURED');
      if (await tx.roleAssignmentRecord.findFirst({ where: { roleId: { in: adminRoles.map(role => role.id) } } })) {
        throw new Error('ADMIN_ALREADY_EXISTS_USE_GOVERNANCE');
      }
      const identity = await tx.identityRecord.findUnique({ where: { id: input.identityId }, include: { user: true, account: true, credentials: true } });
      if (!identity || identity.status !== 'ACTIVE' || identity.account?.accessState !== 'Active' || !identity.user?.isEmailVerified
        || identity.credentials.filter(item => item.type === 'password' && !item.disabled).length !== 1) throw new Error('FIRST_ADMIN_VERIFIED_IDENTITY_REQUIRED');
      await tx.roleAssignmentRecord.create({ data: { id: randomUUID(), identityId: input.identityId, roleId: input.roleId } });
      await tx.auditRecord.create({ data: {
        id: randomUUID(), reference: 'FIRST_ADMIN_BOOTSTRAP_ONCE', action: 'FIRST_ADMIN_BOOTSTRAPPED', category: 'AUTHORIZATION',
        severity: 'CRITICAL', actorId: input.actorId, actorType: 'OPERATOR', targetId: input.identityId, targetType: 'IDENTITY',
        source: 'controlled-first-admin-cli', timestamp: new Date(), correlationReference: input.changeId,
        contextMetadata: { approverId: input.approverId, roleId: input.roleId, changeId: input.changeId },
      } });
    }, { isolationLevel: 'Serializable' });
  }
}

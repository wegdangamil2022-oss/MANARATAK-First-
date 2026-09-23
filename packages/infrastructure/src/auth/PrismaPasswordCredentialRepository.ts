import type { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import type { IPasswordCredentialRepository } from '@manaratak/domain';

export class PrismaPasswordCredentialRepository implements IPasswordCredentialRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async find(identityId: string) {
    const rows = await this.prisma.credentialRecord.findMany({ where: { identityId, type: 'password' }, take: 2 });
    if (rows.length > 1) throw new Error('DUPLICATE_PASSWORD_CREDENTIAL');
    return rows[0] ?? null;
  }

  async disable(identityId: string, actorId: string, changeId: string): Promise<void> {
    await this.prisma.$transaction(async tx => {
      const updated = await tx.credentialRecord.updateMany({ where: { identityId, type: 'password' }, data: { disabled: true } });
      if (updated.count !== 1) throw new Error('PASSWORD_CREDENTIAL_MISSING_OR_DUPLICATE');
      await tx.sessionRecord.updateMany({ where: { identityId, revokedAt: null }, data: { revokedAt: new Date() } });
      const id = randomUUID();
      await tx.auditRecord.create({ data: {
        id, reference: `AUD-${id}`, action: 'PASSWORD_CREDENTIAL_DISABLED', category: 'IAM', severity: 'WARNING',
        actorId, actorType: 'IDENTITY', targetId: identityId, targetType: 'PASSWORD_CREDENTIAL',
        source: 'admin-credential-api', timestamp: new Date(), correlationReference: changeId,
        contextMetadata: { result: 'SUCCESS', sessionsRevoked: true },
      } });
    }, { isolationLevel: 'Serializable' });
  }

  async change(identityId: string, expectedHash: string, passwordHash: string): Promise<void> {
    await this.prisma.$transaction(async tx => {
      const identity = await tx.identityRecord.findUnique({ where: { id: identityId }, include: { user: true, account: true } });
      if (!identity || identity.status !== 'ACTIVE' || identity.account?.accessState !== 'Active' || !identity.user?.isEmailVerified) {
        throw new Error('AUTHENTICATION_REQUIRED');
      }
      const updated = await tx.credentialRecord.updateMany({
        where: { identityId, type: 'password', disabled: false, passwordHash: expectedHash }, data: { passwordHash },
      });
      if (updated.count !== 1) throw new Error('CREDENTIAL_CHANGED_OR_DISABLED');
      await tx.sessionRecord.updateMany({ where: { identityId, revokedAt: null }, data: { revokedAt: new Date() } });
      const id = randomUUID();
      await tx.auditRecord.create({ data: {
        id, reference: `AUD-${id}`, action: 'PASSWORD_CHANGED', category: 'IAM', severity: 'INFO',
        actorId: identityId, actorType: 'IDENTITY', targetId: identityId, targetType: 'PASSWORD_CREDENTIAL',
        source: 'auth-api', timestamp: new Date(), contextMetadata: { sessionsRevoked: true },
      } });
    }, { isolationLevel: 'Serializable' });
  }

}

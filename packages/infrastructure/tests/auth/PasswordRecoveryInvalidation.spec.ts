import { describe, expect, it, vi } from 'vitest';
import { PrismaPasswordCredentialRepository } from '../../src/auth/PrismaPasswordCredentialRepository';

describe('password change recovery-token invalidation', () => {
  it('invalidates pending recovery tokens in the same transaction as the password change', async () => {
    const tx = {
      identityRecord: { findUnique: vi.fn().mockResolvedValue({ status: 'ACTIVE', account: { accessState: 'Active' }, user: { isEmailVerified: true } }) },
      credentialRecord: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      passwordResetTokenRecord: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      sessionRecord: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
      auditRecord: { create: vi.fn() },
    };
    const prisma = { $transaction: vi.fn(async (fn) => fn(tx)) };
    await new PrismaPasswordCredentialRepository(prisma as any).change('identity', 'old-hash', 'new-hash');
    expect(tx.passwordResetTokenRecord.updateMany).toHaveBeenCalledWith({ where: { identityId: 'identity', consumedAt: null }, data: { consumedAt: expect.any(Date) } });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});

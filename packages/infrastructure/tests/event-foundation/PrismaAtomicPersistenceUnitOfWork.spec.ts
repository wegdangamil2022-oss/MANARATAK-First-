import { describe, expect, it, vi } from 'vitest';
import { PrismaAtomicPersistenceUnitOfWork } from '../../src/event-foundation/PrismaAtomicPersistenceUnitOfWork';

describe('PrismaAtomicPersistenceUnitOfWork', () => {
  it('supplies one transaction client and returns the work result', async () => {
    const transactionClient = { marker: 'transaction' };
    const prisma = {
      $transaction: vi.fn(async (callback: (client: unknown) => Promise<unknown>) => callback(transactionClient)),
    };
    const unitOfWork = new PrismaAtomicPersistenceUnitOfWork(prisma as any);

    const result = await unitOfWork.execute(async context => {
      expect(context.boundaryId).toBeTruthy();
      expect((context as any).transactionClient).toBe(transactionClient);
      return 'committed';
    });

    expect(result).toBe('committed');
    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });

  it('propagates work failure so Prisma can roll back the transaction', async () => {
    const prisma = {
      $transaction: vi.fn(async (callback: (client: unknown) => Promise<unknown>) => callback({})),
    };
    const unitOfWork = new PrismaAtomicPersistenceUnitOfWork(prisma as any);

    await expect(unitOfWork.execute(async () => { throw new Error('business write failed'); })).rejects.toThrow('business write failed');
  });
});

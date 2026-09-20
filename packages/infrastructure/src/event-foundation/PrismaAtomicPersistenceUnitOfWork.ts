import type { PrismaClient } from '@prisma/client';
import type { IAtomicPersistenceUnitOfWork } from '@manaratak/application';
import type { AtomicPersistenceContext } from '@manaratak/domain';
import type { PrismaAtomicPersistenceContext } from './PrismaTransactionalOutboxStore';

export class PrismaAtomicPersistenceUnitOfWork implements IAtomicPersistenceUnitOfWork {
  public constructor(private readonly prisma: PrismaClient) {}

  public async execute<T>(work: (context: AtomicPersistenceContext) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async transactionClient => {
      const context: PrismaAtomicPersistenceContext = {
        boundaryId: crypto.randomUUID(),
        transactionClient,
      };
      return work(context);
    });
  }
}

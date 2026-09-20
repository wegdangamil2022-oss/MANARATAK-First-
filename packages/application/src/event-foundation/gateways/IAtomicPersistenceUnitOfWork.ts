import { AtomicPersistenceContext } from '@manaratak/domain';

export interface IAtomicPersistenceUnitOfWork {
  execute<T>(work: (context: AtomicPersistenceContext) => Promise<T>): Promise<T>;
}

import { AtomicPersistenceContext } from '@absheer/domain';

export interface IAtomicPersistenceUnitOfWork {
  execute<T>(work: (context: AtomicPersistenceContext) => Promise<T>): Promise<T>;
}

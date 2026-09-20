import { Role } from '../aggregates/Role';
import { ISpecification } from '@manaratak/core';
import { AtomicPersistenceContext } from '../../event-foundation/outbox/TransactionalOutbox';

export interface IRoleRepository {
  findById(id: string): Promise<Role | null>;
  save(role: Role): Promise<void>;
  findBy(specification: ISpecification<Role>): Promise<Role[]>;
  listAll(): Promise<Role[]>;
  delete(id: string): Promise<void>;
}

export interface ITransactionalRoleRepository extends IRoleRepository {
  withTransaction(context: AtomicPersistenceContext): IRoleRepository;
}

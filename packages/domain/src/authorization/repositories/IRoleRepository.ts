import { Role } from '../aggregates/Role';
import { ISpecification } from '@manaratak/core';
import { AtomicPersistenceContext } from '../../event-foundation/outbox/TransactionalOutbox';

export interface IRoleRepository {
  queryPage?(input: {
    limit: number;
    cursor?: string;
    policyId?: string; search?: string;
  }): Promise<{ items: Role[]; nextCursor: string | null }>;
  findById(id: string): Promise<Role | null>;
  save(role: Role): Promise<void>;
  findBy(specification: ISpecification<Role>): Promise<Role[]>;
  listAll(): Promise<Role[]>;
  delete(id: string): Promise<void>;
  /** Control-plane commands require implementations with atomic revision checks. */
  createUnique?(role: Role): Promise<void>;
  updateIfCurrent?(role: Role, expectedRevision: string): Promise<void>;
  deleteIfUnused?(id: string, expectedRevision: string): Promise<void>;
  countMembers?(id: string): Promise<number>;
}

export interface ITransactionalRoleRepository extends IRoleRepository {
  withTransaction(context: AtomicPersistenceContext): IRoleRepository;
}

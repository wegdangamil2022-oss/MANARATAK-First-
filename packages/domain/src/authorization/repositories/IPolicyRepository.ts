import { Policy } from '../aggregates/Policy';
import { ISpecification } from '@manaratak/core';

export interface IPolicyRepository {
  queryPage?(input: {
    limit: number;
    cursor?: string;
  }): Promise<{ items: Policy[]; nextCursor: string | null }>;
  create?(policy: Policy): Promise<void>;
  assertRoleUsageAuthority?(id: string, permittedPermissions: string[]): Promise<void>;
  updateIfCurrent?(policy: Policy, revision: string): Promise<void>;
  withTransaction?(
    context: import('../../event-foundation/outbox/TransactionalOutbox').AtomicPersistenceContext,
  ): IPolicyRepository;
  findById(id: string): Promise<Policy | null>;
  save(policy: Policy): Promise<void>;
  findBy(specification: ISpecification<Policy>): Promise<Policy[]>;
  delete(id: string): Promise<void>;
}

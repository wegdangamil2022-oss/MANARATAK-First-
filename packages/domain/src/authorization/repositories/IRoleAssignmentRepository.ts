import { RoleAssignment } from '../aggregates/RoleAssignment';
import { ISpecification } from '@manaratak/core';
import { AtomicPersistenceContext } from '../../event-foundation/outbox/TransactionalOutbox';

export interface IRoleAssignmentRepository {
  findById(id: string): Promise<RoleAssignment | null>;
  save(assignment: RoleAssignment): Promise<void>;
  findBy(specification: ISpecification<RoleAssignment>): Promise<RoleAssignment[]>;
  findByIdentityId(identityId: string): Promise<RoleAssignment[]>;
  listAll(): Promise<RoleAssignment[]>;
  delete(id: string): Promise<void>;
}

export interface ITransactionalRoleAssignmentRepository extends IRoleAssignmentRepository {
  withTransaction(context: AtomicPersistenceContext): IRoleAssignmentRepository;
}

import { 
  IRoleAssignmentRepository, 
  IIdentityRepository,
  IRoleRepository,
  ITransactionalRoleAssignmentRepository,
  RoleAssignment
} from '@manaratak/domain';
import { AssignRoleInput } from '../dtos/AuthorizationDtos';
import { AtomicDomainMutationCoordinator, AtomicMutationRequestContext } from '../../event-foundation/use-cases/AtomicDomainMutationCoordinator';

export class AssignRoleUseCase {
  constructor(private readonly roleAssignmentRepository: IRoleAssignmentRepository, private readonly atomicMutations: AtomicDomainMutationCoordinator | undefined,
    private readonly identities: IIdentityRepository, private readonly roles: IRoleRepository) {}

  public page(input: { limit: number; cursor?: string; roleId?: string; search?: string }) {
    if (!this.roleAssignmentRepository.queryPage)
      throw new Error('AUTHORIZATION_PAGINATION_UNAVAILABLE');
    return this.roleAssignmentRepository.queryPage(input);
  }
  public async listAssignments(): Promise<RoleAssignment[]> {
    return this.roleAssignmentRepository.listAll();
  }

  public async getAssignment(id: string): Promise<RoleAssignment | null> {
    return this.roleAssignmentRepository.findById(id);
  }

  public async revokeAssignment(id: string, context?: AtomicMutationRequestContext): Promise<void> {
    const existing = await this.roleAssignmentRepository.findById(id);
    if (!existing) throw new Error('ROLE_ASSIGNMENT_NOT_FOUND');
    if (!this.atomicMutations) return this.roleAssignmentRepository.delete(id);
    const repository = this.roleAssignmentRepository as Partial<ITransactionalRoleAssignmentRepository>;
    if (!repository.withTransaction) throw new Error('ROLE_ASSIGNMENT_TRANSACTIONAL_PERSISTENCE_REQUIRED');
    await this.atomicMutations.execute(
      {
        domain: 'AUTHORIZATION',
        aggregateType: 'ROLE_ASSIGNMENT',
        aggregateId: id,
        action: 'ROLE_ASSIGNMENT_REVOKED',
        context,
        auditMetadata: {
          ...(
            context as
              (AtomicMutationRequestContext & { metadata?: Record<string, unknown> }) | undefined
          )?.metadata,
          identityId: existing.identityId,
          roleId: existing.roleId,
        },
      },
      transaction => repository.withTransaction!(transaction).delete(id),
    );
  }

  public async execute(
    input: AssignRoleInput,
    context?: AtomicMutationRequestContext,
  ): Promise<{ assignmentId: string; replayed: boolean }> {
    if (!(await this.identities.findById(input.identityId))) throw new Error('IDENTITY_NOT_FOUND');
    if (!(await this.roles.findById(input.roleId))) throw new Error('ROLE_NOT_FOUND');
    const existing = await this.roleAssignmentRepository.findById(input.id);
    if (existing && (existing.identityId !== input.identityId || existing.roleId !== input.roleId)) throw new Error('ROLE_ASSIGNMENT_IMMUTABLE');
    const assigned = (await this.roleAssignmentRepository.findByIdentityId(input.identityId)).find(item => item.roleId === input.roleId);
    if (assigned) return { assignmentId: assigned.id, replayed: true };
    const assignment = new RoleAssignment({
      id: input.id,
      identityId: input.identityId,
      roleId: input.roleId,
      assignedAt: new Date()
    });

    if (!this.atomicMutations) {
      await this.roleAssignmentRepository.save(assignment);
      return { assignmentId: assignment.id, replayed: false };
    }
    const repository = this.roleAssignmentRepository as Partial<ITransactionalRoleAssignmentRepository>;
    if (!repository.withTransaction) throw new Error('ROLE_ASSIGNMENT_TRANSACTIONAL_PERSISTENCE_REQUIRED');
    await this.atomicMutations.execute(
      {
        domain: 'AUTHORIZATION',
        aggregateType: 'ROLE_ASSIGNMENT',
        aggregateId: input.id,
        action: 'ROLE_ASSIGNED',
        context,
        auditMetadata: {
          ...(
            context as
              (AtomicMutationRequestContext & { metadata?: Record<string, unknown> }) | undefined
          )?.metadata,
          identityId: input.identityId,
          roleId: input.roleId,
        },
        outbox: { metadata: {schemaVersion:'1.0.0'}, eventType: 'RoleAssignmentCreated', payload: { assignmentId: input.id, identityId: input.identityId, roleId: input.roleId } },
      },
      transaction => repository.withTransaction!(transaction).save(assignment),
    );
    return { assignmentId: assignment.id, replayed: false };
  }
}

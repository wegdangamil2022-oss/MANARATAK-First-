import {
  IRoleRepository,
  ITransactionalRoleRepository,
  Role,
  PermissionReference,
} from '@manaratak/domain';
import { CreateRoleInput } from '../dtos/AuthorizationDtos';
import {
  AtomicDomainMutationCoordinator,
  AtomicMutationRequestContext,
} from '../../event-foundation/use-cases/AtomicDomainMutationCoordinator';

export class ManageRolesUseCase {
  constructor(
    private readonly roleRepository: IRoleRepository,
    private readonly atomicMutations?: AtomicDomainMutationCoordinator,
  ) {}

  public async createRole(
    input: CreateRoleInput,
    context?: AtomicMutationRequestContext,
  ): Promise<void> {
    if (
      ['student', 'administrator'].includes(input.id) ||
      /^(?:system|canonical|baseline)[:_-]/i.test(input.id)
    )
      throw new Error('SYSTEM_ROLE_PROTECTED');
    const existing = await this.roleRepository.findById(input.id);
    if (existing) {
      const sameList = (left: string[], right: string[]) =>
        JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
      if (
        existing.name === input.name &&
        existing.description === input.description &&
        sameList(
          existing.permissions.map((permission) => permission.value),
          input.permissions,
        ) &&
        sameList(existing.policyIds, input.policyIds)
      )
        return;
      throw new Error('ROLE_ID_ALREADY_EXISTS');
    }
    const role = new Role({
      id: input.id,
      name: input.name,
      description: input.description,
      permissions: input.permissions.map((p) => new PermissionReference(p)),
      policyIds: input.policyIds,
    });

    const create = (repository: IRoleRepository) =>
      repository.createUnique ? repository.createUnique(role) : repository.save(role);
    if (!this.atomicMutations) return create(this.roleRepository);
    const repository = this.roleRepository as Partial<ITransactionalRoleRepository>;
    if (!repository.withTransaction) throw new Error('ROLE_TRANSACTIONAL_PERSISTENCE_REQUIRED');
    await this.atomicMutations.execute(
      {
        domain: 'AUTHORIZATION',
        aggregateType: 'ROLE',
        aggregateId: input.id,
        action: 'ROLE_CREATED',
        auditMetadata: (
          context as
            (AtomicMutationRequestContext & { metadata?: Record<string, unknown> }) | undefined
        )?.metadata,
        context,
      },
      (transaction) => create(repository.withTransaction!(transaction)),
    );
  }

  public async getRole(id: string): Promise<Role | null> {
    return this.roleRepository.findById(id);
  }

  public page(input: { limit: number; cursor?: string; policyId?: string; search?: string }) {
    if (!this.roleRepository.queryPage) throw new Error('AUTHORIZATION_PAGINATION_UNAVAILABLE');
    return this.roleRepository.queryPage(input);
  }
  public async listRoles(): Promise<Role[]> {
    return this.roleRepository.listAll();
  }

  public async updateRole(
    input: CreateRoleInput & { expectedRevision: string },
    context?: AtomicMutationRequestContext,
  ): Promise<void> {
    if (
      ['student', 'administrator'].includes(input.id) ||
      /^(?:system|canonical|baseline)[:_-]/i.test(input.id)
    )
      throw new Error('SYSTEM_ROLE_PROTECTED');
    const existing = await this.roleRepository.findById(input.id);
    if (!existing) throw new Error('ROLE_NOT_FOUND');
    this.assertCustomRole(existing);
    if (existing.revision !== input.expectedRevision) throw new Error('ROLE_REVISION_CONFLICT');
    const role = new Role({
      ...input,
      permissions: input.permissions.map((permission) => new PermissionReference(permission)),
    });
    await this.mutateRole(input.id, 'ROLE_UPDATED', context, (repository) => {
      if (!repository.updateIfCurrent) throw new Error('ROLE_CONDITIONAL_UPDATE_REQUIRED');
      return repository.updateIfCurrent(role, input.expectedRevision);
    });
  }

  public async retireRole(
    id: string,
    expectedRevision: string,
    context?: AtomicMutationRequestContext,
  ): Promise<void> {
    const existing = await this.roleRepository.findById(id);
    if (!existing) throw new Error('ROLE_NOT_FOUND');
    this.assertCustomRole(existing);
    const role = new Role({
      id,
      name: existing.name,
      description: existing.description,
      permissions: [],
      policyIds: [],
    });
    await this.mutateRole(id, 'ROLE_RETIRED', context, (repository) => {
      if (!repository.updateIfCurrent) throw new Error('ROLE_CONDITIONAL_UPDATE_REQUIRED');
      return repository.updateIfCurrent(role, expectedRevision);
    });
  }

  public async deleteUnusedRole(
    id: string,
    expectedRevision: string,
    context?: AtomicMutationRequestContext,
  ): Promise<void> {
    const existing = await this.roleRepository.findById(id);
    if (!existing) throw new Error('ROLE_NOT_FOUND');
    this.assertCustomRole(existing);
    await this.mutateRole(id, 'ROLE_DELETED', context, (repository) => {
      if (!repository.deleteIfUnused) throw new Error('ROLE_SAFE_DELETE_REQUIRED');
      return repository.deleteIfUnused(id, expectedRevision);
    });
  }

  public async getMemberCount(id: string): Promise<number | null> {
    return this.roleRepository.countMembers ? this.roleRepository.countMembers(id) : null;
  }

  private assertCustomRole(role: Role): void {
    if (
      ['student', 'administrator'].includes(role.id) ||
      /^(?:system|canonical|baseline)[:_-]/i.test(role.id) ||
      role.permissions.some((permission) =>
        [
          '*',
          'admin:*',
          'admin:authorization:manage',
          'admin:identities:manage',
          'admin:credentials:manage',
        ].includes(permission.value),
      )
    ) {
      throw new Error('SYSTEM_ROLE_PROTECTED');
    }
  }

  private async mutateRole(
    id: string,
    action: string,
    context: AtomicMutationRequestContext | undefined,
    mutation: (repository: IRoleRepository) => Promise<void>,
  ) {
    if (!this.atomicMutations) return mutation(this.roleRepository);
    const repository = this.roleRepository as Partial<ITransactionalRoleRepository>;
    if (!repository.withTransaction) throw new Error('ROLE_TRANSACTIONAL_PERSISTENCE_REQUIRED');
    const metadata = (
      context as (AtomicMutationRequestContext & { metadata?: Record<string, unknown> }) | undefined
    )?.metadata;
    await this.atomicMutations.execute(
      {
        domain: 'AUTHORIZATION',
        aggregateType: 'ROLE',
        aggregateId: id,
        action,
        context,
        auditMetadata: metadata,
      },
      (transaction) => mutation(repository.withTransaction!(transaction)),
    );
  }
}

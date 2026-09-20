import { 
  IRoleRepository, 
  ITransactionalRoleRepository,
  Role, 
  PermissionReference 
} from '@manaratak/domain';
import { CreateRoleInput } from '../dtos/AuthorizationDtos';
import { AtomicDomainMutationCoordinator, AtomicMutationRequestContext } from '../../event-foundation/use-cases/AtomicDomainMutationCoordinator';

export class ManageRolesUseCase {
  constructor(private readonly roleRepository: IRoleRepository, private readonly atomicMutations?: AtomicDomainMutationCoordinator) {}

  public async createRole(input: CreateRoleInput, context?: AtomicMutationRequestContext): Promise<void> {
    const role = new Role({
      id: input.id,
      name: input.name,
      description: input.description,
      permissions: input.permissions.map(p => new PermissionReference(p)),
      policyIds: input.policyIds
    });

    if (!this.atomicMutations) return this.roleRepository.save(role);
    const repository = this.roleRepository as Partial<ITransactionalRoleRepository>;
    if (!repository.withTransaction) throw new Error('ROLE_TRANSACTIONAL_PERSISTENCE_REQUIRED');
    await this.atomicMutations.execute({ domain: 'AUTHORIZATION', aggregateType: 'ROLE', aggregateId: input.id, action: 'ROLE_CREATED', context },
      transaction => repository.withTransaction!(transaction).save(role));
  }

  public async getRole(id: string): Promise<Role | null> {
    return this.roleRepository.findById(id);
  }

  public async listRoles(): Promise<Role[]> {
    return this.roleRepository.listAll();
  }
}

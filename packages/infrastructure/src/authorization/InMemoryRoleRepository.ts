import { Role, IRoleRepository } from '@manaratak/domain';
import { ISpecification } from '@manaratak/core';

export class InMemoryRoleRepository implements IRoleRepository {
  private readonly roles = new Map<string, Role>();

  async findById(id: string): Promise<Role | null> {
    return this.roles.get(id) || null;
  }

  async save(role: Role): Promise<void> {
    this.roles.set(role.id, role);
  }

  async findBy(specification: ISpecification<Role>): Promise<Role[]> {
    const all = Array.from(this.roles.values());
    return all.filter(role => specification.isSatisfiedBy(role));
  }

  async listAll(): Promise<Role[]> {
    return Array.from(this.roles.values());
  }

  async delete(id: string): Promise<void> {
    this.roles.delete(id);
  }
}

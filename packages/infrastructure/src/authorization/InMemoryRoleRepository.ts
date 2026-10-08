import { Role, IRoleRepository } from '@manaratak/domain';
import { ISpecification } from '@manaratak/core';

export class InMemoryRoleRepository implements IRoleRepository {
  private readonly roles = new Map<string, Role>();

  async findById(id: string): Promise<Role | null> {
    return this.roles.get(id) || null;
  }

  async save(role: Role): Promise<void> {
    const previous = this.roles.get(role.id)?.revision;
    this.roles.set(
      role.id,
      new Role({
        id: role.id,
        name: role.name,
        description: role.description,
        permissions: role.permissions,
        policyIds: role.policyIds,
        revision: new Date(
          Math.max(Date.now(), previous ? new Date(previous).getTime() + 1 : 0),
        ).toISOString(),
      }),
    );
  }

  async createUnique(role: Role): Promise<void> {
    if (this.roles.has(role.id)) throw new Error('ROLE_ID_ALREADY_EXISTS');
    this.assertUniqueName(role);
    await this.save(role);
  }

  async updateIfCurrent(role: Role, expectedRevision: string): Promise<void> {
    if (this.roles.get(role.id)?.revision !== expectedRevision)
      throw new Error('ROLE_REVISION_CONFLICT');
    this.assertUniqueName(role);
    await this.save(role);
  }

  private assertUniqueName(role: Role) {
    const normalize = (value: string) =>
      value.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLowerCase();
    if (
      [...this.roles.values()].some(
        (existing) => existing.id !== role.id && normalize(existing.name) === normalize(role.name),
      )
    )
      throw new Error('ROLE_NAME_ALREADY_EXISTS');
  }

  async findBy(specification: ISpecification<Role>): Promise<Role[]> {
    const all = Array.from(this.roles.values());
    return all.filter(role => specification.isSatisfiedBy(role));
  }

  async queryPage(input: { limit: number; cursor?: string; policyId?: string; search?: string }) {
    const rows = [...this.roles.values()]
      .filter(
        (item) =>
          (!input.cursor || item.id > input.cursor) && (!input.policyId || item.policyIds.includes(input.policyId)) &&
          (!input.search ||
            [item.id, item.name, item.description].some((value) =>
              value.toLowerCase().includes(input.search!.toLowerCase()),
            )),
      )
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const items = rows.slice(0, input.limit);
    return { items, nextCursor: rows.length > input.limit ? items.at(-1)!.id : null };
  }
  async listAll(): Promise<Role[]> {
    return Array.from(this.roles.values());
  }

  async delete(id: string): Promise<void> {
    this.roles.delete(id);
  }
}

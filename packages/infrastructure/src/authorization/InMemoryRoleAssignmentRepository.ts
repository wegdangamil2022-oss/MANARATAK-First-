import { RoleAssignment, IRoleAssignmentRepository } from '@manaratak/domain';
import { ISpecification } from '@manaratak/core';

export class InMemoryRoleAssignmentRepository implements IRoleAssignmentRepository {
  private readonly assignments = new Map<string, RoleAssignment>();

  async findById(id: string): Promise<RoleAssignment | null> {
    return this.assignments.get(id) || null;
  }

  async save(assignment: RoleAssignment): Promise<void> {
    this.assignments.set(assignment.id, assignment);
  }

  async findBy(specification: ISpecification<RoleAssignment>): Promise<RoleAssignment[]> {
    const all = Array.from(this.assignments.values());
    return all.filter(assignment => specification.isSatisfiedBy(assignment));
  }

  async findByIdentityId(identityId: string): Promise<RoleAssignment[]> {
    const all = Array.from(this.assignments.values());
    return all.filter(assignment => assignment.identityId === identityId);
  }

  async queryPage(input: { limit: number; cursor?: string; roleId?: string; search?: string }) {
    const rows = [...this.assignments.values()]
      .filter(
        (item) =>
          (!input.cursor || item.id > input.cursor) &&
          (!input.roleId || item.roleId === input.roleId) &&
          (!input.search ||
            [item.id, item.identityId, item.roleId].some((value) =>
              value.toLowerCase().includes(input.search!.toLowerCase()),
            )),
      )
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const items = rows.slice(0, input.limit);
    return { items, nextCursor: rows.length > input.limit ? items.at(-1)!.id : null };
  }
  async listAll(): Promise<RoleAssignment[]> {
    return Array.from(this.assignments.values());
  }

  async delete(id: string): Promise<void> {
    this.assignments.delete(id);
  }
}

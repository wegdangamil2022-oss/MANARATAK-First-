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

  async listAll(): Promise<RoleAssignment[]> {
    return Array.from(this.assignments.values());
  }

  async delete(id: string): Promise<void> {
    this.assignments.delete(id);
  }
}

import { Policy, IPolicyRepository } from '@manaratak/domain';
import { ISpecification } from '@manaratak/core';

export class InMemoryPolicyRepository implements IPolicyRepository {
  private readonly policies = new Map<string, Policy>();

  async findById(id: string): Promise<Policy | null> {
    return this.policies.get(id) || null;
  }

  async save(policy: Policy): Promise<void> {
    this.policies.set(policy.id, policy);
  }

  async findBy(specification: ISpecification<Policy>): Promise<Policy[]> {
    const all = Array.from(this.policies.values());
    return all.filter(policy => specification.isSatisfiedBy(policy));
  }

  async delete(id: string): Promise<void> {
    this.policies.delete(id);
  }
}

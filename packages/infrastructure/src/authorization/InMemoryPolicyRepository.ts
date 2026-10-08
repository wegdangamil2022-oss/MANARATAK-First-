import { Policy, IPolicyRepository, IRoleRepository } from '@manaratak/domain';
import { ISpecification } from '@manaratak/core';

export class InMemoryPolicyRepository implements IPolicyRepository {
  constructor(private readonly roles?: IRoleRepository) {}
  private readonly policies = new Map<string, Policy>();

  async findById(id: string): Promise<Policy | null> {
    return this.policies.get(id) || null;
  }

  async save(policy: Policy): Promise<void> {
    const previous = this.policies.get(policy.id)?.revision;
    this.policies.set(
      policy.id,
      new Policy({
        id: policy.id,
        name: policy.name,
        description: policy.description,
        ruleType: policy.ruleType,
        ruleConfiguration: policy.ruleConfiguration,
        revision: new Date(
          Math.max(Date.now(), previous ? new Date(previous).getTime() + 1 : 0),
        ).toISOString(),
      }),
    );
  }

  async findBy(specification: ISpecification<Policy>): Promise<Policy[]> {
    const all = Array.from(this.policies.values());
    return all.filter(policy => specification.isSatisfiedBy(policy));
  }

  async queryPage(input: { limit: number; cursor?: string }) {
    const rows = [...this.policies.values()]
      .filter((row) => !input.cursor || row.id > input.cursor)
      .sort((a, b) => a.id.localeCompare(b.id));
    const items = rows.slice(0, input.limit);
    return { items, nextCursor: rows.length > input.limit ? items.at(-1)!.id : null };
  }
  async create(policy: Policy) {
    if (this.policies.has(policy.id)) throw new Error('POLICY_ID_ALREADY_EXISTS');
    await this.save(policy);
  }
  async assertRoleUsageAuthority(id: string, permittedPermissions: string[]): Promise<void> {
    if(!this.roles?.queryPage)throw new Error('POLICY_USAGE_CHECK_UNAVAILABLE');
    let cursor: string | undefined;
    do {
      const page = await this.roles.queryPage({limit:100,policyId:id,cursor});
      if(page.items.some(role => ['student','administrator'].includes(role.id) || /^(?:system|canonical|baseline)[:_-]/i.test(role.id)
        || role.permissions.some(permission => !permittedPermissions.includes(permission.value))))throw new Error('POLICY_PERMISSION_EXCEEDS_ACTOR');
      cursor = page.nextCursor ?? undefined;
    } while(cursor);
  }
  async updateIfCurrent(policy: Policy, revision: string) {
    if (this.policies.get(policy.id)?.revision !== revision)
      throw new Error('POLICY_REVISION_CONFLICT');
    await this.save(policy);
  }
  async delete(id: string): Promise<void> {
    this.policies.delete(id);
  }
}

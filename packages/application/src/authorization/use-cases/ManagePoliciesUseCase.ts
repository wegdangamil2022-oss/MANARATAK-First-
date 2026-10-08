import { IPolicyRepository, Policy } from '@manaratak/domain';
import { isIP } from 'node:net';
import {
  AtomicDomainMutationCoordinator,
  AtomicMutationRequestContext,
} from '../../event-foundation/use-cases/AtomicDomainMutationCoordinator';

export type PolicyDefinition = {
  id: string;
  name: string;
  description: string;
  ruleType: 'TIME' | 'IP';
  configuration: {
    start?: string;
    end?: string;
    timezone?: string;
    daysOfWeek?: number[];
    allowedIps?: string[];
  };
};
/** Authoring never changes permission ownership. Retired policies deny access, preserving references. */
export class ManagePoliciesUseCase {
  constructor(
    private readonly policies: IPolicyRepository,
    private readonly atomic?: AtomicDomainMutationCoordinator,
  ) {}
  get(id: string) {
    return this.policies.findById(id);
  }
  page(input: { limit: number; cursor?: string }) {
    if (!this.policies.queryPage) throw new Error('POLICY_PAGINATION_UNAVAILABLE');
    return this.policies.queryPage(input);
  }
  definition(input: PolicyDefinition): Policy {
    if (
      !input.id.trim() ||
      !input.name.trim() ||
      input.name.length > 240 ||
      input.description.length > 2000
    )
      throw new Error('POLICY_DEFINITION_INVALID');
    const c = input.configuration;
    if (input.ruleType === 'TIME') {
      if (
        !c.start ||
        !c.end ||
        !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(c.start) ||
        !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(c.end) ||
        c.allowedIps !== undefined ||
        (c.daysOfWeek &&
          (!c.daysOfWeek.length ||
            c.daysOfWeek.some((day) => !Number.isInteger(day) || day < 0 || day > 6)))
      )
        throw new Error('POLICY_DEFINITION_INVALID');
      try {
        new Intl.DateTimeFormat('en', { timeZone: c.timezone || 'UTC' });
      } catch {
        throw new Error('POLICY_DEFINITION_INVALID');
      }
    } else if (input.ruleType === 'IP') {
      if (
        !c.allowedIps?.length ||
        c.allowedIps.length > 100 ||
        c.allowedIps.some((ip) => !isIP(ip)) ||
        c.start !== undefined ||
        c.end !== undefined ||
        c.timezone !== undefined ||
        c.daysOfWeek !== undefined
      )
        throw new Error('POLICY_DEFINITION_INVALID');
    } else throw new Error('POLICY_DEFINITION_INVALID');
    return new Policy({
      id: input.id,
      name: input.name.trim(),
      description: input.description.trim(),
      ruleType: input.ruleType,
      ruleConfiguration: JSON.stringify(c),
    });
  }
  async create(input: PolicyDefinition, context?: AtomicMutationRequestContext, permittedPermissions: string[] = []) {
    const policy = this.definition(input);
    await this.mutate(policy.id, 'POLICY_CREATED', context, async (repo) => {
      if (!repo.create) throw new Error('POLICY_CREATION_UNAVAILABLE');
      if (!repo.assertRoleUsageAuthority) throw new Error('POLICY_USAGE_CHECK_UNAVAILABLE');
      await repo.assertRoleUsageAuthority(policy.id, permittedPermissions);
      await repo.create(policy);
    });
  }
  async update(input: PolicyDefinition, revision: string, context?: AtomicMutationRequestContext, permittedPermissions: string[] = []) {
    const policy = this.definition(input);
    await this.mutate(policy.id, 'POLICY_UPDATED', context, async (repo) => {
      if (!repo.updateIfCurrent) throw new Error('POLICY_CONDITIONAL_UPDATE_REQUIRED');
      if (!repo.assertRoleUsageAuthority) throw new Error('POLICY_USAGE_CHECK_UNAVAILABLE');
      await repo.assertRoleUsageAuthority(policy.id, permittedPermissions);
      await repo.updateIfCurrent(policy, revision);
    });
  }
  async retire(id: string, revision: string, context?: AtomicMutationRequestContext, permittedPermissions: string[] = []) {
    const existing = await this.get(id);
    if (!existing) throw new Error('POLICY_NOT_FOUND');
    const policy = new Policy({
      id,
      name: existing.name,
      description: existing.description,
      ruleType: 'RETIRED',
      ruleConfiguration: '{}',
    });
    await this.mutate(id, 'POLICY_RETIRED', context, async (repo) => {
      if (!repo.updateIfCurrent) throw new Error('POLICY_CONDITIONAL_UPDATE_REQUIRED');
      if (!repo.assertRoleUsageAuthority) throw new Error('POLICY_USAGE_CHECK_UNAVAILABLE');
      await repo.assertRoleUsageAuthority(policy.id, permittedPermissions);
      await repo.updateIfCurrent(policy, revision);
    });
  }
  private async mutate(
    id: string,
    action: string,
    context: AtomicMutationRequestContext | undefined,
    write: (repo: IPolicyRepository) => Promise<void>,
  ) {
    if (!this.atomic) return write(this.policies);
    if (!this.policies.withTransaction)
      throw new Error('POLICY_TRANSACTIONAL_PERSISTENCE_REQUIRED');
    const metadata = (
      context as (AtomicMutationRequestContext & { metadata?: Record<string, unknown> }) | undefined
    )?.metadata;
    await this.atomic.execute(
      {
        domain: 'AUTHORIZATION',
        aggregateType: 'POLICY',
        aggregateId: id,
        action,
        context,
        auditMetadata: metadata,
      },
      (tx) => write(this.policies.withTransaction!(tx)),
    );
  }
}

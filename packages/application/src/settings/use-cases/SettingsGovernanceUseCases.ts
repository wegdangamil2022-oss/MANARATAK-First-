import { ADMIN_PERMISSION_CATALOG } from '@absheer/shared';
import {
  validateSettingsDependencyPolicy,
  type SettingsDependencyPolicy,
  type AtomicPersistenceContext,
  type IIdentityRepository,
  LifeStatus,
} from '@absheer/domain';
import {
  AtomicDomainMutationCoordinator,
  type AtomicMutationRequestContext,
} from '../../event-foundation/use-cases/AtomicDomainMutationCoordinator';
export interface SettingsChange {
  key: string;
  level: 'GLOBAL' | 'DOMAIN' | 'IDENTITY';
  scopeId?: string;
  expectedCurrentVersionId: string | null;
  value: unknown;
}
export interface SettingsProposal {
  id: string;
  approverId: string;
  kind: 'VALUES' | 'DEPENDENCIES';
  reason: string;
  expectedPolicyRevision: number;
  changes?: SettingsChange[];
  policy?: SettingsDependencyPolicy;
  previewDigest: string;
}
export interface ISettingsGovernanceGateway {
  withTransaction(tx: AtomicPersistenceContext): ISettingsGovernanceGateway;
  policy(): Promise<{ revision: number; policy: SettingsDependencyPolicy }>;
  preview(
    input: Omit<SettingsProposal, 'id' | 'approverId' | 'previewDigest' | 'reason'>,
  ): Promise<unknown>;
  propose(input: SettingsProposal, actorId: string): Promise<unknown>;
  list(actorId: string, cursor?: string): Promise<unknown>;
  get(id: string, actorId: string): Promise<any>;
  approve(id: string, actorId: string): Promise<unknown>;
  commit(id: string, actorId: string, correlationId: string): Promise<unknown>;
}
export class SettingsGovernanceUseCases {
  constructor(
    private readonly gateway: ISettingsGovernanceGateway,
    private readonly mutations: AtomicDomainMutationCoordinator,
    private readonly identities: Pick<IIdentityRepository, 'findById'>,
  ) {}
  policy() {
    return this.gateway.policy();
  }
  get(id: string, actorId: string) {
    return this.gateway.get(id, actorId);
  }
  list(actorId: string, cursor?: string) {
    return this.gateway.list(actorId, cursor);
  }
  private async scope(context?: { domainId?: string; identityId?: string }) {
    if (
      context?.domainId &&
      !ADMIN_PERMISSION_CATALOG.some((item) => item.domain === context.domainId)
    )
      throw new Error('SETTINGS_DOMAIN_SCOPE_INVALID');
    if (context?.identityId) {
      const identity = await this.identities.findById(context.identityId);
      if (!identity || identity.status === LifeStatus.PURGED)
        throw new Error('SETTINGS_IDENTITY_SCOPE_INVALID');
    }
  }
  private async validate(
    input: Omit<SettingsProposal, 'id' | 'approverId' | 'previewDigest' | 'reason'>,
  ) {
    if (!Number.isSafeInteger(input.expectedPolicyRevision) || input.expectedPolicyRevision < 0)
      throw new Error('SETTINGS_GOVERNANCE_INVALID');
    if (input.kind === 'DEPENDENCIES') {
      if (input.changes !== undefined) throw new Error('SETTINGS_GOVERNANCE_INVALID');
      const policy = validateSettingsDependencyPolicy(input.policy);
      for (const rule of policy.rules) await this.scope(rule.context);
    } else {
      if (input.policy !== undefined || !input.changes?.length || input.changes.length > 20)
        throw new Error('SETTINGS_GOVERNANCE_INVALID');
      const seen = new Set<string>();
      for (const change of input.changes) {
        const key = JSON.stringify([change.key, change.level, change.scopeId]);
        if (
          seen.has(key) ||
          !/^[a-zA-Z0-9_\-.]{1,240}$/.test(change.key) ||
          !['GLOBAL', 'DOMAIN', 'IDENTITY'].includes(change.level) ||
          (change.level === 'GLOBAL' ? change.scopeId !== undefined : !change.scopeId)
        )
          throw new Error('SETTINGS_GOVERNANCE_INVALID');
        seen.add(key);
        await this.scope(
          change.level === 'DOMAIN'
            ? { domainId: change.scopeId }
            : change.level === 'IDENTITY'
              ? { identityId: change.scopeId }
              : undefined,
        );
      }
    }
    if (JSON.stringify(input).length > 65536) throw new Error('SETTINGS_GOVERNANCE_INVALID');
  }
  async preview(input: Omit<SettingsProposal, 'id' | 'approverId' | 'previewDigest' | 'reason'>) {
    await this.validate(input);
    return this.gateway.preview(input);
  }
  private mutate(
    action: string,
    id: string,
    context: AtomicMutationRequestContext,
    work: (gateway: ISettingsGovernanceGateway, correlationId: string) => Promise<unknown>,
  ) {
    if (!context.actorId) throw new Error('SETTINGS_ACTOR_REQUIRED');
    const correlationId = context.correlationId ?? id;
    return this.mutations.execute(
      {
        domain: 'SETTINGS',
        aggregateType: 'SETTINGS_CHANGE_SET',
        aggregateId: id,
        action,
        context: { ...context, correlationId },
        auditMetadata: { changeSetId: id },
        outbox: { metadata: { settingsEventRole: 'CONTROL_PLANE_MUTATION', changeSetId: id } },
      },
      (tx) => work(this.gateway.withTransaction(tx), correlationId),
      (result) => !(result as { replay?: boolean })?.replay,
    );
  }
  async propose(input: SettingsProposal, context: AtomicMutationRequestContext) {
    await this.validate(input);
    if (
      input.approverId === context.actorId ||
      input.reason.trim().length < 3 ||
      input.reason.length > 1000 ||
      /[\u0000-\u001f\u007f]/.test(input.reason)
    )
      throw new Error('SETTINGS_INDEPENDENT_APPROVAL_REQUIRED');
    return this.mutate('SETTINGS_CHANGE_SET_REQUESTED', input.id, context, (gateway) =>
      gateway.propose(input, context.actorId),
    );
  }
  approve(id: string, context: AtomicMutationRequestContext) {
    return this.mutate('SETTINGS_CHANGE_SET_APPROVED', id, context, (gateway) =>
      gateway.approve(id, context.actorId),
    );
  }
  commit(id: string, context: AtomicMutationRequestContext) {
    return this.mutate('SETTINGS_CHANGE_SET_COMMITTED', id, context, (gateway, correlationId) =>
      gateway.commit(id, context.actorId, correlationId),
    );
  }
}

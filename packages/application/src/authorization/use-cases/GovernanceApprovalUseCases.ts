import { createHash } from 'node:crypto';
import type { AtomicPersistenceContext } from '@manaratak/domain';
import type {
  AtomicDomainMutationCoordinator,
  AtomicMutationRequestContext,
} from '../../event-foundation/use-cases/AtomicDomainMutationCoordinator';
export type GovernanceApprovalScope =
  | 'DUTY_POLICY'
  | 'DUTY_EXCEPTION'
  | 'MFA_RESET'
  | 'TRANSLATION_TRANSFER'
  | 'TRANSLATION_PUBLICATION'
  | 'AUTHORIZATION_CHANGE';
export interface GovernanceApproval {
  id: string;
  scope: GovernanceApprovalScope;
  requestedBy: string;
  approverId: string;
  payload: unknown;
  digest: string;
  expiresAt: string;
  approvedAt: string | null;
  usedAt: string | null;
}
export interface IGovernanceApprovalGateway {
  get?(id: string): Promise<GovernanceApproval | null>;
  list(
    actorId: string,
    limit: number,
    cursor?: string,
  ): Promise<{ items: GovernanceApproval[]; nextCursor: string | null }>;
  create(approval: GovernanceApproval, context: AtomicPersistenceContext): Promise<void>;
  approve(id: string, actorId: string, context: AtomicPersistenceContext): Promise<void>;
  consume(
    id: string,
    scope: GovernanceApprovalScope,
    payload: unknown,
    requestedBy: string,
    approverId: string,
    context: AtomicPersistenceContext,
  ): Promise<void>;
}
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, entry]) => [key, canonical(entry)]),
    );
  return value;
}
export function governanceApprovalDigest(scope: GovernanceApprovalScope, payload: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify([scope, canonical(payload)]))
    .digest('hex');
}
export class GovernanceApprovalUseCases {
  constructor(
    private readonly gateway: IGovernanceApprovalGateway,
    private readonly atomic: AtomicDomainMutationCoordinator,
  ) {}
  list(actorId: string, limit: number, cursor?: string) {
    return this.gateway.list(actorId, Math.min(100, Math.max(1, limit)), cursor);
  }
  async assertApproved(id: string, payload: unknown, actorId: string, approverId: string) {
    const approval = await this.gateway.get?.(id);
    if (
      !approval ||
      approval.scope !== 'AUTHORIZATION_CHANGE' ||
      !approval.approvedAt ||
      approval.usedAt ||
      approval.requestedBy !== actorId ||
      approval.approverId !== approverId ||
      actorId === approverId ||
      !Number.isFinite(Date.parse(approval.expiresAt)) ||
      Date.parse(approval.expiresAt) <= Date.now() ||
      approval.digest !== governanceApprovalDigest('AUTHORIZATION_CHANGE', payload)
    )
      throw new Error('GOVERNANCE_APPROVAL_REQUIRED');
  }
  consumeChange(
    id: string,
    payload: unknown,
    actorId: string,
    approverId: string,
    tx: AtomicPersistenceContext,
  ) {
    return this.gateway.consume(id, 'AUTHORIZATION_CHANGE', payload, actorId, approverId, tx);
  }
  async request(
    input: { id: string; scope: GovernanceApprovalScope; approverId: string; payload: unknown },
    context: AtomicMutationRequestContext,
  ) {
    if (
      !input.id ||
      !input.approverId ||
      input.approverId === context.actorId ||
      ![
        'DUTY_POLICY',
        'DUTY_EXCEPTION',
        'MFA_RESET',
        'TRANSLATION_TRANSFER',
        'TRANSLATION_PUBLICATION',
        'AUTHORIZATION_CHANGE',
      ].includes(input.scope)
    )
      throw new Error('GOVERNANCE_APPROVAL_INVALID');
    const approval: GovernanceApproval = {
      ...input,
      requestedBy: context.actorId,
      digest: governanceApprovalDigest(input.scope, input.payload),
      expiresAt: new Date(Date.now() + 30 * 60000).toISOString(),
      approvedAt: null,
      usedAt: null,
    };
    await this.atomic.execute(
      {
        domain: 'AUTHORIZATION',
        aggregateType: 'GOVERNANCE_APPROVAL',
        aggregateId: approval.id,
        action: 'GOVERNANCE_APPROVAL_REQUESTED',
        context,
        auditMetadata: { scope: input.scope, approverId: input.approverId },
      },
      (tx) => this.gateway.create(approval, tx),
    );
    return approval;
  }
  async approve(id: string, context: AtomicMutationRequestContext) {
    await this.atomic.execute(
      {
        domain: 'AUTHORIZATION',
        aggregateType: 'GOVERNANCE_APPROVAL',
        aggregateId: id,
        action: 'GOVERNANCE_APPROVAL_CONFIRMED',
        context,
      },
      (tx) => this.gateway.approve(id, context.actorId, tx),
    );
  }
}

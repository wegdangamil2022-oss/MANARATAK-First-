import type { IGovernanceApprovalGateway } from './GovernanceApprovalUseCases';
import {
  validateDutyPolicy,
  validateDutyException,
  type DutyPolicy,
  type DutyException,
  type AtomicPersistenceContext,
} from '@manaratak/domain';
import {
  AtomicDomainMutationCoordinator,
  type AtomicMutationRequestContext,
} from '../../event-foundation/use-cases/AtomicDomainMutationCoordinator';

export interface AccessReview {
  id: string;
  principalId: string;
  roleIds: string[];
  reviewerId: string;
  reason: string;
  reviewedAt: string;
  nextReviewAt: string;
  decision: 'KEEP' | 'REVOKE_REQUIRED';
}
export interface IAuthorizationGovernanceGateway {
  getPolicy(): Promise<{ policy: DutyPolicy; revision: string | null }>;
  preview(
    principalId: string,
    roleId: string,
  ): Promise<{
    configured: boolean;
    policyRevision: string | null;
    conflicts: DutyPolicy['pairs'];
  }>;
  savePolicy(
    policy: DutyPolicy,
    expectedRevision: string | null,
    context: AtomicPersistenceContext,
  ): Promise<void>;
  saveException(exception: DutyException, context: AtomicPersistenceContext): Promise<void>;
  reviewSubject(principalId: string): Promise<{ roles: Array<{ id: string; name: string }> }>;
  exceptions(
    limit: number,
    cursor?: string,
  ): Promise<{ items: DutyException[]; nextCursor: string | null }>;
  revokeException(
    id: string,
    actorId: string,
    reason: string,
    context: AtomicPersistenceContext,
  ): Promise<boolean>;
  saveReview(review: AccessReview, context: AtomicPersistenceContext): Promise<void>;
  listReviews(input: {
    limit: number;
    cursor?: string;
    dueOnly?: boolean;
  }): Promise<{ items: AccessReview[]; nextCursor: string | null }>;
}
export class AuthorizationGovernanceUseCases {
  constructor(
    private readonly gateway: IAuthorizationGovernanceGateway,
    private readonly atomic: AtomicDomainMutationCoordinator,
    private readonly approvals?: IGovernanceApprovalGateway,
  ) {}
  reviewSubject(principalId: string) {
    return this.gateway.reviewSubject(principalId);
  }
  policy() {
    return this.gateway.getPolicy();
  }
  preview(principalId: string, roleId: string) {
    return this.gateway.preview(principalId, roleId);
  }
  reviews(input: { limit: number; cursor?: string; dueOnly?: boolean }) {
    return this.gateway.listReviews(input);
  }
  async configure(
    input: DutyPolicy & {
      expectedRevision: string | null;
      reason: string;
      approvedBy: string;
      changeTicket: string;
      approvalId: string;
    },
    context: AtomicMutationRequestContext,
  ) {
    this.approval(context.actorId, input.approvedBy, input.reason);
    const policy = validateDutyPolicy(input);
    await this.atomic.execute(
      {
        domain: 'AUTHORIZATION',
        aggregateType: 'DUTY_POLICY',
        aggregateId: 'authorization-governance:sod',
        action: 'DUTY_POLICY_CONFIGURED',
        context,
        auditMetadata: {
          reason: input.reason,
          approvedBy: input.approvedBy,
          pairCount: policy.pairs.length,
        },
      },
      async (tx) => {
        if (!this.approvals) throw new Error('GOVERNANCE_APPROVAL_REQUIRED');
        await this.approvals.consume(
          input.approvalId,
          'DUTY_POLICY',
          {
            pairs: policy.pairs,
            expectedRevision: input.expectedRevision,
            reason: input.reason,
            changeTicket: input.changeTicket,
          },
          context.actorId,
          input.approvedBy,
          tx,
        );
        await this.gateway.savePolicy(policy, input.expectedRevision, tx);
      },
    );
  }
  async exception(
    input: Omit<DutyException, 'requestedBy'> & { approvalId: string },
    context: AtomicMutationRequestContext,
  ) {
    const { approvalId, ...request } = input;
    const exception = { ...request, requestedBy: context.actorId };
    validateDutyException(exception, new Date());
    await this.atomic.execute(
      {
        domain: 'AUTHORIZATION',
        aggregateType: 'DUTY_EXCEPTION',
        aggregateId: input.id,
        action: 'DUTY_EXCEPTION_APPROVED',
        context,
        auditMetadata: {
          principalId: input.principalId,
          pairIds: input.pairIds,
          approvedBy: input.approvedBy,
          reason: input.reason,
          changeTicket: input.changeTicket,
          expiresAt: input.expiresAt,
        },
      },
      async (tx) => {
        if (!this.approvals) throw new Error('GOVERNANCE_APPROVAL_REQUIRED');
        const { approvedBy, ...payload } = request;
        await this.approvals.consume(
          approvalId,
          'DUTY_EXCEPTION',
          payload,
          context.actorId,
          approvedBy,
          tx,
        );
        await this.gateway.saveException(exception, tx);
      },
    );
  }
  exceptions(limit: number, cursor?: string) {
    return this.gateway.exceptions(Math.min(100, Math.max(1, limit)), cursor);
  }
  async revokeException(id: string, reason: string, context: AtomicMutationRequestContext) {
    if (!id || reason.trim().length < 6) throw new Error('DUTY_EXCEPTION_REVOCATION_INVALID');
    return this.atomic.execute(
      {
        domain: 'AUTHORIZATION',
        aggregateType: 'DUTY_EXCEPTION',
        aggregateId: id,
        action: 'DUTY_EXCEPTION_REVOKED',
        context,
        auditMetadata: { reason },
      },
      (tx) => this.gateway.revokeException(id, context.actorId, reason, tx),
      (changed) => changed,
    );
  }
  async review(
    input: Omit<AccessReview, 'reviewerId' | 'reviewedAt'>,
    context: AtomicMutationRequestContext,
  ) {
    if (
      !input.principalId ||
      input.reason.trim().length < 6 ||
      !Array.isArray(input.roleIds) ||
      input.roleIds.length > 200 ||
      !Number.isFinite(Date.parse(input.nextReviewAt)) ||
      Date.parse(input.nextReviewAt) <= Date.now() ||
      !['KEEP', 'REVOKE_REQUIRED'].includes(input.decision)
    )
      throw new Error('ACCESS_REVIEW_INVALID');
    const review = { ...input, reviewerId: context.actorId, reviewedAt: new Date().toISOString() };
    await this.atomic.execute(
      {
        domain: 'AUTHORIZATION',
        aggregateType: 'ACCESS_REVIEW',
        aggregateId: review.id,
        action: 'ACCESS_REVIEW_RECORDED',
        context,
        auditMetadata: {
          principalId: review.principalId,
          decision: review.decision,
          nextReviewAt: review.nextReviewAt,
        },
      },
      (tx) => this.gateway.saveReview(review, tx),
    );
  }
  private approval(actor: string, approver: string, reason: string) {
    if (!actor || !approver || actor === approver || reason.trim().length < 6)
      throw new Error('DUTY_POLICY_APPROVAL_REQUIRED');
  }
}

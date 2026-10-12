import type { IGovernanceApprovalGateway } from '../../authorization/use-cases/GovernanceApprovalUseCases';
import type { AtomicPersistenceContext } from '@manaratak/domain';
import type { AtomicDomainMutationCoordinator } from '../../event-foundation/use-cases/AtomicDomainMutationCoordinator';
import type { ICredentialVerifier } from '../ICredentialVerifier';
import type { ISessionManager } from '@manaratak/core';
export interface MfaProof {
  enrollmentId: string;
  verifiedAt: string;
}
export interface IMfaGateway {
  enabled(identityId: string): Promise<boolean>;
  begin(
    identityId: string,
    context: AtomicPersistenceContext,
  ): Promise<{ secret: string; provisioningUri: string }>;
  confirm(identityId: string, code: string, context: AtomicPersistenceContext): Promise<void>;
  consume(identityId: string, code: string, context: AtomicPersistenceContext): Promise<MfaProof>;
  disable(identityId: string, context: AtomicPersistenceContext): Promise<void>;
  markProof(identityId: string, sessionId: string, proof: MfaProof): Promise<void>;
  sessionProofValid(identityId: string, sessionId: string): Promise<boolean>;
  proofIsFresh(identityId: string, sessionId: string): Promise<boolean>;
  copyProof(identityId: string, fromSessionId: string, toSessionId: string): Promise<void>;
}
export interface IMfaAuthenticationPolicy {
  assertLogin(identityId: string, code?: string): Promise<MfaProof | null>;
  markSession(identityId: string, sessionId: string, proof: MfaProof): Promise<void>;
  copySession(identityId: string, from: string, to: string): Promise<void>;
}
export class MfaUseCases implements IMfaAuthenticationPolicy {
  constructor(
    private readonly gateway: IMfaGateway,
    private readonly credentials: ICredentialVerifier,
    private readonly atomic: AtomicDomainMutationCoordinator,
    private readonly sessions: ISessionManager,
    private readonly approvals?: IGovernanceApprovalGateway,
  ) {}
  async status(identityId: string, sessionId?: string) {
    return {
      enabled: await this.gateway.enabled(identityId),
      stepUpFresh: !!sessionId && (await this.gateway.proofIsFresh(identityId, sessionId)),
    };
  }
  async begin(identityId: string, password: string) {
    await this.password(identityId, password);
    if (await this.gateway.enabled(identityId)) throw new Error('MFA_ALREADY_ENABLED');
    return this.atomic.execute(this.definition(identityId, 'MFA_ENROLLMENT_STARTED'), (tx) =>
      this.gateway.begin(identityId, tx),
    );
  }
  async confirm(identityId: string, code: string) {
    await this.atomic.execute(this.definition(identityId, 'MFA_ENABLED'), (tx) =>
      this.gateway.confirm(identityId, code, tx),
    );
    await this.sessions.revokeAllSessions(identityId);
  }
  async disable(identityId: string, password: string, code: string) {
    await this.password(identityId, password);
    await this.atomic.execute(this.definition(identityId, 'MFA_DISABLED'), async (tx) => {
      await this.gateway.consume(identityId, code, tx);
      await this.gateway.disable(identityId, tx);
    });
    await this.sessions.revokeAllSessions(identityId);
  }
  async stepUp(identityId: string, sessionId: string, password: string, code: string) {
    if (!sessionId || !(await this.sessions.isSessionActive(identityId, sessionId)))
      throw new Error('MFA_SESSION_REQUIRED');
    await this.password(identityId, password);
    const proof = await this.atomic.execute(
      this.definition(identityId, 'MFA_STEP_UP_VERIFIED'),
      (tx) => this.gateway.consume(identityId, code, tx),
    );
    await this.gateway.markProof(identityId, sessionId, proof);
  }
  async assertLogin(identityId: string, code?: string) {
    if (!(await this.gateway.enabled(identityId))) return null;
    if (!code) throw new Error('MFA_REQUIRED');
    return this.atomic.execute(this.definition(identityId, 'MFA_LOGIN_VERIFIED'), (tx) =>
      this.gateway.consume(identityId, code, tx),
    );
  }
  markSession(identityId: string, sessionId: string, proof: MfaProof) {
    return this.gateway.markProof(identityId, sessionId, proof);
  }
  copySession(identityId: string, from: string, to: string) {
    return this.gateway.copyProof(identityId, from, to);
  }
  async sessionAuthenticated(identityId: string, sessionId: string) {
    return (
      !(await this.gateway.enabled(identityId)) ||
      (await this.gateway.sessionProofValid(identityId, sessionId))
    );
  }
  async adminReset(
    identityId: string,
    actorId: string,
    approvedBy: string,
    reason: string,
    approvalId: string,
    changeTicket: string,
  ) {
    if (
      !actorId ||
      !approvedBy ||
      actorId === approvedBy ||
      actorId === identityId ||
      approvedBy === identityId ||
      reason.trim().length < 12
    )
      throw new Error('MFA_RESET_APPROVAL_REQUIRED');
    await this.atomic.execute(
      {
        ...this.definition(identityId, 'MFA_ADMIN_RESET'),
        context: { actorId, source: 'admin-mfa-owner' },
        auditMetadata: { approvedBy, reason },
      },
      async (tx) => {
        if (!this.approvals) throw new Error('GOVERNANCE_APPROVAL_REQUIRED');
        await this.approvals.consume(
          approvalId,
          'MFA_RESET',
          { identityId, reason, changeTicket },
          actorId,
          approvedBy,
          tx,
        );
        await this.gateway.disable(identityId, tx);
      },
    );
    await this.sessions.revokeAllSessions(identityId);
  }
  async assertFresh(identityId: string, sessionId?: string) {
    if (!(await this.gateway.enabled(identityId))) throw new Error('MFA_ENROLLMENT_REQUIRED');
    if (!sessionId || !(await this.gateway.proofIsFresh(identityId, sessionId)))
      throw new Error('MFA_STEP_UP_REQUIRED');
  }
  private async password(identityId: string, password: string) {
    if (!(await this.credentials.verify(identityId, password)))
      throw new Error('MFA_CREDENTIAL_DENIED');
  }
  private definition(identityId: string, action: string) {
    return {
      domain: 'IDENTITY',
      aggregateType: 'MFA_CREDENTIAL',
      aggregateId: identityId,
      action,
      context: { actorId: identityId, source: 'auth-mfa-owner' },
    };
  }
}

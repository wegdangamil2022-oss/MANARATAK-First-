import { randomUUID } from 'node:crypto';
import type { EmergencyAccessGrantRecord, IEmergencyAccessRepository } from '@manaratak/domain';
import {
  AtomicDomainMutationCoordinator,
  AtomicMutationRequestContext,
} from '../../event-foundation/use-cases/AtomicDomainMutationCoordinator';

export class ManageEmergencyAccessUseCase {
  constructor(
    private readonly repository: IEmergencyAccessRepository,
    private readonly atomicMutations?: AtomicDomainMutationCoordinator,
  ) {}

  page(input: {
    limit: number;
    cursor?: string;
    principalId?: string;
    activeOnly?: boolean;
    state?: 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'REVOKED';
  }) {
    if (!this.repository.queryPage) throw new Error('EMERGENCY_ACCESS_PAGINATION_UNAVAILABLE');
    return this.repository.queryPage(input);
  }
  list(input?: { principalId?: string; activeOnly?: boolean; limit?: number }) {
    return this.repository.list(input);
  }

  async grant(
    input: {
      principalId: string;
      roleId: string;
      reason: string;
      changeTicket: string;
      requestedBy: string;
      approvedBy: string;
      durationMinutes: number;
    },
    context?: AtomicMutationRequestContext,
  ): Promise<EmergencyAccessGrantRecord> {
    if (!input.principalId.trim() || !input.roleId.trim())
      throw new Error('EMERGENCY_ACCESS_TARGET_REQUIRED');
    if (input.requestedBy === input.approvedBy)
      throw new Error('EMERGENCY_ACCESS_MAKER_CHECKER_REQUIRED');
    if (input.reason.trim().length < 12) throw new Error('EMERGENCY_ACCESS_REASON_REQUIRED');
    if (input.changeTicket.trim().length < 6)
      throw new Error('EMERGENCY_ACCESS_CHANGE_TICKET_REQUIRED');
    if (
      !Number.isInteger(input.durationMinutes) ||
      input.durationMinutes < 5 ||
      input.durationMinutes > 240
    )
      throw new Error('EMERGENCY_ACCESS_DURATION_INVALID');
    const startsAt = new Date();
    const grant = {
      id: `breakglass_${randomUUID()}`,
      principalId: input.principalId.trim(),
      roleId: input.roleId.trim(),
      reason: input.reason.trim(),
      changeTicket: input.changeTicket.trim(),
      requestedBy: input.requestedBy,
      approvedBy: input.approvedBy,
      startsAt,
      expiresAt: new Date(startsAt.getTime() + input.durationMinutes * 60_000),
    };
    if (!this.atomicMutations) return this.repository.grant(grant);
    if (!this.repository.withTransaction)
      throw new Error('EMERGENCY_ACCESS_TRANSACTIONAL_PERSISTENCE_REQUIRED');
    if (!context?.actorId || context.actorId !== input.requestedBy)
      throw new Error('EMERGENCY_ACCESS_ACTOR_REQUIRED');
    return this.atomicMutations.execute(
      {
        domain: 'AUTHORIZATION',
        aggregateType: 'EMERGENCY_ACCESS',
        aggregateId: grant.id,
        action: 'EMERGENCY_ACCESS_GRANTED',
        context,
        auditMetadata: {
          principalId: grant.principalId,
          roleId: grant.roleId,
          reason: grant.reason,
          changeTicket: grant.changeTicket,
          approvedBy: grant.approvedBy,
          expiresAt: grant.expiresAt.toISOString(),
        },
      },
      (transaction) => this.repository.withTransaction!(transaction).grant(grant),
    );
  }

  revoke(id: string, revokedBy: string, reason: string, context?: AtomicMutationRequestContext) {
    if (reason.trim().length < 6) throw new Error('EMERGENCY_ACCESS_REVOCATION_REASON_REQUIRED');
    const input = { id, revokedBy, reason: reason.trim() };
    if (!this.atomicMutations) return this.repository.revoke(input);
    if (!this.repository.withTransaction)
      throw new Error('EMERGENCY_ACCESS_TRANSACTIONAL_PERSISTENCE_REQUIRED');
    if (!context?.actorId || context.actorId !== revokedBy)
      throw new Error('EMERGENCY_ACCESS_ACTOR_REQUIRED');
    return this.atomicMutations.execute(
      {
        domain: 'AUTHORIZATION',
        aggregateType: 'EMERGENCY_ACCESS',
        aggregateId: id,
        action: 'EMERGENCY_ACCESS_REVOKED',
        context,
        auditMetadata: { reason: input.reason },
      },
      (transaction) => this.repository.withTransaction!(transaction).revoke(input),
    );
  }
}

import type { AtomicPersistenceContext } from '../../event-foundation/outbox/TransactionalOutbox';

export interface EmergencyAccessGrantRecord {
  id: string;
  principalId: string;
  roleId: string;
  reason: string;
  changeTicket: string;
  requestedBy: string;
  approvedBy: string;
  startsAt: Date;
  expiresAt: Date;
  revokedAt?: Date | null;
  revokedBy?: string | null;
  revocationReason?: string | null;
  createdAt: Date;
}

export interface IEmergencyAccessRepository {
  withTransaction?(context: AtomicPersistenceContext): IEmergencyAccessRepository;
  queryPage?(input: {
    limit: number;
    cursor?: string;
    principalId?: string;
    activeOnly?: boolean;
    state?: 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'REVOKED';
  }): Promise<{ items: EmergencyAccessGrantRecord[]; nextCursor: string | null }>;
  list(input?: {
    principalId?: string;
    activeOnly?: boolean;
    limit?: number;
  }): Promise<EmergencyAccessGrantRecord[]>;
  listActiveRoleIds(principalId: string, at?: Date): Promise<string[]>;
  grant(
    input: Omit<
      EmergencyAccessGrantRecord,
      'createdAt' | 'revokedAt' | 'revokedBy' | 'revocationReason'
    >,
  ): Promise<EmergencyAccessGrantRecord>;
  revoke(input: {
    id: string;
    revokedBy: string;
    reason: string;
  }): Promise<EmergencyAccessGrantRecord>;
}

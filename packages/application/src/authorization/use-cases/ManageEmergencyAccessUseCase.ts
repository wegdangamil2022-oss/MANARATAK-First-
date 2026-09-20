import { randomUUID } from 'node:crypto';
import type { EmergencyAccessGrantRecord, IEmergencyAccessRepository } from '@manaratak/domain';

export class ManageEmergencyAccessUseCase {
  constructor(private readonly repository: IEmergencyAccessRepository) {}

  list(input?: { principalId?: string; activeOnly?: boolean; limit?: number }) { return this.repository.list(input); }

  async grant(input: {
    principalId: string; roleId: string; reason: string; changeTicket: string;
    requestedBy: string; approvedBy: string; durationMinutes: number;
  }): Promise<EmergencyAccessGrantRecord> {
    if (!input.principalId.trim() || !input.roleId.trim()) throw new Error('EMERGENCY_ACCESS_TARGET_REQUIRED');
    if (input.requestedBy === input.approvedBy) throw new Error('EMERGENCY_ACCESS_MAKER_CHECKER_REQUIRED');
    if (input.reason.trim().length < 12) throw new Error('EMERGENCY_ACCESS_REASON_REQUIRED');
    if (input.changeTicket.trim().length < 6) throw new Error('EMERGENCY_ACCESS_CHANGE_TICKET_REQUIRED');
    if (!Number.isInteger(input.durationMinutes) || input.durationMinutes < 5 || input.durationMinutes > 240) throw new Error('EMERGENCY_ACCESS_DURATION_INVALID');
    const startsAt = new Date();
    return this.repository.grant({
      id: `breakglass_${randomUUID()}`, principalId: input.principalId.trim(), roleId: input.roleId.trim(),
      reason: input.reason.trim(), changeTicket: input.changeTicket.trim(), requestedBy: input.requestedBy,
      approvedBy: input.approvedBy, startsAt, expiresAt: new Date(startsAt.getTime() + input.durationMinutes * 60_000),
    });
  }

  revoke(id: string, revokedBy: string, reason: string) {
    if (reason.trim().length < 6) throw new Error('EMERGENCY_ACCESS_REVOCATION_REASON_REQUIRED');
    return this.repository.revoke({ id, revokedBy, reason: reason.trim() });
  }
}

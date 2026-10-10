import type { EmergencyAccessGrantRecord, IEmergencyAccessRepository } from '@manaratak/domain';

export class InMemoryEmergencyAccessRepository implements IEmergencyAccessRepository {
  private readonly rows = new Map<string, EmergencyAccessGrantRecord>();
  async queryPage(input: {
    limit: number;
    cursor?: string;
    principalId?: string;
    activeOnly?: boolean;
    state?: 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'REVOKED';
  }) {
    const now = new Date();
    const rows = [...this.rows.values()]
      .filter(
        (row) =>
          !input.state ||
          (row.revokedAt
            ? 'REVOKED'
            : row.expiresAt <= now
              ? 'EXPIRED'
              : row.startsAt > now
                ? 'SCHEDULED'
                : 'ACTIVE') === input.state,
      )
      .filter(
        (row) =>
          (!input.cursor || row.id > input.cursor) &&
          (!input.principalId || row.principalId === input.principalId) &&
          (!input.activeOnly || (!row.revokedAt && row.startsAt <= now && row.expiresAt > now)),
      )
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const items = rows.slice(0, input.limit);
    return { items, nextCursor: rows.length > input.limit ? items.at(-1)!.id : null };
  }
  async list(input: { principalId?: string; activeOnly?: boolean; limit?: number } = {}) {
    const now = new Date();
    return [...this.rows.values()]
      .filter(row => !input.principalId || row.principalId === input.principalId)
      .filter(row => !input.activeOnly || (!row.revokedAt && row.startsAt <= now && row.expiresAt > now))
      .sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, input.limit ?? 100);
  }
  async listActiveRoleIds(principalId: string, at = new Date()) {
    return Array.from(new Set([...this.rows.values()].filter(row => row.principalId === principalId && !row.revokedAt && row.startsAt <= at && row.expiresAt > at).map(row => row.roleId)));
  }
  async grant(input: Omit<EmergencyAccessGrantRecord, 'createdAt'|'revokedAt'|'revokedBy'|'revocationReason'>) {
    if ([...this.rows.values()].some(row => row.principalId === input.principalId && row.roleId === input.roleId && !row.revokedAt && row.expiresAt > input.startsAt && row.startsAt < input.expiresAt)) throw new Error('EMERGENCY_ACCESS_OVERLAPPING_GRANT');
    const row: EmergencyAccessGrantRecord = { ...input, createdAt: new Date(), revokedAt: null, revokedBy: null, revocationReason: null };
    this.rows.set(row.id, row); return row;
  }
  async revoke(input: { id: string; revokedBy: string; reason: string }) {
    const row = this.rows.get(input.id); if (!row || row.revokedAt) throw new Error('EMERGENCY_ACCESS_NOT_ACTIVE');
    const next = { ...row, revokedAt: new Date(), revokedBy: input.revokedBy, revocationReason: input.reason }; this.rows.set(input.id, next); return next;
  }
}

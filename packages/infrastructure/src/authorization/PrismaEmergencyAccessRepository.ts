import type { PrismaClient } from '@prisma/client';
import type { EmergencyAccessGrantRecord, IEmergencyAccessRepository } from '@manaratak/domain';

function map(row: any): EmergencyAccessGrantRecord {
  return {
    id: row.id,
    principalId: row.principalId,
    roleId: row.roleId,
    reason: row.reason,
    changeTicket: row.changeTicket,
    requestedBy: row.requestedBy,
    approvedBy: row.approvedBy,
    startsAt: new Date(row.startsAt),
    expiresAt: new Date(row.expiresAt),
    revokedAt: row.revokedAt ? new Date(row.revokedAt) : null,
    revokedBy: row.revokedBy ?? null,
    revocationReason: row.revocationReason ?? null,
    createdAt: new Date(row.createdAt),
  };
}

export class PrismaEmergencyAccessRepository implements IEmergencyAccessRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(input: { principalId?: string; activeOnly?: boolean; limit?: number } = {}): Promise<EmergencyAccessGrantRecord[]> {
    const now = new Date();
    const rows = await (this.prisma as any).adminEmergencyAccessRecord.findMany({
      where: {
        ...(input.principalId ? { principalId: input.principalId } : {}),
        ...(input.activeOnly ? { revokedAt: null, startsAt: { lte: now }, expiresAt: { gt: now } } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: Math.min(200, Math.max(1, input.limit ?? 100)),
    });
    return rows.map(map);
  }

  async listActiveRoleIds(principalId: string, at = new Date()): Promise<string[]> {
    const rows = await (this.prisma as any).adminEmergencyAccessRecord.findMany({
      where: { principalId, revokedAt: null, startsAt: { lte: at }, expiresAt: { gt: at } },
      select: { roleId: true },
    });
    return Array.from(new Set(rows.map((row: any) => String(row.roleId))));
  }

  async grant(input: Omit<EmergencyAccessGrantRecord, 'createdAt' | 'revokedAt' | 'revokedBy' | 'revocationReason'>): Promise<EmergencyAccessGrantRecord> {
    const row = await (this.prisma as any).$transaction(async (tx: any) => {
      const role = await tx.roleRecord.findUnique({ where: { id: input.roleId } });
      if (!role) throw new Error('EMERGENCY_ACCESS_ROLE_NOT_FOUND');
      const overlapping = await tx.adminEmergencyAccessRecord.findFirst({
        where: {
          principalId: input.principalId,
          roleId: input.roleId,
          revokedAt: null,
          expiresAt: { gt: input.startsAt },
          startsAt: { lt: input.expiresAt },
        },
      });
      if (overlapping) throw new Error('EMERGENCY_ACCESS_OVERLAPPING_GRANT');
      return tx.adminEmergencyAccessRecord.create({ data: input });
    }, { isolationLevel: 'Serializable' });
    return map(row);
  }

  async revoke(input: { id: string; revokedBy: string; reason: string }): Promise<EmergencyAccessGrantRecord> {
    const now = new Date();
    const updated = await (this.prisma as any).adminEmergencyAccessRecord.updateMany({
      where: { id: input.id, revokedAt: null },
      data: { revokedAt: now, revokedBy: input.revokedBy, revocationReason: input.reason },
    });
    if (updated.count !== 1) throw new Error('EMERGENCY_ACCESS_NOT_ACTIVE');
    const row = await (this.prisma as any).adminEmergencyAccessRecord.findUnique({ where: { id: input.id } });
    if (!row) throw new Error('EMERGENCY_ACCESS_NOT_FOUND');
    return map(row);
  }
}

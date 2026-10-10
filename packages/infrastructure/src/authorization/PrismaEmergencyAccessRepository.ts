import type { AdminEmergencyAccessRecord, Prisma, PrismaClient } from '@prisma/client';
import type {
  AtomicPersistenceContext,
  EmergencyAccessGrantRecord,
  IEmergencyAccessRepository,
} from '@manaratak/domain';

function map(row: AdminEmergencyAccessRecord): EmergencyAccessGrantRecord {
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
  constructor(
    private readonly prisma: PrismaClient,
    private readonly transactional = false,
  ) {}

  withTransaction(context: AtomicPersistenceContext): IEmergencyAccessRepository {
    const transactionClient = (
      context as AtomicPersistenceContext & { transactionClient?: Prisma.TransactionClient }
    ).transactionClient;
    if (!context.boundaryId || !transactionClient)
      throw new Error('EMERGENCY_ACCESS_ATOMIC_TRANSACTION_CONTEXT_REQUIRED');
    return new PrismaEmergencyAccessRepository(transactionClient as unknown as PrismaClient, true);
  }

  async queryPage(input: {
    limit: number;
    cursor?: string;
    principalId?: string;
    activeOnly?: boolean;
    state?: 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'REVOKED';
  }) {
    const now = new Date();
    const stateWhere =
      input.state === 'REVOKED'
        ? { revokedAt: { not: null } }
        : input.state === 'EXPIRED'
          ? { revokedAt: null, expiresAt: { lte: now } }
          : input.state === 'SCHEDULED'
            ? { revokedAt: null, startsAt: { gt: now }, expiresAt: { gt: now } }
            : input.state === 'ACTIVE'
              ? { revokedAt: null, startsAt: { lte: now }, expiresAt: { gt: now } }
              : {};
    const rows = await this.prisma.adminEmergencyAccessRecord.findMany({
      where: {
        ...stateWhere,
        ...(input.cursor ? { id: { gt: input.cursor } } : {}),
        ...(input.principalId ? { principalId: input.principalId } : {}),
        ...(input.activeOnly
          ? { revokedAt: null, startsAt: { lte: now }, expiresAt: { gt: now } }
          : {}),
      },
      orderBy: { id: 'asc' },
      take: input.limit + 1,
    });
    const items = rows.slice(0, input.limit).map(map);
    return { items, nextCursor: rows.length > input.limit ? items.at(-1)!.id : null };
  }
  async list(
    input: { principalId?: string; activeOnly?: boolean; limit?: number } = {},
  ): Promise<EmergencyAccessGrantRecord[]> {
    const now = new Date();
    const rows = await this.prisma.adminEmergencyAccessRecord.findMany({
      where: {
        ...(input.principalId ? { principalId: input.principalId } : {}),
        ...(input.activeOnly
          ? { revokedAt: null, startsAt: { lte: now }, expiresAt: { gt: now } }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: Math.min(200, Math.max(1, input.limit ?? 100)),
    });
    return rows.map(map);
  }

  async listActiveRoleIds(principalId: string, at = new Date()): Promise<string[]> {
    const rows = await this.prisma.adminEmergencyAccessRecord.findMany({
      where: { principalId, revokedAt: null, startsAt: { lte: at }, expiresAt: { gt: at } },
      select: { roleId: true },
    });
    return Array.from(new Set(rows.map((row) => row.roleId)));
  }

  async grant(
    input: Omit<
      EmergencyAccessGrantRecord,
      'createdAt' | 'revokedAt' | 'revokedBy' | 'revocationReason'
    >,
  ): Promise<EmergencyAccessGrantRecord> {
    const persist = async (tx: Prisma.TransactionClient) => {
      // Serialise overlapping grants even when joining an existing audit/outbox transaction.
      const lockKey = `emergency-access:${input.principalId}:${input.roleId}`;
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))::text AS lock_result`;
      const roleLock = `authorization-role-reference:${input.roleId}`;
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${roleLock}, 0))::text AS lock_result`;
      const role = await tx.roleRecord.findUnique({ where: { id: input.roleId } });
      if (!role) throw new Error('EMERGENCY_ACCESS_ROLE_NOT_FOUND');
      if (!Array.isArray(role.permissions) || !role.permissions.length) throw new Error('ROLE_RETIRED');
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
    };
    const row = this.transactional
      ? await persist(this.prisma)
      : await this.prisma.$transaction(persist, { isolationLevel: 'Serializable' });
    return map(row);
  }

  async revoke(input: {
    id: string;
    revokedBy: string;
    reason: string;
  }): Promise<EmergencyAccessGrantRecord> {
    const now = new Date();
    const updated = await this.prisma.adminEmergencyAccessRecord.updateMany({
      where: { id: input.id, revokedAt: null, expiresAt: { gt: now } },
      data: { revokedAt: now, revokedBy: input.revokedBy, revocationReason: input.reason },
    });
    if (updated.count !== 1) throw new Error('EMERGENCY_ACCESS_NOT_ACTIVE');
    const row = await this.prisma.adminEmergencyAccessRecord.findUnique({
      where: { id: input.id },
    });
    if (!row) throw new Error('EMERGENCY_ACCESS_NOT_FOUND');
    return map(row);
  }
}

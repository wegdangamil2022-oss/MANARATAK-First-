import { Prisma, type PrismaClient } from '@prisma/client';
import {
  assertDutyUnion,
  dutyConflicts,
  validateDutyPolicy,
  validateDutyException,
  type DutyPolicy,
  type DutyException,
} from '@absheer/domain';

export const DUTY_POLICY_ID = 'authorization-governance:sod';
export const DUTY_LOCK = 'authorization-duty-governance';
/** Existing Authorization-owned PolicyRecord is the durable policy authority. */
export class PrismaDutyGuard {
  constructor(private readonly db: PrismaClient | Prisma.TransactionClient) {}
  async lock(): Promise<void> {
    await this.db.$queryRaw(
      Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${DUTY_LOCK}, 0))::text AS lock_result`,
    );
  }
  async policy(): Promise<{ policy: DutyPolicy; revision: string | null }> {
    const row = await this.db.policyRecord.findUnique({ where: { id: DUTY_POLICY_ID } });
    if (!row) return { policy: { pairs: [] }, revision: null };
    if (row.ruleType !== 'SEPARATION_OF_DUTIES') throw new Error('DUTY_POLICY_INVALID');
    return {
      policy: validateDutyPolicy(JSON.parse(row.ruleConfiguration)),
      revision: row.updatedAt.toISOString(),
    };
  }
  async permissions(
    principalId: string,
    change?: { roleId: string; permissions?: string[]; include?: boolean },
  ): Promise<string[]> {
    const assignments = await this.db.roleAssignmentRecord.findMany({
      where: { identityId: principalId },
      select: { roleId: true },
      take: 201,
    });
    const emergency = await this.db.adminEmergencyAccessRecord.findMany({
      where: { principalId, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { roleId: true },
      take: 201,
    });
    if (assignments.length > 200 || emergency.length > 200)
      throw new Error('AUTHORIZATION_ACCESS_PROJECTION_LIMIT');
    const ids = new Set([...assignments, ...emergency].map((row) => row.roleId));
    if (change?.include) ids.add(change.roleId);
    if (ids.size > 200) throw new Error('AUTHORIZATION_ACCESS_PROJECTION_LIMIT');
    const rows = await this.db.roleRecord.findMany({
      where: { id: { in: [...ids] } },
      select: { id: true, permissions: true },
    });
    return [
      ...new Set(
        rows.flatMap((row) => {
          const permissions =
            row.id === change?.roleId && change.permissions ? change.permissions : row.permissions;
          if (!Array.isArray(permissions) || permissions.some((p) => typeof p !== 'string'))
            throw new Error('ROLE_PERMISSIONS_INVALID');
          return permissions as string[];
        }),
      ),
    ];
  }
  async allowedPairs(principalId: string, revision: string | null, at: Date): Promise<string[]> {
    if (!revision) return [];
    // Canonical JSON fragment narrows the query; parsed identity/revision/time are authoritative.
    const rows = await this.db.$queryRaw<Array<{ ruleConfiguration: string }>>(Prisma.sql`
      SELECT "ruleConfiguration" FROM "PolicyRecord" WHERE "ruleType"='DUTY_EXCEPTION'
      AND "ruleConfiguration"::jsonb->>'principalId'=${principalId}
      AND "ruleConfiguration"::jsonb->>'policyRevision'=${revision}
      AND ("ruleConfiguration"::jsonb->>'expiresAt')::timestamptz>${at}
      AND "ruleConfiguration"::jsonb->>'revokedAt' IS NULL LIMIT 101`);
    if (rows.length > 100) throw new Error('DUTY_EXCEPTION_LIMIT');
    return rows.flatMap((row) => {
      const e = JSON.parse(row.ruleConfiguration) as DutyException;
      if (e.revokedAt !== undefined) return [];
      if (Date.parse(e.expiresAt) <= at.getTime()) return [];
      validateDutyException(e, at);
      return e.principalId === principalId &&
        e.policyRevision === revision &&
        e.requestedBy !== e.approvedBy &&
        Date.parse(e.startsAt) <= at.getTime() &&
        Date.parse(e.expiresAt) > at.getTime()
        ? e.pairIds
        : [];
    });
  }
  async assertPrincipal(
    principalId: string,
    change?: { roleId: string; permissions?: string[]; include?: boolean },
  ): Promise<void> {
    const { policy, revision } = await this.policy();
    if (!policy.pairs.length) return;
    assertDutyUnion(
      await this.permissions(principalId, change),
      policy,
      await this.allowedPairs(principalId, revision, new Date()),
    );
  }
  async assertRoleChange(roleId: string, permissions: string[]): Promise<void> {
    const { policy } = await this.policy();
    if (!policy.pairs.length) return;
    assertDutyUnion(permissions, policy); // A role may not embed both sides of an approved pair.
    let cursor: string | undefined;
    for (;;) {
      const rows: Array<{ id: string; identityId: string }> =
        await this.db.roleAssignmentRecord.findMany({
          where: { roleId, ...(cursor ? { id: { gt: cursor } } : {}) },
          orderBy: { id: 'asc' },
          take: 100,
          select: { id: true, identityId: true },
        });
      for (const row of rows) await this.assertPrincipal(row.identityId, { roleId, permissions });
      if (rows.length < 100) break;
      cursor = rows.at(-1)!.id;
    }
    cursor = undefined;
    for (;;) {
      const rows: Array<{ id: string; principalId: string }> =
        await this.db.adminEmergencyAccessRecord.findMany({
          where: {
            roleId,
            revokedAt: null,
            expiresAt: { gt: new Date() },
            ...(cursor ? { id: { gt: cursor } } : {}),
          },
          orderBy: { id: 'asc' },
          take: 100,
          select: { id: true, principalId: true },
        });
      for (const row of rows) await this.assertPrincipal(row.principalId, { roleId, permissions });
      if (rows.length < 100) break;
      cursor = rows.at(-1)!.id;
    }
  }
  async isAllowed(principalId: string): Promise<boolean> {
    try {
      await this.assertPrincipal(principalId);
      return true;
    } catch {
      return false;
    }
  }
  async preview(principalId: string, roleId: string) {
    const { policy, revision } = await this.policy();
    const permissions = await this.permissions(principalId, { roleId, include: true });
    const allowed = await this.allowedPairs(principalId, revision, new Date());
    return {
      configured: revision !== null,
      policyRevision: revision,
      conflicts: dutyConflicts(permissions, policy).filter((pair) => !allowed.includes(pair.id)),
    };
  }
}

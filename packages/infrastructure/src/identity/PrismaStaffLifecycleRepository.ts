import { Prisma, type PrismaClient } from '@prisma/client';
import { createHash, timingSafeEqual } from 'node:crypto';
import type {
  AtomicPersistenceContext,
  IStaffLifecycleRepository,
  StaffInvitation,
  StaffInvitationSummary,
  StaffChangeRequest,
  StaffLifecycleSnapshot,
} from '@manaratak/domain';
import { PrismaStaffWorkspaceRepository } from './PrismaStaffWorkspaceRepository';
import { PrismaDutyGuard } from '../authorization/PrismaDutyGuard';

const tables = [
  'StaffInvitationRecord',
  'StaffChangeRequestRecord',
  'StaffAdminAccessRecord',
  'StaffGrantSourceRecord',
];
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
type InvitationRow = Omit<
  StaffInvitation,
  'expiresAt' | 'acceptedAt' | 'revokedAt' | 'createdAt'
> & { expiresAt: Date; acceptedAt: Date | null; revokedAt: Date | null; createdAt: Date };
type RequestRow = Omit<StaffChangeRequest, 'expiresAt' | 'approvedAt' | 'usedAt'> & {
  expiresAt: Date;
  approvedAt: Date | null;
  usedAt: Date | null;
};
const invitation = (r: InvitationRow): StaffInvitation => ({
  ...r,
  expiresAt: r.expiresAt.toISOString(),
  acceptedAt: r.acceptedAt?.toISOString() ?? null,
  revokedAt: r.revokedAt?.toISOString() ?? null,
  createdAt: r.createdAt.toISOString(),
});
const request = (r: RequestRow): StaffChangeRequest => ({
  ...r,
  expiresAt: r.expiresAt.toISOString(),
  approvedAt: r.approvedAt?.toISOString() ?? null,
  usedAt: r.usedAt?.toISOString() ?? null,
});
export class PrismaStaffLifecycleRepository implements IStaffLifecycleRepository {
  constructor(
    private readonly db: PrismaClient,
    private readonly actorAllowed: (id: string) => Promise<boolean>,
  ) {}
  private tx(context: AtomicPersistenceContext) {
    const tx = (
      context as AtomicPersistenceContext & { transactionClient?: Prisma.TransactionClient }
    ).transactionClient;
    if (!tx || !context.boundaryId) throw Error('STAFF_TRANSACTION_REQUIRED');
    return tx;
  }
  async readiness() {
    const rows = await this.db.$queryRaw<
      Array<{ name: string; present: boolean; permitted: boolean }>
    >(
      Prisma.sql`SELECT name,oid IS NOT NULL AS present,COALESCE(has_table_privilege(oid,'SELECT') AND has_table_privilege(oid,'INSERT') AND has_table_privilege(oid,'UPDATE'),false) AS permitted FROM (SELECT name,to_regclass(format('%I.%I',current_schema(),name)) AS oid FROM unnest(ARRAY[${Prisma.join(tables)}]::text[]) name) s`,
    );
    const missingTables = tables.filter((t) => !rows.some((r) => r.name === t && r.present)),
      missingPrivileges = rows.filter((r) => r.present && !r.permitted).map((r) => r.name);
    const base = await new PrismaStaffWorkspaceRepository(this.db).readiness();
    missingTables.push(...base.missingTables);
    missingPrivileges.push(...base.missingPrivileges);
    return {
      ready: base.ready && !missingTables.length && !missingPrivileges.length,
      missingTables,
      missingPrivileges,
    };
  }
  async lock(context: AtomicPersistenceContext) {
    const tx = this.tx(context);
    await new PrismaDutyGuard(tx).lock();
    await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(748103,1)::text`);
    await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(748103,2)::text`);
  }
  private async lockPrincipal(id: string, tx: Prisma.TransactionClient) {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "IdentityRecord" WHERE id=${id} FOR SHARE`);
    await tx.$queryRaw(
      Prisma.sql`SELECT "identityId" FROM "UserRecord" WHERE "identityId"=${id} FOR SHARE`,
    );
    await tx.$queryRaw(
      Prisma.sql`SELECT "identityId" FROM "AccountRecord" WHERE "identityId"=${id} FOR SHARE`,
    );
    await tx.$queryRaw(
      Prisma.sql`SELECT id FROM "CredentialRecord" WHERE "identityId"=${id} ORDER BY id FOR SHARE`,
    );
  }
  private async eligible(id: string, tx: Prisma.TransactionClient | PrismaClient) {
    const row = await tx.identityRecord.findUnique({
      where: { id },
      include: { user: true, account: true, credentials: true },
    });
    return {
      row,
      eligible:
        !!row &&
        row.type === 'Human' &&
        row.status === 'ACTIVE' &&
        row.account?.accessState === 'ACTIVE' &&
        row.user?.isEmailVerified === true &&
        row.credentials.some((c) => c.type === 'password' && !c.disabled),
      mfa: !!row?.credentials.some((c) => {
        if (c.type !== 'TOTP' || c.disabled) return false;
        try {
          return JSON.parse(c.passwordHash).confirmed === true;
        } catch {
          return false;
        }
      }),
    };
  }
  async snapshot(id: string, context?: AtomicPersistenceContext): Promise<StaffLifecycleSnapshot> {
    const tx = context ? this.tx(context) : this.db;
    if (context)
      await tx.$queryRaw(
        Prisma.sql`SELECT id FROM "StaffMembershipRecord" WHERE id=${id} FOR UPDATE`,
      );
    let member = await new PrismaStaffWorkspaceRepository(tx as PrismaClient).get(id);
    if (context && member?.identityId) {
      await this.lockPrincipal(member.identityId, this.tx(context));
      member = await new PrismaStaffWorkspaceRepository(tx as PrismaClient).get(id);
    }
    if (!member) throw Error('STAFF_NOT_FOUND');
    const principal = member.identityId ? await this.eligible(member.identityId, tx) : null;
    const acceptedRows = member.identityId
      ? await tx.$queryRaw<Array<{ id: string }>>(
          Prisma.sql`SELECT id FROM "StaffInvitationRecord" WHERE "membershipId"=${id} AND "acceptedBy"=${member.identityId} AND "acceptedAt" IS NOT NULL AND "revokedAt" IS NULL AND email=${member.email.toLowerCase()} LIMIT 1`,
        )
      : [];
    const grants = member.identityId
      ? await tx.roleAssignmentRecord.findMany({
          where: { identityId: member.identityId },
          orderBy: { id: 'asc' },
          take: 501,
        })
      : [];
    if (grants.length > 500) throw Error('STAFF_GRANT_LIMIT');
    const sources = await tx.$queryRaw<Array<{ assignmentId: string; assignedAt: Date }>>(
      Prisma.sql`SELECT "assignmentId","assignedAt" FROM "StaffGrantSourceRecord" WHERE "membershipId"=${id} AND "revokedAt" IS NULL ORDER BY "assignmentId"`,
    );
    const owned = grants.filter((g) =>
      sources.some(
        (s) => s.assignmentId === g.id && s.assignedAt.getTime() === g.assignedAt.getTime(),
      ),
    );
    const pending: Record<string, number> = {
      directReports: await tx.staffMembershipRecord.count({
        where: { managerId: id, status: { in: ['ACTIVE', 'SUSPENDED'] } },
      }),
    };
    if (member.identityId) {
      pending.review = await tx.reviewWorkCase.count({
        where: {
          assigneeId: member.identityId,
          state: { notIn: ['CLOSED', 'RESOLVED', 'CANCELLED'] },
        },
      });
      pending.imports = await tx.importReviewAssignment.count({
        where: {
          assigneeId: member.identityId,
          state: { notIn: ['COMPLETED', 'CANCELLED', 'RELEASED'] },
        },
      });
      const audit = await tx.$queryRaw<Array<{ count: bigint }>>(
        Prisma.sql`SELECT count(*) AS count FROM "AuditWorkspaceRecord" WHERE kind='CASE' AND data->>'assigneeId'=${member.identityId} AND data->>'status'<>'CLOSED'`,
      );
      pending.audit = Number(audit[0].count);
      const support = await tx.$queryRaw<Array<{ present: boolean; memberships?: boolean }>>(
        Prisma.sql`SELECT to_regclass(format('%I.%I',current_schema(),'StudentSupportCaseRecord')) IS NOT NULL AS present`,
      );
      pending.support = support[0].present
        ? await tx.studentSupportCaseRecord.count({
            where: {
              assigneeId: member.identityId,
              status: { notIn: ['CLOSED', 'CANCELLED', 'RESOLVED'] },
            },
          })
        : 0;
    }
    const base = {
      member,
      identityEligible: principal?.eligible ?? false,
      mfaEnrolled: principal?.mfa ?? false,
      accepted: acceptedRows.length === 1,
      ownedGrants: owned.length,
      otherGrants: grants.length - owned.length,
      pending,
    };
    return {
      ...base,
      hash: digest([
        base,
        grants.map((g) => [g.id, g.roleId, g.assignedAt.toISOString()]),
        sources.map((s) => [s.assignmentId, s.assignedAt.toISOString()]),
      ]),
    };
  }
  async listInvitations(limit: number, cursor?: string) {
    const rows = await this.db.$queryRaw<InvitationRow[]>(
      Prisma.sql`SELECT * FROM "StaffInvitationRecord" WHERE id>${cursor ?? ''} ORDER BY id LIMIT ${limit + 1}`,
    );
    return {
      items: rows.slice(0, limit).map((r) => {
        const { tokenHash: _token, commandHash: _command, ...summary } = invitation(r);
        return summary as StaffInvitationSummary;
      }),
      nextCursor: rows.length > limit ? rows[limit - 1].id : null,
    };
  }
  async invitation(id: string, context: AtomicPersistenceContext) {
    const rows = await this.tx(context).$queryRaw<InvitationRow[]>(
      Prisma.sql`SELECT * FROM "StaffInvitationRecord" WHERE id=${id} FOR UPDATE`,
    );
    return rows[0] ? invitation(rows[0]) : null;
  }
  async issue(i: StaffInvitation, context: AtomicPersistenceContext) {
    const tx = this.tx(context);
    await tx.$executeRaw(
      Prisma.sql`UPDATE "StaffInvitationRecord" SET "revokedAt"=CURRENT_TIMESTAMP,version=version+1 WHERE "membershipId"=${i.membershipId} AND "acceptedAt" IS NULL AND "revokedAt" IS NULL`,
    );
    await tx.$executeRaw(
      Prisma.sql`INSERT INTO "StaffInvitationRecord" (id,"membershipId","memberVersion","identityId",email,"tokenHash","issuedBy","commandHash","expiresAt","createdAt") VALUES (${i.id},${i.membershipId},${i.memberVersion},${i.identityId},${i.email},${i.tokenHash},${i.issuedBy},${i.commandHash},${new Date(i.expiresAt)},${new Date(i.createdAt)})`,
    );
    await this.event(
      i.membershipId,
      'INVITATION_ISSUED',
      i.issuedBy,
      'Secure manual invitation issued',
      tx,
    );
  }
  async revoke(
    id: string,
    version: number,
    actorId: string,
    reason: string,
    context: AtomicPersistenceContext,
  ) {
    const tx = this.tx(context),
      i = await this.invitation(id, context);
    if (!i || i.version !== version || i.acceptedAt || i.revokedAt)
      throw Error('STAFF_INVITATION_CONFLICT');
    await tx.$executeRaw(
      Prisma.sql`UPDATE "StaffInvitationRecord" SET "revokedAt"=CURRENT_TIMESTAMP,version=version+1 WHERE id=${id} AND version=${version}`,
    );
    await this.event(i.membershipId, 'INVITATION_REVOKED', actorId, reason, tx);
  }
  async accept(
    input: { id: string; actorId: string; tokenHash: string },
    context: AtomicPersistenceContext,
  ) {
    const tx = this.tx(context),
      i = await this.invitation(input.id, context);
    if (
      !i ||
      i.revokedAt ||
      i.acceptedAt ||
      Date.parse(i.expiresAt) <= Date.now() ||
      i.tokenHash.length !== input.tokenHash.length ||
      !timingSafeEqual(Buffer.from(i.tokenHash), Buffer.from(input.tokenHash))
    )
      throw Error('STAFF_INVITATION_DENIED');
    await this.lockPrincipal(input.actorId, tx);
    const p = await this.eligible(input.actorId, tx);
    const m = await new PrismaStaffWorkspaceRepository(tx as PrismaClient).get(i.membershipId);
    if (
      !p.eligible ||
      !p.row?.user ||
      p.row.user.primaryEmail.trim().toLowerCase() !== i.email ||
      !m ||
      m.status !== 'DRAFT' ||
      m.version !== i.memberVersion ||
      (i.identityId && i.identityId !== input.actorId) ||
      i.issuedBy === input.actorId
    )
      throw Error('STAFF_INVITATION_DENIED');
    await tx.staffMembershipRecord.update({
      where: { id: m.id },
      data: {
        identityId: input.actorId,
        draftName: null,
        draftEmail: null,
        version: { increment: 1 },
      },
    });
    await tx.$executeRaw(
      Prisma.sql`UPDATE "StaffInvitationRecord" SET "acceptedBy"=${input.actorId},"acceptedAt"=CURRENT_TIMESTAMP,version=version+1 WHERE id=${i.id}`,
    );
    await this.event(
      m.id,
      'INVITATION_ACCEPTED',
      input.actorId,
      'Authenticated owner explicitly accepted; no activation or role grant',
      tx,
    );
  }
  async listChanges(_actorId: string, limit: number, cursor?: string) {
    const rows = await this.db.$queryRaw<RequestRow[]>(
      Prisma.sql`SELECT * FROM "StaffChangeRequestRecord" WHERE id>${cursor ?? ''} ORDER BY id LIMIT ${limit + 1}`,
    );
    return {
      items: rows.slice(0, limit).map(request),
      nextCursor: rows.length > limit ? rows[limit - 1].id : null,
    };
  }
  async request(id: string, context: AtomicPersistenceContext) {
    const rows = await this.tx(context).$queryRaw<RequestRow[]>(
      Prisma.sql`SELECT * FROM "StaffChangeRequestRecord" WHERE id=${id} FOR UPDATE`,
    );
    return rows[0] ? request(rows[0]) : null;
  }
  async saveRequest(r: StaffChangeRequest, context: AtomicPersistenceContext) {
    await this.tx(context).$executeRaw(
      Prisma.sql`INSERT INTO "StaffChangeRequestRecord" (id,"membershipId","memberVersion",action,payload,"snapshotHash",reason,"requestedBy","expiresAt") VALUES (${r.id},${r.membershipId},${r.memberVersion},${r.action},${JSON.stringify(r.payload)}::jsonb,${r.snapshotHash},${r.reason},${r.requestedBy},${new Date(r.expiresAt)})`,
    );
  }
  async approve(id: string, version: number, actorId: string, context: AtomicPersistenceContext) {
    const count = await this.tx(context).$executeRaw(
      Prisma.sql`UPDATE "StaffChangeRequestRecord" SET "approvedBy"=${actorId},"approvedAt"=CURRENT_TIMESTAMP,version=version+1 WHERE id=${id} AND version=${version} AND "approvedAt" IS NULL AND "usedAt" IS NULL AND "expiresAt">CURRENT_TIMESTAMP AND "requestedBy"<>${actorId}`,
    );
    if (count !== 1) throw Error('STAFF_APPROVAL_CONFLICT');
  }
  async assertActor(id: string, context: AtomicPersistenceContext) {
    const tx = this.tx(context);
    await this.lockPrincipal(id, tx);
    if (
      !(await this.actorAllowed(id)) ||
      !(await this.adminAccessAllowed(id)) ||
      !(await this.eligible(id, tx)).eligible
    )
      throw Error('STAFF_ACTOR_DENIED');
  }
  async assertRecoveryAdmin(excludedId: string, context: AtomicPersistenceContext) {
    const tx = this.tx(context);
    const candidates = await tx.identityRecord.findMany({
      where: {
        id: { not: excludedId },
        type: 'Human',
        status: 'ACTIVE',
        account: { accessState: 'ACTIVE' },
        user: { isEmailVerified: true },
      },
      select: { id: true },
      orderBy: { id: 'asc' },
      take: 501,
    });
    if (candidates.length > 500) throw Error('STAFF_RECOVERY_REVIEW_REQUIRED');
    for (const p of candidates) {
      await this.lockPrincipal(p.id, tx);
      const state = await this.eligible(p.id, tx);
      if (!state.eligible || !state.mfa || !(await this.adminAccessAllowed(p.id))) continue;
      const roles = await tx.roleAssignmentRecord.findMany({
        where: { identityId: p.id },
        include: { role: true },
      });
      const permissions = roles
        .filter((a) => Array.isArray(a.role.policyIds) && a.role.policyIds.length === 0)
        .flatMap((a) => (Array.isArray(a.role.permissions) ? a.role.permissions : []));
      if (
        permissions.includes('*') ||
        permissions.includes('admin:*') ||
        (permissions.includes('admin:authorization:manage') &&
          permissions.includes('admin:identities:manage'))
      )
        return;
    }
    throw Error('STAFF_LAST_RECOVERY_ADMIN');
  }
  async apply(r: StaffChangeRequest, context: AtomicPersistenceContext) {
    const tx = this.tx(context),
      snapshot = await this.snapshot(r.membershipId, context),
      m = snapshot.member;
    if (!m.identityId) throw Error('STAFF_IDENTITY_REQUIRED');
    const statuses = {
      ACTIVATE: 'ACTIVE',
      RESUME: 'ACTIVE',
      SUSPEND: 'SUSPENDED',
      OFFBOARD: 'ENDED',
      TRANSFER: 'ACTIVE',
    };
    const structure = await new PrismaStaffWorkspaceRepository(tx as PrismaClient).organization(
      context,
    );
    const data: Prisma.StaffMembershipRecordUpdateManyMutationInput = {
      status: statuses[r.action],
      version: { increment: 1 },
    };
    if (['TRANSFER', 'ACTIVATE', 'RESUME'].includes(r.action)) {
      const departmentId =
          r.payload.departmentId === undefined ? m.departmentId : r.payload.departmentId,
        jobTitleId = r.payload.jobTitleId === undefined ? m.jobTitleId : r.payload.jobTitleId,
        managerId = r.payload.managerId === undefined ? m.managerId : r.payload.managerId;
      if (
        departmentId &&
        !structure.departments.some((d) => d.id === departmentId && d.status === 'ACTIVE')
      )
        throw Error('STAFF_DEPARTMENT_INVALID');
      const title = jobTitleId
        ? structure.titles.find((t) => t.id === jobTitleId && t.status === 'ACTIVE')
        : null;
      if (jobTitleId && (!title || (title.departmentId && title.departmentId !== departmentId)))
        throw Error('STAFF_TITLE_DEPARTMENT_MISMATCH');
      if (managerId) {
        let current: string | null = managerId;
        const visited = new Set([m.id]);
        while (current) {
          if (visited.has(current)) throw Error('STAFF_MANAGER_CYCLE');
          visited.add(current);
          const manager: { status: string; managerId: string | null; endsAt: Date | null } | null =
            await tx.staffMembershipRecord.findUnique({
              where: { id: current },
              select: { status: true, managerId: true, endsAt: true },
            });
          if (
            !manager ||
            manager.status !== 'ACTIVE' ||
            (manager.endsAt && manager.endsAt <= new Date())
          )
            throw Error('STAFF_MANAGER_INVALID');
          current = manager.managerId;
        }
      }
      Object.assign(data, { departmentId, jobTitleId, managerId });
    }
    if (r.action === 'ACTIVATE' && !m.startsAt) data.startsAt = new Date();
    if (r.action === 'OFFBOARD') data.endsAt = new Date();
    if (
      (
        await tx.staffMembershipRecord.updateMany({
          where: { id: m.id, version: r.memberVersion },
          data,
        })
      ).count !== 1
    )
      throw Error('STAFF_CHANGE_CONFLICT');
    await tx.$executeRaw(
      Prisma.sql`INSERT INTO "StaffAdminAccessRecord" ("identityId","membershipId",allowed) VALUES (${m.identityId},${m.id},${statuses[r.action] === 'ACTIVE'}) ON CONFLICT ("identityId") DO UPDATE SET "membershipId"=EXCLUDED."membershipId",allowed=EXCLUDED.allowed,version="StaffAdminAccessRecord".version+1,"updatedAt"=CURRENT_TIMESTAMP`,
    );
    if (r.action === 'OFFBOARD') {
      // Delete only exact grants created with this membership. Legacy, unrelated and recreated grants remain untouched.
      await tx.$executeRaw(
        Prisma.sql`DELETE FROM "RoleAssignmentRecord" a USING "StaffGrantSourceRecord" s WHERE s."membershipId"=${m.id} AND s."revokedAt" IS NULL AND a.id=s."assignmentId" AND a."identityId"=s."identityId" AND a."roleId"=s."roleId" AND a."assignedAt"=s."assignedAt"`,
      );
      await tx.$executeRaw(
        Prisma.sql`UPDATE "StaffGrantSourceRecord" SET "revokedAt"=CURRENT_TIMESTAMP WHERE "membershipId"=${m.id} AND "revokedAt" IS NULL`,
      );
      await tx.adminEmergencyAccessRecord.updateMany({
        where: { principalId: m.identityId, revokedAt: null },
        data: {
          revokedAt: new Date(),
          revokedBy: r.requestedBy,
          revocationReason: 'Staff offboarding; independent admin fence applied',
        },
      });
    }
    if (
      (await tx.$executeRaw(
        Prisma.sql`UPDATE "StaffChangeRequestRecord" SET "usedAt"=CURRENT_TIMESTAMP,version=version+1 WHERE id=${r.id} AND version=${r.version} AND "usedAt" IS NULL`,
      )) !== 1
    )
      throw Error('STAFF_APPROVAL_CONFLICT');
    await this.event(m.id, 'STAFF_' + r.action, r.requestedBy, r.reason, tx);
  }
  async adminAccessAllowed(identityId: string) {
    const probe = await this.db.$queryRaw<Array<{ present: boolean; memberships: boolean }>>(
      Prisma.sql`SELECT to_regclass(format('%I.%I',current_schema(),'StaffAdminAccessRecord')) IS NOT NULL AS present, to_regclass(format('%I.%I',current_schema(),'StaffMembershipRecord')) IS NOT NULL AS memberships`,
    );
    if (!probe[0].memberships) return !probe[0].present;
    if (!probe[0].present) {
      const staff = await this.db.staffMembershipRecord.count({
        where: { identityId, status: { in: ['ACTIVE', 'SUSPENDED', 'ENDED'] } },
      });
      return staff === 0;
    }
    const rows = await this.db.$queryRaw<Array<{ allowed: boolean }>>(
      Prisma.sql`SELECT f.allowed AND m.status='ACTIVE' AND (m."startsAt" IS NULL OR m."startsAt"<=clock_timestamp()) AND (m."endsAt" IS NULL OR m."endsAt">clock_timestamp()) AS allowed FROM "StaffAdminAccessRecord" f JOIN "StaffMembershipRecord" m ON m.id=f."membershipId" AND m."identityId"=f."identityId" WHERE f."identityId"=${identityId}`,
    );
    if (rows.length) return rows[0].allowed;
    return (
      (await this.db.staffMembershipRecord.count({
        where: { identityId, status: { in: ['ACTIVE', 'SUSPENDED', 'ENDED'] } },
      })) === 0
    );
  }
  async recordGrant(assignmentId: string, membershipId: string, context: AtomicPersistenceContext) {
    const tx = this.tx(context);
    await this.lock(context);
    const m = await tx.staffMembershipRecord.findUnique({ where: { id: membershipId } }),
      a = await tx.roleAssignmentRecord.findUnique({ where: { id: assignmentId } });
    if (
      !m ||
      !a ||
      m.identityId !== a.identityId ||
      m.status !== 'ACTIVE' ||
      (m.endsAt && m.endsAt <= new Date()) ||
      !(await this.adminAccessAllowed(a.identityId))
    )
      throw Error('STAFF_GRANT_SOURCE_DENIED');
    await tx.$executeRaw(
      Prisma.sql`INSERT INTO "StaffGrantSourceRecord" ("assignmentId","membershipId","identityId","roleId","assignedAt") VALUES (${a.id},${m.id},${a.identityId},${a.roleId},${a.assignedAt})`,
    );
  }
  private async event(
    membershipId: string,
    eventType: string,
    actorId: string,
    reason: string,
    tx: Prisma.TransactionClient,
  ) {
    await tx.staffLifecycleEventRecord.create({
      data: { membershipId, eventType, actorId, reason },
    });
  }
}

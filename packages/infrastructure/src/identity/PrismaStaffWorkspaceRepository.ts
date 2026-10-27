import { Prisma, type PrismaClient } from '@prisma/client';
import type {
  AtomicPersistenceContext,
  IStaffWorkspaceRepository,
  StaffDraft,
  StaffMember,
  StaffReadiness,
  StaffKind,
} from '@manaratak/domain';

const tables = [
  'StaffDepartmentRecord',
  'StaffJobTitleRecord',
  'StaffMembershipRecord',
  'StaffLifecycleEventRecord',
];
type MemberRow = Prisma.StaffMembershipRecordGetPayload<{
  include: { identity: { include: { user: true } } };
}>;
function member(row: MemberRow): StaffMember {
  return {
    id: row.id,
    publicId: row.publicId,
    identityId: row.identityId,
    displayName: row.identity?.user?.displayName ?? row.draftName ?? '',
    email: row.identity?.user?.primaryEmail ?? row.draftEmail ?? '',
    kind: row.kind as StaffKind,
    status: row.status,
    departmentId: row.departmentId,
    jobTitleId: row.jobTitleId,
    managerId: row.managerId,
    startsAt: row.startsAt?.toISOString() ?? null,
    endsAt: row.endsAt?.toISOString() ?? null,
    version: row.version,
    identityStatus: row.identity?.status ?? null,
    emailVerified: row.identity?.user?.isEmailVerified ?? null,
  };
}
export class PrismaStaffWorkspaceRepository implements IStaffWorkspaceRepository {
  constructor(private readonly db: PrismaClient) {}
  private tx(context: AtomicPersistenceContext) {
    const tx = (
      context as AtomicPersistenceContext & { transactionClient?: Prisma.TransactionClient }
    ).transactionClient;
    if (!context.boundaryId || !tx) throw Error('STAFF_TRANSACTION_REQUIRED');
    return tx;
  }
  async readiness(): Promise<StaffReadiness> {
    const rows = await this.db.$queryRaw<
      Array<{ name: string; present: boolean; permitted: boolean }>
    >(
      Prisma.sql`SELECT name, oid IS NOT NULL AS present,
        COALESCE(has_table_privilege(oid,'SELECT') AND has_table_privilege(oid,'INSERT') AND
          (name='StaffLifecycleEventRecord' OR has_table_privilege(oid,'UPDATE')),false) AS permitted
        FROM (SELECT name, to_regclass(format('%I.%I',current_schema(),name)) AS oid
        FROM unnest(ARRAY['StaffDepartmentRecord','StaffJobTitleRecord','StaffMembershipRecord','StaffLifecycleEventRecord']) AS name) AS storage`,
    );
    const missingTables = tables.filter(
      (name) => !rows.some((row) => row.name === name && row.present),
    );
    const missingPrivileges = rows
      .filter((row) => row.present && !row.permitted)
      .map((row) => row.name);
    const ready = missingTables.length === 0 && missingPrivileges.length === 0;
    return {
      ready,
      missingTables,
      missingPrivileges,
      capabilities: {
        drafts: ready,
        organization: ready,
        invitations: false,
        activation: false,
        offboarding: false,
      },
    };
  }
  async list(query: Parameters<IStaffWorkspaceRepository['list']>[0]) {
    const where: Prisma.StaffMembershipRecordWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.departmentId ? { departmentId: query.departmentId } : {}),
      ...(query.cursor ? { id: { gt: query.cursor } } : {}),
      ...(query.search
        ? {
            OR: [
              { publicId: { contains: query.search, mode: 'insensitive' } },
              { draftName: { contains: query.search, mode: 'insensitive' } },
              { draftEmail: { contains: query.search, mode: 'insensitive' } },
              {
                identity: {
                  user: { displayName: { contains: query.search, mode: 'insensitive' } },
                },
              },
              {
                identity: {
                  user: { primaryEmail: { contains: query.search, mode: 'insensitive' } },
                },
              },
            ],
          }
        : {}),
    };
    const rows = await this.db.staffMembershipRecord.findMany({
      where,
      orderBy: { id: 'asc' },
      take: query.limit + 1,
      include: { identity: { include: { user: true } } },
    });
    return {
      items: rows.slice(0, query.limit).map(member),
      nextCursor: rows.length > query.limit ? rows[query.limit - 1].id : null,
    };
  }
  async get(id: string, context?: AtomicPersistenceContext) {
    const row = await (context ? this.tx(context) : this.db).staffMembershipRecord.findUnique({
      where: { id },
      include: { identity: { include: { user: true } } },
    });
    return row ? member(row) : null;
  }
  async events(query: Parameters<IStaffWorkspaceRepository['events']>[0]) {
    const rows = await this.db.staffLifecycleEventRecord.findMany({
      where: {
        ...(query.membershipId ? { membershipId: query.membershipId } : {}),
        ...(query.cursor ? { id: { gt: query.cursor } } : {}),
      },
      orderBy: { id: 'asc' },
      take: query.limit + 1,
    });
    return {
      items: rows
        .slice(0, query.limit)
        .map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
      nextCursor: rows.length > query.limit ? rows[query.limit - 1].id : null,
    };
  }
  async organization(context?: AtomicPersistenceContext) {
    const db = context ? this.tx(context) : this.db;
    // Serialize hierarchy changes and draft validation, including absent-parent races.
    if (context) await db.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(748103,1)`);
    const [departments, titles] = await Promise.all([
      db.staffDepartmentRecord.findMany({ orderBy: { name: 'asc' }, take: 1001 }),
      db.staffJobTitleRecord.findMany({ orderBy: { name: 'asc' }, take: 1001 }),
    ]);
    if (departments.length > 1000 || titles.length > 1000) throw Error('STAFF_ORGANIZATION_LIMIT');
    return { departments, titles };
  }
  async eligibleIdentity(id: string, context: AtomicPersistenceContext) {
    const tx = this.tx(context);
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "IdentityRecord" WHERE id=${id} FOR SHARE`);
    const identity = await tx.identityRecord.findUnique({ where: { id }, include: { user: true } });
    // Linking a draft does not prove ownership or activate anything.
    return (
      !!identity &&
      identity.type === 'Human' &&
      !['ARCHIVED', 'PURGED'].includes(identity.status) &&
      !!identity.user
    );
  }
  async saveDraft(
    input: StaffDraft,
    publicId: string,
    actorId: string,
    context: AtomicPersistenceContext,
  ) {
    const tx = this.tx(context);
    await tx.staffMembershipRecord.create({
      data: {
        id: input.id,
        publicId,
        identityId: input.identityId,
        draftName: input.identityId ? null : input.displayName?.trim(),
        draftEmail: input.identityId ? null : input.email?.trim().toLowerCase(),
        kind: input.kind,
        status: 'DRAFT',
        departmentId: input.departmentId,
        jobTitleId: input.jobTitleId,
        managerId: input.managerId,
        startsAt: input.startsAt ? new Date(input.startsAt) : null,
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
        reason: input.reason,
        createdBy: actorId,
      },
    });
  }
  async recordEvent(
    input: Parameters<IStaffWorkspaceRepository['recordEvent']>[0],
    context: AtomicPersistenceContext,
  ) {
    await this.tx(context).staffLifecycleEventRecord.create({ data: input });
  }
  async cancelDraft(id: string, version: number, context: AtomicPersistenceContext) {
    const result = await this.tx(context).staffMembershipRecord.updateMany({
      where: { id, version, status: 'DRAFT' },
      data: { status: 'CANCELLED', version: { increment: 1 } },
    });
    return result.count === 1;
  }
  async saveDepartment(
    input: Parameters<IStaffWorkspaceRepository['saveDepartment']>[0],
    context: AtomicPersistenceContext,
  ) {
    const tx = this.tx(context);
    const data = { name: input.name, parentId: input.parentId ?? null };
    if (input.version === undefined)
      await tx.staffDepartmentRecord.create({ data: { id: input.id, ...data } });
    else if (
      (
        await tx.staffDepartmentRecord.updateMany({
          where: { id: input.id, version: input.version },
          data: { ...data, version: { increment: 1 } },
        })
      ).count !== 1
    )
      throw Error('STAFF_STALE_OR_NOT_DRAFT');
  }
  async saveTitle(
    input: Parameters<IStaffWorkspaceRepository['saveTitle']>[0],
    context: AtomicPersistenceContext,
  ) {
    const tx = this.tx(context);
    const data = {
      name: input.name,
      description: input.description,
      departmentId: input.departmentId ?? null,
    };
    if (
      input.departmentId &&
      (await tx.staffMembershipRecord.count({
        where: {
          jobTitleId: input.id,
          status: { notIn: ['CANCELLED', 'ENDED'] },
          OR: [{ departmentId: null }, { departmentId: { not: input.departmentId } }],
        },
      }))
    )
      throw Error('STAFF_TITLE_DEPARTMENT_MISMATCH');
    if (input.version === undefined)
      await tx.staffJobTitleRecord.create({ data: { id: input.id, ...data } });
    else if (
      (
        await tx.staffJobTitleRecord.updateMany({
          where: { id: input.id, version: input.version },
          data: { ...data, version: { increment: 1 } },
        })
      ).count !== 1
    )
      throw Error('STAFF_STALE_OR_NOT_DRAFT');
  }
}

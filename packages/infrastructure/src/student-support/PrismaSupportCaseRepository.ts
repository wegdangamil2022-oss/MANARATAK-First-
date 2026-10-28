import { Prisma, type PrismaClient } from '@prisma/client';
import {
  type AtomicPersistenceContext,
  type ISupportCaseRepository,
  type SupportAccess,
  type SupportCase,
  type SupportEvent,
  type SupportMacro,
  type SupportMessage,
  type SupportPolicy,
  type SupportQuery,
  type SupportTeam,
} from '@manaratak/domain';
import type { PrismaAtomicPersistenceContext } from '../event-foundation/PrismaTransactionalOutboxStore';
import { StudentSupportCursorCodec } from '../students/StudentSupportCursorCodec';

const tables = [
  'StudentSupportCaseRecord',
  'StudentSupportMessageRecord',
  'StudentSupportEventRecord',
  'StudentSupportTeamRecord',
  'StudentSupportTeamMemberRecord',
  'StudentSupportPolicyRecord',
  'StudentSupportMacroRecord',
  'StudentSupportCaseLinkRecord',
];
type CaseRow = Prisma.StudentSupportCaseRecordGetPayload<Record<string, never>>;
const dateFields = [
  'lastStudentMessageAt',
  'lastPublicReplyAt',
  'firstPublicReplyAt',
  'firstReplyDueAt',
  'resolutionDueAt',
  'slaPausedAt',
  'resolvedAt',
  'closedAt',
  'createdAt',
  'updatedAt',
] as const;
const activeStatuses = ['NEW', 'OPEN', 'REOPENED', 'WAITING_ON_STUDENT', 'WAITING_ON_OWNER'];
function scope(access: SupportAccess): Prisma.StudentSupportCaseRecordWhereInput {
  if (access.kind === 'STUDENT') return { studentId: access.actorId };
  if (access.allTeams) return {};
  return {
    OR: [
      { assigneeId: access.actorId },
      { team: { active: true, members: { some: { identityId: access.actorId, active: true } } } },
    ],
  };
}
function mapped(row: CaseRow): SupportCase {
  return {
    ...row,
    status: row.status as SupportCase['status'],
    priority: row.priority as SupportCase['priority'],
    origin: row.origin as SupportCase['origin'],
    ...Object.fromEntries(dateFields.map((key) => [key, row[key]?.toISOString() ?? null])),
    lastStudentMessageAt: row.lastStudentMessageAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastPublicReplyAt: row.lastPublicReplyAt?.toISOString() ?? null,
    firstPublicReplyAt: row.firstPublicReplyAt?.toISOString() ?? null,
    firstReplyDueAt: row.firstReplyDueAt?.toISOString() ?? null,
    resolutionDueAt: row.resolutionDueAt?.toISOString() ?? null,
    slaPausedAt: row.slaPausedAt?.toISOString() ?? null,
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    closedAt: row.closedAt?.toISOString() ?? null,
    slaSnapshot: row.slaSnapshot as unknown as SupportCase['slaSnapshot'],
  };
}
function write(record: SupportCase) {
  return {
    ...record,
    ...Object.fromEntries(
      dateFields.map((key) => [key, record[key] ? new Date(record[key]!) : null]),
    ),
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
    lastStudentMessageAt: new Date(record.lastStudentMessageAt),
    slaSnapshot: record.slaSnapshot
      ? (JSON.parse(JSON.stringify(record.slaSnapshot)) as Prisma.InputJsonValue)
      : Prisma.JsonNull,
  };
}
export class PrismaSupportCaseRepository implements ISupportCaseRepository {
  async commandStatus(access: SupportAccess, key: string) {
    const event = await this.db.studentSupportEventRecord.findUnique({
      where: { actorId_commandKey: { actorId: access.actorId, commandKey: key } },
      select: { caseId: true, type: true, data: true },
    });
    if (
      !event ||
      (!access.internalNotes && event.type === 'INTERNAL_NOTE_ADDED') ||
      !(await this.get(event.caseId, access))
    )
      return { state: 'UNKNOWN' as const };
    const data = event.data as Record<string, unknown>;
    return {
      state: 'SAVED' as const,
      caseId: event.caseId,
      messageId: typeof data.messageId === 'string' ? data.messageId : null,
    };
  }
  async messageStatus(caseId: string, messageId: string, access: SupportAccess) {
    const message = await this.db.studentSupportMessageRecord.findFirst({
      where: {
        id: messageId,
        caseId,
        supportCase: scope(access),
        ...(!access.internalNotes || access.kind === 'STUDENT' ? { visibility: 'PUBLIC' } : {}),
      },
      select: { visibility: true },
    });
    if (!message) return null;
    if (message.visibility === 'INTERNAL')
      return {
        saved: true as const,
        visibility: 'INTERNAL' as const,
        notification: 'NOT_REQUESTED' as const,
      };
    const event = await this.db.transactionalOutboxRecord.findFirst({
      where: {
        domain: 'STUDENT_SUPPORT',
        aggregateId: caseId,
        eventType: 'StudentSupportNotificationRequested',
        payload: { path: ['messageId'], equals: messageId },
      },
      select: { id: true, state: true },
    });
    if (!event)
      return {
        saved: true as const,
        visibility: 'PUBLIC' as const,
        notification: 'UNKNOWN' as const,
      };
    const intents = await this.db.notificationIntentRecord.findMany({
      where: { reference: { startsWith: 'support-event:' + event.id + ':' } },
      select: { deliveryState: true },
      take: 101,
    });
    const states = intents.map((intent) => intent.deliveryState);
    const notification =
      states.length <= 100 && states.length > 0 && states.every((state) => state === 'DELIVERED')
        ? ('DELIVERED' as const)
        : states.some((state) => ['FAILED', 'DEAD_LETTER', 'EXPIRED', 'CANCELLED'].includes(state))
          ? ('FAILED' as const)
          : states.length && states.every((state) => state === 'SUPPRESSED')
            ? ('SUPPRESSED' as const)
            : states.length
              ? ('PENDING' as const)
              : ['FAILED', 'DEAD_LETTER'].includes(event.state)
                ? ('FAILED' as const)
                : event.state === 'PENDING' || event.state === 'PROCESSING'
                  ? ('QUEUED' as const)
                  : ('UNKNOWN' as const);
    return { saved: true as const, visibility: 'PUBLIC' as const, notification };
  }
  private readonly cursors: StudentSupportCursorCodec;
  constructor(
    private readonly db: PrismaClient,
    signingSecret: string,
    private readonly eligibleAgent: (id: string) => Promise<boolean>,
  ) {
    this.cursors = new StudentSupportCursorCodec(signingSecret);
  }
  private tx(context: AtomicPersistenceContext): Prisma.TransactionClient {
    const client = (context as PrismaAtomicPersistenceContext).transactionClient;
    if (!context.boundaryId || !client) throw Error('SUPPORT_TRANSACTION_REQUIRED');
    return client;
  }
  async readiness() {
    const rows = await this.db.$queryRaw<
      Array<{ name: string; present: boolean; permitted: boolean }>
    >(Prisma.sql`
      SELECT name, oid IS NOT NULL AS present, COALESCE(has_table_privilege(oid,'SELECT') AND has_table_privilege(oid,'INSERT') AND
        (name IN ('StudentSupportMessageRecord','StudentSupportEventRecord','StudentSupportCaseLinkRecord') OR has_table_privilege(oid,'UPDATE')), false) AS permitted
      FROM (SELECT name,to_regclass(format('%I.%I',current_schema(),name)) AS oid FROM unnest(ARRAY[${Prisma.join(tables)}]::text[]) AS name) AS storage`);
    const missingTables = tables.filter(
      (name) => !rows.some((row) => row.name === name && row.present),
    );
    const missingPrivileges = rows
      .filter((row) => row.present && !row.permitted)
      .map((row) => row.name);
    const guards = await this.db.$queryRaw<Array<{ name: string }>>(
      Prisma.sql`SELECT t.tgname AS name FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=current_schema() AND t.tgenabled='O' AND NOT t.tgisinternal AND t.tgname IN ('support_message_immutable','support_event_immutable','support_link_same_student')`,
    );
    const missingGuards = [
      'support_message_immutable',
      'support_event_immutable',
      'support_link_same_student',
    ].filter((name) => !guards.some((guard) => guard.name === name));
    return {
      ready: !missingTables.length && !missingPrivileges.length && !missingGuards.length,
      missingTables,
      missingPrivileges,
      missingGuards,
      attachments: false as const,
      notificationDelivery: 'OWNER_MANAGED' as const,
      slaAutomation: false as const,
    };
  }
  async teamsForActor(actorId: string) {
    const rows = await this.db.studentSupportTeamMemberRecord.findMany({
      where: { identityId: actorId, active: true, team: { active: true } },
      select: { teamId: true },
      take: 200,
    });
    return rows.map((row) => row.teamId);
  }
  async replayCommand(
    access: SupportAccess,
    command: { key: string; hash: string },
    context: AtomicPersistenceContext,
  ) {
    const db = this.tx(context);
    await db.$queryRaw(
      Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${'support-command:' + access.actorId + ':' + command.key},0))::text`,
    );
    const event = await db.studentSupportEventRecord.findUnique({
      where: { actorId_commandKey: { actorId: access.actorId, commandKey: command.key } },
    });
    if (!event) return null;
    if (event.commandHash !== command.hash) throw Error('SUPPORT_IDEMPOTENCY_CONFLICT');
    const record = await this.get(event.caseId, access, context);
    if (!record) throw Error('SUPPORT_CASE_NOT_FOUND');
    return record;
  }
  async get(id: string, access: SupportAccess, context?: AtomicPersistenceContext) {
    const db = context ? this.tx(context) : this.db;
    const where = { id, AND: [scope(access)] };
    const row = await db.studentSupportCaseRecord.findFirst({ where });
    if (!row) return null;
    if (context) {
      await db.$queryRaw(
        Prisma.sql`SELECT id FROM "StudentSupportCaseRecord" WHERE id=${id} FOR UPDATE`,
      );
      const locked = await db.studentSupportCaseRecord.findFirst({ where });
      return locked ? mapped(locked) : null;
    }
    return mapped(row);
  }
  private replyFilter(): Prisma.StudentSupportCaseRecordWhereInput {
    return {
      status: { in: activeStatuses },
      OR: [
        { lastPublicReplyAt: null },
        { lastStudentMessageAt: { gt: this.db.studentSupportCaseRecord.fields.lastPublicReplyAt } },
      ],
    };
  }
  private overdueFilter(): Prisma.StudentSupportCaseRecordWhereInput {
    return {
      status: { in: activeStatuses },
      OR: [
        { firstPublicReplyAt: null, firstReplyDueAt: { lt: new Date() } },
        { slaPausedAt: null, resolutionDueAt: { lt: new Date() } },
      ],
    };
  }
  async list(query: SupportQuery, access: SupportAccess) {
    const { cursor, ...filters } = query;
    const fingerprint =
      'cases:' + JSON.stringify([access.actorId, access.kind, access.allTeams, filters]);
    const boundary = cursor ? this.cursors.decode(cursor, fingerprint) : null;
    const views: Record<string, Prisma.StudentSupportCaseRecordWhereInput> = {
      MINE: { assigneeId: access.actorId },
      UNASSIGNED: { assigneeId: null, status: { in: activeStatuses } },
      NEEDS_REPLY: this.replyFilter(),
      WAITING: { status: 'WAITING_ON_STUDENT' },
      OVERDUE: this.overdueFilter(),
      RESOLVED: { status: { in: ['RESOLVED', 'CLOSED'] } },
      REOPENED: { status: 'REOPENED' },
    };
    const where: Prisma.StudentSupportCaseRecordWhereInput = {
      AND: [
        scope(access),
        ...(query.studentId && access.kind === 'AGENT' ? [{ studentId: query.studentId }] : []),
        ...(query.status ? [{ status: query.status }] : []),
        ...(query.priority ? [{ priority: query.priority }] : []),
        ...(query.category ? [{ category: query.category }] : []),
        ...(query.teamId ? [{ teamId: query.teamId }] : []),
        ...(query.view && views[query.view] ? [views[query.view]] : []),
        ...(query.q
          ? [
              {
                OR: [
                  { publicId: { contains: query.q, mode: 'insensitive' as const } },
                  { title: { contains: query.q, mode: 'insensitive' as const } },
                ],
              },
            ]
          : []),
        ...(boundary
          ? [
              {
                OR: [
                  { updatedAt: { lt: boundary.updatedAt } },
                  { updatedAt: boundary.updatedAt, id: { lt: boundary.id } },
                ],
              },
            ]
          : []),
      ],
    };
    const limit = Math.min(100, Math.max(1, query.limit));
    const rows = await this.db.studentSupportCaseRecord.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });
    const page = rows.slice(0, limit),
      last = page.at(-1);
    return {
      items: page.map(mapped),
      hasMore: rows.length > limit,
      nextCursor: rows.length > limit && last ? this.cursors.encode(last, fingerprint) : null,
    };
  }
  async messages(caseId: string, access: SupportAccess, limit: number, cursor?: string) {
    const fingerprint =
      'messages:' + JSON.stringify([caseId, access.actorId, access.kind, access.internalNotes]);
    const boundary = cursor ? this.cursors.decode(cursor, fingerprint) : null;
    const rows = await this.db.studentSupportMessageRecord.findMany({
      where: {
        caseId,
        supportCase: scope(access),
        ...(!access.internalNotes || access.kind === 'STUDENT' ? { visibility: 'PUBLIC' } : {}),
        ...(boundary
          ? {
              OR: [
                { createdAt: { lt: boundary.updatedAt } },
                { createdAt: boundary.updatedAt, id: { lt: boundary.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });
    const page = rows.slice(0, limit),
      last = page.at(-1);
    return {
      items: [...page].reverse().map((row) => ({
        ...row,
        authorKind: row.authorKind as SupportMessage['authorKind'],
        visibility: row.visibility as SupportMessage['visibility'],
        createdAt: row.createdAt.toISOString(),
      })),
      nextCursor:
        rows.length > limit && last
          ? this.cursors.encode({ id: last.id, updatedAt: last.createdAt }, fingerprint)
          : null,
    };
  }
  async events(caseId: string, access: SupportAccess, limit: number, cursor?: string) {
    const fingerprint = 'events:' + JSON.stringify([caseId, access.actorId, access.internalNotes]),
      boundary = cursor ? this.cursors.decode(cursor, fingerprint) : null;
    const rows = await this.db.studentSupportEventRecord.findMany({
      where: {
        caseId,
        supportCase: scope(access),
        ...(!access.internalNotes ? { type: { not: 'INTERNAL_NOTE_ADDED' } } : {}),
        ...(boundary
          ? {
              OR: [
                { createdAt: { lt: boundary.updatedAt } },
                { createdAt: boundary.updatedAt, id: { lt: boundary.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });
    const page = rows.slice(0, limit),
      last = page.at(-1);
    return {
      items: page.map((row) => ({
        id: row.id,
        caseId: row.caseId,
        actorId: row.actorId,
        type: row.type,
        data: row.data as SupportEvent['data'],
        createdAt: row.createdAt.toISOString(),
      })),
      nextCursor:
        rows.length > limit && last
          ? this.cursors.encode({ id: last.id, updatedAt: last.createdAt }, fingerprint)
          : null,
    };
  }
  async create(
    record: SupportCase,
    message: SupportMessage,
    event: SupportEvent,
    context: AtomicPersistenceContext,
    command: { key: string; hash: string },
  ) {
    const db = this.tx(context);
    await db.studentSupportCaseRecord.create({ data: write(record) });
    await db.studentSupportMessageRecord.create({
      data: { ...message, createdAt: new Date(message.createdAt) },
    });
    await db.studentSupportEventRecord.create({
      data: {
        ...event,
        data: event.data,
        commandKey: command.key,
        commandHash: command.hash,
        createdAt: new Date(event.createdAt),
      },
    });
  }
  async change(
    record: SupportCase,
    expectedVersion: number,
    event: SupportEvent,
    context: AtomicPersistenceContext,
    command: { key: string; hash: string },
    message?: SupportMessage,
  ) {
    const db = this.tx(context);
    const changed = await db.studentSupportCaseRecord.updateMany({
      where: { id: record.id, version: expectedVersion },
      data: write(record),
    });
    if (changed.count !== 1) throw Error('SUPPORT_VERSION_CONFLICT');
    if (message)
      await db.studentSupportMessageRecord.create({
        data: { ...message, createdAt: new Date(message.createdAt) },
      });
    await db.studentSupportEventRecord.create({
      data: {
        ...event,
        data: event.data,
        commandKey: command.key,
        commandHash: command.hash,
        createdAt: new Date(event.createdAt),
      },
    });
  }
  async assertStudent(studentId: string, context: AtomicPersistenceContext) {
    const db = this.tx(context);
    const [student, identity] = await Promise.all([
      db.studentWorkspace.findUnique({
        where: { studentReferenceId: studentId },
        select: { status: true },
      }),
      db.identityRecord.findUnique({ where: { id: studentId }, select: { status: true } }),
    ]);
    if (!student || !identity || identity.status !== 'ACTIVE' || student.status !== 'ACTIVE')
      throw Error('SUPPORT_STUDENT_UNAVAILABLE');
  }
  async assertTeam(id: string, context: AtomicPersistenceContext) {
    const team = await this.tx(context).studentSupportTeamRecord.findFirst({
      where: { id, active: true },
      select: { id: true },
    });
    if (!team) throw Error('SUPPORT_TEAM_INELIGIBLE');
  }
  async assertAssignee(actorId: string, teamId: string | null, context: AtomicPersistenceContext) {
    const db = this.tx(context);
    const identity = await db.identityRecord.findUnique({
      where: { id: actorId },
      select: {
        status: true,
        type: true,
        staffMemberships: { select: { status: true, endsAt: true } },
      },
    });
    if (
      !identity ||
      identity.status !== 'ACTIVE' ||
      identity.type !== 'Human' ||
      (identity.staffMemberships.length &&
        !identity.staffMemberships.some(
          (member) => member.status === 'ACTIVE' && (!member.endsAt || member.endsAt > new Date()),
        )) ||
      !(await this.eligibleAgent(actorId))
    )
      throw Error('SUPPORT_ASSIGNEE_INELIGIBLE');
    if (
      teamId &&
      !(await db.studentSupportTeamMemberRecord.findFirst({
        where: { teamId, identityId: actorId, active: true, team: { active: true } },
      }))
    )
      throw Error('SUPPORT_TEAM_MEMBERSHIP_REQUIRED');
  }
  async policy(context?: AtomicPersistenceContext): Promise<SupportPolicy | null> {
    const row = await (context ? this.tx(context) : this.db).studentSupportPolicyRecord.findFirst({
      where: { active: true },
      orderBy: { id: 'asc' },
    });
    return row ? { ...row, data: row.data as unknown as SupportPolicy['data'] } : null;
  }
  async configuration() {
    const [teams, policies, macros] = await Promise.all([
      this.db.studentSupportTeamRecord.findMany({
        orderBy: { name: 'asc' },
        take: 100,
        include: { members: { where: { active: true }, select: { identityId: true }, take: 100 } },
      }),
      this.db.studentSupportPolicyRecord.findMany({ orderBy: { id: 'asc' }, take: 100 }),
      this.db.studentSupportMacroRecord.findMany({ orderBy: { id: 'asc' }, take: 100 }),
    ]);
    return {
      teams: teams.map((row) => ({
        id: row.id,
        name: row.name,
        active: row.active,
        version: row.version,
        memberIds: row.members.map((member) => member.identityId),
      })),
      policies: policies.map((row) => ({
        ...row,
        data: row.data as unknown as SupportPolicy['data'],
      })),
      macros: macros.map((row) => ({
        ...row,
        locale: row.locale as 'ar' | 'en',
        status: row.status as SupportMacro['status'],
      })),
    };
  }
  async saveTeam(input: SupportTeam, memberIds: string[], context: AtomicPersistenceContext) {
    const db = this.tx(context);
    for (const id of memberIds) await this.assertAssignee(id, null, context);
    await this.versioned(db.studentSupportTeamRecord, input.id, input.version, {
      name: input.name,
      active: input.active,
    });
    await db.studentSupportTeamMemberRecord.updateMany({
      where: { teamId: input.id, identityId: { notIn: memberIds } },
      data: { active: false },
    });
    for (const identityId of memberIds)
      await db.studentSupportTeamMemberRecord.upsert({
        where: { teamId_identityId: { teamId: input.id, identityId } },
        create: { teamId: input.id, identityId, active: true },
        update: { active: true },
      });
  }
  async savePolicy(input: SupportPolicy, context: AtomicPersistenceContext) {
    const db = this.tx(context);
    await db.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(748104,1)::text`);
    if (
      input.active &&
      (await db.studentSupportPolicyRecord.findFirst({
        where: { active: true, id: { not: input.id } },
        select: { id: true },
      }))
    )
      throw Error('SUPPORT_ACTIVE_POLICY_EXISTS');
    await this.versioned(db.studentSupportPolicyRecord, input.id, input.version, {
      name: input.name,
      active: input.active,
      data: JSON.parse(JSON.stringify(input.data)) as Prisma.InputJsonValue,
    });
  }
  async saveMacro(input: SupportMacro, context: AtomicPersistenceContext) {
    await this.versioned(this.tx(context).studentSupportMacroRecord, input.id, input.version, {
      title: input.title,
      locale: input.locale,
      body: input.body,
      status: input.status,
    });
  }
  private async versioned(
    delegate: {
      create(args: never): Promise<unknown>;
      updateMany(args: never): Promise<{ count: number }>;
    },
    id: string,
    expectedVersion: number,
    data: Record<string, unknown>,
  ) {
    try {
      if (!expectedVersion) await delegate.create({ data: { id, ...data, version: 1 } } as never);
      else if (
        (
          await delegate.updateMany({
            where: { id, version: expectedVersion },
            data: { ...data, version: expectedVersion + 1 },
          } as never)
        ).count !== 1
      )
        throw Error('SUPPORT_VERSION_CONFLICT');
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw Error('SUPPORT_VERSION_CONFLICT');
      throw error;
    }
  }
  async linkDuplicate(
    caseId: string,
    relatedCaseId: string,
    actorId: string,
    context: AtomicPersistenceContext,
  ) {
    await this.tx(context).studentSupportCaseLinkRecord.upsert({
      where: { caseId_relatedCaseId: { caseId, relatedCaseId } },
      create: { caseId, relatedCaseId, linkedBy: actorId },
      update: {},
    });
  }
  async metrics(access: SupportAccess) {
    const count = (where: Prisma.StudentSupportCaseRecordWhereInput) =>
      this.db.studentSupportCaseRecord.count({ where: { AND: [scope(access), where] } });
    const [total, needsReply, unassigned, overdue, waiting, resolved, reopened] = await Promise.all(
      [
        count({}),
        count(this.replyFilter()),
        count({ assigneeId: null, status: { in: activeStatuses } }),
        count(this.overdueFilter()),
        count({ status: 'WAITING_ON_STUDENT' }),
        count({ status: { in: ['RESOLVED', 'CLOSED'] } }),
        count({ status: 'REOPENED' }),
      ],
    );
    return {
      total,
      needsReply,
      unassigned,
      overdue,
      waiting,
      resolved,
      reopened,
      checkedAt: new Date().toISOString(),
      csat: null,
    };
  }
}

import { createHash, randomUUID } from 'node:crypto';
import {
  SUPPORT_CATEGORIES,
  SUPPORT_STATUSES,
  assertSupportTransition,
  canReadSupportCase,
  supportBusinessDeadline,
  supportBusinessMinutesBetween,
  validateSupportCalendar,
  type SupportTeam,
  type SupportPolicy,
  type SupportMacro,
  type ISupportCaseRepository,
  type SupportAccess,
  type SupportCase,
  type SupportEvent,
  type SupportMessage,
  type SupportQuery,
  type SupportStatus,
} from '@manaratak/domain';
import type {
  AtomicDomainMutationCoordinator,
  AtomicMutationRequestContext,
} from '../event-foundation/use-cases/AtomicDomainMutationCoordinator';

export interface SupportCommandContext extends AtomicMutationRequestContext {
  requestId: string;
}
const stable = (value: unknown): string =>
  value && typeof value === 'object'
    ? Array.isArray(value)
      ? '[' + value.map(stable).join(',') + ']'
      : '{' +
        Object.entries(value)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, item]) => JSON.stringify(key) + ':' + stable(item))
          .join(',') +
        '}'
    : JSON.stringify(value);
function command(operation: string, input: unknown, context: SupportCommandContext) {
  if (
    !context.actorId ||
    !context.requestId ||
    context.requestId.length < 8 ||
    context.requestId.length > 200
  )
    throw Error('SUPPORT_COMMAND_REQUIRED');
  return {
    key: createHash('sha256').update(context.requestId).digest('hex'),
    hash: createHash('sha256')
      .update(operation + ':' + stable(input))
      .digest('hex'),
  };
}
function text(value: string, min: number, max: number) {
  if (
    typeof value !== 'string' ||
    value.trim().length < min ||
    value.length > max ||
    /\u0000/.test(value)
  )
    throw Error('SUPPORT_TEXT_INVALID');
  return value.trim();
}
export class SupportCaseUseCases {
  async commandStatus(key: string, access: SupportAccess) {
    await this.requireReady();
    if (key.length < 8 || key.length > 200) throw Error('SUPPORT_COMMAND_REQUIRED');
    return this.repository.commandStatus(access, createHash('sha256').update(key).digest('hex'));
  }
  async messageStatus(caseId: string, messageId: string, access: SupportAccess) {
    await this.get(caseId, access);
    const result = await this.repository.messageStatus(caseId, messageId, access);
    if (!result) throw Error('SUPPORT_MESSAGE_NOT_FOUND');
    return result;
  }
  constructor(
    private readonly repository: ISupportCaseRepository,
    private readonly atomic: AtomicDomainMutationCoordinator,
    private readonly now: () => Date = () => new Date(),
  ) {}
  readiness() {
    return this.repository.readiness();
  }
  async requireReady() {
    if (!(await this.readiness()).ready) throw Error('SUPPORT_SCHEMA_NOT_READY');
  }
  async access(
    actorId: string,
    kind: 'STUDENT' | 'AGENT',
    allTeams = false,
    internalNotes = false,
  ): Promise<SupportAccess> {
    return {
      actorId,
      kind,
      allTeams: kind === 'AGENT' && allTeams,
      internalNotes: kind === 'AGENT' && internalNotes,
      teamIds:
        kind === 'AGENT' && (await this.readiness()).ready
          ? await this.repository.teamsForActor(actorId)
          : [],
    };
  }
  async list(query: SupportQuery, access: SupportAccess) {
    await this.requireReady();
    return this.repository.list(query, access);
  }
  async get(id: string, access: SupportAccess) {
    await this.requireReady();
    const record = await this.repository.get(id, access);
    if (!record || !canReadSupportCase(record, access)) throw Error('SUPPORT_CASE_NOT_FOUND');
    return record;
  }
  async messages(id: string, access: SupportAccess, limit = 50, cursor?: string) {
    await this.get(id, access);
    return this.repository.messages(id, access, Math.min(100, Math.max(1, limit)), cursor);
  }
  async events(id: string, access: SupportAccess, limit = 50, cursor?: string) {
    await this.get(id, access);
    if (access.kind !== 'AGENT') throw Error('SUPPORT_ACCESS_DENIED');
    const page = await this.repository.events(
      id,
      access,
      Math.min(100, Math.max(1, limit)),
      cursor,
    );
    return {
      ...page,
      items: access.internalNotes
        ? page.items
        : page.items.filter((event) => event.type !== 'INTERNAL_NOTE_ADDED'),
    };
  }
  async metrics(access: SupportAccess) {
    await this.requireReady();
    return this.repository.metrics(access);
  }
  async configuration() {
    await this.requireReady();
    return this.repository.configuration();
  }
  async saveConfiguration(
    kind: 'team' | 'policy' | 'macro',
    input: SupportTeam | SupportPolicy | SupportMacro,
    memberIds: string[],
    context: SupportCommandContext,
  ) {
    await this.requireReady();
    if (!context.actorId || !input.id || !Number.isInteger(input.version) || input.version < 0)
      throw Error('SUPPORT_INPUT_INVALID');
    if (kind === 'policy') {
      const policy = input as SupportPolicy;
      validateSupportCalendar(policy.data.calendar);
      if (
        ![
          policy.data.firstReplyMinutes,
          policy.data.resolutionMinutes,
          policy.data.reopenDays,
        ].every((value) => Number.isInteger(value) && value > 0) ||
        policy.data.firstReplyMinutes > 525600 ||
        policy.data.resolutionMinutes > 525600 ||
        policy.data.reopenDays > 365
      )
        throw Error('SUPPORT_SLA_DURATION_INVALID');
    }
    return this.atomic.execute(
      {
        domain: 'STUDENT_SUPPORT',
        aggregateType: 'SUPPORT_CONFIGURATION',
        aggregateId: input.id,
        action: 'SUPPORT_CONFIGURATION_CHANGED',
        context,
        auditMetadata: { kind, expectedVersion: input.version },
      },
      async (tx) => {
        if (kind === 'team') await this.repository.saveTeam(input as SupportTeam, memberIds, tx);
        else if (kind === 'policy') await this.repository.savePolicy(input as SupportPolicy, tx);
        else await this.repository.saveMacro(input as SupportMacro, tx);
        return { id: input.id, version: input.version + 1 };
      },
    );
  }

  async create(
    input: {
      title: string;
      body: string;
      category: string;
      studentId?: string;
      reason?: string;
      followupTo?: string;
    },
    access: SupportAccess,
    context: SupportCommandContext,
  ) {
    await this.requireReady();
    this.assertActor(access, context);
    const title = text(input.title, 3, 160),
      body = text(input.body, 3, 4000);
    if (!(SUPPORT_CATEGORIES as readonly string[]).includes(input.category))
      throw Error('SUPPORT_CATEGORY_INVALID');
    const studentId = access.kind === 'STUDENT' ? access.actorId : input.studentId;
    if (!studentId || (access.kind === 'AGENT' && !input.reason?.trim()))
      throw Error('SUPPORT_PROXY_REASON_REQUIRED');
    const initialMessageId = randomUUID();
    const id = randomUUID(),
      request = command('create', { ...input, studentId }, context);
    return this.atomic.execute(
      {
        domain: 'STUDENT_SUPPORT',
        aggregateType: 'SUPPORT_CASE',
        aggregateId: id,
        action: 'SUPPORT_CASE_CREATED',
        context,
        auditMetadata: { origin: access.kind === 'STUDENT' ? 'STUDENT_PORTAL' : 'ADMIN_PROXY' },
        outbox: {
          eventType: 'StudentSupportNotificationRequested',
          payload: {
            caseId: id,
            messageId: initialMessageId,
            audience: 'TEAM',
            publicEvent: 'CREATED',
          },
        },
      },
      async (tx) => {
        const replay = await this.repository.replayCommand(access, request, tx);
        if (replay) return { record: replay, replayed: true };
        await this.repository.assertStudent(studentId, tx);
        if (input.followupTo) {
          const original = await this.repository.get(input.followupTo, access, tx);
          if (!original || original.studentId !== studentId)
            throw Error('SUPPORT_DUPLICATE_LINK_INVALID');
        }
        const now = this.now().toISOString(),
          policy = await this.repository.policy(tx);
        const slaSnapshot = policy
          ? { ...policy.data, policyId: policy.id, version: policy.version }
          : null;
        const record: SupportCase = {
          id,
          publicId: 'SUP-' + id.replaceAll('-', '').slice(0, 12).toUpperCase(),
          studentId,
          title,
          category: input.category,
          status: 'NEW',
          priority: 'NORMAL',
          origin: access.kind === 'STUDENT' ? 'STUDENT_PORTAL' : 'ADMIN_PROXY',
          teamId: null,
          assigneeId: null,
          version: 1,
          lastStudentMessageAt: now,
          lastPublicReplyAt: null,
          firstPublicReplyAt: null,
          firstReplyDueAt: slaSnapshot
            ? supportBusinessDeadline(
                new Date(now),
                slaSnapshot.firstReplyMinutes,
                slaSnapshot.calendar,
              )
            : null,
          resolutionDueAt: slaSnapshot
            ? supportBusinessDeadline(
                new Date(now),
                slaSnapshot.resolutionMinutes,
                slaSnapshot.calendar,
              )
            : null,
          slaPausedAt: null,
          slaRemainingMinutes: null,
          slaBreached: false,
          slaSnapshot,
          resolvedAt: null,
          closedAt: null,
          createdAt: now,
          updatedAt: now,
        };
        const message: SupportMessage = {
          id: initialMessageId,
          caseId: id,
          authorId: context.actorId,
          authorKind: access.kind === 'STUDENT' ? 'STUDENT' : 'AGENT',
          visibility: 'PUBLIC',
          body,
          createdAt: now,
        };
        await this.repository.create(
          record,
          message,
          this.event(id, context.actorId, 'CREATED', now, {
            origin: record.origin,
            messageId: initialMessageId,
            saved: true,
          }),
          tx,
          request,
        );
        if (input.followupTo)
          await this.repository.linkDuplicate(id, input.followupTo, access.actorId, tx);
        return { record, replayed: false };
      },
      (result) => !result.replayed,
    );
  }

  async reply(
    id: string,
    input: {
      body: string;
      expectedVersion?: number;
      internal?: boolean;
      requestInformation?: boolean;
    },
    access: SupportAccess,
    context: SupportCommandContext,
  ) {
    await this.requireReady();
    this.assertActor(access, context);
    const body = text(input.body, 1, 4000),
      internal = input.internal === true;
    if (internal && (access.kind !== 'AGENT' || !access.internalNotes))
      throw Error('SUPPORT_ACCESS_DENIED');
    const request = command('reply:' + id, input, context),
      messageId = randomUUID();
    return this.atomic.execute(
      {
        domain: 'STUDENT_SUPPORT',
        aggregateType: 'SUPPORT_CASE',
        aggregateId: id,
        action: internal ? 'SUPPORT_INTERNAL_NOTE_ADDED' : 'SUPPORT_PUBLIC_REPLY_ADDED',
        context,
        auditMetadata: { visibility: internal ? 'INTERNAL' : 'PUBLIC' },
        outbox: internal
          ? undefined
          : {
              eventType: 'StudentSupportNotificationRequested',
              payload: {
                caseId: id,
                messageId,
                audience: access.kind === 'STUDENT' ? 'TEAM' : 'STUDENT',
                publicEvent: 'REPLY',
              },
            },
      },
      async (tx) => {
        const replay = await this.repository.replayCommand(access, request, tx);
        if (replay) return { record: replay, replayed: true };
        const current = await this.repository.get(id, access, tx);
        if (!current) throw Error('SUPPORT_CASE_NOT_FOUND');
        if (access.kind === 'AGENT' && current.version !== input.expectedVersion)
          throw Error('SUPPORT_VERSION_CONFLICT');
        const now = this.now().toISOString();
        const record = { ...current, version: current.version + 1, updatedAt: now };
        const message: SupportMessage = {
          id: messageId,
          caseId: id,
          authorId: access.actorId,
          authorKind: access.kind === 'STUDENT' ? 'STUDENT' : 'AGENT',
          visibility: internal ? 'INTERNAL' : 'PUBLIC',
          body,
          createdAt: now,
        };
        if (!internal && access.kind === 'STUDENT') {
          record.lastStudentMessageAt = now;
          if (['RESOLVED', 'CLOSED', 'CANCELLED'].includes(current.status)) {
            const days = current.slaSnapshot?.reopenDays ?? 7;
            const endedAt = current.closedAt ?? current.resolvedAt ?? current.updatedAt;
            if (Date.parse(now) - Date.parse(endedAt) > days * 86400000)
              throw Error('SUPPORT_FOLLOWUP_REQUIRED');
            record.status = 'REOPENED';
            record.closedAt = null;
            record.resolvedAt = null;
          } else if (current.status === 'WAITING_ON_STUDENT') record.status = 'OPEN';
          this.resumeClock(record, now);
        } else if (!internal) {
          if (['CLOSED', 'CANCELLED', 'RESOLVED'].includes(current.status))
            throw Error('SUPPORT_REOPEN_REQUIRED');
          record.lastPublicReplyAt = now;
          record.firstPublicReplyAt ??= now;
          if (current.status === 'NEW') record.status = 'OPEN';
          if (input.requestInformation) {
            record.status = 'WAITING_ON_STUDENT';
            this.pauseClock(record, now);
          }
        }
        this.recordBreach(record, now);
        await this.repository.change(
          record,
          current.version,
          this.event(
            id,
            access.actorId,
            internal
              ? 'INTERNAL_NOTE_ADDED'
              : access.kind === 'STUDENT' && record.status === 'REOPENED'
                ? 'STUDENT_REPLY_REOPENED'
                : 'PUBLIC_REPLY_ADDED',
            now,
            { messageId: message.id, status: record.status, saved: true },
          ),
          tx,
          request,
          message,
        );
        return { record, replayed: false };
      },
      (result) => !result.replayed,
    );
  }

  async change(
    id: string,
    input: {
      expectedVersion: number;
      status?: SupportStatus;
      priority?: SupportCase['priority'];
      teamId?: string | null;
      assigneeId?: string | null;
      reason: string;
      relatedCaseId?: string;
    },
    access: SupportAccess,
    context: SupportCommandContext,
  ) {
    await this.requireReady();
    this.assertActor(access, context);
    if (access.kind !== 'AGENT') throw Error('SUPPORT_ACCESS_DENIED');
    if (
      !Number.isInteger(input.expectedVersion) ||
      input.expectedVersion < 1 ||
      (input.status && !(SUPPORT_STATUSES as readonly string[]).includes(input.status)) ||
      (input.priority && !['LOW', 'NORMAL', 'HIGH', 'URGENT'].includes(input.priority))
    )
      throw Error('SUPPORT_INPUT_INVALID');
    text(input.reason, 3, 2000);
    const request = command('change:' + id, input, context);
    return this.atomic.execute(
      {
        domain: 'STUDENT_SUPPORT',
        aggregateType: 'SUPPORT_CASE',
        aggregateId: id,
        action: 'SUPPORT_CASE_CHANGED',
        context,
        auditMetadata: { status: input.status ?? null, priority: input.priority ?? null },
        outbox: input.status
          ? {
              eventType: 'StudentSupportNotificationRequested',
              payload: { caseId: id, audience: 'STUDENT', publicEvent: 'STATUS_CHANGED' },
            }
          : undefined,
      },
      async (tx) => {
        const replay = await this.repository.replayCommand(access, request, tx);
        if (replay) return { record: replay, replayed: true };
        const current = await this.repository.get(id, access, tx);
        if (!current) throw Error('SUPPORT_CASE_NOT_FOUND');
        if (current.version !== input.expectedVersion) throw Error('SUPPORT_VERSION_CONFLICT');
        const now = this.now().toISOString(),
          record = { ...current, version: current.version + 1, updatedAt: now };
        if (input.status) {
          assertSupportTransition(current.status, input.status);
          record.status = input.status;
          if (input.status === 'RESOLVED') record.resolvedAt = now;
          if (input.status === 'CLOSED' || input.status === 'CANCELLED') record.closedAt = now;
          if (input.status === 'REOPENED') {
            record.closedAt = null;
            record.resolvedAt = null;
          }
          if (input.status === 'WAITING_ON_STUDENT') this.pauseClock(record, now);
          else this.resumeClock(record, now);
        }
        if (input.priority) record.priority = input.priority;
        if (input.teamId !== undefined) record.teamId = input.teamId;
        if (input.assigneeId !== undefined) record.assigneeId = input.assigneeId;
        if (record.teamId) await this.repository.assertTeam(record.teamId, tx);
        if (record.assigneeId)
          await this.repository.assertAssignee(record.assigneeId, record.teamId, tx);
        if (record.teamId && !access.allTeams && !access.teamIds.includes(record.teamId))
          throw Error('SUPPORT_ACCESS_DENIED');
        if (record.status === 'NEW' && record.assigneeId) record.status = 'OPEN';
        if (input.relatedCaseId) {
          const related = await this.repository.get(input.relatedCaseId, access, tx);
          if (!related || related.studentId !== record.studentId || related.id === record.id)
            throw Error('SUPPORT_DUPLICATE_LINK_INVALID');
          await this.repository.linkDuplicate(record.id, related.id, access.actorId, tx);
        }
        this.recordBreach(record, now);
        await this.repository.change(
          record,
          current.version,
          this.event(id, access.actorId, 'CASE_CHANGED', now, {
            previousStatus: current.status,
            status: record.status,
            teamId: record.teamId,
            assigneeId: record.assigneeId,
            priority: record.priority,
            reason: input.reason,
          }),
          tx,
          request,
        );
        return { record, replayed: false };
      },
      (result) => !result.replayed,
    );
  }
  async studentClose(
    id: string,
    expectedVersion: number,
    access: SupportAccess,
    context: SupportCommandContext,
  ) {
    await this.requireReady();
    this.assertActor(access, context);
    if (access.kind !== 'STUDENT') throw Error('SUPPORT_ACCESS_DENIED');
    const request = command('student-close:' + id, { expectedVersion }, context);
    return this.atomic.execute(
      {
        domain: 'STUDENT_SUPPORT',
        aggregateType: 'SUPPORT_CASE',
        aggregateId: id,
        action: 'SUPPORT_CASE_CLOSED_BY_STUDENT',
        context,
        outbox: {
          eventType: 'StudentSupportNotificationRequested',
          payload: { caseId: id, audience: 'TEAM', publicEvent: 'STATUS_CHANGED' },
        },
      },
      async (tx) => {
        const replay = await this.repository.replayCommand(access, request, tx);
        if (replay) return { record: replay, replayed: true };
        const current = await this.repository.get(id, access, tx);
        if (!current) throw Error('SUPPORT_CASE_NOT_FOUND');
        if (current.version !== expectedVersion) throw Error('SUPPORT_VERSION_CONFLICT');
        if (['CLOSED', 'CANCELLED'].includes(current.status))
          throw Error('SUPPORT_TRANSITION_INVALID');
        const now = this.now().toISOString(),
          record = {
            ...current,
            status: current.status === 'RESOLVED' ? ('CLOSED' as const) : ('CANCELLED' as const),
            closedAt: now,
            version: current.version + 1,
            updatedAt: now,
          };
        this.recordBreach(record, now);
        await this.repository.change(
          record,
          current.version,
          this.event(id, access.actorId, 'STUDENT_CLOSED', now, { status: record.status }),
          tx,
          request,
        );
        return { record, replayed: false };
      },
      (result) => !result.replayed,
    );
  }
  private event(
    caseId: string,
    actorId: string,
    type: string,
    createdAt: string,
    data: SupportEvent['data'],
  ): SupportEvent {
    return { id: randomUUID(), caseId, actorId, type, data, createdAt };
  }
  private assertActor(access: SupportAccess, context: SupportCommandContext) {
    if (!access.actorId || access.actorId !== context.actorId) throw Error('SUPPORT_ACCESS_DENIED');
  }
  private recordBreach(record: SupportCase, now: string) {
    if (
      (!record.firstPublicReplyAt && record.firstReplyDueAt && record.firstReplyDueAt < now) ||
      (record.firstPublicReplyAt &&
        record.firstReplyDueAt &&
        record.firstPublicReplyAt > record.firstReplyDueAt) ||
      (!record.slaPausedAt &&
        record.resolutionDueAt &&
        record.resolutionDueAt < (record.resolvedAt ?? now))
    )
      record.slaBreached = true;
  }
  private pauseClock(record: SupportCase, now: string) {
    if (
      !record.slaSnapshot?.pauseWaitingForStudent ||
      record.slaPausedAt ||
      !record.resolutionDueAt
    )
      return;
    this.recordBreach(record, now);
    record.slaRemainingMinutes = supportBusinessMinutesBetween(
      new Date(now),
      new Date(record.resolutionDueAt),
      record.slaSnapshot.calendar,
    );
    record.slaPausedAt = now;
  }
  private resumeClock(record: SupportCase, now: string) {
    if (!record.slaPausedAt || !record.slaSnapshot || record.slaRemainingMinutes === null) return;
    record.resolutionDueAt = supportBusinessDeadline(
      new Date(now),
      record.slaRemainingMinutes,
      record.slaSnapshot.calendar,
    );
    record.slaPausedAt = null;
    record.slaRemainingMinutes = null;
  }
}

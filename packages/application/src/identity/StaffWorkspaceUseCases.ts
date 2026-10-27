import { randomBytes } from 'node:crypto';
import type { IStaffWorkspaceRepository, StaffDraft } from '@manaratak/domain';
import type {
  AtomicDomainMutationCoordinator,
  AtomicMutationRequestContext,
} from '../event-foundation/use-cases/AtomicDomainMutationCoordinator';

/** Drafts never provision identities, assign roles, activate staff or suspend student accounts. */
export class StaffWorkspaceUseCases {
  constructor(
    private readonly repository: IStaffWorkspaceRepository,
    private readonly atomic: AtomicDomainMutationCoordinator,
  ) {}
  readiness() {
    return this.repository.readiness();
  }
  async requireReady() {
    if (!(await this.readiness()).ready) throw Error('STAFF_SCHEMA_NOT_READY');
  }
  async list(query: Parameters<IStaffWorkspaceRepository['list']>[0]) {
    await this.requireReady();
    return this.repository.list(query);
  }
  async get(id: string) {
    await this.requireReady();
    const member = await this.repository.get(id);
    if (!member) throw Error('STAFF_NOT_FOUND');
    return member;
  }
  async organization() {
    await this.requireReady();
    return this.repository.organization();
  }
  async events(query: Parameters<IStaffWorkspaceRepository['events']>[0]) {
    await this.requireReady();
    return this.repository.events(query);
  }
  async createDraft(input: StaffDraft, context: AtomicMutationRequestContext) {
    await this.requireReady();
    if (
      !context.actorId ||
      !input.reason.trim() ||
      !['EMPLOYEE', 'CONTRACTOR', 'VOLUNTEER', 'SERVICE'].includes(input.kind)
    )
      throw Error('STAFF_DRAFT_INVALID');
    if (
      (!input.identityId && (!input.displayName?.trim() || !input.email?.trim())) ||
      (input.identityId && (input.displayName || input.email))
    )
      throw Error('STAFF_IDENTITY_SOURCE_REQUIRED');
    if (
      (input.startsAt && !Number.isFinite(Date.parse(input.startsAt))) ||
      (input.endsAt &&
        (!Number.isFinite(Date.parse(input.endsAt)) ||
          !input.startsAt ||
          Date.parse(input.endsAt) <= Date.parse(input.startsAt)))
    )
      throw Error('STAFF_DATES_INVALID');
    const publicId = 'EMP-' + randomBytes(6).toString('hex').toUpperCase();
    await this.atomic.execute(
      {
        domain: 'STAFF',
        aggregateType: 'STAFF_MEMBERSHIP',
        aggregateId: input.id,
        action: 'STAFF_DRAFT_CREATED',
        context,
        auditMetadata: { kind: input.kind, status: 'DRAFT' }, // Never copy proposed email/name into audit or outbox.
      },
      async (tx) => {
        const structure = await this.repository.organization(tx);
        if (
          input.departmentId &&
          !structure.departments.some((d) => d.id === input.departmentId && d.status === 'ACTIVE')
        )
          throw Error('STAFF_DEPARTMENT_INVALID');
        const title = input.jobTitleId
          ? structure.titles.find((t) => t.id === input.jobTitleId && t.status === 'ACTIVE')
          : undefined;
        if (
          input.jobTitleId &&
          (!title || (title.departmentId && title.departmentId !== input.departmentId))
        )
          throw Error('STAFF_TITLE_DEPARTMENT_MISMATCH');
        if (input.managerId) {
          const manager = await this.repository.get(input.managerId, tx);
          if (
            !manager ||
            manager.status !== 'ACTIVE' ||
            manager.id === input.id ||
            (input.identityId && manager.identityId === input.identityId)
          )
            throw Error('STAFF_MANAGER_INVALID');
        }
        if (input.identityId && !(await this.repository.eligibleIdentity(input.identityId, tx)))
          throw Error('STAFF_IDENTITY_NOT_ELIGIBLE');
        await this.repository.saveDraft(input, publicId, context.actorId, tx);
        await this.repository.recordEvent(
          {
            membershipId: input.id,
            eventType: 'DRAFT_CREATED',
            actorId: context.actorId,
            reason: input.reason,
            correlationId: context.correlationId,
          },
          tx,
        );
      },
    );
    return this.get(input.id);
  }
  async cancelDraft(
    id: string,
    version: number,
    reason: string,
    context: AtomicMutationRequestContext,
  ) {
    await this.requireReady();
    if (reason.trim().length < 3) throw Error('STAFF_REASON_REQUIRED');
    await this.atomic.execute(
      {
        domain: 'STAFF',
        aggregateType: 'STAFF_MEMBERSHIP',
        aggregateId: id,
        action: 'STAFF_DRAFT_CANCELLED',
        context,
      },
      async (tx) => {
        if (!(await this.repository.cancelDraft(id, version, tx)))
          throw Error('STAFF_STALE_OR_NOT_DRAFT');
        await this.repository.recordEvent(
          {
            membershipId: id,
            eventType: 'DRAFT_CANCELLED',
            actorId: context.actorId,
            reason,
            correlationId: context.correlationId,
          },
          tx,
        );
      },
    );
    return this.get(id);
  }
  async department(
    input: Parameters<IStaffWorkspaceRepository['saveDepartment']>[0],
    reason: string,
    context: AtomicMutationRequestContext,
  ) {
    await this.requireReady();
    await this.atomic.execute(
      {
        domain: 'STAFF',
        aggregateType: 'STAFF_DEPARTMENT',
        aggregateId: input.id,
        action: 'STAFF_DEPARTMENT_SAVED',
        context,
        auditMetadata: { reason },
      },
      async (tx) => {
        const structure = await this.repository.organization(tx);
        const parents = new Map(structure.departments.map((row) => [row.id, row.parentId]));
        let parent: string | null | undefined = input.parentId;
        const visited = new Set([input.id]);
        while (parent) {
          if (visited.has(parent)) throw Error('STAFF_DEPARTMENT_CYCLE');
          visited.add(parent);
          if (!parents.has(parent)) throw Error('STAFF_DEPARTMENT_INVALID');
          parent = parents.get(parent);
        }
        if (reason.trim().length < 3) throw Error('STAFF_REASON_REQUIRED');
        await this.repository.saveDepartment(input, tx);
      },
    );
    return this.organization();
  }
  async title(
    input: Parameters<IStaffWorkspaceRepository['saveTitle']>[0],
    reason: string,
    context: AtomicMutationRequestContext,
  ) {
    await this.requireReady();
    await this.atomic.execute(
      {
        domain: 'STAFF',
        aggregateType: 'STAFF_JOB_TITLE',
        aggregateId: input.id,
        action: 'STAFF_TITLE_SAVED',
        context,
        auditMetadata: { reason },
      },
      async (tx) => {
        const structure = await this.repository.organization(tx);
        if (
          input.departmentId &&
          !structure.departments.some((d) => d.id === input.departmentId && d.status === 'ACTIVE')
        )
          throw Error('STAFF_DEPARTMENT_INVALID');
        if (reason.trim().length < 3) throw Error('STAFF_REASON_REQUIRED');
        await this.repository.saveTitle(input, tx);
      },
    );
    return this.organization();
  }
}

import { createHash, createHmac } from 'node:crypto';
import {
  STAFF_CHANGE_ACTIONS,
  type IStaffLifecycleRepository,
  type StaffChangeAction,
  type StaffChangePayload,
  type StaffChangeRequest,
  type StaffLifecycleSnapshot,
} from '@manaratak/domain';
import type {
  AtomicDomainMutationCoordinator,
  AtomicMutationRequestContext,
} from '../event-foundation/use-cases/AtomicDomainMutationCoordinator';

const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function reason(value: string) {
  if (value.trim().length < 3 || value.length > 1000) throw Error('STAFF_REASON_REQUIRED');
}
export class StaffLifecycleUseCases {
  constructor(
    private readonly repository: IStaffLifecycleRepository,
    private readonly atomic: AtomicDomainMutationCoordinator,
    private readonly secret?: string,
    private readonly now = () => new Date(),
  ) {}
  async readiness() {
    return {
      ...(await this.repository.readiness()),
      tokenService: !!this.secret && this.secret.length >= 32,
      externalDelivery: false as const,
    };
  }
  async requireReady() {
    const r = await this.readiness();
    if (!r.ready || !r.tokenService) throw Error('STAFF_LIFECYCLE_NOT_READY');
  }
  async snapshot(id: string) {
    await this.requireReady();
    return this.repository.snapshot(id);
  }
  async invitations(limit: number, cursor?: string) {
    await this.requireReady();
    return this.repository.listInvitations(limit, cursor);
  }
  async changes(actorId: string, limit: number, cursor?: string) {
    await this.requireReady();
    return this.repository.listChanges(actorId, limit, cursor);
  }
  private token(id: string) {
    if (!this.secret || this.secret.length < 32) throw Error('STAFF_LIFECYCLE_NOT_READY');
    return createHmac('sha256', this.secret)
      .update('MANARATAK:STAFF_INVITATION:v1:' + id)
      .digest('base64url');
  }
  async invite(
    input: { id: string; membershipId: string; version: number; reason: string },
    context: AtomicMutationRequestContext,
  ) {
    await this.requireReady();
    reason(input.reason);
    const commandHash = hash([input, context.actorId]);
    const token = this.token(input.id);
    await this.atomic.execute(
      {
        domain: 'STAFF',
        aggregateType: 'STAFF_MEMBERSHIP',
        aggregateId: input.membershipId,
        action: 'STAFF_INVITATION_ISSUED',
        context,
      },
      async (tx) => {
        await this.repository.lock(tx);
        await this.repository.assertActor(context.actorId, tx);
        const existing = await this.repository.invitation(input.id, tx);
        if (existing) {
          if (
            existing.tokenHash !== hash(token) ||
            existing.commandHash !== commandHash ||
            existing.issuedBy !== context.actorId ||
            existing.revokedAt ||
            existing.acceptedAt ||
            Date.parse(existing.expiresAt) <= this.now().getTime()
          )
            throw Error('STAFF_INVITATION_CONFLICT');
          return false;
        }
        const { member } = await this.repository.snapshot(input.membershipId, tx);
        if (
          member.status !== 'DRAFT' ||
          member.kind === 'SERVICE' ||
          member.version !== input.version ||
          member.identityId === context.actorId
        )
          throw Error('STAFF_DRAFT_CONFLICT');
        if (!member.email) throw Error('STAFF_INVITATION_EMAIL_REQUIRED');
        await this.repository.issue(
          {
            id: input.id,
            membershipId: member.id,
            memberVersion: member.version,
            identityId: member.identityId,
            email: member.email.trim().toLowerCase(),
            tokenHash: hash(token),
            issuedBy: context.actorId,
            commandHash,
            expiresAt: new Date(this.now().getTime() + 48 * 3600000).toISOString(),
            acceptedAt: null,
            acceptedBy: null,
            revokedAt: null,
            version: 1,
            createdAt: this.now().toISOString(),
          },
          tx,
        );
        return true;
      },
      (changed) => changed,
    );
    // Only the authenticated issuer receives this response. Never persist it in HTTP replay/audit/outbox stores.
    return { id: input.id, token, delivery: 'MANUAL_SECURE_HANDOFF' as const };
  }
  async revoke(
    input: { id: string; version: number; reason: string },
    context: AtomicMutationRequestContext,
  ) {
    await this.requireReady();
    reason(input.reason);
    await this.atomic.execute(
      {
        domain: 'STAFF',
        aggregateType: 'STAFF_INVITATION',
        aggregateId: input.id,
        action: 'STAFF_INVITATION_REVOKED',
        context,
      },
      async (tx) => {
        await this.repository.lock(tx);
        await this.repository.assertActor(context.actorId, tx);
        await this.repository.revoke(input.id, input.version, context.actorId, input.reason, tx);
      },
    );
  }
  async accept(
    input: { id: string; token: string; confirm: true },
    context: AtomicMutationRequestContext,
  ) {
    await this.requireReady();
    if (!input.confirm || !context.actorId || input.token.length !== 43)
      throw Error('STAFF_INVITATION_DENIED');
    await this.atomic.execute(
      {
        domain: 'STAFF',
        aggregateType: 'STAFF_INVITATION',
        aggregateId: input.id,
        action: 'STAFF_INVITATION_ACCEPTED',
        context,
      },
      async (tx) => {
        await this.repository.lock(tx);
        await this.repository.accept(
          { id: input.id, tokenHash: hash(input.token), actorId: context.actorId },
          tx,
        );
      },
    );
    return { accepted: true, activated: false };
  }
  private validateChange(
    action: StaffChangeAction,
    snapshot: StaffLifecycleSnapshot,
    actorId: string,
  ) {
    const m = snapshot.member;
    if (!m.identityId || m.identityId === actorId || m.kind === 'SERVICE')
      throw Error('STAFF_CHANGE_DENIED');
    const allowed: Record<StaffChangeAction, string[]> = {
      ACTIVATE: ['DRAFT'],
      RESUME: ['SUSPENDED'],
      SUSPEND: ['ACTIVE'],
      OFFBOARD: ['ACTIVE', 'SUSPENDED'],
      TRANSFER: ['ACTIVE'],
    };
    if (!allowed[action].includes(m.status)) throw Error('STAFF_CHANGE_CONFLICT');
    if (
      ['ACTIVATE', 'RESUME'].includes(action) &&
      (!snapshot.accepted ||
        !snapshot.identityEligible ||
        !snapshot.mfaEnrolled ||
        (m.startsAt && Date.parse(m.startsAt) > this.now().getTime()) ||
        (m.endsAt && Date.parse(m.endsAt) <= this.now().getTime()))
    )
      throw Error('STAFF_ACTIVATION_PREREQUISITES');
    if (
      ['OFFBOARD', 'SUSPEND', 'TRANSFER'].includes(action) &&
      Object.values(snapshot.pending).some((n) => n > 0)
    )
      throw Error('STAFF_HANDOVER_REQUIRED');
  }
  async request(
    input: {
      id: string;
      membershipId: string;
      version: number;
      action: StaffChangeAction;
      payload: StaffChangePayload;
      reason: string;
    },
    context: AtomicMutationRequestContext,
  ) {
    await this.requireReady();
    reason(input.reason);
    if (!(STAFF_CHANGE_ACTIONS as readonly string[]).includes(input.action))
      throw Error('STAFF_CHANGE_INVALID');
    let created = false;
    return this.atomic.execute(
      {
        domain: 'STAFF',
        aggregateType: 'STAFF_MEMBERSHIP',
        aggregateId: input.membershipId,
        action: 'STAFF_CHANGE_REQUESTED',
        context,
      },
      async (tx) => {
        await this.repository.lock(tx);
        await this.repository.assertActor(context.actorId, tx);
        const existing = await this.repository.request(input.id, tx);
        if (existing) {
          if (
            existing.membershipId !== input.membershipId ||
            existing.memberVersion !== input.version ||
            existing.action !== input.action ||
            existing.requestedBy !== context.actorId ||
            JSON.stringify(existing.payload) !== JSON.stringify(input.payload) ||
            existing.reason !== input.reason
          )
            throw Error('STAFF_CHANGE_CONFLICT');
          return existing;
        }
        const snapshot = await this.repository.snapshot(input.membershipId, tx);
        this.validateChange(input.action, snapshot, context.actorId);
        if (snapshot.member.version !== input.version) throw Error('STAFF_CHANGE_CONFLICT');
        const row: StaffChangeRequest = {
          id: input.id,
          membershipId: input.membershipId,
          memberVersion: input.version,
          action: input.action,
          payload: input.payload,
          snapshotHash: snapshot.hash,
          reason: input.reason,
          requestedBy: context.actorId,
          approvedBy: null,
          approvedAt: null,
          usedAt: null,
          expiresAt: new Date(this.now().getTime() + 30 * 60000).toISOString(),
          version: 1,
        };
        await this.repository.saveRequest(row, tx);
        created = true;
        return row;
      },
      () => created,
    );
  }
  async approve(id: string, version: number, context: AtomicMutationRequestContext) {
    await this.requireReady();
    await this.atomic.execute(
      {
        domain: 'STAFF',
        aggregateType: 'STAFF_CHANGE',
        aggregateId: id,
        action: 'STAFF_CHANGE_APPROVED',
        context,
      },
      async (tx) => {
        await this.repository.lock(tx);
        await this.repository.assertActor(context.actorId, tx);
        const request = await this.repository.request(id, tx);
        if (
          !request ||
          request.requestedBy === context.actorId ||
          request.usedAt ||
          request.approvedAt ||
          Date.parse(request.expiresAt) <= this.now().getTime()
        )
          throw Error('STAFF_APPROVAL_DENIED');
        const snapshot = await this.repository.snapshot(request.membershipId, tx);
        this.validateChange(request.action, snapshot, context.actorId);
        if (snapshot.hash !== request.snapshotHash) throw Error('STAFF_CHANGE_CONFLICT');
        await this.repository.approve(id, version, context.actorId, tx);
      },
    );
  }
  async apply(id: string, version: number, context: AtomicMutationRequestContext) {
    await this.requireReady();
    await this.atomic.execute(
      {
        domain: 'STAFF',
        aggregateType: 'STAFF_CHANGE',
        aggregateId: id,
        action: 'STAFF_CHANGE_APPLIED',
        context,
      },
      async (tx) => {
        await this.repository.lock(tx);
        const request = await this.repository.request(id, tx);
        if (
          !request ||
          request.requestedBy !== context.actorId ||
          !request.approvedBy ||
          request.approvedBy === context.actorId ||
          !request.approvedAt ||
          request.usedAt ||
          request.version !== version ||
          Date.parse(request.expiresAt) <= this.now().getTime()
        )
          throw Error('STAFF_APPROVAL_REQUIRED');
        await this.repository.assertActor(context.actorId, tx);
        await this.repository.assertActor(request.approvedBy, tx);
        const snapshot = await this.repository.snapshot(request.membershipId, tx);
        this.validateChange(request.action, snapshot, context.actorId);
        this.validateChange(request.action, snapshot, request.approvedBy);
        if (
          snapshot.hash !== request.snapshotHash ||
          snapshot.member.version !== request.memberVersion
        )
          throw Error('STAFF_CHANGE_CONFLICT');
        if (['OFFBOARD', 'SUSPEND'].includes(request.action))
          await this.repository.assertRecoveryAdmin(snapshot.member.identityId!, tx);
        await this.repository.apply(request, tx);
      },
    );
    return { applied: true };
  }
}

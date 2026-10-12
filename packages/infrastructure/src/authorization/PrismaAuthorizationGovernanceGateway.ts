import { Prisma, type PrismaClient } from '@prisma/client';
import {
  validateDutyPolicy,
  validateDutyException,
  type AtomicPersistenceContext,
  type DutyPolicy,
  type DutyException,
} from '@manaratak/domain';
import type { AccessReview, IAuthorizationGovernanceGateway } from '@manaratak/application';
import { DUTY_POLICY_ID, PrismaDutyGuard } from './PrismaDutyGuard';

export class PrismaAuthorizationGovernanceGateway implements IAuthorizationGovernanceGateway {
  constructor(private readonly db: PrismaClient) {}
  getPolicy() {
    return new PrismaDutyGuard(this.db).policy();
  }
  preview(principalId: string, roleId: string) {
    return new PrismaDutyGuard(this.db).preview(principalId, roleId);
  }
  private client(context: AtomicPersistenceContext): PrismaClient {
    const tx = (
      context as AtomicPersistenceContext & { transactionClient?: Prisma.TransactionClient }
    ).transactionClient;
    if (!context.boundaryId || !tx)
      throw new Error('AUTHORIZATION_GOVERNANCE_TRANSACTION_REQUIRED');
    return tx as unknown as PrismaClient;
  }
  async savePolicy(
    input: DutyPolicy,
    expectedRevision: string | null,
    context: AtomicPersistenceContext,
  ) {
    const db = this.client(context),
      guard = new PrismaDutyGuard(db);
    await guard.lock();
    const current = await guard.policy();
    if (current.revision !== expectedRevision) throw new Error('DUTY_POLICY_REVISION_CONFLICT');
    const policy = validateDutyPolicy(input);
    const data = {
      name: 'Separation of duties',
      description: 'Administrator configured global permission pairs',
      ruleType: 'SEPARATION_OF_DUTIES',
      ruleConfiguration: JSON.stringify(policy),
      updatedAt: new Date(Math.max(Date.now(), Date.parse(expectedRevision ?? '') + 1 || 0)),
    };
    if (current.revision) await db.policyRecord.update({ where: { id: DUTY_POLICY_ID }, data });
    else await db.policyRecord.create({ data: { id: DUTY_POLICY_ID, ...data } });
    // Configuration cannot silently invalidate existing grants; rollback the policy on conflict.
    let cursor: string | undefined;
    for (;;) {
      const rows = await db.identityRecord.findMany({
        where: cursor ? { id: { gt: cursor } } : {},
        orderBy: { id: 'asc' },
        take: 100,
        select: { id: true },
      });
      for (const row of rows) await guard.assertPrincipal(row.id);
      if (rows.length < 100) break;
      cursor = rows.at(-1)!.id;
    }
    // Emergency grants may reference a principal without a directory row in legacy data.
    cursor = undefined;
    for (;;) {
      const rows: Array<{ id: string; principalId: string }> =
        await db.adminEmergencyAccessRecord.findMany({
          where: {
            revokedAt: null,
            expiresAt: { gt: new Date() },
            ...(cursor ? { id: { gt: cursor } } : {}),
          },
          orderBy: { id: 'asc' },
          take: 100,
          select: { id: true, principalId: true },
        });
      for (const row of rows) await guard.assertPrincipal(row.principalId);
      if (rows.length < 100) break;
      cursor = rows.at(-1)!.id;
    }
  }
  async saveException(exception: DutyException, context: AtomicPersistenceContext) {
    const db = this.client(context),
      guard = new PrismaDutyGuard(db);
    await guard.lock();
    validateDutyException(exception, new Date());
    const current = await guard.policy();
    if (
      current.revision !== exception.policyRevision ||
      exception.pairIds.some((id) => !current.policy.pairs.some((pair) => pair.id === id))
    )
      throw new Error('DUTY_POLICY_REVISION_CONFLICT');
    await db.policyRecord.create({
      data: {
        id: 'duty-exception:' + exception.id,
        name: 'Time-bounded duty exception',
        description: exception.reason,
        ruleType: 'DUTY_EXCEPTION',
        ruleConfiguration: JSON.stringify(exception),
      },
    });
  }
  async exceptions(limit: number, cursor?: string) {
    const rows = await this.db.policyRecord.findMany({
      where: { ruleType: 'DUTY_EXCEPTION', ...(cursor ? { id: { gt: cursor } } : {}) },
      orderBy: { id: 'asc' },
      take: limit + 1,
    });
    return {
      items: rows.slice(0, limit).map((row) => JSON.parse(row.ruleConfiguration) as DutyException),
      nextCursor: rows.length > limit ? rows[limit - 1].id : null,
    };
  }
  async revokeException(
    id: string,
    actorId: string,
    reason: string,
    context: AtomicPersistenceContext,
  ) {
    const db = this.client(context);
    await new PrismaDutyGuard(db).lock();
    const row = await db.policyRecord.findUnique({ where: { id: 'duty-exception:' + id } });
    if (!row || row.ruleType !== 'DUTY_EXCEPTION') throw new Error('DUTY_EXCEPTION_NOT_FOUND');
    const exception = JSON.parse(row.ruleConfiguration) as DutyException;
    if (exception.revokedAt) return false;
    await db.policyRecord.update({
      where: { id: row.id },
      data: {
        ruleConfiguration: JSON.stringify({
          ...exception,
          revokedAt: new Date().toISOString(),
          revokedBy: actorId,
          revocationReason: reason,
        }),
      },
    });
    return true;
  }
  private async subject(db: PrismaClient, principalId: string) {
    const normal = await db.roleAssignmentRecord.findMany({
      where: { identityId: principalId },
      take: 201,
      select: { roleId: true },
    });
    const emergency = await db.adminEmergencyAccessRecord.findMany({
      where: { principalId, revokedAt: null, expiresAt: { gt: new Date() } },
      take: 201,
      select: { roleId: true },
    });
    const ids = [...new Set([...normal, ...emergency].map((row) => row.roleId))];
    if (normal.length > 200 || emergency.length > 200 || ids.length > 200)
      throw new Error('ACCESS_REVIEW_SUBJECT_LIMIT');
    const roles = await db.roleRecord.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
      orderBy: { id: 'asc' },
    });
    return {
      roles: ids
        .sort()
        .map((id) => ({ id, name: roles.find((role) => role.id === id)?.name ?? id })),
    };
  }
  reviewSubject(principalId: string) {
    return this.subject(this.db, principalId);
  }
  async saveReview(review: AccessReview, context: AtomicPersistenceContext) {
    const db = this.client(context);
    await new PrismaDutyGuard(db).lock();
    const actual = (await this.subject(db, review.principalId)).roles;
    if (
      JSON.stringify([...new Set(review.roleIds)].sort()) !==
      JSON.stringify([...new Set(actual.map((role) => role.id))].sort())
    )
      throw new Error('ACCESS_REVIEW_STALE');
    await db.policyRecord.create({
      data: {
        id: 'access-review:' + review.id,
        name: 'Access review',
        description: review.reason,
        ruleType: 'ACCESS_REVIEW',
        ruleConfiguration: JSON.stringify(review),
      },
    });
  }
  async listReviews(input: { limit: number; cursor?: string; dueOnly?: boolean }) {
    const limit = Math.min(100, Math.max(1, input.limit));
    // One current review per principal; superseded records remain immutable history.
    const rows = await this.db.$queryRaw<
      Array<{ id: string; principalId: string; ruleConfiguration: string }>
    >(Prisma.sql`
      SELECT * FROM (
        SELECT DISTINCT ON ("ruleConfiguration"::jsonb->>'principalId') id,"ruleConfiguration",
          "ruleConfiguration"::jsonb->>'principalId' AS "principalId"
        FROM "PolicyRecord" WHERE "ruleType"='ACCESS_REVIEW'
        ORDER BY "ruleConfiguration"::jsonb->>'principalId',("ruleConfiguration"::jsonb->>'reviewedAt')::timestamptz DESC,id DESC
      ) latest WHERE "principalId">${input.cursor ?? ''}
        AND (${!input.dueOnly} OR ("ruleConfiguration"::jsonb->>'nextReviewAt')::timestamptz<=${new Date()})
      ORDER BY "principalId" LIMIT ${limit + 1}`);
    return {
      items: rows.slice(0, limit).map((row) => JSON.parse(row.ruleConfiguration) as AccessReview),
      nextCursor: rows.length > limit ? rows[limit - 1].principalId : null,
    };
  }
}

import { Prisma, type PrismaClient } from '@prisma/client';
import type { AtomicPersistenceContext } from '@absheer/domain';
import {
  governanceApprovalDigest,
  type GovernanceApproval,
  type GovernanceApprovalScope,
  type IGovernanceApprovalGateway,
} from '@absheer/application';
export class PrismaGovernanceApprovalGateway implements IGovernanceApprovalGateway {
  constructor(private readonly db: PrismaClient) {}
  private tx(context: AtomicPersistenceContext) {
    const tx = (
      context as AtomicPersistenceContext & { transactionClient?: Prisma.TransactionClient }
    ).transactionClient;
    if (!context.boundaryId || !tx) throw new Error('GOVERNANCE_APPROVAL_TRANSACTION_REQUIRED');
    return tx;
  }
  async list(actorId: string, limit: number, cursor?: string) {
    const rows = await this.db.$queryRaw<Array<{ id: string; ruleConfiguration: string }>>(
      Prisma.sql`SELECT id,"ruleConfiguration" FROM "PolicyRecord" WHERE "ruleType"='GOVERNANCE_APPROVAL' AND ("ruleConfiguration"::jsonb->>'requestedBy'=${actorId} OR "ruleConfiguration"::jsonb->>'approverId'=${actorId}) AND id>${cursor ?? ''} ORDER BY id LIMIT ${limit + 1}`,
    );
    return {
      items: rows
        .slice(0, limit)
        .map((row) => JSON.parse(row.ruleConfiguration) as GovernanceApproval),
      nextCursor: rows.length > limit ? rows[limit - 1].id : null,
    };
  }
  async create(approval: GovernanceApproval, context: AtomicPersistenceContext) {
    await this.tx(context).policyRecord.create({
      data: {
        id: 'governance-approval:' + approval.id,
        name: 'Independent governance approval',
        description: approval.scope,
        ruleType: 'GOVERNANCE_APPROVAL',
        ruleConfiguration: JSON.stringify(approval),
      },
    });
  }
  private async locked(id: string, context: AtomicPersistenceContext) {
    const tx = this.tx(context);
    await tx.$queryRaw(
      Prisma.sql`SELECT id FROM "PolicyRecord" WHERE id=${'governance-approval:' + id} FOR UPDATE`,
    );
    const row = await tx.policyRecord.findUnique({ where: { id: 'governance-approval:' + id } });
    if (!row || row.ruleType !== 'GOVERNANCE_APPROVAL')
      throw new Error('GOVERNANCE_APPROVAL_REQUIRED');
    const approval = JSON.parse(row.ruleConfiguration) as GovernanceApproval;
    if (
      !Number.isFinite(Date.parse(approval.expiresAt)) ||
      Date.parse(approval.expiresAt) <= Date.now() ||
      approval.usedAt ||
      approval.requestedBy === approval.approverId
    )
      throw new Error('GOVERNANCE_APPROVAL_REQUIRED');
    return { tx, row, approval };
  }
  async approve(id: string, actorId: string, context: AtomicPersistenceContext) {
    const { tx, row, approval } = await this.locked(id, context);
    if (approval.approverId !== actorId || approval.requestedBy === actorId)
      throw new Error('GOVERNANCE_APPROVAL_DENIED');
    if (!approval.approvedAt)
      await tx.policyRecord.update({
        where: { id: row.id },
        data: {
          ruleConfiguration: JSON.stringify({ ...approval, approvedAt: new Date().toISOString() }),
        },
      });
  }
  async consume(
    id: string,
    scope: GovernanceApprovalScope,
    payload: unknown,
    requestedBy: string,
    approverId: string,
    context: AtomicPersistenceContext,
  ) {
    const { tx, row, approval } = await this.locked(id, context);
    if (
      !approval.approvedAt ||
      approval.requestedBy !== requestedBy ||
      approval.approverId !== approverId ||
      approval.scope !== scope ||
      approval.digest !== governanceApprovalDigest(scope, payload)
    )
      throw new Error('GOVERNANCE_APPROVAL_REQUIRED');
    await tx.policyRecord.update({
      where: { id: row.id },
      data: {
        ruleConfiguration: JSON.stringify({ ...approval, usedAt: new Date().toISOString() }),
      },
    });
  }
}

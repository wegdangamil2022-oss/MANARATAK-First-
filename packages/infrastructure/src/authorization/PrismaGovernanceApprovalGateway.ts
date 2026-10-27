import { Prisma, type PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';
import type { AtomicPersistenceContext } from '@manaratak/domain';
import {
  governanceApprovalDigest,
  type GovernanceApproval,
  type GovernanceApprovalScope,
  type IGovernanceApprovalGateway,
} from '@manaratak/application';
export class PrismaGovernanceApprovalGateway implements IGovernanceApprovalGateway {
  constructor(private readonly db: PrismaClient) {}
  async get(id: string): Promise<GovernanceApproval | null> {
    const row = await this.db.policyRecord.findUnique({
      where: { id: 'governance-approval:' + id },
    });
    return row?.ruleType === 'GOVERNANCE_APPROVAL' ? JSON.parse(row.ruleConfiguration) : null;
  }
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
    if (scope === 'AUTHORIZATION_CHANGE') {
      const binding = (
        payload as {
          binding?: {
            role?: { id: string; revision: string };
            policies?: Array<{ id: string; revision: string | null; digest: string }>;
            identity?: {
              id: string;
              version: number;
              status: string;
              verified: boolean;
              accountState: string;
            };
            assignment?: { id: string; identityId: string; roleId: string; assignedAt: string };
            requiresActiveIdentity?: boolean;
          };
        }
      ).binding;
      if (!binding) throw Error('GOVERNANCE_APPROVAL_REQUIRED');
      if (binding.role) {
        await tx.$queryRaw(
          Prisma.sql`SELECT id FROM "RoleRecord" WHERE id=${binding.role.id} FOR UPDATE`,
        );
        const current = await tx.roleRecord.findUnique({ where: { id: binding.role.id } });
        if (!current || current.updatedAt.toISOString() !== binding.role.revision)
          throw Error('GOVERNANCE_APPROVAL_STALE');
      }
      for (const policy of binding.policies ?? []) {
        await tx.$queryRaw(
          Prisma.sql`SELECT id FROM "PolicyRecord" WHERE id=${policy.id} FOR SHARE`,
        );
        const current = await tx.policyRecord.findUnique({ where: { id: policy.id } });
        if (
          !current ||
          current.updatedAt.toISOString() !== policy.revision ||
          createHash('sha256')
            .update(JSON.stringify([current.ruleType, current.ruleConfiguration]))
            .digest('hex') !== policy.digest
        )
          throw Error('GOVERNANCE_APPROVAL_STALE');
      }
      if (binding.identity) {
        await tx.$queryRaw(
          Prisma.sql`SELECT id FROM "IdentityRecord" WHERE id=${binding.identity.id} FOR SHARE`,
        );
        await tx.$queryRaw(
          Prisma.sql`SELECT "identityId" FROM "UserRecord" WHERE "identityId"=${binding.identity.id} FOR SHARE`,
        );
        const current = await tx.identityRecord.findUnique({
          where: { id: binding.identity.id },
          include: { user: true, account: true },
        });
        if (
          !current ||
          current.version !== binding.identity.version ||
          current.status !== binding.identity.status ||
          current.account?.accessState !== binding.identity.accountState ||
          current.user?.isEmailVerified !== binding.identity.verified ||
          (binding.requiresActiveIdentity &&
            (current.status !== 'ACTIVE' ||
              current.account?.accessState !== 'Active' ||
              current.user?.isEmailVerified !== true))
        )
          throw Error('GOVERNANCE_APPROVAL_STALE');
      }
      if (binding.assignment) {
        await tx.$queryRaw(
          Prisma.sql`SELECT id FROM "RoleAssignmentRecord" WHERE id=${binding.assignment.id} FOR UPDATE`,
        );
        const current = await tx.roleAssignmentRecord.findUnique({
          where: { id: binding.assignment.id },
        });
        if (
          !current ||
          current.identityId !== binding.assignment.identityId ||
          current.roleId !== binding.assignment.roleId ||
          current.assignedAt.toISOString() !== binding.assignment.assignedAt
        )
          throw Error('GOVERNANCE_APPROVAL_STALE');
      }
    }
    await tx.policyRecord.update({
      where: { id: row.id },
      data: {
        ruleConfiguration: JSON.stringify({ ...approval, usedAt: new Date().toISOString() }),
      },
    });
  }
}

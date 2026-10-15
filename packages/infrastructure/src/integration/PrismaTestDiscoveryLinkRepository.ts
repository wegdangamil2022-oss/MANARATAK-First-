import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import type {
  ITestDiscoveryLinkRepository,
  TestDiscoveryOwner,
  TestDiscoveryLink,
} from '@manaratak/domain';
export abstract class PrismaTestDiscoveryLinkRepository implements ITestDiscoveryLinkRepository {
  constructor(protected readonly prisma: PrismaClient) {}
  abstract readonly ownerDomain: TestDiscoveryOwner;
  protected abstract table(client?: any): any;
  async find(ownerKey: string, testId: string): Promise<TestDiscoveryLink | null> {
    return this.table().findUnique({ where: { ownerKey_testId: { ownerKey, testId } } });
  }
  async listOwner(ownerKey: string, after?: string) {
    return this.page({ ownerKey }, after, 20);
  }
  async listApproved(testId: string, after: string | undefined, limit: number) {
    return this.page({ testId, status: 'APPROVED' }, after, limit);
  }
  private async page(scope: Record<string, string>, after: string | undefined, limit: number) {
    if (after) {
      const anchor = await this.table().findFirst({
        where: { ...scope, id: after },
        select: { id: true },
      });
      if (!anchor) throw new Error('TEST_DISCOVERY_CURSOR_INVALID');
    }
    const rows: TestDiscoveryLink[] = await this.table().findMany({
      where: { ...scope, ...(after ? { id: { gt: after } } : {}) },
      orderBy: { id: 'asc' },
      take: limit + 1,
    });
    const data = rows.slice(0, limit);
    return {
      data,
      hasMore: rows.length > limit,
      nextCursor: rows.length > limit ? data.at(-1)!.id : null,
    };
  }
  async propose(input: Parameters<ITestDiscoveryLinkRepository['propose']>[0]) {
    return this.prisma.$transaction(async (tx: any) => {
      const where = { ownerKey: input.ownerKey, testId: input.testId };
      const existing = await this.table(tx).findUnique({ where: { ownerKey_testId: where } });
      if ((existing?.version ?? 0) !== input.expectedVersion)
        throw new Error('TEST_DISCOVERY_VERSION_CONFLICT');
      const data = {
        ownerRevision: input.ownerRevision,
        testRevision: input.testRevision,
        status: 'PENDING',
        proposedBy: input.actorId,
        reviewedBy: null,
        reason: input.reason.trim(),
      };
      let row: TestDiscoveryLink;
      if (!existing)
        row = await this.table(tx).create({ data: { id: randomUUID(), ...where, ...data } });
      else {
        const changed = await this.table(tx).updateMany({
          where: { id: existing.id, version: input.expectedVersion },
          data: { ...data, version: { increment: 1 } },
        });
        if (changed.count !== 1) throw new Error('TEST_DISCOVERY_VERSION_CONFLICT');
        row = await this.table(tx).findUnique({ where: { id: existing.id } });
      }
      await this.audit(tx, row, input.actorId, 'TestDiscoveryProposed');
      return row;
    });
  }
  async review(input: Parameters<ITestDiscoveryLinkRepository['review']>[0]) {
    return this.prisma.$transaction(async (tx: any) => {
      const row = await this.table(tx).findUnique({
        where: { ownerKey_testId: { ownerKey: input.ownerKey, testId: input.testId } },
      });
      if (!row || row.version !== input.expectedVersion)
        throw new Error('TEST_DISCOVERY_VERSION_CONFLICT');
      if (
        input.status === 'APPROVED' &&
        (row.status !== 'PENDING' || row.proposedBy === input.actorId)
      )
        throw new Error('TEST_DISCOVERY_INDEPENDENT_REVIEW_REQUIRED');
      const changed = await this.table(tx).updateMany({
        where: { id: row.id, version: input.expectedVersion, status: row.status },
        data: {
          status: input.status,
          reviewedBy: input.actorId,
          reason: input.reason.trim(),
          version: { increment: 1 },
        },
      });
      if (changed.count !== 1) throw new Error('TEST_DISCOVERY_VERSION_CONFLICT');
      const fresh = await this.table(tx).findUnique({ where: { id: row.id } });
      await this.audit(
        tx,
        fresh,
        input.actorId,
        input.status === 'APPROVED' ? 'TestDiscoveryApproved' : 'TestDiscoveryRevoked',
      );
      return fresh as TestDiscoveryLink;
    });
  }
  private async audit(tx: any, row: TestDiscoveryLink, actorId: string, action: string) {
    const id = randomUUID();
    await tx.auditRecord.create({
      data: {
        id,
        reference: `test-discovery-${id}`,
        action,
        category: this.ownerDomain,
        severity: 'INFO',
        actorId,
        actorType: 'USER',
        targetId: row.ownerKey,
        targetType: this.ownerDomain,
        source: 'owner-test-discovery',
        timestamp: new Date(),
        contextMetadata: {
          testId: row.testId,
          version: row.version,
          status: row.status,
          ownerRevision: row.ownerRevision,
          testRevision: row.testRevision,
          reason: row.reason,
        },
      },
    });
  }
}

import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import {
  AtomicPersistenceContext,
  ITransactionalOutboxStore,
  OutboxClaimRequest,
  OutboxLeaseOwnership,
  OutboxProcessingState,
  SanitizedOutboxFailure,
  TransactionalOutboxEntry,
} from '@manaratak/domain';

type OutboxDelegate = {
  create(args: Record<string, unknown>): Promise<unknown>;
  findMany(args: Record<string, unknown>): Promise<any[]>;
  update(args: Record<string, unknown>): Promise<unknown>;
  updateMany(args: Record<string, unknown>): Promise<{ count: number }>;
};

type OutboxPrismaClient = Prisma.TransactionClient & { transactionalOutboxRecord: OutboxDelegate };
export interface PrismaAtomicPersistenceContext extends AtomicPersistenceContext { readonly transactionClient: Prisma.TransactionClient; }

export class PrismaTransactionalOutboxStore implements ITransactionalOutboxStore {
  public constructor(private readonly prisma: PrismaClient) {}

  public async appendInTransaction(entry: TransactionalOutboxEntry, context: AtomicPersistenceContext): Promise<void> {
    const client = this.transactionClient(context);
    await client.transactionalOutboxRecord.create({ data: this.toCreateData(entry) });
  }

  public async claimPendingBatch(request: OutboxClaimRequest): Promise<TransactionalOutboxEntry[]> {
    return this.prisma.$transaction(async transaction => {
      const client = transaction as OutboxPrismaClient;
      const domainFilter = request.domain ? Prisma.sql`AND "domain" = ${request.domain}` : Prisma.empty;
      const eventFilter = request.eventTypes?.length ? Prisma.sql`AND "eventType" IN (${Prisma.join([...request.eventTypes])})` : Prisma.empty;
      const candidates = await (transaction as any).$queryRaw(Prisma.sql`
        SELECT "id"
        FROM "TransactionalOutboxRecord"
        WHERE "state" IN ('PENDING', 'FAILED', 'PROCESSING')
          AND "availableAt" <= ${request.now}
          AND ("claimUntil" IS NULL OR "claimUntil" < ${request.now})
          ${domainFilter}
          ${eventFilter}
        ORDER BY "availableAt" ASC, "createdAt" ASC
        LIMIT ${request.batchSize}
        FOR UPDATE SKIP LOCKED
      `) as Array<{ id: string }>;
      const claimed: TransactionalOutboxEntry[] = [];
      for (const candidate of candidates) {
        const claimToken = randomUUID();
        const updated = await client.transactionalOutboxRecord.updateMany({
          where: {
            id: candidate.id,
            state: { in: [OutboxProcessingState.PENDING, OutboxProcessingState.FAILED, OutboxProcessingState.PROCESSING] },
            OR: [{ claimUntil: null }, { claimUntil: { lt: request.now } }],
          },
          data: { state: OutboxProcessingState.PROCESSING, claimedBy: request.workerId, claimToken, claimUntil: request.claimUntil },
        });
        if (updated.count !== 1) continue;
        const rows = await client.transactionalOutboxRecord.findMany({ where: { id: candidate.id }, take: 1 });
        if (rows[0]) claimed.push(this.toDomain(rows[0]));
      }
      return claimed;
    });
  }

  public async renewLease(id: string, ownership: OutboxLeaseOwnership, now: Date, newClaimUntil: Date): Promise<boolean> {
    const result = await this.delegate().updateMany({
      where: {
        id, state: OutboxProcessingState.PROCESSING,
        claimedBy: ownership.workerId, claimToken: ownership.leaseToken,
        claimUntil: { gt: now },
      },
      data: { claimUntil: newClaimUntil },
    });
    return result.count === 1;
  }

  public async markProcessed(id: string, ownership: OutboxLeaseOwnership, processedAt: Date): Promise<boolean> {
    const result = await this.delegate().updateMany({
      where: {
        id, state: OutboxProcessingState.PROCESSING,
        claimedBy: ownership.workerId, claimToken: ownership.leaseToken,
        claimUntil: { gt: processedAt },
      },
      data: { state: OutboxProcessingState.PROCESSED, processedAt, claimedBy: null, claimToken: null, claimUntil: null },
    });
    return result.count === 1;
  }

  public async markFailed(id: string, ownership: OutboxLeaseOwnership, failure: SanitizedOutboxFailure, nextAvailableAt: Date): Promise<boolean> {
    const result = await this.delegate().updateMany({
      where: {
        id, state: OutboxProcessingState.PROCESSING,
        claimedBy: ownership.workerId, claimToken: ownership.leaseToken,
        claimUntil: { gt: failure.failedAt },
      },
      data: {
        state: OutboxProcessingState.FAILED,
        attempts: { increment: 1 },
        availableAt: nextAvailableAt,
        claimedBy: null,
        claimToken: null,
        claimUntil: null,
        lastErrorCode: failure.code,
        lastErrorText: failure.message,
        lastFailedAt: failure.failedAt,
      },
    });
    return result.count === 1;
  }

  private delegate(client: PrismaClient | Prisma.TransactionClient = this.prisma): OutboxDelegate {
    const delegate = (client as unknown as { transactionalOutboxRecord?: OutboxDelegate }).transactionalOutboxRecord;
    if (!delegate) throw new Error('OUTBOX_PERSISTENCE_NOT_MIGRATED');
    return delegate;
  }

  private transactionClient(context: AtomicPersistenceContext): OutboxPrismaClient {
    const client = (context as Partial<PrismaAtomicPersistenceContext>).transactionClient;
    if (!client || !context.boundaryId) throw new Error('OUTBOX_ATOMIC_TRANSACTION_CONTEXT_REQUIRED');
    this.delegate(client);
    return client as OutboxPrismaClient;
  }

  private toCreateData(entry: TransactionalOutboxEntry): Record<string, unknown> {
    return {
      id: entry.id, eventType: entry.eventType, domain: entry.domain,
      aggregateType: entry.aggregate?.aggregateType, aggregateId: entry.aggregate?.aggregateId,
      payload: entry.payload, metadata: entry.metadata, correlationId: entry.correlationId, causationId: entry.causationId,
      createdAt: entry.createdAt, availableAt: entry.availableAt, state: entry.state, attempts: entry.attempts,
    };
  }

  private toDomain(record: any): TransactionalOutboxEntry {
    return {
      id: record.id, eventType: record.eventType, domain: record.domain,
      aggregate: record.aggregateType && record.aggregateId ? { domain: record.domain, aggregateType: record.aggregateType, aggregateId: record.aggregateId } : undefined,
      payload: record.payload as Record<string, unknown>, metadata: record.metadata as Record<string, unknown>,
      correlationId: record.correlationId ?? undefined, causationId: record.causationId ?? undefined,
      createdAt: record.createdAt, availableAt: record.availableAt, state: record.state as OutboxProcessingState, attempts: record.attempts,
      processedAt: record.processedAt ?? undefined,
      lastError: record.lastErrorCode && record.lastFailedAt ? { code: record.lastErrorCode, message: record.lastErrorText ?? '', failedAt: record.lastFailedAt } : undefined,
      ...(record.claimedBy && record.claimToken && record.claimUntil ? { lease: { workerId: record.claimedBy, leaseToken: record.claimToken, claimUntil: record.claimUntil } } : {}),
    };
  }
}

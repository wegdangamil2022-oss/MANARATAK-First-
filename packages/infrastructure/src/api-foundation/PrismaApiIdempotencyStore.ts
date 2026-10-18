import { randomUUID } from 'node:crypto';

export type ApiIdempotencyBeginDecision =
  | { kind: 'STARTED'; scopeHash: string; leaseToken: string }
  | { kind: 'REPLAY'; statusCode: number; responseBody: unknown }
  | { kind: 'CONFLICT' }
  | { kind: 'IN_PROGRESS' };

export interface ApiIdempotencyBeginInput {
  scopeHash: string;
  principalId: string;
  method: string;
  routeKey: string;
  keyHash: string;
  requestFingerprint: string;
  ttlSeconds: number;
  leaseSeconds: number;
}

/** Durable API command identity store. Uses a fenced lease so a stale request cannot
 * overwrite the terminal result after another worker legitimately reclaimed the key. */
export class PrismaApiIdempotencyStore {
  constructor(private readonly prisma: any) {}

  async begin(input: ApiIdempotencyBeginInput): Promise<ApiIdempotencyBeginDecision> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.beginAttempt(input);
      } catch (error: any) {
        // Retry the complete aborted transaction, including its initial read.
        // P2002 covers a competing insert of this scope; querying inside that
        // failed PostgreSQL transaction would itself fail with 25P02.
        if (attempt >= 4 || !['P2034', 'P2002'].includes(error?.code)) throw error;
      }
    }
  }

  private async beginAttempt(input: ApiIdempotencyBeginInput): Promise<ApiIdempotencyBeginDecision> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + input.ttlSeconds * 1000);
    const leaseExpiresAt = new Date(now.getTime() + input.leaseSeconds * 1000);
    const leaseToken = randomUUID();

    return this.prisma.$transaction(async (tx: any) => {
      let existing = await tx.apiIdempotencyRecord.findUnique({ where: { scopeHash: input.scopeHash } });

      if (existing && existing.expiresAt <= now) {
        await tx.apiIdempotencyRecord.deleteMany({
          where: { scopeHash: input.scopeHash, expiresAt: { lte: now } },
        });
        existing = null;
      }

      if (!existing) {
          await tx.apiIdempotencyRecord.create({
            data: {
              scopeHash: input.scopeHash,
              principalId: input.principalId,
              method: input.method,
              routeKey: input.routeKey,
              keyHash: input.keyHash,
              requestFingerprint: input.requestFingerprint,
              state: 'PROCESSING',
              leaseToken,
              leaseExpiresAt,
              expiresAt,
            },
          });
          return { kind: 'STARTED', scopeHash: input.scopeHash, leaseToken } as const;
      }

      if (!existing) throw new Error('API_IDEMPOTENCY_CONCURRENT_CREATE_UNRESOLVED');
      if (existing.requestFingerprint !== input.requestFingerprint) return { kind: 'CONFLICT' } as const;
      if (existing.state === 'COMPLETED') {
        return {
          kind: 'REPLAY',
          statusCode: existing.statusCode ?? 200,
          responseBody: existing.responseBody,
        } as const;
      }
      if (existing.leaseExpiresAt && existing.leaseExpiresAt > now) return { kind: 'IN_PROGRESS' } as const;

      const reclaimed = await tx.apiIdempotencyRecord.updateMany({
        where: {
          scopeHash: input.scopeHash,
          requestFingerprint: input.requestFingerprint,
          state: 'PROCESSING',
          OR: [{ leaseExpiresAt: null }, { leaseExpiresAt: { lte: now } }],
        },
        data: { leaseToken, leaseExpiresAt, expiresAt },
      });
      return reclaimed.count === 1
        ? { kind: 'STARTED', scopeHash: input.scopeHash, leaseToken } as const
        : { kind: 'IN_PROGRESS' } as const;
    }, { isolationLevel: 'Serializable' });
  }

  async complete(input: {
    scopeHash: string;
    leaseToken: string;
    statusCode: number;
    responseBody: unknown;
  }): Promise<void> {
    const updated = await this.prisma.apiIdempotencyRecord.updateMany({
      where: {
        scopeHash: input.scopeHash,
        leaseToken: input.leaseToken,
        state: 'PROCESSING',
      },
      data: {
        state: 'COMPLETED',
        statusCode: input.statusCode,
        responseBody: input.responseBody ?? null,
        completedAt: new Date(),
        leaseExpiresAt: null,
      },
    });
    if (updated.count !== 1) throw new Error('API_IDEMPOTENCY_STALE_LEASE_COMPLETION_REJECTED');
  }
}

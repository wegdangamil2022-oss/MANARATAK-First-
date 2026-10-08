import { describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaAuditRecordRepository } from '../../src/audit/PrismaAuditRecordRepository';
import { InMemoryAuditRecordRepository } from '../../src/audit/InMemoryAuditRecordRepository';
import { createAuditRecordFromDto } from '../../../application/src/audit/use-cases/AuditRecordFactory';

const timestamp = new Date('2026-10-01T12:00:00Z');
const record = (id: string, contextMetadata = {}, chainReference?: string) => createAuditRecordFromDto({
  id, reference: `AUD-${id}`, action: 'ROLE_ASSIGNED', category: 'AUTHORIZATION_MUTATION', severity: 'INFO',
  actorId: 'operator', actorType: 'IDENTITY', targetId: 'role', targetType: 'ROLE',
  source: 'admin-api', timestamp, contextMetadata, chainReference,
});

describe('bounded audit reference and timestamp verification', () => {
  it('caps both queries and resolves a predecessor outside the selected page', async () => {
    const findMany = vi.fn()
      .mockResolvedValueOnce([
        { id: 'new', reference: 'AUD-new', chainReference: 'AUD-old', timestamp },
        { id: 'extra', reference: 'AUD-extra', chainReference: null, timestamp },
      ])
      .mockResolvedValueOnce([{ reference: 'AUD-old', timestamp: new Date('2026-09-01T00:00:00Z') }]);
    const repository = new PrismaAuditRecordRepository({ auditRecord: { findMany } } as unknown as PrismaClient);
    const report = await repository.verifyIntegrity({ limit: 1, from: timestamp });
    expect(report).toMatchObject({ status: 'PASS', checkedRecords: 1, hasMore: true,
      scope: 'REFERENCE_LINKAGE_AND_TIMESTAMPS', cryptographicVerification: false,
      nextCursor: { timestamp, id: 'new' }, range: { from: timestamp, until: timestamp } });
    expect(findMany.mock.calls[0][0]).toMatchObject({ take: 2, where: { timestamp: { gte: timestamp } } });
    expect(findMany.mock.calls[1][0]).toMatchObject({ take: 1, where: { reference: { in: ['AUD-old'] } } });
  });

  it('detects missing, self, later references and future dates', async () => {
    const future = new Date(Date.now() + 60 * 60_000);
    const findMany = vi.fn().mockResolvedValueOnce([
      { id: 'a', reference: 'AUD-a', chainReference: 'missing', timestamp },
      { id: 'b', reference: 'AUD-b', chainReference: 'AUD-b', timestamp },
      { id: 'c', reference: 'AUD-c', chainReference: 'later', timestamp },
      { id: 'd', reference: 'AUD-d', chainReference: null, timestamp: future },
    ]).mockResolvedValueOnce([
      { reference: 'AUD-b', timestamp }, { reference: 'later', timestamp: future },
    ]);
    const repository = new PrismaAuditRecordRepository({ auditRecord: { findMany } } as unknown as PrismaClient);
    const report = await repository.verifyIntegrity();
    expect(report.status).toBe('FAIL');
    expect(report.brokenChainReferences).toEqual(['AUD-a', 'AUD-b', 'AUD-c']);
    expect(report.futureTimestamps).toEqual(['AUD-d']);
  });

  it('never treats a reference check as proof of unchanged event content', async () => {
    const original = new InMemoryAuditRecordRepository();
    const altered = new InMemoryAuditRecordRepository();
    await original.save(record('same', { actionDetail: 'original' }));
    await altered.save(record('same', { actionDetail: 'altered' }));
    for (const repository of [original, altered]) {
      expect(await repository.verifyIntegrity()).toMatchObject({ status: 'PASS',
        scope: 'REFERENCE_LINKAGE_AND_TIMESTAMPS', cryptographicVerification: false });
    }
  });

  it('uses a timestamp/id cursor without losing records at equal timestamps', async () => {
    const repository = new InMemoryAuditRecordRepository();
    for (const id of ['a', 'b', 'c']) await repository.save(record(id));
    const first = await repository.verifyIntegrity({ limit: 2 });
    const second = await repository.verifyIntegrity({ limit: 2, cursor: first.nextCursor });
    expect(first).toMatchObject({ checkedRecords: 2, hasMore: true, nextCursor: { id: 'b', timestamp } });
    expect(second).toMatchObject({ checkedRecords: 1, hasMore: false, nextCursor: null });
  });

  it('hard-caps direct repository calls and represents an empty range explicitly', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const repository = new PrismaAuditRecordRepository({ auditRecord: { findMany } } as unknown as PrismaClient);
    expect(await repository.verifyIntegrity({ limit: 10000 })).toMatchObject({ checkedRecords: 0,
      maxRecords: 100, range: { from: null, until: null }, hasMore: false });
    expect(findMany.mock.calls[0][0].take).toBe(101);
    expect(findMany).toHaveBeenCalledOnce();
  });
});

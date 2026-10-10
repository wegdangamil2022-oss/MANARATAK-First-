import { describe, expect, it, vi } from 'vitest';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaAuditRecordRepository } from '../../src/audit/PrismaAuditRecordRepository';

describe('Prisma audit investigation query contract', () => {
  it('keeps cursor, subject and result predicates together with bounded owner filters', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const repository = new PrismaAuditRecordRepository({ auditRecord: { findMany } } as unknown as PrismaClient);
    const timestamp = new Date('2026-10-01T00:00:00Z');
    await repository.queryPage({ limit: 10000, cursor: { timestamp, id: 'cursor-id' },
      subjectIdentityId: 'staff', subjectRoleIds: ['role'], reference: 'AUD-1', traceId: 'trace-1',
      actorType: 'IDENTITY', targetType: 'ROLE', source: 'admin-api', lifecycleState: 'RECORDED',
      complianceTag: 'GDPR', method: 'POST', path: '/route', result: 'SUCCESS' });
    const query = findMany.mock.calls[0][0];
    expect(query.take).toBe(101);
    expect(query.where).toMatchObject({ reference: 'AUD-1', traceReference: 'trace-1',
      actorType: 'IDENTITY', targetType: 'ROLE', source: 'admin-api', lifecycleState: 'RECORDED',
      complianceMetadata: { array_contains: ['GDPR'] },
      OR: [{ timestamp: { lt: timestamp } }, { timestamp, id: { lt: 'cursor-id' } }] });
    expect(query.where.AND).toEqual(expect.arrayContaining([
      expect.objectContaining({ OR: expect.any(Array) }),
      { contextMetadata: { path: ['method'], equals: 'POST' } },
      { contextMetadata: { path: ['path'], equals: '/route' } },
      { contextMetadata: { path: ['result'], equals: 'SUCCESS' } },
      { AND: [{ action: { not: 'MUTATION_INTENT_RECORDED' } }, { OR: [
        { contextMetadata: { path: ['auditEvent'], equals: Prisma.AnyNull } },
        { contextMetadata: { path: ['auditEvent'], not: 'MUTATION_INTENT' } },
      ] }] },
    ]));
  });
});

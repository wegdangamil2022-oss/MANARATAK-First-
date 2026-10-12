import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { RetentionOwner, RetentionDisposition } from '@manaratak/domain';
import { PrismaRetentionDecisionRepository } from '../../src/retention/PrismaRetentionDecisionRepository';

describe('retention completion versus temporary skip evidence', () => {
  it('only regards applied owner disposition as terminal', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const repo = new PrismaRetentionDecisionRepository({ retentionDecisionRecord: { findFirst } } as unknown as PrismaClient);
    expect(await repo.hasTerminalDecision('decision')).toBe(false);
    expect(findFirst).toHaveBeenCalledWith({ where: { decisionKey: 'decision', result: 'APPLIED' }, select: { id: true } });
  });
  it('preserves old skip evidence and atomically transfers its unique key to completion', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const create = vi.fn().mockResolvedValue({});
    const transaction = { retentionDecisionRecord: { updateMany, create } };
    const $transaction = vi.fn(async (work: (tx: typeof transaction) => Promise<void>) => work(transaction));
    const repo = new PrismaRetentionDecisionRepository({ $transaction } as unknown as PrismaClient);
    await repo.append({ decisionKey: 'decision', owner: RetentionOwner.AUDIT, recordId: 'audit', expiresAt: new Date('2026-01-01'), disposition: RetentionDisposition.ARCHIVE, reason: 'AUDIT_EVIDENCE_ARCHIVE', decidedAt: new Date('2026-10-12'), result: 'APPLIED' });
    expect(updateMany).toHaveBeenCalledWith({ where: { terminalKey: 'decision', result: 'SKIPPED' }, data: { terminalKey: null } });
    expect(create.mock.calls[0][0].data).toMatchObject({ terminalKey: 'decision', result: 'APPLIED' });
    expect(updateMany.mock.invocationCallOrder[0]).toBeLessThan(create.mock.invocationCallOrder[0]);
  });
});

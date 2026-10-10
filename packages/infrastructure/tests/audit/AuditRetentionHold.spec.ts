import { describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { decideRetention, RetentionOwner } from '@manaratak/domain';
import { PrismaAuditRetentionGateway } from '../../src/retention/PrismaAuditRetentionGateway';

describe('audit retention legal-hold write predicates (mock database)', () => {
  const now = new Date('2026-10-01T00:00:00Z');
  const candidate = { owner: RetentionOwner.AUDIT, recordId: 'audit-1', expiresAt: new Date('2026-09-01T00:00:00Z'), legalHoldUntil: null, lifecycleState: 'RECORDED' };

  it('rechecks legal hold during both lease claim and archival disposition', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const gateway = new PrismaAuditRetentionGateway({ auditRecord: { updateMany } } as unknown as PrismaClient);
    expect(await gateway.applyDecision(candidate, decideRetention(candidate, now))).toBe('APPLIED');
    for (const [args] of updateMany.mock.calls) {
      expect(args.where).toMatchObject({ retentionExpiresAt: candidate.expiresAt,
        AND: [{ OR: [{ legalHoldUntil: null }, { legalHoldUntil: { lte: now } }] }] });
      expect(args.data).not.toHaveProperty('action');
      expect(args.data).not.toHaveProperty('contextMetadata');
    }
  });

  it('does not archive when a new hold blocks the final conditional write', async () => {
    const updateMany = vi.fn().mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ count: 1 });
    const gateway = new PrismaAuditRetentionGateway({ auditRecord: { updateMany } } as unknown as PrismaClient);
    expect(await gateway.applyDecision(candidate, decideRetention(candidate, now))).toBe('SKIPPED');
    expect(updateMany.mock.calls[1][0].where.AND).toEqual([{ OR: [{ legalHoldUntil: null }, { legalHoldUntil: { lte: now } }] }]);
    expect(updateMany.mock.calls[2][0].data).toEqual({ retentionClaimToken: null, retentionClaimUntil: null });
  });

  it('skips a known active hold without attempting a claim', async () => {
    const updateMany = vi.fn();
    const gateway = new PrismaAuditRetentionGateway({ auditRecord: { updateMany } } as unknown as PrismaClient);
    // A stale ARCHIVE decision cannot override the subsequently observed hold.
    const held = { ...candidate, legalHoldUntil: new Date('2026-11-01T00:00:00Z') };
    expect(await gateway.applyDecision(held, decideRetention(candidate, now))).toBe('SKIPPED');
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('rejects a mismatched owner decision', async () => {
    const updateMany = vi.fn();
    const gateway = new PrismaAuditRetentionGateway({ auditRecord: { updateMany } } as unknown as PrismaClient);
    await expect(gateway.applyDecision(candidate, { ...decideRetention(candidate, now), recordId: 'different' })).rejects.toThrow('AUDIT_RETENTION_OWNER_MISMATCH');
    expect(updateMany).not.toHaveBeenCalled();
  });
});

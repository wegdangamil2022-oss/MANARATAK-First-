import { describe, it, expect, vi } from 'vitest';
import { PrismaConfiguredAuditRetention } from '../../src/audit/PrismaAuditWorkspaceGateway';
import { PrismaAuditRetentionGateway } from '../../src/retention/PrismaAuditRetentionGateway';
import { decideRetention, RetentionOwner } from '@absheer/domain';
describe('administrator-configured retention and independent case holds', () => {
  it('does not invent durations when no policy exists', async () => {
    const db = { auditWorkspaceRecord: { findUnique: vi.fn(async () => null) } };
    expect(
      await new PrismaConfiguredAuditRetention().resolve(
        { category: 'AUTHENTICATION', severity: 'INFO' },
        db as any,
      ),
    ).toMatchObject({ retentionPeriodInDays: undefined, status: 'UNCONFIGURED_RETAIN' });
  });
  it('reads the policy from the same supplied transaction client', async () => {
    const db = {
      auditWorkspaceRecord: {
        findUnique: vi.fn(async () => ({
          kind: 'RETENTION_POLICY',
          data: { durations: { AUTHENTICATION: 45 } },
        })),
      },
    };
    expect(
      await new PrismaConfiguredAuditRetention().resolve(
        { category: 'AUTHENTICATION', severity: 'INFO' },
        db as any,
      ),
    ).toMatchObject({ retentionPeriodInDays: 45, status: 'APPROVED_POLICY' });
    expect(db.auditWorkspaceRecord.findUnique).toHaveBeenCalledWith({
      where: { id: 'audit-retention-policy' },
    });
  });
  it('preserves an explicit owner duration over the shared configured value', async () => {
    const db = {
      auditWorkspaceRecord: {
        findUnique: vi.fn(async () => ({
          kind: 'RETENTION_POLICY',
          data: { durations: { AUTHENTICATION: 45 } },
        })),
      },
    };
    expect(
      await new PrismaConfiguredAuditRetention().resolve(
        { category: 'AUTHENTICATION', severity: 'INFO', retentionPeriodInDays: 30 },
        db as any,
      ),
    ).toMatchObject({ retentionPeriodInDays: 30, status: 'EXPLICIT_OWNER_DURATION' });
  });
  it('fails closed on corrupt configured days', async () => {
    const db = {
      auditWorkspaceRecord: {
        findUnique: vi.fn(async () => ({
          kind: 'RETENTION_POLICY',
          data: { durations: { AUTHENTICATION: -1 } },
        })),
      },
    };
    await expect(
      new PrismaConfiguredAuditRetention().resolve(
        { category: 'AUTHENTICATION', severity: 'INFO' },
        db as any,
      ),
    ).rejects.toThrow('DURATION_INVALID');
  });
  it('serializes hold writes with archival and does not archive held references', async () => {
    const tx = {
        $queryRaw: vi
          .fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([{ held: true }]),
        auditRecord: { updateMany: vi.fn() },
      },
      db = { $transaction: vi.fn(async (operation: any) => operation(tx)) },
      candidate = {
        owner: RetentionOwner.AUDIT,
        recordId: 'record',
        expiresAt: new Date('2026-01-01'),
        legalHoldUntil: null,
        lifecycleState: 'RECORDED',
      };
    expect(
      await new PrismaAuditRetentionGateway(db as any, true).applyDecision(
        candidate,
        decideRetention(candidate, new Date('2026-10-12')),
      ),
    ).toBe('SKIPPED');
    expect(tx.auditRecord.updateMany).not.toHaveBeenCalled();
    expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
  });
  it('archives only lifecycle metadata after rechecking both individual and case holds', async () => {
    const tx = {
        $queryRaw: vi
          .fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([{ held: false }]),
        auditRecord: { updateMany: vi.fn(async () => ({ count: 1 })) },
      },
      db = { $transaction: vi.fn(async (operation: any) => operation(tx)) },
      candidate = {
        owner: RetentionOwner.AUDIT,
        recordId: 'record',
        expiresAt: new Date('2026-01-01'),
        legalHoldUntil: null,
        lifecycleState: 'RECORDED',
      };
    expect(
      await new PrismaAuditRetentionGateway(db as any, true).applyDecision(
        candidate,
        decideRetention(candidate, new Date('2026-10-12')),
      ),
    ).toBe('APPLIED');
    expect(tx.auditRecord.updateMany.mock.calls[0][0].data).not.toHaveProperty('contextMetadata');
    expect(tx.auditRecord.updateMany.mock.calls[0][0].data.lifecycleState).toBe('ARCHIVED');
  });
});

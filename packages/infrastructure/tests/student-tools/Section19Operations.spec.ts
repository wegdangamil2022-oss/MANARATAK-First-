import { describe, expect, it, vi } from 'vitest';
import { PrismaStudentToolRegistryRepository } from '../../src/student-tools/PrismaStudentToolRegistryRepository';
import { PrismaStudentPrivateResultRetentionGateway } from '../../src/students/PrismaStudentPrivateResultRetentionGateway';
import { RetentionDisposition, RetentionOwner } from '@manaratak/domain';

describe('Section 19 truthful operations and bounded retention', () => {
  it('separates blocked and running from terminal rates and student from test traffic', async () => {
    const rows = [
      { status: 'COMPLETED', durationMs: 10 },
      { status: 'COMPLETED', durationMs: 30 },
      { status: 'BLOCKED' },
      { status: 'RUNNING' },
      { status: 'FAILED', isTest: true },
    ].map((row) => ({ startedAt: new Date(Date.now() - 180000), isTest: false, ...row }));
    const repository = new PrismaStudentToolRegistryRepository({
      studentToolExecutionRecord: { findMany: vi.fn().mockResolvedValue(rows) },
    } as never);
    const telemetry = await repository.telemetry('gpa-calculator');
    for (const window of ['24h', '7d', '30d'] as const) {
      expect(telemetry.windows?.[window].student).toMatchObject({
        total: 4,
        completed: 2,
        blocked: 1,
        running: 1,
        staleRunning: 1,
        terminalDenominator: 2,
        successRate: 1,
        p95LatencyMs: 30,
      });
      expect(telemetry.windows?.[window].test).toMatchObject({
        total: 1,
        failed: 1,
        terminalDenominator: 1,
        successRate: 0,
      });
    }
  });
  it('passes exact trace/status/test predicates with a bounded stable execution page', async () => {
    const findMany = vi.fn().mockResolvedValue([]),
      count = vi.fn().mockResolvedValue(0);
    const repository = new PrismaStudentToolRegistryRepository({
      $transaction: (operations: Promise<unknown>[]) => Promise.all(operations),
      studentToolExecutionRecord: { findMany, count },
    } as never);
    await repository.listExecutions('gpa-calculator', 5, 1000, { isTest: false, traceId: 'trace' });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { definition: { toolKey: 'gpa-calculator' }, isTest: false, traceId: 'trace' },
        skip: 400,
        take: 100,
        orderBy: [{ startedAt: 'desc' }, { executionId: 'desc' }],
      }),
    );
    expect(count).toHaveBeenCalledWith({
      where: { definition: { toolKey: 'gpa-calculator' }, isTest: false, traceId: 'trace' },
    });
  });
  it('clears only matching expired ciphertext and rejects a stale retention decision', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const gateway = new PrismaStudentPrivateResultRetentionGateway({
      studentSavedItem: { updateMany },
    } as never);
    const candidate = {
      owner: RetentionOwner.STUDENT_PRIVATE_RESULT,
      recordId: 'artifact',
      expiresAt: new Date(0),
    };
    const decision = {
      ...candidate,
      decidedAt: new Date(100),
      disposition: RetentionDisposition.PURGE,
      reason: 'expired',
    };
    await expect(gateway.applyDecision(candidate, decision)).resolves.toBe('APPLIED');
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'artifact', privateResultExpiresAt: new Date(0) }),
        data: expect.objectContaining({ privateResultEnvelope: expect.anything() }),
      }),
    );
    await expect(
      gateway.applyDecision(candidate, { ...decision, expiresAt: new Date(50) }),
    ).rejects.toThrow('STUDENT_PRIVATE_RESULT_RETENTION_MISMATCH');
    expect(updateMany).toHaveBeenCalledOnce();
  });
});

import { describe, expect, it, vi } from 'vitest';
import { OFFICIAL_STUDENT_TOOLS } from '@manaratak/application';
import { PrismaStudentToolRegistryRepository } from '../../src/student-tools/PrismaStudentToolRegistryRepository';
const fixture = () => {
  const original = structuredClone(
    OFFICIAL_STUDENT_TOOLS.find((tool) => tool.toolKey === 'gpa-calculator')!,
  );
  let row: any = {
    ...original,
    id: 'd1',
    revision: 1,
    lastModifiedBy: 'author',
    versions: [{ ...original.currentVersion, id: 'v1' }],
    dependencies: original.dependencies,
  };
  const audit = vi.fn(),
    outbox = vi.fn();
  const tx: any = {
    $queryRawUnsafe: vi.fn(),
    auditRecord: { create: audit },
    transactionalOutboxRecord: { create: outbox },
    studentToolDefinitionRecord: {
      findUnique: vi.fn().mockImplementation(() => Promise.resolve(structuredClone(row))),
      updateMany: vi.fn().mockImplementation(({ where, data }) => {
        if (row.revision !== where.revision) return Promise.resolve({ count: 0 });
        row = {
          ...row,
          ...data,
          revision: data.revision?.increment
            ? row.revision + data.revision.increment
            : row.revision,
        };
        return Promise.resolve({ count: 1 });
      }),
    },
  };
  const db = { ...tx, $transaction: (fn: any) => fn(tx) };
  return {
    repository: new PrismaStudentToolRegistryRepository(db as any),
    tx,
    audit,
    outbox,
    get: () => row,
    set: (patch: any) => {
      row = { ...row, ...patch };
    },
  };
};
describe('Section 19 immutable release evidence', () => {
  it('requires a distinct reviewer, binds revision and consumes approval once', async () => {
    const f = fixture();
    await f.repository.release('gpa-calculator', 'PROPOSE', 'author', 1, 'review this version');
    await expect(
      f.repository.release('gpa-calculator', 'APPROVE', 'author', 1, 'review'),
    ).rejects.toThrow('TOOL_RELEASE_REVIEWER_MUST_DIFFER');
    await f.repository.release('gpa-calculator', 'APPROVE', 'reviewer', 1, 'review');
    const tool = await f.repository.release(
      'gpa-calculator',
      'ACTIVATE',
      'deployer',
      1,
      'activate reviewed release',
    );
    expect(tool.releaseApproval?.status).toBe('CONSUMED');
    expect(tool.revision).toBe(2);
    await expect(
      f.repository.release('gpa-calculator', 'ACTIVATE', 'deployer', 1, 'replay'),
    ).rejects.toThrow('TOOL_REVISION_CONFLICT');
    expect(f.audit).toHaveBeenCalledTimes(3);
    expect(f.outbox).toHaveBeenCalledTimes(3);
  });
  it('rejects stale approval after flags change, even when a version is unchanged', async () => {
    const f = fixture();
    await f.repository.release('gpa-calculator', 'PROPOSE', 'author', 1, 'review');
    f.set({ featureFlags: { ...f.get().featureFlags, anonymousEnabled: false } });
    await expect(
      f.repository.release('gpa-calculator', 'APPROVE', 'reviewer', 1, 'review'),
    ).rejects.toThrow('TOOL_RELEASE_APPROVAL_STALE');
  });
  it('rejects expired proposal', async () => {
    const f = fixture();
    await f.repository.release('gpa-calculator', 'PROPOSE', 'author', 1, 'review');
    f.set({
      releaseApproval: { ...f.get().releaseApproval, expiresAt: new Date(0).toISOString() },
    });
    await expect(
      f.repository.release('gpa-calculator', 'APPROVE', 'reviewer', 1, 'review'),
    ).rejects.toThrow('TOOL_RELEASE_APPROVAL_STALE');
  });
  it('requires last-editor provenance for legacy definitions', async () => {
    const f = fixture();
    f.set({ lastModifiedBy: null });
    await expect(
      f.repository.release('gpa-calculator', 'PROPOSE', 'author', 1, 'review'),
    ).rejects.toThrow('TOOL_RELEASE_AUTHOR_UNKNOWN');
  });
  it('rejects CAS loss without writing success audit/outbox', async () => {
    const f = fixture();
    f.tx.studentToolDefinitionRecord.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      f.repository.release('gpa-calculator', 'PROPOSE', 'author', 1, 'review'),
    ).rejects.toThrow('TOOL_REVISION_CONFLICT');
    expect(f.audit).not.toHaveBeenCalled();
    expect(f.outbox).not.toHaveBeenCalled();
  });
});
describe('Section 19 terminal transitions', () => {
  const fixture = () => {
    let row: any = {
      executionId: 'stx',
      isTest: true,
      correlationId: 'correlation',
      traceId: 'trace',
      status: 'RUNNING',
      definitionId: 'd1',
      versionId: 'v1',
      definition: { toolKey: 'gpa-calculator' },
    };
    const outbox = vi.fn();
    const tx: any = {
      studentToolExecutionRecord: {
        findUnique: vi.fn().mockImplementation(() => Promise.resolve({ ...row })),
        updateMany: vi.fn().mockImplementation(({ where, data }) => {
          if (row.status !== where.status || row.versionId !== where.versionId)
            return Promise.resolve({ count: 0 });
          row = { ...row, ...data };
          return Promise.resolve({ count: 1 });
        }),
      },
      transactionalOutboxRecord: { create: outbox },
      studentToolDefinitionRecord: {
        findUnique: vi.fn().mockResolvedValue({ toolKey: 'gpa-calculator' }),
      },
    };
    return {
      repository: new PrismaStudentToolRegistryRepository({
        ...tx,
        $transaction: (fn: any) => fn(tx),
      } as any),
      outbox,
      get: () => row,
    };
  };
  it('allows only one complete/fail winner and one event', async () => {
    const f = fixture();
    const responses = await Promise.allSettled([
      f.repository.completeExecution('stx', { status: 'FAILED' as any }),
      f.repository.completeExecution('stx', { status: 'BLOCKED' as any }),
    ]);
    expect(responses.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(f.outbox).toHaveBeenCalledOnce();
    const event = f.outbox.mock.calls[0][0].data;
    expect(event.eventType).toBe(`STUDENT_TOOL_EXECUTION_${f.get().status}`);
    expect(event.payload.isTest).toBe(true);
    expect(event.metadata).toMatchObject({ correlationId: 'correlation', traceId: 'trace' });
  });
  it('does not record completed status without protected result and matching digest', async () => {
    const f = fixture();
    await expect(
      f.repository.completeExecution('stx', { status: 'COMPLETED' as any, resultDigest: 'digest' }),
    ).rejects.toThrow('TOOL_EXECUTION_RESULT_REQUIRED');
    expect(f.get().status).toBe('RUNNING');
  });
});

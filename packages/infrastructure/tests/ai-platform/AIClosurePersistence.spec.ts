import { describe, expect, it, vi } from 'vitest';
import { PrismaAIPlatformRepository } from '../../src/ai-platform/PrismaAIPlatformRepository';

function governanceFixture() {
  let sequence = 1;
  const existing = {
    id: 'active',
    key: 'guard',
    resourceType: 'guardrails',
    status: 'ACTIVE',
    createdBy: 'old-author',
    updatedAt: new Date('2026-10-11T10:00:00Z'),
    configuration: { status: 'ACTIVE', version: 1, rules: { patterns: ['old'] } },
  };
  const rows = new Map<string, any>([['guardrails:guard', existing]]);
  const registry = {
    findUnique: vi.fn(async ({ where }: any) =>
      where.resourceType_key
        ? (rows.get(`${where.resourceType_key.resourceType}:${where.resourceType_key.key}`) ?? null)
        : [...rows.values()].find((row) => row.id === where.id),
    ),
    findMany: vi.fn(async () => [...rows.values()]),
    create: vi.fn(async ({ data }: any) => {
      const row = { ...data, id: `revision-${sequence++}`, updatedAt: new Date() };
      rows.set(`${row.resourceType}:${row.key}`, row);
      return row;
    }),
    update: vi.fn(async ({ where, data }: any) => {
      const prior = [...rows.values()].find((row) => row.id === where.id)!;
      const row = { ...prior, ...data, updatedAt: new Date() };
      rows.set(`${row.resourceType}:${row.key}`, row);
      return row;
    }),
    upsert: vi.fn(async ({ where, create, update }: any) => {
      const key = `${where.resourceType_key.resourceType}:${where.resourceType_key.key}`;
      const prior = rows.get(key);
      const row = prior ? { ...prior, ...update, updatedAt: new Date() } : create;
      rows.set(key, row);
      return row;
    }),
  };
  const tx = {
    $queryRaw: vi.fn(),
    aIRegistryRecord: registry,
    auditRecord: { create: vi.fn() },
    transactionalOutboxRecord: { create: vi.fn() },
  };
  const repository = new PrismaAIPlatformRepository({ $transaction: (fn: any) => fn(tx) });
  const stage = {
    configuration: { status: 'ACTIVE', version: 2, rules: { patterns: ['new'] } },
    reason: 'Reviewed safety improvement',
    expectedUpdatedAt: existing.updatedAt.toISOString(),
  };
  return { repository, registry, rows, tx, stage };
}

describe('P17 staged governance persistence', () => {
  it('keeps active configuration unchanged until distinct author, reviewer and deployer act', async () => {
    const f = governanceFixture();
    const revision = await f.repository.governConfiguration(
      'guardrails',
      'guard',
      'STAGE',
      f.stage,
      'author',
    );
    expect(f.rows.get('guardrails:guard').configuration.version).toBe(1);
    await expect(
      f.repository.governConfiguration(
        'guardrails',
        'guard',
        'APPROVE',
        { revisionKey: String(revision.revisionKey), reason: 'Approve' },
        'author',
      ),
    ).rejects.toThrow('AI_GOVERNANCE_INDEPENDENT_ACTOR_REQUIRED');
    await f.repository.governConfiguration(
      'guardrails',
      'guard',
      'APPROVE',
      { revisionKey: String(revision.revisionKey), reason: 'Independent review' },
      'reviewer',
    );
    await expect(
      f.repository.governConfiguration(
        'guardrails',
        'guard',
        'ACTIVATE',
        { revisionKey: String(revision.revisionKey), reason: 'Deploy' },
        'reviewer',
      ),
    ).rejects.toThrow('AI_GOVERNANCE_INDEPENDENT_ACTOR_REQUIRED');
    expect(f.rows.get('guardrails:guard').configuration.version).toBe(1);
    await f.repository.governConfiguration(
      'guardrails',
      'guard',
      'ACTIVATE',
      { revisionKey: String(revision.revisionKey), reason: 'Independent deployment' },
      'deployer',
    );
    expect(f.rows.get('guardrails:guard').configuration.version).toBe(2);
    expect(f.tx.auditRecord.create).toHaveBeenCalledTimes(3);
    expect(f.tx.transactionalOutboxRecord.create).toHaveBeenCalledTimes(3);
  });
  it('rejects an approved candidate after its active base changes', async () => {
    const f = governanceFixture();
    const revision = await f.repository.governConfiguration(
      'guardrails',
      'guard',
      'STAGE',
      f.stage,
      'author',
    );
    await f.repository.governConfiguration(
      'guardrails',
      'guard',
      'APPROVE',
      { revisionKey: String(revision.revisionKey), reason: 'Review' },
      'reviewer',
    );
    f.rows.get('guardrails:guard').updatedAt = new Date('2026-10-11T12:00:00Z');
    await expect(
      f.repository.governConfiguration(
        'guardrails',
        'guard',
        'ACTIVATE',
        { revisionKey: String(revision.revisionKey), reason: 'Deploy' },
        'deployer',
      ),
    ).rejects.toThrow('AI_REGISTRY_CONCURRENT_CHANGE');
    expect(f.registry.upsert).not.toHaveBeenCalled();
  });
  it('makes rollback a new review rather than bypassing approval', async () => {
    const f = governanceFixture();
    const revision = await f.repository.governConfiguration(
      'guardrails',
      'guard',
      'STAGE',
      f.stage,
      'author',
    );
    await f.repository.governConfiguration(
      'guardrails',
      'guard',
      'APPROVE',
      { revisionKey: String(revision.revisionKey), reason: 'Review' },
      'reviewer',
    );
    await f.repository.governConfiguration(
      'guardrails',
      'guard',
      'ACTIVATE',
      { revisionKey: String(revision.revisionKey), reason: 'Deploy' },
      'deployer',
    );
    const restored = await f.repository.governConfiguration(
      'guardrails',
      'guard',
      'ROLLBACK',
      {
        revisionKey: String(revision.revisionKey),
        reason: 'Restore old approved configuration',
        expectedUpdatedAt: f.rows.get('guardrails:guard').updatedAt.toISOString(),
      },
      'rollback-author',
    );
    expect(restored.status).toBe('REVIEW');
    expect((restored.candidate as any).version).toBe(1);
    expect(f.rows.get('guardrails:guard').configuration.version).toBe(2);
  });
  it('rejects break-glass requests without an actual unresolved critical incident', async () => {
    const f = governanceFixture();
    await expect(
      f.repository.governConfiguration(
        'guardrails',
        'guard',
        'STAGE',
        { ...f.stage, incidentReference: 'missing-incident' },
        'author',
      ),
    ).rejects.toThrow('AI_BREAK_GLASS_OPEN_INCIDENT_REQUIRED');
    expect(f.registry.create).not.toHaveBeenCalled();
  });
});

describe('P17 reservation reconciliation persistence', () => {
  function fixture(proposal?: any) {
    const evidence = {
      tokens: 20,
      cost: 0.25,
      currency: 'USD',
      reference: 'provider-receipt-42',
      reason: 'Provider confirmed usage after lost ACK',
    };
    const current: any = {
      id: 'execution',
      publicId: 'ai_unknown',
      status: 'FAILED',
      updatedAt: new Date('2026-10-11T10:00:00Z'),
      consumerKey: 'consumer',
      providerKey: 'provider',
      modelKey: 'model',
      metadata: proposal ? { reconciliation: proposal } : {},
    };
    const tx = {
      $queryRaw: vi.fn(),
      aIExecutionRecord: {
        findUniqueOrThrow: vi.fn(async () => current),
        update: vi.fn(async ({ data }: any) => ({ ...current, ...data })),
      },
      aIQuotaReservationRecord: {
        findUnique: vi.fn().mockResolvedValue({ status: 'RESERVED', currency: 'USD' }),
        updateMany: vi.fn(),
      },
      aIUsageRecord: { findMany: vi.fn().mockResolvedValue([]), upsert: vi.fn() },
      auditRecord: { create: vi.fn() },
      transactionalOutboxRecord: { create: vi.fn() },
    };
    const repository = new PrismaAIPlatformRepository({ $transaction: (fn: any) => fn(tx) });
    return { repository, tx, evidence, current };
  }
  it('records a proposal without releasing unknown cost, then commits only independent exact-evidence approval', async () => {
    const f = fixture();
    const proposed = await f.repository.reconcileReservation(
      'ai_unknown',
      'PROPOSE',
      f.evidence,
      'operator',
      f.current.updatedAt.toISOString(),
    );
    expect(f.tx.aIQuotaReservationRecord.updateMany).not.toHaveBeenCalled();
    f.current.metadata = proposed.metadata;
    await expect(
      f.repository.reconcileReservation(
        'ai_unknown',
        'APPROVE',
        f.evidence,
        'operator',
        f.current.updatedAt.toISOString(),
      ),
    ).rejects.toThrow('AI_RECONCILIATION_INDEPENDENT_APPROVAL_REQUIRED');
    await f.repository.reconcileReservation(
      'ai_unknown',
      'APPROVE',
      f.evidence,
      'reviewer',
      f.current.updatedAt.toISOString(),
    );
    expect(f.tx.aIQuotaReservationRecord.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'COMMITTED', actualCost: 0.25 }),
      }),
    );
    expect(f.tx.aIUsageRecord.upsert).toHaveBeenCalledOnce();
  });
  it('does not overwrite already recorded provider cost using a conflicting manual proposal', async () => {
    const f = fixture();
    const proposed = await f.repository.reconcileReservation(
      'ai_unknown',
      'PROPOSE',
      f.evidence,
      'operator',
      f.current.updatedAt.toISOString(),
    );
    f.current.metadata = proposed.metadata;
    f.tx.aIUsageRecord.findMany.mockResolvedValue([
      { currency: 'USD', cost: 0.5, inputTokens: 20, outputTokens: 0 },
    ]);
    await expect(
      f.repository.reconcileReservation(
        'ai_unknown',
        'APPROVE',
        f.evidence,
        'reviewer',
        f.current.updatedAt.toISOString(),
      ),
    ).rejects.toThrow('AI_RECONCILIATION_KNOWN_USAGE_MISMATCH');
    expect(f.tx.aIQuotaReservationRecord.updateMany).not.toHaveBeenCalled();
  });
});

describe('P17 scheduled bounded retention and reconciliation', () => {
  it('purges expired protected results and legacy private previews, but holds an unknown provider reservation', async () => {
    const record = {
      id: 'record',
      publicId: 'ai_private',
      dataClassification: 'CONFIDENTIAL',
      updatedAt: new Date(),
      metadata: {
        asyncResult: { expiresAt: '2020-01-01T00:00:00Z', ciphertext: 'expired' },
        requestFingerprint: 'retained-hash',
      },
    };
    const tx = {
      $queryRaw: vi.fn(),
      aIExecutionRecord: {
        findUnique: vi.fn().mockResolvedValue({
          publicId: 'ai_unknown',
          status: 'FAILED',
          errorCode: 'AI_PROVIDER_OUTCOME_UNKNOWN',
        }),
      },
      aIUsageRecord: { findMany: vi.fn().mockResolvedValue([]) },
      aIQuotaReservationRecord: { updateMany: vi.fn() },
    };
    const prisma = {
      $transaction: (fn: any) => fn(tx),
      aIExecutionRecord: {
        findMany: vi.fn().mockResolvedValue([record]),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      aIExecutionSpanRecord: { updateMany: vi.fn() },
      aIWorkflowStepRunRecord: { findMany: vi.fn().mockResolvedValue([]) },
      aIRegistryRecord: { findMany: vi.fn().mockResolvedValue([]) },
      aIEmbeddingRecord: { findMany: vi.fn().mockResolvedValue([]), deleteMany: vi.fn() },
      aIQuotaReservationRecord: {
        findMany: vi
          .fn()
          .mockResolvedValue([{ id: 'reservation', executionPublicId: 'ai_unknown' }]),
      },
    };
    expect(
      await new PrismaAIPlatformRepository(prisma).maintainPrivacyAndReservations(5000),
    ).toEqual({ purged: 1, reconciled: 0 });
    expect(prisma.aIExecutionRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 }),
    );
    expect(prisma.aIExecutionRecord.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: record.id, updatedAt: record.updatedAt },
        data: {
          inputPreview: null,
          outputPreview: null,
          metadata: { requestFingerprint: 'retained-hash' },
        },
      }),
    );
    expect(tx.aIQuotaReservationRecord.updateMany).not.toHaveBeenCalled();
  });
});

describe('P17 incident replay persistence', () => {
  it('replays the same intent before checking the already-advanced transition, without another audit or event', async () => {
    const incident = {
      id: 'incident',
      key: 'incident-1',
      status: 'INVESTIGATING',
      configuration: { severity: 'HIGH', timeline: [] },
    };
    const tx = {
      $queryRaw: vi.fn(),
      aIRegistryRecord: { findUnique: vi.fn().mockResolvedValue(incident) },
      aIIncidentEventRecord: {
        findUnique: vi.fn().mockResolvedValue({
          action: 'INVESTIGATION_UPDATE',
          note: 'Reviewing',
          actorReferenceId: 'operator',
        }),
        create: vi.fn(),
      },
      auditRecord: { create: vi.fn() },
      transactionalOutboxRecord: { create: vi.fn() },
    };
    const repo = new PrismaAIPlatformRepository({ $transaction: (fn: any) => fn(tx) });
    const event = {
      at: new Date(),
      action: 'INVESTIGATION_UPDATE',
      note: 'Reviewing',
      actorReferenceId: 'operator',
    };
    expect(await repo.appendIncidentEvent('incident-1', event, 'intent-1')).toMatchObject({
      status: 'INVESTIGATING',
    });
    await expect(
      repo.appendIncidentEvent('incident-1', { ...event, note: 'Changed intent' }, 'intent-1'),
    ).rejects.toThrow('AI_INCIDENT_IDEMPOTENCY_CONFLICT');
    expect(tx.aIIncidentEventRecord.create).not.toHaveBeenCalled();
    expect(tx.auditRecord.create).not.toHaveBeenCalled();
  });
});

describe('P17 queue and cost observability', () => {
  it('joins the existing execution without provider calls or private payloads in its projection', async () => {
    const execution = { publicId: 'ai_1', traceId: 'trace-1', actualCost: 0.5, currency: 'USD' };
    const prisma = {
      aIAsyncJobRecord: {
        findMany: vi.fn().mockResolvedValue([{ publicId: 'aij_1', executionPublicId: 'ai_1' }]),
        count: vi.fn().mockResolvedValue(1),
      },
      aIExecutionRecord: { findMany: vi.fn().mockResolvedValue([execution]) },
    };
    const page = await new PrismaAIPlatformRepository(prisma).listAsyncJobs();
    expect(page.data[0].execution).toEqual(execution);
    const projection = prisma.aIExecutionRecord.findMany.mock.calls[0][0].select;
    expect(projection).not.toHaveProperty('inputPreview');
    expect(projection).not.toHaveProperty('outputPreview');
    expect(projection).not.toHaveProperty('metadata');
    expect(projection.actualCost).toBe(true);
  });
});

describe('P17 emergency switch governance', () => {
  it('requires reviewed activation even when runtime settings have never been created', async () => {
    const tx = {
      $queryRaw: vi.fn(),
      aIRegistryRecord: { findUnique: vi.fn().mockResolvedValue(null), upsert: vi.fn() },
    };
    const repo = new PrismaAIPlatformRepository({ $transaction: (fn: any) => fn(tx) });
    await expect(
      repo.upsert(
        'platformSettings',
        { key: 'runtime', status: 'ACTIVE', globalEnabled: true },
        'operator',
      ),
    ).rejects.toThrow('AI_PLATFORM_REENABLE_GOVERNED_APPROVAL_REQUIRED');
    expect(tx.aIRegistryRecord.upsert).not.toHaveBeenCalled();
  });
});

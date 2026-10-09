import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { ImportSourceDefinition, SourceAccessClassification, SourceConnectorCategory, SourceStatus,
  RetentionOwner, RetentionDisposition } from '@manaratak/domain';
import { CsvImportStreamParser, ImportSourceControlUseCases, ImportSourceIdentity, ImportParserRegistry,
  SourceConnectorRegistry } from '@manaratak/application';
import { PrismaImportRepository } from '../../src/import-foundation/PrismaImportRepository';
import { VerifiedImportArtifactGateway } from '../../src/import-foundation/VerifiedImportArtifactGateway';
import { PrismaImportRetentionGateway } from '../../src/retention/PrismaImportRetentionGateway';

async function collect<T>(stream: AsyncIterable<T>) { const rows: T[] = []; for await (const row of stream) rows.push(row); return rows; }
const sha = (text: string) => createHash('sha256').update(text).digest('hex');

describe('staging recovery and atomic visibility', () => {
  it('queues the exact accepted work in the same transaction as promotion', async () => {
    const tx = { importBatch: { updateMany: vi.fn(async () => ({ count: 1 })) },
      importRecord: { updateMany: vi.fn().mockResolvedValueOnce({ count: 2 }).mockResolvedValueOnce({ count: 1 }) } };
    const prisma = { $transaction: vi.fn(async (work: any) => work(tx)) };
    await new PrismaImportRepository(prisma as any).finalizeStagedStream('b', 3);
    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(tx.importBatch.updateMany.mock.calls[0][0]).toMatchObject({
      where: { batchStatus: 'STAGING', claimedBy: 'ARTIFACT_STAGING', claimUntil: { gt: expect.any(Date) } },
      data: { batchStatus: 'QUEUED', totalRecords: 3, claimedBy: null, claimUntil: null },
    });
    expect(tx.importRecord.updateMany).toHaveBeenCalledTimes(2);
  });
  it('recovers at most 20 expired staging candidates using the observed version and lease', async () => {
    const candidate = { id: 'stale', batchStatus: 'STAGING', updatedAt: new Date(0), claimUntil: new Date(1) };
    const tx = { importBatch: { updateMany: vi.fn(async () => ({ count: 1 })) }, importRecord: { updateMany: vi.fn() } };
    const prisma = { importBatch: { findMany: vi.fn(async () => [candidate]) }, $transaction: async (work: any) => work(tx) };
    expect(await new PrismaImportRepository(prisma as any).recoverStaleStaging()).toBe(1);
    expect(prisma.importBatch.findMany.mock.calls[0][0]).toMatchObject({ take: 20 });
    expect(tx.importBatch.updateMany.mock.calls[0][0].where).toEqual(candidate);
    expect(tx.importRecord.updateMany.mock.calls[0][0]).toMatchObject({ data: { status: 'STAGING_REJECTED' } });
  });
  it('does not reject rows if a live parser renewed the candidate after recovery inspection', async () => {
    const tx = { importBatch: { updateMany: vi.fn(async () => ({ count: 0 })) }, importRecord: { updateMany: vi.fn() } };
    const prisma = { importBatch: { findMany: async () => [{ id: 'renewed', batchStatus: 'STAGING', updatedAt: new Date(0), claimUntil: new Date(1) }] },
      $transaction: async (work: any) => work(tx) };
    expect(await new PrismaImportRepository(prisma as any).recoverStaleStaging()).toBe(0);
    expect(tx.importRecord.updateMany).not.toHaveBeenCalled();
  });
  it('an expired parser cannot recreate source-key reservations after recovery', async () => {
    const tx = { $queryRaw: vi.fn(async () => []), importBatch: { updateMany: vi.fn(async () => ({ count: 0 })) },
      importRecord: { findMany: vi.fn(), createMany: vi.fn() } };
    const repo = new PrismaImportRepository({ $transaction: (work: any) => work(tx) } as any);
    await expect(repo.bulkCreateRecords([{ batchId: 'b', status: 'STAGING_PENDING', sourceDedupKey: 'source', rawPayload: {} }])).rejects.toThrow('STAGING_LEASE_LOST');
    expect(tx.importRecord.createMany).not.toHaveBeenCalled();
    expect(tx.importBatch.updateMany.mock.calls[0][0].where).toMatchObject({ batchStatus: 'STAGING', claimUntil: { gt: expect.any(Date) } });
  });
});

describe('CSV byte provenance', () => {
  it('reports identical UTF8 start offsets for every chunk boundary, including BOM, CRLF and quoted newlines', async () => {
    const text = '\uFEFFid,name\r\n1,"ع\n😀"\r\n2,ب'; const bytes = Buffer.from(text);
    const expected = [Buffer.byteLength('\uFEFFid,name\r\n'), Buffer.byteLength('\uFEFFid,name\r\n1,"ع\n😀"\r\n')];
    for (let width = 1; width <= bytes.length; width++) {
      async function* stream() { for (let i = 0; i < bytes.length; i += width) yield bytes.subarray(i, i + width); }
      const rows = await collect(new CsvImportStreamParser().parse(stream(), { batchId: 'b' }));
      expect(rows.map(row => row.recordOffset)).toEqual(expected);
      expect(rows[0]).toMatchObject({ raw: { name: 'ع\n😀' } });
    }
  });
  it('bounds external identity keys instead of retaining oversized checkpoint/diff identities', () => {
    expect(() => ImportSourceIdentity.create({ sourceSystem: 'source', ownerDomain: 'GENERIC', payload: { id: 'ع'.repeat(300) } })).toThrow('IDENTITY_TOO_LARGE');
  });
});

describe('private spool capacity', () => {
  it('fails the fifth concurrent spool closed and releases capacity on consumer return', async () => {
    let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
    const gateway = new VerifiedImportArtifactGateway({ openRead: async function* () { await gate; yield Buffer.from('x'); } } as any);
    const input = { locator: {} as any, expectedSha256: sha('x'), expectedByteSize: 1, maxBytes: 100 };
    const iterators = Array.from({ length: 4 }, () => gateway.readVerified(input)[Symbol.asyncIterator]());
    const pending = iterators.map(iterator => iterator.next());
    try { await expect(gateway.readVerified(input)[Symbol.asyncIterator]().next()).rejects.toThrow('SPOOL_CAPACITY'); }
    finally { release(); await Promise.all(pending); await Promise.all(iterators.map(iterator => iterator.return?.())); }
    expect(await collect(gateway.readVerified(input))).toHaveLength(1);
  });
});

describe('source configuration and revision-pinned run', () => {
  const revision = new Date('2026-10-09T00:00:00Z');
  const source = new ImportSourceDefinition({ sourceId: 'source', displayName: 'Source', baseUrl: 'https://example.org/data',
    category: SourceConnectorCategory.OFFICIAL_API, accessClassification: SourceAccessClassification.PUBLIC_ALLOWED,
    connectorId: 'api', connectorVersion: '1', status: SourceStatus.ACTIVE, updatedAt: revision, metadata: { ownerDomain: 'GENERIC' } });
  function setup(value = source) {
    const repository = { getSource: vi.fn(async () => value), updateSourceStatus: vi.fn(async () => true) };
    const sources = { ...repository, withTransaction: () => repository };
    const connectors = new SourceConnectorRegistry([{ connectorId: 'api', connectorVersion: '1', category: SourceConnectorCategory.OFFICIAL_API, supports: () => true } as any]);
    const atomic = { execute: vi.fn(async (_definition: any, work: any) => work({ boundaryId: 'tx' })) };
    const acquire = { execute: vi.fn(async () => ({ acquisition: { rawBytes: Buffer.from('id\n1\n') },
      snapshot: { artifactId: 'raw', rawArtifactReference: 'snapshot:raw', contentHash: sha('id\n1\n') } })) };
    const imports = { stageNormalizedStream: vi.fn(async (input: any) => { await collect(input.rows); return { batchId: 'b', status: 'QUEUED' }; }) };
    const parsers = new ImportParserRegistry(); parsers.register(new CsvImportStreamParser());
    return { repository, sources, atomic, acquire, imports, useCase: new ImportSourceControlUseCases(sources as any, connectors, atomic as any,
      { acquire: acquire as any, imports: imports as any, parsers }) };
  }
  const input = { expectedUpdatedAt: revision.toISOString(), ownerDomain: 'GENERIC', format: 'csv' as const, reason: 'reviewed source' };
  it('tests configuration without making any acquisition/provider request', async () => {
    const { useCase, acquire } = setup(); expect(await useCase.testConfiguration('source')).toMatchObject({ executionAllowed: true, networkTestPerformed: false });
    expect(acquire.execute).not.toHaveBeenCalled();
  });
  it('stages public acquisition with immutable registered-source provenance and authenticated intent', async () => {
    const { useCase, atomic, imports } = setup(); await useCase.run('source', input, { actorId: 'admin' });
    expect(atomic.execute.mock.calls[0][0]).toMatchObject({ action: 'IMPORT_SOURCE_RUN_REQUESTED', context: { actorId: 'admin' } });
    expect(imports.stageNormalizedStream.mock.calls[0][0]).toMatchObject({ sourceSystem: 'source', handoffContext: {
      artifactId: 'raw', referenceMetadata: { sourceRevision: revision.toISOString(), acquisitionKind: 'REGISTERED_SOURCE' } } });
  });
  it('refuses acquisition with stale revisions or restricted approvals', async () => {
    const stale = setup(); await expect(stale.useCase.run('source', { ...input, expectedUpdatedAt: new Date(0).toISOString() }, { actorId: 'admin' })).rejects.toThrow('STATUS_CONFLICT');
    expect(stale.acquire.execute).not.toHaveBeenCalled();
    const restricted = setup(new ImportSourceDefinition({ ...source, accessClassification: SourceAccessClassification.DATA_AGREEMENT }));
    await expect(restricted.useCase.run('source', input, { actorId: 'admin' })).rejects.toThrow('AGREEMENT_APPROVAL_REQUIRED');
    expect(restricted.acquire.execute).not.toHaveBeenCalled();
  });
  it('stops after acquisition if the source was disabled or edited during network work', async () => {
    const { useCase, sources, imports } = setup(); sources.getSource.mockResolvedValueOnce(source).mockResolvedValueOnce(new ImportSourceDefinition({ ...source, status: SourceStatus.DISABLED }));
    await expect(useCase.run('source', input, { actorId: 'admin' })).rejects.toThrow('STATUS_CONFLICT');
    expect(imports.stageNormalizedStream).not.toHaveBeenCalled();
  });
  it('joins status changes to audit/outbox and blocks foreign owners or unsupported activation', async () => {
    const normal = setup(); await normal.useCase.changeStatus('source', SourceStatus.DISABLED, revision.toISOString(), 'maintenance', { actorId: 'admin' });
    expect(normal.repository.updateSourceStatus).toHaveBeenCalledWith('source', SourceStatus.DISABLED, 'maintenance');
    expect(normal.atomic.execute.mock.calls[0][0]).toMatchObject({ action: 'IMPORT_SOURCE_STATUS_CHANGED' });
    const foreign = setup(new ImportSourceDefinition({ ...source, metadata: { ownerDomain: 'SCHOLARSHIPS' } }));
    await expect(foreign.useCase.changeStatus('source', SourceStatus.DISABLED, revision.toISOString(), 'review', { actorId: 'admin' })).rejects.toThrow('OWNER_WORKSPACE_REQUIRED');
    const restricted = setup(new ImportSourceDefinition({ ...source, status: SourceStatus.DISABLED, accessClassification: SourceAccessClassification.AUTHORIZED_ACCOUNT }));
    await expect(restricted.useCase.changeStatus('source', SourceStatus.ACTIVE, revision.toISOString(), 'review', { actorId: 'admin' })).rejects.toThrow('ACCOUNT_CAPABILITY_REQUIRED');
    expect(restricted.repository.updateSourceStatus).not.toHaveBeenCalled();
  });
});

describe('read-only bounded batch diff', () => {
  const batches = ['left', 'right'].map(id => ({ id, sourceSystem: 'provider', dataType: 'GENERIC', updatedAt: new Date(0), batchStatus: 'COMPLETED' }));
  const row = (id: string, key: string, fingerprint: string | null) => ({ id, sourceDedupKey: key, fingerprint });
  function setup(left: any[], right: any[], values = batches) {
    const tx = { importBatch: { findMany: vi.fn(async () => values) }, $queryRaw: vi.fn().mockResolvedValueOnce(left).mockResolvedValueOnce(right) };
    const prisma = { $transaction: vi.fn(async (work: any) => work(tx)) };
    return { prisma, tx, repo: new PrismaImportRepository(prisma as any) };
  }
  it('matches stable external IDs across different payload hashes and never exposes source payloads', async () => {
    const before = sha('before'); const after = sha('after');
    const { repo, prisma } = setup([row('a', `provider|generic|id:ONE|sha256:${before}`, before), row('c', 'missing', before)],
      [row('b', `provider|generic|id:ONE|sha256:${after}`, after), row('d', 'new', after)]);
    const result = await repo.compareBatches('left', 'right');
    expect(result.counters).toMatchObject({ changed: 1, added: 1, missingFromComparison: 1 });
    expect(result.canonicalDeletion).toBe(false); expect(result.readOnly).toBe(true);
    expect(JSON.stringify(result)).not.toContain('id:ONE');
    expect(prisma.$transaction.mock.calls[0][1]).toEqual({ isolationLevel: 'RepeatableRead' });
  });
  it('reports missing fingerprints as unknown instead of unchanged', async () => {
    const { repo } = setup([row('a', 'one', null)], [row('b', 'one', null)]);
    expect((await repo.compareBatches('left', 'right')).counters).toMatchObject({ unknown: 1, unchanged: 0 });
  });
  it('refuses excessive rows, cross-provider comparisons and ambiguous stable identities', async () => {
    await expect(setup(Array(5001).fill(row('a', 'one', 'x')), []).repo.compareBatches('left', 'right')).rejects.toThrow('LIMIT_EXCEEDED');
    await expect(setup([], [], [batches[0], { ...batches[1], sourceSystem: 'other' }]).repo.compareBatches('left', 'right')).rejects.toThrow('SCOPE_MISMATCH');
    await expect(setup([row('a', 'one', 'x'), row('b', 'one', 'y')], []).repo.compareBatches('left', 'right')).rejects.toThrow('IDENTITY_AMBIGUOUS');
  });
});

describe('import retention legal hold and replay fencing', () => {
  const now = new Date('2026-10-09T00:00:00Z'); const expiresAt = new Date(0);
  const candidate = { owner: RetentionOwner.IMPORT, recordId: 'r', expiresAt };
  const decision = { ...candidate, decisionKey: 'key', disposition: RetentionDisposition.PURGE, reason: 'expired', decidedAt: now };
  function setup(status = 'COMPLETED', claimCount = 1) {
    const tx = { importBatch: { updateMany: vi.fn(async () => ({ count: 1 })) }, importRecord: {
      findUnique: vi.fn(async () => ({ batchId: 'b', batch: { batchStatus: status } })),
      updateMany: vi.fn().mockResolvedValueOnce({ count: claimCount }).mockResolvedValue({ count: 1 }),
    } };
    return { tx, gateway: new PrismaImportRetentionGateway({ $transaction: (work: any) => work(tx) } as any) };
  }
  it('rechecks expiry/legal holds on both the claim and purge inside the parent lock transaction', async () => {
    const { gateway, tx } = setup(); expect(await gateway.applyDecision(candidate, decision)).toBe('APPLIED');
    for (const call of tx.importRecord.updateMany.mock.calls) expect(call[0].where).toMatchObject({
      retentionExpiresAt: expiresAt, AND: [{ OR: [{ legalHoldUntil: null }, { legalHoldUntil: { lte: now } }] }],
    });
    expect(tx.importBatch.updateMany.mock.calls[0][0].where).toMatchObject({ batchStatus: 'COMPLETED', claimedBy: null, claimUntil: null });
  });
  it('cannot purge active batches or a row with a newly added hold', async () => {
    const active = setup('RUNNING'); expect(await active.gateway.applyDecision(candidate, decision)).toBe('SKIPPED');
    expect(active.tx.importRecord.updateMany).not.toHaveBeenCalled();
    const held = setup('COMPLETED', 0); expect(await held.gateway.applyDecision(candidate, decision)).toBe('SKIPPED');
    expect(held.tx.importRecord.updateMany).toHaveBeenCalledOnce();
  });
  it('refuses a purge decision for a different owner, ID or expiry', async () => {
    await expect(setup().gateway.applyDecision(candidate, { ...decision, recordId: 'other' })).rejects.toThrow('DECISION_MISMATCH');
  });
});

it('a concurrent unfinished artifact cannot be silently counted as an accepted duplicate', async () => {
  const tx = { $queryRaw: vi.fn(async () => []), importRecord: {
    findMany: async () => [{ batchId: 'unfinished', status: 'STAGING_PENDING', sourceDedupKey: 'same-key' }],
    createMany: vi.fn(),
  } };
  const repo = new PrismaImportRepository({ $transaction: (work: any) => work(tx) } as any);
  await expect(repo.bulkCreateRecords([{ batchId: 'new', status: 'COMPLETE', sourceDedupKey: 'same-key', rawPayload: {} }])).rejects.toThrow('SOURCE_STAGING_BUSY');
  expect(tx.importRecord.createMany).not.toHaveBeenCalled();
});

it('batch diff pagination pins both versions and links already-resolved owner identities', async () => {
  const batches = ['left', 'right'].map(id => ({ id, sourceSystem: 'source', dataType: 'GENERIC', updatedAt: new Date(0), batchStatus: 'COMPLETED' }));
  const tx = { importBatch: { findMany: vi.fn(async () => batches) }, $queryRaw: vi.fn()
    .mockResolvedValueOnce([{ id: 'old', sourceDedupKey: 'external-old', promotedEntityId: 'owner-id', fingerprint: 'a' }])
    .mockResolvedValueOnce([{ id: 'new', sourceDedupKey: 'external-new', promotedEntityId: 'owner-id', fingerprint: 'b' }]) };
  const repo = new PrismaImportRepository({ $transaction: (work: any) => work(tx) } as any);
  expect((await repo.compareBatches('left', 'right')).counters.changed).toBe(1);
  await expect(repo.compareBatches('left', 'right', 2, { leftUpdatedAt: new Date(1).toISOString(), rightUpdatedAt: new Date(0).toISOString() })).rejects.toThrow('VERSION_CONFLICT');
  expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
});

it('record pagination after page 50 remains intact for large workers', async () => {
  const prisma = { importRecord: { findMany: vi.fn(async () => []), count: vi.fn(async () => 10_000) } };
  await new PrismaImportRepository(prisma as any).listRecords({ batchId: 'b', page: 52, pageSize: 100, workItemsOnly: true });
  expect(prisma.importRecord.findMany.mock.calls[0][0]).toMatchObject({ skip: 5100, take: 100 });
});

it('a diff cursor detects owner-link changes even when the parent batch version did not change', async () => {
  const batches = ['left', 'right'].map(id => ({ id, sourceSystem: 'source', dataType: 'GENERIC', updatedAt: new Date(0), batchStatus: 'COMPLETED' }));
  const a = { id: 'a', sourceDedupKey: 'one', fingerprint: sha('a') };
  const b = { id: 'b', sourceDedupKey: 'one', fingerprint: sha('b') };
  const tx = { importBatch: { findMany: async () => batches }, $queryRaw: vi.fn()
    .mockResolvedValueOnce([a]).mockResolvedValueOnce([b])
    .mockResolvedValueOnce([{ ...a, promotedEntityId: 'new-owner-link' }]).mockResolvedValueOnce([b]) };
  const repo = new PrismaImportRepository({ $transaction: (work: any) => work(tx) } as any);
  const first = await repo.compareBatches('left', 'right');
  await expect(repo.compareBatches('left', 'right', 1, { leftUpdatedAt: new Date(0).toISOString(), rightUpdatedAt: new Date(0).toISOString(),
    leftRecordVersion: first.leftRecordVersion, rightRecordVersion: first.rightRecordVersion })).rejects.toThrow('VERSION_CONFLICT');
});

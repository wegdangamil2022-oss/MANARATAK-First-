import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { ParsedImportRow, ImportParseError } from '@manaratak/domain';
import { ImportAdminUseCases, ImportArtifactUseCase, ImportParserRegistry, CsvImportStreamParser,
  NdjsonImportStreamParser, ImportSourceControlUseCases, SourceConnectorRegistry } from '@manaratak/application';
import { VerifiedImportArtifactGateway } from '../../src/import-foundation/VerifiedImportArtifactGateway';
import { PrismaImportRepository } from '../../src/import-foundation/PrismaImportRepository';
import { SourceAccessClassification, SourceConnectorCategory, SourceStatus } from '@manaratak/domain';

const locator = { bucket: 'private', path: 'clean/import.csv', storageClass: 'CLEAN' } as any;
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
async function* chunks(bytes: Uint8Array) { for (let i = 0; i < bytes.length; i += 3) yield bytes.subarray(i, i + 3); }
async function collect<T>(stream: AsyncIterable<T>) { const rows: T[] = []; for await (const row of stream) rows.push(row); return rows; }
function parserRegistry() { const parsers = new ImportParserRegistry(); parsers.register(new CsvImportStreamParser()); parsers.register(new NdjsonImportStreamParser()); return parsers; }
function staging(queueStatus = 'QUEUED') {
  const repo = { createBatch: vi.fn(async () => ({ id: 'batch-1' })),
    bulkCreateRecords: vi.fn(async (rows: any[]) => ({ count: rows.length, acceptedRecordIds: rows.map(row => row.id) })),
    recoverStaleStaging: vi.fn(), finalizeStagedStream: vi.fn(), rejectStagedStream: vi.fn() };
  const queue = { enqueueImportJob: vi.fn(), getJobStatus: vi.fn(async () => ({ status: queueStatus })) };
  const worker = { runOne: vi.fn() };
  return { repo, queue, worker, imports: new ImportAdminUseCases(repo as any, queue as any, undefined, worker as any) };
}

describe('Verified artifact import', () => {
  it('checks all native-stream bytes before yielding and preserves exact content', async () => {
    const bytes = Buffer.from('name\nمثال\n'); let finished = false;
    const gateway = new VerifiedImportArtifactGateway({ openRead: async function* () { yield* chunks(bytes); finished = true; } } as any);
    const stream = gateway.readVerified({ locator, expectedSha256: sha(bytes), expectedByteSize: bytes.length, maxBytes: 1024 });
    const output: Uint8Array[] = [];
    for await (const chunk of stream) { expect(finished).toBe(true); output.push(chunk); }
    expect(Buffer.concat(output)).toEqual(bytes);
  });
  it('never exposes checksum-mismatched or oversized bytes', async () => {
    const bytes = Buffer.from('name\nrow\n');
    const gateway = new VerifiedImportArtifactGateway({ openRead: () => chunks(bytes) } as any);
    const mismatch = gateway.readVerified({ locator, expectedSha256: '0'.repeat(64), expectedByteSize: bytes.length, maxBytes: 100 });
    await expect(mismatch[Symbol.asyncIterator]().next()).rejects.toThrow('CHECKSUM_MISMATCH');
    await expect(collect(gateway.readVerified({ locator, expectedSha256: sha(bytes), expectedByteSize: 2, maxBytes: 100 }))).rejects.toThrow('SIZE_MISMATCH');
  });
  it('refuses a whole-file fallback and propagates provider stream failures', async () => {
    const input = { locator, expectedSha256: '0'.repeat(64), expectedByteSize: 1, maxBytes: 100 };
    await expect(collect(new VerifiedImportArtifactGateway({ read: vi.fn() } as any).readVerified(input))).rejects.toThrow('STREAM_UNAVAILABLE');
    const gateway = new VerifiedImportArtifactGateway({ openRead: async function* () { throw new Error('PROVIDER_FAILED'); } } as any);
    await expect(collect(gateway.readVerified(input))).rejects.toThrow('PROVIDER_FAILED');
  });
  it('stages bounded chunks and never dispatches an owner inline', async () => {
    const { imports, repo, queue, worker } = staging();
    async function* rows() { for (let i = 0; i < 501; i++) yield new ParsedImportRow({ sourceRowNumber: i + 1, raw: { id: i } }); }
    const result = await imports.stageNormalizedStream({ ownerDomain: 'GENERIC', sourceSystem: 'MANUAL_EAP_UPLOAD', rows: rows() });
    expect(repo.bulkCreateRecords.mock.calls.map(call => call[0].length)).toEqual([500, 1]);
    expect(repo.finalizeStagedStream).toHaveBeenCalledWith('batch-1', 501, { receivedRecords: 501, skippedRecords: 0, invalidRecords: 0 }, undefined);
    expect(queue.enqueueImportJob).not.toHaveBeenCalled(); expect(worker.runOne).not.toHaveBeenCalled();
    expect(result.summary.stagedRecords).toBe(501);
    expect(repo.bulkCreateRecords.mock.calls[0][0][0].status).toBe('STAGING_PENDING');
  });
  it('rejects a partial parse before queueing and retains rejection evidence', async () => {
    const { imports, repo, queue } = staging();
    async function* rows() { for (let i = 0; i < 500; i++) yield new ParsedImportRow({ raw: { id: i } }); throw new Error('BROKEN_STREAM'); }
    await expect(imports.stageNormalizedStream({ ownerDomain: 'GENERIC', sourceSystem: 'MANUAL_EAP_UPLOAD', rows: rows() })).rejects.toThrow('BROKEN_STREAM');
    expect(repo.rejectStagedStream).toHaveBeenCalledWith('batch-1');
    expect(repo.finalizeStagedStream).not.toHaveBeenCalled(); expect(queue.enqueueImportJob).not.toHaveBeenCalled();
  });
  it('preserves separate invalid row evidence without storing sensitive raw fragments', async () => {
    const { imports, repo } = staging('RUNNING');
    async function* rows() { for (let i = 1; i <= 2; i++) yield new ImportParseError({ code: 'BAD_ROW', message: 'bad', sourceRowNumber: i, recoverable: true, rawFragment: 'secret' }); }
    const result = await imports.stageNormalizedStream({ ownerDomain: 'GENERIC', sourceSystem: 'MANUAL_EAP_UPLOAD', rows: rows() });
    expect(result.summary.invalidRecords).toBe(2); expect(result.status).toBe('RUNNING');
    const records = repo.bulkCreateRecords.mock.calls[0][0];
    expect(records[0].sourceDedupKey).not.toBe(records[1].sourceDedupKey);
    expect(JSON.stringify(records)).not.toContain('secret');
  });
  it('fails closed if persistence cannot identify accepted rows', async () => {
    const { imports, repo, queue } = staging(); repo.bulkCreateRecords.mockImplementation(async () => ({ count: 1 } as any));
    async function* rows() { yield new ParsedImportRow({ raw: { id: 1 } }); }
    await expect(imports.stageNormalizedStream({ ownerDomain: 'GENERIC', sourceSystem: 'MANUAL_EAP_UPLOAD', rows: rows() })).rejects.toThrow('ACCEPTANCE_IDS_REQUIRED');
    expect(queue.enqueueImportJob).not.toHaveBeenCalled();
  });
  it('checks actor ownership before reading bytes and pins manual provenance', async () => {
    const parsers = parserRegistry(); const bytes = Buffer.from('id\n1\n'); const asset = { checksum: { algorithm: 'sha256', hash: sha(bytes) }, locator, metadata: { byteSize: bytes.length } };
    const policy = { assertUsable: vi.fn(async () => asset) }; const reader = { readVerified: vi.fn(() => chunks(bytes)) };
    const imports = { stageNormalizedStream: vi.fn(async (input: any) => { await collect(input.rows); return { batchId: 'batch' }; }) };
    const useCase = new ImportArtifactUseCase(policy as any, reader, parsers, imports as any);
    const input = { assetId: 'asset-1', ownerDomain: 'GENERIC', expectedSha256: sha(bytes), format: 'csv' as const };
    await expect(useCase.preflight(input, '')).rejects.toThrow('ACTOR_REQUIRED'); expect(reader.readVerified).not.toHaveBeenCalled();
    expect(await useCase.preflight(input, 'admin')).toMatchObject({ validRows: 1, invalidRows: 0 });
    expect(policy.assertUsable).toHaveBeenCalledWith('asset-1', { purpose: 'IMPORT_ARTIFACT', expectedOwnerId: 'admin' });
    await useCase.stage(input, 'admin'); expect(imports.stageNormalizedStream.mock.calls[0][0].sourceSystem).toBe('MANUAL_EAP_UPLOAD');
    expect(await useCase.inspect('asset-1', 'admin')).not.toHaveProperty('locator');
    policy.assertUsable.mockRejectedValueOnce(new Error('ASSET_OWNER_MISMATCH'));
    const reads = reader.readVerified.mock.calls.length;
    await expect(useCase.preflight(input, 'other')).rejects.toThrow('OWNER_MISMATCH'); expect(reader.readVerified).toHaveBeenCalledTimes(reads);
  });
});

describe('stream parser safety', () => {
  it.each(['__proto__', 'constructor', '_phase6HandoffState', 'id,id', ''])('rejects unsafe CSV headers %s', async header => {
    await expect(collect(new CsvImportStreamParser().parse(chunks(Buffer.from(`${header},name\n1,a\n`)), { batchId: 'b' }))).rejects.toThrow(/HEADERS_INVALID|RESERVED_HANDOFF_METADATA_FORBIDDEN/);
  });
  it('rejects invalid UTF8, oversized rows and trailing quoted content', async () => {
    for (const parser of [new CsvImportStreamParser(), new NdjsonImportStreamParser()]) {
      await expect(collect(parser.parse(chunks(new Uint8Array([0xff])), { batchId: 'b' }))).rejects.toThrow();
      async function* huge() { yield Buffer.from('a'.repeat(1024 * 1024 + 2)); }
      await expect(collect(parser.parse(huge(), { batchId: 'b' }))).rejects.toThrow('ROW_SIZE_LIMIT');
    }
    await expect(collect(new CsvImportStreamParser().parse(chunks(Buffer.from('name\n"a"junk\n')), { batchId: 'b' }))).rejects.toThrow('TRAILING_QUOTED_CONTENT');
  });
  it('honors an explicit format and refuses ambiguous metadata', () => {
    const parsers = parserRegistry(); expect(parsers.resolve({ formatHint: 'csv', fileName: 'x.ndjson' })?.format).toBe('csv');
    expect(parsers.resolve({ formatHint: 'xml', fileName: 'x.csv' })).toBeNull();
    expect(() => parsers.resolve({ mimeType: 'text/csv', fileName: 'x.ndjson' })).toThrow('FORMAT_AMBIGUOUS');
  });
});

describe('generic source control', () => {
  const input = { sourceId: 'official-1', displayName: 'Official source', baseUrl: 'https://example.org/data/', category: SourceConnectorCategory.OFFICIAL_API,
    accessClassification: SourceAccessClassification.PUBLIC_ALLOWED, connectorId: 'api', connectorVersion: '1', rateLimitPerMinute: 20, allowedPathPrefixes: ['/data/'] };
  function control(existing: any = null) {
    const transaction = { getSource: vi.fn(async () => existing), registerSource: vi.fn(), replaceSource: vi.fn() };
    const sources = { withTransaction: vi.fn(() => transaction), getSource: vi.fn(async () => existing) };
    const atomic = { execute: vi.fn(async (_definition: any, mutation: any) => mutation({ boundaryId: 'tx' })) };
    const connectors = new SourceConnectorRegistry([{ connectorId: 'api', connectorVersion: '1', category: SourceConnectorCategory.OFFICIAL_API } as any]);
    return { transaction, sources, atomic, useCase: new ImportSourceControlUseCases(sources as any, connectors, atomic as any) };
  }
  it('creates disabled definitions inside the audited transaction using a server actor', async () => {
    const { useCase, transaction, atomic } = control(); await useCase.save(input, null, 'reviewed', { actorId: 'admin' });
    expect(transaction.registerSource.mock.calls[0][0]).toMatchObject({ status: SourceStatus.DISABLED, metadata: { ownerDomain: 'GENERIC' } });
    expect(atomic.execute.mock.calls[0][0]).toMatchObject({ domain: 'IMPORT', context: { actorId: 'admin' } });
  });
  it('refuses owner workspace writes, stale creates and missing actors', async () => {
    await expect(control({ metadata: { ownerDomain: 'SCHOLARSHIPS' } }).useCase.save(input, null, 'review', { actorId: 'admin' })).rejects.toThrow('OWNER_WORKSPACE_REQUIRED');
    await expect(control({ metadata: { ownerDomain: 'GENERIC' } }).useCase.save(input, null, 'review', { actorId: 'admin' })).rejects.toThrow('STATUS_CONFLICT');
    await expect(control().useCase.save(input, null, 'review', { actorId: '' })).rejects.toThrow('REVIEW_REQUIRED');
  });
  it.each(['/../data', '/data/..', '/%2e%2e/', '//other/', '/data?secret=1'])('refuses unsafe scopes %s', async scope => {
    await expect(control().useCase.save({ ...input, allowedPathPrefixes: [scope] }, null, 'review', { actorId: 'admin' })).rejects.toThrow('SCOPE_INVALID');
  });
  it('forwards the exact revision to compare-and-swap replacement and deactivates edits', async () => {
    const { useCase, transaction } = control({ metadata: { ownerDomain: 'GENERIC' } }); const revision = '2026-10-09T00:00:00.000Z';
    await useCase.save(input, revision, 'review', { actorId: 'admin' });
    expect(transaction.replaceSource).toHaveBeenCalledWith(expect.objectContaining({ status: 'DISABLED' }), new Date(revision));
  });
});

describe('Prisma artifact finalization fence', () => {
  it('does not promote staged rows when the batch changed ownership', async () => {
    const tx = { importBatch: { updateMany: vi.fn(async () => ({ count: 0 })) }, importRecord: { updateMany: vi.fn() } };
    const repository = new PrismaImportRepository({ $transaction: (fn: any) => fn(tx) } as any);
    await expect(repository.finalizeStagedStream('b', 1)).rejects.toThrow('STATE_CONFLICT');
    await repository.rejectStagedStream('b'); expect(tx.importRecord.updateMany).not.toHaveBeenCalled();
  });
  it('requires the actual promoted row count to match accepted rows', async () => {
    const tx = { importBatch: { updateMany: vi.fn(async () => ({ count: 1 })) }, importRecord: { updateMany: vi.fn(async () => ({ count: 0 })) } };
    const repository = new PrismaImportRepository({ $transaction: (fn: any) => fn(tx) } as any);
    await expect(repository.finalizeStagedStream('b', 1)).rejects.toThrow('ACCEPTANCE_COUNT_MISMATCH');
    expect(tx.importBatch.updateMany.mock.calls[0][0]).toMatchObject({ where: { claimedBy: 'ARTIFACT_STAGING', claimUntil: { gt: expect.any(Date) }, batchStatus: 'STAGING' }, data: { batchStatus: 'QUEUED', claimedBy: null, claimUntil: null } });
  });
});

describe('artifact rejection is never replay authority', () => {
  it('fences replay and claiming with durable staging evidence and excludes it from worker pages', async () => {
    const { PrismaImportQueueGateway } = await import('../../src/import-foundation/PrismaImportQueueGateway');
    const tx = { importBatch: { updateMany: vi.fn(async () => ({ count: 0 })), findFirst: vi.fn(async () => null) },
      importRecord: { findMany: vi.fn(async () => []), count: vi.fn(async () => 0) } };
    const prisma = { ...tx, $transaction: (fn: any) => fn(tx) };
    const queue = new PrismaImportQueueGateway(prisma as any);
    expect(await queue.replayJob({ batchId: 'rejected', fromCheckpoint: false })).toBe(false);
    const statuses = ['STAGING_PENDING', 'STAGING_INVALID', 'STAGING_REJECTED'];
    expect(tx.importBatch.updateMany.mock.calls[0][0].where).toMatchObject({
      records: { none: { status: { in: statuses } } },
      OR: [{ lastError: null }, { lastError: { not: 'IMPORT_ARTIFACT_STAGING_REJECTED' } }],
    });
    await queue.claimNextJob({ workerId: 'w', leaseDurationMs: 30_000 });
    expect(tx.importBatch.findFirst.mock.calls[0][0].where).toMatchObject({ records: { none: { status: { in: statuses } } } });
    await new PrismaImportRepository(prisma as any).listRecords({ batchId: 'rejected', workItemsOnly: true });
    expect(tx.importRecord.findMany.mock.calls[0][0].where.AND[0].status.notIn).toEqual(expect.arrayContaining(statuses));
  });
});

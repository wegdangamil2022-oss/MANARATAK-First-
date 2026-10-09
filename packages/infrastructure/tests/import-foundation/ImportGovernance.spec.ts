import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { ImportGovernanceUseCases, AcquireImportSourceUseCase, SourceConnectorRegistry } from '@manaratak/application';
import { ImportSourceDefinition, SourceAccessClassification as Access, SourceConnectorCategory as Category, SourceStatus, ParsedImportRow } from '@manaratak/domain';
import { ImportHandoffDispatcher } from '../../../application/src/import-foundation/services/ImportHandoffDispatcher';
import { PrismaImportScreeningReceiptStore, screeningReceiptIdentity } from '../../src/import-foundation/PrismaImportScreeningReceiptStore';
import { PrismaImportGovernanceGateway } from '../../src/import-foundation/PrismaImportGovernanceGateway';
import { PrismaImportSourceObservationGateway } from '../../src/import-foundation/PrismaImportSourceObservationGateway';
import { PrismaSourceAcquisitionLimiter } from '../../src/import-foundation/PrismaSourceAcquisitionLimiter';
import { SignedSourceAccessAuthority, assertRobotsAllowed } from '../../src/import-foundation/network/SignedSourceAccessAuthority';
import { NodeSafeSourceHttpTransport } from '../../src/import-foundation/network/NodeSafeSourceHttpTransport';
import { PrismaImportRepository } from '../../src/import-foundation/PrismaImportRepository';

const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const revision = new Date('2026-10-09T00:00:00.000Z');
const source = (classification = Access.PUBLIC_ALLOWED) => new ImportSourceDefinition({ sourceId: 'source', displayName: 'Source',
  baseUrl: 'https://example.org/data', category: Category.OFFICIAL_API, accessClassification: classification, status: SourceStatus.ACTIVE,
  connectorId: 'api', connectorVersion: '1', updatedAt: revision, rateLimitPerMinute: 60,
  metadata: { ownerDomain: 'GENERIC', allowedUrlScope: { allowedOrigins: ['https://example.org'], allowedPathPrefixes: ['/data'] } },
  ...(classification === Access.PUBLIC_ROBOTS_RESTRICTED ? { robotsPolicyUrl: 'https://example.org/robots.txt' } : {}) });
const handoff = { handoffId: 'h', ownerDomain: 'SCHOLARSHIPS', artifact: { sourceId: 'source' }, normalizedPayload: { name: 'Example' },
  provenance: { sourceSystem: 'source' }, validation: { state: 'VALID' as const, issues: [] }, execution: { executionId: 'batch', dryRun: false, attempt: 1, idempotencyKey: 'key' } };

function receiptFixture() {
  let row: any = null;
  const tx = { $queryRaw: vi.fn(async () => []), importScreeningReceipt: { findUnique: vi.fn(async () => row), create: vi.fn(async ({ data }: any) => { row = data; return data; }) } };
  const prisma = { ...tx, $transaction: vi.fn(async (work: any) => work(tx)) };
  return { prisma, tx, store: new PrismaImportScreeningReceiptStore(prisma as any) };
}
describe('durable pure-screening receipts', () => {
  it('stores once, reuses the result and fences changed semantic content', async () => {
    const { store, tx } = receiptFixture(); const screen = vi.fn(async () => ({ screening: true }));
    const dispatcher = new ImportHandoffDispatcher({ SCHOLARSHIPS: { effectMode: 'SCREENING_ONLY', accept: screen } }, store);
    expect(await dispatcher.dispatch(handoff)).toEqual({ screening: true });
    expect(await dispatcher.dispatch({ ...handoff, execution: { ...handoff.execution, attempt: 2 } })).toEqual({ screening: true });
    expect(screen).toHaveBeenCalledOnce(); expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
    expect(await dispatcher.findReceipt(handoff)).toEqual({ result: { screening: true } });
    await expect(dispatcher.dispatch({ ...handoff, normalizedPayload: { name: 'Changed' } })).rejects.toThrow('CONTENT_CONFLICT');
    expect(screen).toHaveBeenCalledOnce();
  });
  it('does not save failed or oversized owner screening as successful', async () => {
    const { store, tx } = receiptFixture();
    await expect(store.accept(handoff, async () => { throw new Error('SCREENING_FAILED'); })).rejects.toThrow('SCREENING_FAILED');
    await expect(store.accept(handoff, async () => ({ text: 'x'.repeat(300_000) }))).rejects.toThrow('RESULT_INVALID');
    expect(tx.importScreeningReceipt.create).not.toHaveBeenCalled();
  });
  it('matches receipts after PostgreSQL JSONB property ordering and date serialization', () => {
    const original = { ...handoff, normalizedPayload: { z: 1, a: 2 }, provenance: { ...handoff.provenance, acquiredAt: revision } };
    const persisted = { execution: { idempotencyKey: 'key', attempt: 2, dryRun: false, executionId: 'batch' },
      validation: { issues: [], state: 'VALID' }, provenance: { acquiredAt: revision.toISOString(), sourceSystem: 'source' },
      normalizedPayload: { a: 2, z: 1 }, artifact: { sourceId: 'source' }, ownerDomain: 'SCHOLARSHIPS', handoffId: 'h' };
    expect(screeningReceiptIdentity(persisted as any)).toEqual(screeningReceiptIdentity(original));
  });
  it('uses batch-bound receipt keys and excludes attempt changes only', () => {
    expect(screeningReceiptIdentity({ ...handoff, execution: { ...handoff.execution, attempt: 3 } })).toEqual(screeningReceiptIdentity(handoff));
    expect(screeningReceiptIdentity({ ...handoff, execution: { ...handoff.execution, executionId: 'other' } }).handoffKey).not.toEqual(screeningReceiptIdentity(handoff).handoffKey);
  });
});
describe('immutable mappings and delegated review', () => {
  const definition = { fields: [{ target: 'externalId', aliases: ['id','رقم'], type: 'string' as const, required: true },
    { target: 'amount', aliases: ['cost'], type: 'number' as const, required: false }] };
  const profile = { id: 'profile', sourceId: 'source', ownerDomain: 'SCHOLARSHIPS', version: 1, sourceRevision: revision, definition, definitionHash: 'hash' };
  it('retains raw provenance, maps aliases and validates required fields and types', () => {
    const raw = { 'رقم': '001', cost: '2.5', unused: 'keep' };
    expect(ImportGovernanceUseCases.mapRow(new ParsedImportRow({ sourceRowNumber: 7, raw }), profile)).toMatchObject({ raw,
      normalized: { externalId: '001', amount: 2.5 }, metadata: { mappingProfileId: 'profile' } });
    expect(ImportGovernanceUseCases.mapRow(new ParsedImportRow({ sourceRowNumber: 8, raw: { cost: '2' } }), profile)).toMatchObject({ code: 'IMPORT_MAPPING_REQUIRED_FIELD' });
    expect(ImportGovernanceUseCases.mapRow(new ParsedImportRow({ sourceRowNumber: 8, raw: { id: '1', cost: 'NaN' } }), profile)).toMatchObject({ code: 'IMPORT_MAPPING_TYPE_INVALID' });
    expect(ImportGovernanceUseCases.mapRow(new ParsedImportRow({ sourceRowNumber: 8, raw: { id: '1', 'رقم': '2' } }), profile)).toMatchObject({ code: 'IMPORT_MAPPING_ALIAS_AMBIGUOUS' });
  });
  it('rejects reserved fields, shared aliases and duplicate targets', () => {
    expect(() => ImportGovernanceUseCases.validateMapping({ fields: [{ ...definition.fields[0], target: 'constructor' }] })).toThrow();
    expect(() => ImportGovernanceUseCases.validateMapping({ fields: [definition.fields[0], { ...definition.fields[1], aliases: ['id'] }] })).toThrow('ALIAS_AMBIGUOUS');
    expect(() => ImportGovernanceUseCases.validateMapping({ fields: [definition.fields[0], definition.fields[0]] })).toThrow();
  });
  it('refuses profile/source/domain/revision substitution', async () => {
    const usecase = new ImportGovernanceUseCases({ getProfile: async () => profile } as any, {} as any, async () => true);
    await expect(usecase.pinnedProfile('profile', 'other', 'SCHOLARSHIPS')).rejects.toThrow('PROFILE_CONFLICT');
    await expect(usecase.pinnedProfile('profile', 'source', 'COURSES')).rejects.toThrow('PROFILE_CONFLICT');
    await expect(usecase.pinnedProfile('profile', 'source', 'SCHOLARSHIPS', new Date(0).toISOString())).rejects.toThrow('PROFILE_CONFLICT');
  });
  it('requires actual reviewer permission before writing an audited assignment', async () => {
    const gateway = { reviewDomain: async () => 'SCHOLARSHIPS', assign: vi.fn(), withTransaction: vi.fn() }; const atomic = { execute: vi.fn() };
    const usecase = new ImportGovernanceUseCases(gateway as any, atomic as any, async () => false);
    await expect(usecase.assign({ recordId: 'r', assigneeId: 'unauthorized', dueAt: new Date(Date.now()+60_000).toISOString(), expectedVersion: 0, reason: 'review' }, { actorId: 'manager' })).rejects.toThrow('AUTHORITY_REQUIRED');
    expect(atomic.execute).not.toHaveBeenCalled(); expect(gateway.assign).not.toHaveBeenCalled();
  });
  it('claims only the delegated assignee and exact version under a bounded lease', async () => {
    const tx = { $queryRaw: vi.fn(), importRecord: { findUnique: async () => ({ batchId: 'b', status: 'NEEDS_REVIEW', batch: { batchStatus: 'PARTIALLY_COMPLETED', updatedAt: revision } }) },
      importBatch: { updateMany: async () => ({ count: 1 }) }, importReviewAssignment: { updateMany: vi.fn(async () => ({ count: 0 })), findUnique: vi.fn() } };
    await expect(new PrismaImportGovernanceGateway(tx as any, true).claim({ recordId: 'r', actorId: 'actor', expectedVersion: 2 })).rejects.toThrow('REVIEW_CONFLICT');
    expect(tx.importReviewAssignment.updateMany.mock.calls[0][0]).toMatchObject({ where: { assigneeId: 'actor', version: 2, OR: [{ claimUntil: null }, { claimUntil: { lte: expect.any(Date) } }, { claimedBy: 'actor' }] }, data: { state: 'CLAIMED', claimUntil: expect.any(Date) } });
  });
});
describe('server signed approvals and robots', () => {
  const pair = generateKeyPairSync('ed25519'); const key = pair.publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const token = (classification: Access, changes: Record<string, unknown> = {}) => {
    const data = Buffer.from(JSON.stringify({ audience: 'MANARATAK_IMPORT', sourceId: 'source', sourceRevision: revision.toISOString(), classification,
      origin: 'https://example.org', pathPrefixes: ['/data'], policyReference: 'agreement-123', expiresAt: '2099-01-01T00:00:00.000Z',
      credentialBinding: 'IMPORT_SOURCE_CREDENTIAL_PROVIDER', ...changes })).toString('base64url');
    return `${data}.${sign(null, Buffer.from(data), pair.privateKey).toString('base64url')}`;
  };
  it('admits signed account scope with a server credential and refuses stale, expired and unsigned metadata', () => {
    const authority = new SignedSourceAccessAuthority(key, [token(Access.AUTHORIZED_ACCOUNT)], () => 'server-token');
    expect(authority.headersFor(source(Access.AUTHORIZED_ACCOUNT), new URL('https://example.org/data/items'))).toEqual({ Authorization: 'Bearer server-token' });
    expect(() => authority.headersFor(source(Access.AUTHORIZED_ACCOUNT), new URL('https://other.org/data'))).toThrow('SCOPE_MISMATCH');
    expect(() => authority.headersFor(source(Access.AUTHORIZED_ACCOUNT), new URL('https://example.org/data-evil'))).toThrow('SCOPE_MISMATCH');
    for (const changes of [{ expiresAt: '2000-01-01T00:00:00Z' }, { sourceRevision: new Date(0).toISOString() }])
      expect(() => new SignedSourceAccessAuthority(key, [token(Access.AUTHORIZED_ACCOUNT, changes)]).assertAllowed(source(Access.AUTHORIZED_ACCOUNT), Category.OFFICIAL_API)).toThrow('SIGNED_APPROVAL_REQUIRED');
    expect(() => new SignedSourceAccessAuthority(undefined).assertAllowed(source(Access.AUTHORIZED_ACCOUNT), Category.OFFICIAL_API)).toThrow('SIGNED_APPROVAL_REQUIRED');
  });
  it('rejects signature tampering and missing or injected credentials', () => {
    const valid = token(Access.AUTHORIZED_ACCOUNT); const tampered = 'A' + valid.slice(1);
    expect(() => new SignedSourceAccessAuthority(key, [tampered]).assertAllowed(source(Access.AUTHORIZED_ACCOUNT), Category.OFFICIAL_API)).toThrow();
    for (const value of [undefined, 'token\r\nHeader: injected'])
      expect(() => new SignedSourceAccessAuthority(key, [valid], () => value).assertAllowed(source(Access.AUTHORIZED_ACCOUNT), Category.OFFICIAL_API)).toThrow('CREDENTIAL_REQUIRED');
  });
  it('checks longest allow/disallow rules, user-agent specificity and unsupported crawl delay', () => {
    expect(() => assertRobotsAllowed('User-agent: *\nDisallow: /data\nAllow: /data/public', new URL('https://example.org/data/private'))).toThrow('PATH_DENIED');
    expect(() => assertRobotsAllowed('User-agent: *\nDisallow: /data\nAllow: /data/public', new URL('https://example.org/data/public/1'))).not.toThrow();
    expect(() => assertRobotsAllowed('User-agent: *\nDisallow: /\nUser-agent: ManaratakImport\nAllow: /data', new URL('https://example.org/data'))).not.toThrow();
    expect(() => assertRobotsAllowed('User-agent: *\nDisallow: /*secret$\nCrawl-delay: 5', new URL('https://example.org/data'))).toThrow('CRAWL_DELAY');
  });
  it('fetches robots separately with pinned DNS and never fetches a denied target', async () => {
    const executor = { execute: vi.fn(async () => ({ statusCode: 200, rawBytes: Buffer.from('User-agent: *\nDisallow: /data') })) };
    const policy = { validate: vi.fn(async (_source: any, value: string) => ({ url: new URL(value), addresses: ['93.184.216.34'] })) };
    const authority = new SignedSourceAccessAuthority(key, [token(Access.PUBLIC_ROBOTS_RESTRICTED)]);
    await expect(new NodeSafeSourceHttpTransport(policy as any, executor, authority).get(source(Access.PUBLIC_ROBOTS_RESTRICTED), {})).rejects.toThrow('PATH_DENIED');
    expect(executor.execute).toHaveBeenCalledOnce(); expect(executor.execute.mock.calls[0][0]).toMatchObject({ url: new URL('https://example.org/robots.txt'), headers: { 'User-Agent': 'ManaratakImport' } });
  });
});
describe('conditional verified snapshots, drift and fleet budgets', () => {
  it('reuses only an exact verified unexpired snapshot on 304', async () => {
    const bytes = Buffer.from('id\n1\n'); const acquire = vi.fn(async () => ({ sourceId: 'source', connectorId: 'api', connectorVersion: '1', rawBytes: Buffer.alloc(0), statusCode: 304, finalUrl: 'https://example.org/data', fetchedAt: new Date() }));
    const registry = new SourceConnectorRegistry([{ connectorId: 'api', connectorVersion: '1', category: Category.OFFICIAL_API, supports: () => true, acquire } as any]);
    const snapshot = { artifactId: 'raw', sourceId: 'source', connectorId: 'api', connectorVersion: '1', contentHash: hash(bytes), byteSize: bytes.length,
      requestedUrl: 'https://example.org/data', finalUrl: 'https://example.org/data', etag: '"version"', contentType: 'text/csv' };
    const snapshots = { get: async () => snapshot, read: vi.fn(async () => bytes), store: vi.fn() };
    const observations = { cached: async () => ({ artifactId: 'raw' }), remember: vi.fn() };
    const usecase = new AcquireImportSourceUseCase(registry, snapshots as any, undefined, undefined, observations as any);
    expect((await usecase.execute(source())).acquisition.rawBytes).toEqual(bytes);
    expect(acquire.mock.calls[0][1]).toMatchObject({ conditional: { etag: '"version"' } }); expect(snapshots.store).not.toHaveBeenCalled();
    snapshots.read.mockResolvedValue(Buffer.from('corrupt'));
    await expect(usecase.execute(source())).rejects.toThrow('SNAPSHOT_MISMATCH');
  });
  it('persists changed shape before returning the review-required blocker', async () => {
    const update = vi.fn(); const tx = { $queryRaw: vi.fn(), importSourceObservation: { findUnique: async () => ({ sourceRevision: revision, shapeHash: 'previous' }), update } };
    const prisma = { $transaction: async (work: any) => work(tx) };
    await expect(new PrismaImportSourceObservationGateway(prisma as any).observeShape(source(), { id: ['string'], newField: ['string'] })).rejects.toThrow('DRIFT_REVIEW_REQUIRED');
    expect(update.mock.calls[0][0].data).toMatchObject({ driftState: 'REVIEW_REQUIRED', pendingShape: { id: ['string'], newField: ['string'] } });
  });
  it('reserves fleet and origin slots atomically and refuses a long backlog before writes', async () => {
    const tx = { $queryRaw: vi.fn(), importRateBudget: { findUnique: vi.fn(async () => ({ nextAvailableAt: new Date(Date.now()+2000) })), upsert: vi.fn() } };
    const sleep = vi.fn(); const limiter = new PrismaSourceAcquisitionLimiter({ $transaction: async (work: any) => work(tx) } as any, sleep);
    await limiter.wait(source()); expect(tx.$queryRaw).toHaveBeenCalledTimes(3); expect(tx.importRateBudget.upsert).toHaveBeenCalledTimes(3); expect(sleep).toHaveBeenCalledWith(expect.any(Number));
    tx.importRateBudget.upsert.mockClear(); tx.importRateBudget.findUnique.mockResolvedValue({ nextAvailableAt: new Date(Date.now()+60_000) });
    await expect(limiter.wait(source())).rejects.toThrow('BUDGET_BUSY'); expect(tx.importRateBudget.upsert).not.toHaveBeenCalled();
  });
  it('fences source revocation and validates counters in the same finalization transaction', async () => {
    const tx = { importSourceRegistryEntry: { updateMany: vi.fn(async () => ({ count: 0 })) }, importBatch: { updateMany: vi.fn() } };
    const repository = new PrismaImportRepository({ $transaction: async (work: any) => work(tx) } as any);
    await expect(repository.finalizeStagedStream('b', 2, { receivedRecords: 2, skippedRecords: 0, invalidRecords: 0 }, { sourceId: 'source', revision: revision.toISOString() })).rejects.toThrow('STATUS_CONFLICT');
    expect(tx.importBatch.updateMany).not.toHaveBeenCalled();
    await expect(repository.finalizeStagedStream('b', 2, { receivedRecords: 1, skippedRecords: 0, invalidRecords: 0 })).rejects.toThrow('COUNTERS_INVALID');
  });
});

describe('owner review decisions and conservative recovery', () => {
  it('fences a delegated owner decision inside its transaction', async () => {
    const { PrismaScholarshipImportVerificationDecisionPort } = await import('../../src/scholarships/PrismaScholarshipImportDecisionPorts');
    const tx = { $queryRaw: vi.fn(), importReviewAssignment: { findUnique: async () => ({ state: 'CLAIMED', assigneeId: 'reviewer', claimedBy: 'reviewer', claimUntil: new Date(Date.now()+60_000) }) },
      scholarshipImportVerificationDecision: { create: vi.fn(async () => ({ id: 'decision', createdAt: revision })) } };
    const port = new PrismaScholarshipImportVerificationDecisionPort({ $transaction: async (work: any) => work(tx) } as any);
    await expect(port.record({ recordId: 'r', actorId: 'other', state: 'VERIFIED', reason: 'reviewed' })).rejects.toThrow('LEASE_REQUIRED');
    expect(tx.scholarshipImportVerificationDecision.create).not.toHaveBeenCalled();
    expect(await port.record({ recordId: 'r', actorId: 'reviewer', state: 'VERIFIED', reason: 'reviewed' })).toMatchObject({ decisionId: 'decision' });
    expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
  });
  it('refuses uncertain legacy queue recovery while retaining the batch evidence', async () => {
    const tx = { importBatch: { findUnique: async () => ({ id: 'b', batchStatus: 'CREATED', updatedAt: revision, totalRecords: 2 }), updateMany: async () => ({ count: 1 }), update: vi.fn() },
      importRecord: { count: vi.fn().mockResolvedValueOnce(2).mockResolvedValueOnce(1) } };
    await expect(new PrismaImportGovernanceGateway(tx as any, true).recoverLegacy({ batchId: 'b', expectedUpdatedAt: revision.toISOString(), decision: 'QUEUE' })).rejects.toThrow('EVIDENCE_REQUIRED');
    expect(tx.importBatch.update).not.toHaveBeenCalled();
  });
  it('never purges an uncertain dispatch even when its record says complete', async () => {
    const { PrismaImportRetentionGateway } = await import('../../src/retention/PrismaImportRetentionGateway');
    const { RetentionOwner, RetentionDisposition } = await import('@manaratak/domain');
    const tx = { importRecord: { findUnique: async () => ({ batchId: 'b', rawPayload: { _phase6HandoffState: 'DISPATCH_IN_FLIGHT' }, batch: { batchStatus: 'CANCELLED' } }), updateMany: vi.fn() }, importBatch: { updateMany: vi.fn() } };
    const candidate = { owner: RetentionOwner.IMPORT, recordId: 'r', expiresAt: new Date(0) };
    const decision = { ...candidate, disposition: RetentionDisposition.PURGE, decisionKey: 'key', reason: 'expired', decidedAt: new Date() };
    expect(await new PrismaImportRetentionGateway({ $transaction: async (work: any) => work(tx) } as any).applyDecision(candidate, decision)).toBe('SKIPPED');
    expect(tx.importRecord.updateMany).not.toHaveBeenCalled(); expect(tx.importBatch.updateMany).not.toHaveBeenCalled();
  });
  it('does not reconcile a record without a matching durable receipt', async () => {
    const tx = { importRecord: { findUnique: async () => ({ id: 'r', updatedAt: revision, rawPayload: { _phase6HandoffState: 'DISPATCH_IN_FLIGHT', _phase6HandoffEnvelope: handoff }, batch: {} }), updateMany: vi.fn() },
      importScreeningReceipt: { findUnique: async () => null } };
    await expect(new PrismaImportGovernanceGateway(tx as any, true).reconcile({ recordId: 'r', expectedUpdatedAt: revision.toISOString(), actorId: 'admin' })).rejects.toThrow('RECEIPT_NOT_FOUND');
    expect(tx.importRecord.updateMany).not.toHaveBeenCalled();
  });
  it('matches percent-encoded unreserved paths in robots rules', () => {
    expect(() => assertRobotsAllowed('User-agent: *\nDisallow: /private', new URL('https://example.org/%70rivate'))).toThrow('PATH_DENIED');
    expect(() => assertRobotsAllowed('User-agent: *\nDisallow: /خاص', new URL('https://example.org/خاص'))).toThrow('PATH_DENIED');
  });
});

it('cleans only marked dead-process spools and keeps live/unmarked artifacts', async () => {
  const { mkdtemp, mkdir, writeFile, rm, utimes, access } = await import('node:fs/promises');
  const { tmpdir, hostname } = await import('node:os'); const { join } = await import('node:path');
  const { sweepOrphanImportSpools } = await import('../../src/import-foundation/ImportSpoolMaintenance');
  const root = await mkdtemp(join(tmpdir(), 'spool-maintenance-test-')); const deadPid = 2147483647;
  const now = Date.now() + 25 * 3600_000;
  try {
    for (const [name, pid] of [['manaratak-import-dead', deadPid], ['manaratak-import-live', process.pid]] as const) {
      const directory = join(root, name); await mkdir(directory); await writeFile(join(directory,'owner.json'), JSON.stringify({ pid, host: hostname(), createdAt: Date.now() })); await utimes(directory, new Date(), new Date());
    }
    await mkdir(join(root,'manaratak-import-unmarked'));
    expect(await sweepOrphanImportSpools(root, now)).toBe(1);
    await expect(access(join(root,'manaratak-import-dead'))).rejects.toThrow();
    await expect(access(join(root,'manaratak-import-live'))).resolves.toBeUndefined();
    await expect(access(join(root,'manaratak-import-unmarked'))).resolves.toBeUndefined();
  } finally { await rm(root, { recursive: true, force: true }); }
});

it('does not queue an otherwise matching legacy batch with unknown handoff evidence', async () => {
  const tx = { $queryRaw: vi.fn(async () => [{ count: 0 }]), importBatch: { findUnique: async () => ({ id: 'b', dataType: 'SCHOLARSHIPS', batchStatus: 'CREATED', updatedAt: revision, totalRecords: 1 }),
    updateMany: async () => ({ count: 1 }), update: vi.fn() }, importRecord: { count: vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(0) } };
  await expect(new PrismaImportGovernanceGateway(tx as any, true).recoverLegacy({ batchId: 'b', expectedUpdatedAt: revision.toISOString(), decision: 'QUEUE' })).rejects.toThrow('EVIDENCE_REQUIRED');
  expect(tx.importBatch.update).not.toHaveBeenCalled();
});

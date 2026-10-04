import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { Prisma, type PrismaClient } from '@prisma/client';
import { InternationalTestImportChangeExecutor, prepareInternationalTestImport, type InternationalTestImportApproval } from '@manaratak/application';
import { PrismaInternationalTestImportChangeGateway } from '../../src/international-tests/PrismaInternationalTestImportChangeGateway';
import { actorId, reviewBody } from '../../../application/tests/tests-platform/fixtures/reviewedTestImport';

type Row = { id: string; [key: string]: unknown };
type Version = Row & { testId: string; versionNumber: number; status: string; metadata: Record<string, unknown>; contentBlocks: Row[]; _count: Record<string, number> };
type Root = Row & { _count: Record<string, number> };
type Find = { where: { id?: string; testId?: string; sourceHash?: string; metadata?: { path: string[]; equals: string }; NOT?: { status: string }; OR?: Array<Record<string, string>> }; orderBy?: unknown };
const copy = <T>(value: T): T => structuredClone(value);

/** In-memory Prisma delegates execute the actual gateway + draft-version
 * repository + authorization + atomic audit/outbox adapters. Not a database. */
function harness() {
  let roots: Root[] = []; let versions: Version[] = []; let audits: Row[] = []; let outbox: Row[] = [];
  const now = new Date('2026-10-02T00:00:00Z');
  const body = reviewBody(); const provider = { id: body.entries[0].core.providerId, displayName: 'Reviewed provider' };
  let permissions = ['admin:imports:manage', 'admin:international-tests:manage'];
  let policyIds: string[] = []; let verified = true; let active = true; let failAudit = false; let failOutbox = false;
  const root = (id: string) => { const row = roots.find(item => item.id === id); return row ? copy({ ...row, _count: { ...row._count, versions: versions.filter(version => version.testId === id).length } }) : null; };
  const version = (id: string) => { const row = versions.find(item => item.id === id); return row ? copy(row) : null; };
  const tx = {
    $executeRaw: vi.fn(async (..._query: unknown[]) => 0),
    $queryRaw: vi.fn(async () => [{ id: body.entries[0].targetId }]),
    identityRecord: { findUnique: vi.fn(async ({ where }: { where: { id: string } }) => where.id === actorId ? { id: actorId, status: active ? 'ACTIVE' : 'DISABLED', deletedAt: null, user: { isEmailVerified: verified }, account: { accessState: 'Active' } } : null) },
    roleAssignmentRecord: { findMany: vi.fn(async () => [{ id: 'assignment', identityId: actorId, roleId: 'role', assignedAt: now }]) },
    roleRecord: { findUnique: vi.fn(async () => ({ id: 'role', name: 'Import operator', description: '', permissions, policyIds, createdAt: now, updatedAt: now })) },
    policyRecord: { findUnique: vi.fn(async () => null) },
    internationalTestProvider: { findUnique: vi.fn(async ({ where }: { where: { id: string } }): Promise<typeof provider | null> => where.id === provider.id ? copy(provider) : null), findUniqueOrThrow: vi.fn(async () => copy(provider)) },
    internationalTestFamily: { findUnique: vi.fn(async () => null) },
    internationalTest: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => root(where.id)),
      findUniqueOrThrow: vi.fn(async ({ where }: { where: { id: string } }) => { const row = root(where.id); if (!row) throw new Error('missing root'); return row; }),
      findMany: vi.fn(async ({ where }: { where: { id: { not: string }; OR: Array<Record<string, string>> } }) => roots.filter(row => row.id !== where.id.not && where.OR.some(filter => Object.entries(filter).every(([key, value]) => row[key] === value))).map(row => ({ id: row.id }))),
      create: vi.fn(async ({ data }: { data: Row }) => { const row: Root = { localizedNameAr: null, localizedNameEn: null, abbreviation: null, familyId: null, currentPublishedVersionId: null, ...copy(data), createdAt: now, updatedAt: now, _count: { versions: 0, variants: 0 } }; roots.push(row); return copy(row); }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => { const row = roots.find(item => item.id === where.id)!; Object.assign(row, copy(data), { updatedAt: new Date() }); if (data.optionalFields === Prisma.DbNull) row.optionalFields = null; return root(row.id); }),
    },
    internationalTestVersion: {
      findUniqueOrThrow: vi.fn(async ({ where }: { where: { id: string } }) => { const row = version(where.id); if (!row) throw new Error('missing version'); return row; }),
      findMany: vi.fn(async ({ where }: Find) => versions.filter(row => {
        const path = where.metadata?.path ?? [];
        return path.reduce<unknown>((value, key) => value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined, row.metadata) === where.metadata?.equals;
      }).map(copy)),
      findFirst: vi.fn(async ({ where, orderBy }: Find) => {
        const matching = versions.filter(row => row.testId === where.testId && (!where.sourceHash || row.sourceHash === where.sourceHash) && (!where.NOT || row.status !== where.NOT.status) && (!where.metadata || row.metadata.sourceCycle === where.metadata.equals));
        return copy(orderBy ? matching.sort((a, b) => b.versionNumber - a.versionNumber)[0] ?? null : matching[0] ?? null);
      }),
      create: vi.fn(async ({ data }: { data: { testId: string; versionNumber: number; status: string; metadata: Record<string, unknown>; contentBlocks: { create: Record<string, unknown>[] }; [key: string]: unknown } }) => {
        const contentBlocks = data.contentBlocks.create.map(block => ({ id: randomUUID(), ...copy(block), createdAt: now, updatedAt: now })).sort((a, b) => a.id.localeCompare(b.id));
        const row: Version = { id: randomUUID(), ...copy(data), contentBlocks, createdAt: now, updatedAt: now, _count: { contentBlocks: contentBlocks.length, universityAdmissionRequirements: 0 } };
        versions.push(row); return copy(row);
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => { const row = versions.find(item => item.id === where.id)!; Object.assign(row, copy(data), { updatedAt: new Date() }); return version(row.id); }),
    },
    auditRecord: { create: vi.fn(async ({ data }: { data: Row }) => { if (failAudit) throw new Error('audit unavailable'); audits.push(copy(data)); return copy(data); }) },
    transactionalOutboxRecord: { create: vi.fn(async ({ data }: { data: Row }) => { if (failOutbox) throw new Error('outbox unavailable'); outbox.push(copy(data)); return copy(data); }) },
  };
  const prisma = { $transaction: vi.fn(async (operation: (value: typeof tx) => Promise<unknown>, _options?: unknown) => {
    const snapshot = copy({ roots, versions, audits, outbox });
    try { return await operation(tx); } catch (error) { ({ roots, versions, audits, outbox } = snapshot); throw error; }
  }) } as unknown as PrismaClient;
  const executor = new InternationalTestImportChangeExecutor(new PrismaInternationalTestImportChangeGateway(prisma));
  const plan = prepareInternationalTestImport(body);
  const approval = async (rollback = false): Promise<InternationalTestImportApproval> => ({ actorId, planHash: plan.planHash, previewHash: (await executor.preview(plan, actorId)).previewHash, approval: rollback ? 'APPROVE_ROLLBACK' : 'APPROVE_WRITE', recoveryGateToken: 'test-only-proof', recoveryEvidenceReference: 'recovery/test-pilot' });
  return { tx, prisma, executor, plan, approval, provider, state: () => copy({ roots, versions, audits, outbox }), setPermissions: (value: string[]) => { permissions = value; }, setPolicy: () => { policyIds = ['missing-policy']; }, setVerified: () => { verified = false; }, setInactive: () => { active = false; }, fail: (kind: string) => { failAudit = kind === 'audit'; failOutbox = kind === 'outbox'; }, seed: (row: Root) => roots.push(copy(row)), seedVersion: (row: Version) => versions.push(copy(row)), changeRoot: (fields: Record<string, unknown>) => Object.assign(roots[0], fields), changeVersion: (fields: Record<string, unknown>) => Object.assign(versions[0], fields) };
}
describe('governed test writer with in-memory Prisma transaction', () => {
  it('dry-run uses a READ ONLY snapshot and performs zero mutations', async () => {
    const h = harness(); const report = await h.executor.preview(h.plan, actorId);
    expect(report).toMatchObject({ state: 'READY', databaseWrites: 0 });
    expect((h.tx.$executeRaw.mock.calls[0][0] as string[])[0]).toBe('SET TRANSACTION READ ONLY');
    expect(h.state()).toEqual({ roots: [], versions: [], audits: [], outbox: [] });
  });
  it.each(['student', 'single-permission', 'unverified', 'inactive', 'policy-denied', 'unknown-actor'])('denies %s without writing', async kind => {
    const h = harness();
    if (kind === 'student') h.setPermissions([]);
    if (kind === 'single-permission') h.setPermissions(['admin:imports:manage']);
    if (kind === 'unverified') h.setVerified();
    if (kind === 'inactive') h.setInactive();
    if (kind === 'policy-denied') h.setPolicy();
    await expect(h.executor.preview(h.plan, kind === 'unknown-actor' ? 'unknown' : actorId)).rejects.toThrow(/ACTOR/);
    expect(h.state().roots).toHaveLength(0);
  });
  it('creates a reviewed draft with complete source, provenance and atomic audit/outbox; retry is zero-write', async () => {
    const h = harness(); const approval = await h.approval();
    expect(await h.executor.commit(h.plan, approval)).toMatchObject({ state: 'APPLIED', created: 1, updated: 0, replayed: false });
    const state = h.state();
    expect(state.roots[0]).toMatchObject({ id: h.plan.entries[0].targetId, status: 'NEEDS_REVIEW', isPubliclyVisible: false, providerId: h.provider.id });
    expect(state.versions[0]).toMatchObject({ status: 'DRAFT', sourceHash: h.plan.entries[0].sourceHash, metadata: { sourceCycle: '2026', importedBy: actorId, m10Import: { planHash: h.plan.planHash, state: 'APPLIED', actorId } } });
    expect(state.versions[0].contentBlocks).toHaveLength(3);
    expect(state.versions[0].contentBlocks.find(block => block.blockKey === 'source.raw')?.content).toBe(h.plan.entries[0].rawContent);
    expect(state.versions[0].contentBlocks.every(block => block.reviewStatus === 'NEEDS_REVIEW')).toBe(true);
    expect(state.audits).toHaveLength(1); expect(state.outbox).toHaveLength(1);
    expect(await h.executor.reconcile(h.plan, actorId)).toMatchObject({ state: 'PASS', databaseWrites: 0 });
    expect(await h.executor.commit(h.plan, approval)).toMatchObject({ replayed: true, databaseWrites: 0 });
    expect(h.state().audits).toHaveLength(1); expect(h.state().versions).toHaveLength(1);
  });
  it('denies stale preview after provider changes', async () => {
    const h = harness(); const approval = await h.approval(); h.provider.displayName = 'Changed provider';
    await expect(h.executor.commit(h.plan, approval)).rejects.toThrow('STALE_PREVIEW');
    expect(h.state().roots).toHaveLength(0);
  });
  it('checks permissions again before write after preview', async () => {
    const h = harness(); const approval = await h.approval(); h.setPermissions([]);
    await expect(h.executor.commit(h.plan, approval)).rejects.toThrow('PERMISSION_DENIED');
    expect(h.state().roots).toHaveLength(0);
  });
  it('denies canonical collisions and missing update owners', async () => {
    const h = harness(); h.seed({ id: randomUUID(), slug: h.plan.entries[0].core.slug, _count: {} });
    expect((await h.executor.preview(h.plan, actorId)).issues).toContain('TEST_IMPORT_CANONICAL_IDENTITY_COLLISION');
    await expect(h.executor.commit(h.plan, await h.approval())).rejects.toThrow('PREVIEW_BLOCKED');
    const body = reviewBody(); Object.assign(body.entries[0], { sourceClassification: 'REPLACE_EXISTING', resolution: 'APPROVE_UPDATE' });
    expect((await h.executor.preview(prepareInternationalTestImport(body), actorId)).issues).toContain('TEST_IMPORT_UPDATE_OWNER_NOT_FOUND');
  });
  it.each(['audit', 'outbox'])('rolls back all root/version/source writes if %s fails', async kind => {
    const h = harness(); const approval = await h.approval(); h.fail(kind);
    await expect(h.executor.commit(h.plan, approval)).rejects.toThrow('unavailable');
    expect(h.state()).toEqual({ roots: [], versions: [], audits: [], outbox: [] });
  });
  it('compensates CREATE by archiving and superseding, retaining raw evidence; repeated rollback writes zero', async () => {
    const h = harness(); await h.executor.commit(h.plan, await h.approval());
    const approval = await h.approval(true);
    expect(await h.executor.rollback(h.plan, approval)).toMatchObject({ state: 'ROLLED_BACK', replayed: false });
    expect(h.state().roots[0].status).toBe('ARCHIVED'); expect(h.state().versions[0].status).toBe('SUPERSEDED');
    expect(h.state().versions[0].contentBlocks).toHaveLength(3);
    expect(h.state().audits).toHaveLength(2); expect(h.state().outbox).toHaveLength(2);
    expect(await h.executor.reconcile(h.plan, actorId)).toMatchObject({ state: 'PASS' });
    expect(await h.executor.rollback(h.plan, approval)).toMatchObject({ replayed: true, databaseWrites: 0 });
    await expect(h.executor.commit(h.plan, { ...approval, approval: 'APPROVE_WRITE' })).rejects.toThrow('ROLLED_BACK_REQUIRES_NEW_REVIEW');
  });
  it('restores touched UPDATE fields and preserves canonical identity/previous raw versions', async () => {
    const h = harness(); const entry = h.plan.entries[0];
    h.seed({ id: entry.targetId, ...entry.core, providerName: h.provider.displayName, displayName: 'Old display', familyId: null, localizedNameAr: null, localizedNameEn: null, abbreviation: null, optionalFields: { preserved: 'original' }, status: 'NEEDS_REVIEW', isPubliclyVisible: false, currentPublishedVersionId: null, _count: { versions: 0, variants: 0 } });
    const originalVersion: Version = { id: randomUUID(), testId: entry.targetId, versionNumber: 1, status: 'DRAFT', metadata: { sourceCycle: '2025' }, contentBlocks: [{ id: randomUUID(), content: 'Historical raw evidence' }], _count: { contentBlocks: 1 } };
    h.seedVersion(originalVersion);
    const plan = prepareInternationalTestImport({ ...reviewBody(), entries: [{ ...entry, sourceClassification: 'REPLACE_EXISTING', resolution: 'APPROVE_UPDATE' }] });
    const approval = { ...await h.approval(), planHash: plan.planHash, previewHash: (await h.executor.preview(plan, actorId)).previewHash };
    expect(await h.executor.commit(plan, approval)).toMatchObject({ updated: 1, created: 0 });
    expect(h.state().roots[0].displayName).toBe(entry.core.displayName);
    const after = await h.executor.preview(plan, actorId);
    await h.executor.rollback(plan, { ...approval, approval: 'APPROVE_ROLLBACK', previewHash: after.previewHash });
    expect(h.state().roots[0]).toMatchObject({ displayName: 'Old display', slug: entry.core.slug, optionalFields: { preserved: 'original' } });
    expect(h.state().versions[0]).toEqual(originalVersion);
    expect(h.state().versions[1].versionNumber).toBe(2);
    expect(await h.executor.reconcile(plan, actorId)).toMatchObject({ state: 'PASS' });
  });
  it.each(['root', 'source', 'publication', 'dependencies'])('denies replay/rollback and fails reconciliation after %s drift', async kind => {
    const h = harness(); await h.executor.commit(h.plan, await h.approval()); const approval = await h.approval(true);
    if (kind === 'root') h.changeRoot({ displayName: 'Edited by someone else' });
    if (kind === 'source') h.changeVersion({ sourceHash: 'f'.repeat(64) });
    if (kind === 'publication') h.changeRoot({ status: 'PUBLISHED', isPubliclyVisible: true });
    if (kind === 'dependencies') h.changeVersion({ _count: { contentBlocks: 3, universityAdmissionRequirements: 1 } });
    expect(await h.executor.reconcile(h.plan, actorId)).toMatchObject({ state: 'FAIL' });
    await expect(h.executor.rollback(h.plan, approval)).rejects.toThrow('ROLLBACK_DRIFT');
    await expect(h.executor.commit(h.plan, { ...approval, approval: 'APPROVE_WRITE' })).rejects.toThrow('REPLAY_DRIFT');
    expect(h.state().audits).toHaveLength(1);
  });
  it('does not report reconciliation PASS before an import', async () => {
    const h = harness(); expect(await h.executor.reconcile(h.plan, actorId)).toMatchObject({ state: 'FAIL', issues: ['TEST_IMPORT_RECEIPT_NOT_APPLIED'] });
  });
  it('denies an UPDATE to a published owner or mismatched canonical identity', async () => {
    const h = harness(); const entry = h.plan.entries[0];
    h.seed({ id: entry.targetId, ...entry.core, canonicalName: 'Different identity', status: 'PUBLISHED', isPubliclyVisible: true, _count: {} });
    const plan = prepareInternationalTestImport({ ...reviewBody(), entries: [{ ...entry, sourceClassification: 'REPLACE_EXISTING', resolution: 'APPROVE_UPDATE' }] });
    expect((await h.executor.preview(plan, actorId)).issues).toEqual(expect.arrayContaining(['TEST_IMPORT_OWNER_IMMUTABLE', 'TEST_IMPORT_IDENTITY_MISMATCH:canonicalName']));
  });
  it('rejects a missing provider and incompatible family', async () => {
    const h = harness(); h.tx.internationalTestProvider.findUnique.mockResolvedValue(null);
    const body = reviewBody(); Object.assign(body.entries[0].core, { familyId: randomUUID() });
    expect((await h.executor.preview(prepareInternationalTestImport(body), actorId)).issues).toEqual(expect.arrayContaining(['TEST_IMPORT_PROVIDER_NOT_FOUND', 'TEST_IMPORT_FAMILY_CATEGORY_MISMATCH']));
  });
  it('blocks importing the same source/cycle under a fresh change-set id', async () => {
    const h = harness(); await h.executor.commit(h.plan, await h.approval());
    const entry = h.plan.entries[0];
    const plan = prepareInternationalTestImport({ ...reviewBody(), changeSetId: randomUUID(), entries: [{ ...entry, sourceClassification: 'REPLACE_EXISTING', resolution: 'APPROVE_UPDATE' }] });
    expect((await h.executor.preview(plan, actorId)).issues).toContain('TEST_IMPORT_SOURCE_CYCLE_ALREADY_EXISTS');
  });
  it('detects within-plan dedup collisions across providers sharing a display name', async () => {
    const h = harness(); const entry = h.plan.entries[0];
    h.tx.internationalTestProvider.findUnique.mockImplementation(async ({ where }) => ({ ...h.provider, id: where.id }));
    const plan = prepareInternationalTestImport({ ...reviewBody(), entries: [entry, { ...entry, sourceKey: 'language/Second_2026.md', targetId: randomUUID(), core: { ...entry.core, publicId: 'SECOND', slug: 'second-test', providerId: randomUUID() } }] });
    expect((await h.executor.preview(plan, actorId)).issues).toContain('TEST_IMPORT_CANONICAL_IDENTITY_COLLISION');
    expect(h.state().roots).toHaveLength(0);
  });
  it('rolls back an entire two-entry batch if its audit fails', async () => {
    const h = harness(); const entry = h.plan.entries[0];
    const plan = prepareInternationalTestImport({ ...reviewBody(), entries: [entry, { ...entry, sourceKey: 'language/Second_2026.md', targetId: randomUUID(), core: { ...entry.core, publicId: 'SECOND', slug: 'second-test', canonicalName: 'Second canonical test' } }] });
    const approval = { ...await h.approval(), planHash: plan.planHash, previewHash: (await h.executor.preview(plan, actorId)).previewHash };
    h.fail('audit');
    await expect(h.executor.commit(plan, approval)).rejects.toThrow('unavailable');
    expect(h.tx.internationalTest.create).toHaveBeenCalledTimes(2);
    expect(h.state()).toEqual({ roots: [], versions: [], audits: [], outbox: [] });
  });
  it('an outbox failure during rollback restores APPLIED state atomically', async () => {
    const h = harness(); await h.executor.commit(h.plan, await h.approval()); const approval = await h.approval(true);
    const before = h.state(); h.fail('outbox');
    await expect(h.executor.rollback(h.plan, approval)).rejects.toThrow('unavailable');
    expect(h.state()).toEqual(before);
    expect(await h.executor.reconcile(h.plan, actorId)).toMatchObject({ state: 'PASS' });
  });
});

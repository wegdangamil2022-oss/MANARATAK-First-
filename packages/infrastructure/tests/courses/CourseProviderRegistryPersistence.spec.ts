import { describe, expect, it, vi } from 'vitest';
import { Prisma, type PrismaClient } from '@prisma/client';
import { type AtomicPersistenceContext, type UpdateCourseProviderMappings } from '@manaratak/domain';
import { PrismaExternalCourseProviderRepository } from '../../src/courses/PrismaExternalCourseProviderRepository';

const command: UpdateCourseProviderMappings = { expectedUpdatedAt: '2026-10-01T00:00:00.000Z', displayName: 'Edited', officialWebsite: 'https://example.com', aliases: [{ alias: 'Old alias', locale: 'en' }, { alias: 'New alias' }], allowedDomains: ['example.com'], reason: 'Review source', evidenceReference: 'review-1', mappingsReviewed: true };
function fixture() {
  const row = { id: 'provider-1', publicId: 'PROVIDER-1', slug: 'provider', canonicalName: 'Canonical', normalizedCanonicalName: 'canonical', displayName: 'Original', status: 'APPROVED', updatedAt: new Date(command.expectedUpdatedAt), createdAt: new Date(command.expectedUpdatedAt), aliases: [{ id: 'old-id', alias: 'Old alias', normalizedAlias: 'old alias', locale: 'en', source: 'Workbook' }], allowedDomains: [] };
  const tx = { $queryRaw: vi.fn().mockResolvedValue([]), externalCourseProvider: { findUnique: vi.fn(async ({ where }: { where: { id?: string; normalizedCanonicalName?: string } }) => where.id ? row : null), update: vi.fn().mockResolvedValue(row), findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(151) }, externalCourseProviderAlias: { findUnique: vi.fn().mockResolvedValue(null), deleteMany: vi.fn(), upsert: vi.fn() }, externalCourseProviderDomain: { deleteMany: vi.fn(), upsert: vi.fn() } };
  const repository = new PrismaExternalCourseProviderRepository(tx as unknown as PrismaClient);
  const context = { boundaryId: 'memory-transaction', transactionClient: tx } as AtomicPersistenceContext;
  return { row, tx, repository, context };
}
describe('M10-09 typed provider persistence (Prisma mocks, no DB)', () => {
  it('fences health/continuation writes so a stale snapshot cannot restore removed mappings', async () => {
    const f = fixture(); f.row.updatedAt = new Date('2026-10-02T00:00:00Z');
    const findUnique = vi.fn().mockResolvedValue(f.row); const upsert = vi.fn();
    const tx = { $queryRaw: vi.fn(), externalCourseProvider: { findUnique, upsert } };
    const prisma = { $transaction: vi.fn(async (work: (tx: unknown) => Promise<unknown>) => work(tx)) };
    const repository = new PrismaExternalCourseProviderRepository(prisma as unknown as PrismaClient);
    await expect(repository.upsertSeedProvider({ ...f.row, expectedUpdatedAt: command.expectedUpdatedAt } as never)).rejects.toThrow('PROVIDER_STALE');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1); expect(tx.$queryRaw).toHaveBeenCalledTimes(1); expect(upsert).not.toHaveBeenCalled();
  });
  it('fences by timestamp, preserves identity/status/alias ID and records new alias provenance', async () => {
    const f = fixture(); await f.repository.updateMappingsInTransaction(f.row.id, command, f.context);
    expect(f.tx.$queryRaw).toHaveBeenCalledTimes(2);
    const update = f.tx.externalCourseProvider.update.mock.calls[0][0] as unknown as { where: { id: string }; data: Record<string, unknown> };
    expect(update.where.id).toBe(f.row.id); expect(update.data).toHaveProperty('displayName', 'Edited');
    for (const field of ['id', 'publicId', 'slug', 'canonicalName', 'status', 'sourceTrustLevel', 'lastVerifiedAt', 'connectorKey']) expect(update.data).not.toHaveProperty(field);
    expect(f.tx.externalCourseProviderAlias.upsert.mock.calls[0][0]).toMatchObject({ where: { normalizedAlias: 'old alias' }, update: { source: 'Workbook' } });
    expect(f.tx.externalCourseProviderAlias.upsert.mock.calls[1][0]).toMatchObject({ create: { providerId: f.row.id, source: 'ADMIN_REVIEW:review-1' } });
  });
  it.each(['STALE', 'READ_ONLY', 'NOT_FOUND'] as const)('rejects %s before modifying rows', async failure => {
    const f = fixture(); if (failure === 'STALE') f.row.updatedAt = new Date('2026-10-02T00:00:00Z');
    if (failure === 'READ_ONLY') f.row.status = 'ARCHIVED';
    if (failure === 'NOT_FOUND') f.tx.externalCourseProvider.findUnique.mockResolvedValue(null);
    await expect(f.repository.updateMappingsInTransaction(f.row.id, command, f.context)).rejects.toThrow('PROVIDER_' + failure);
    expect(f.tx.externalCourseProvider.update).not.toHaveBeenCalled(); expect(f.tx.externalCourseProviderAlias.deleteMany).not.toHaveBeenCalled();
  });
  it('rejects an alias owned by another provider before any write', async () => {
    const f = fixture(); f.tx.externalCourseProviderAlias.findUnique.mockResolvedValue({ providerId: 'foreign-provider' });
    await expect(f.repository.updateMappingsInTransaction(f.row.id, command, f.context)).rejects.toThrow('MAPPING_CONFLICT'); expect(f.tx.externalCourseProvider.update).not.toHaveBeenCalled();
  });
  it('maps a racing unique constraint to conflict for the outer transaction to roll back', async () => {
    const f = fixture(); f.tx.externalCourseProviderAlias.upsert.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('collision', { code: 'P2002', clientVersion: '5.22.0' }));
    await expect(f.repository.updateMappingsInTransaction(f.row.id, command, f.context)).rejects.toThrow('MAPPING_CONFLICT'); expect(f.tx.externalCourseProviderDomain.upsert).not.toHaveBeenCalled();
  });
  it('fails closed without a transaction client', async () => {
    const f = fixture(); await expect(f.repository.updateMappingsInTransaction(f.row.id, command, { boundaryId: 'unbound' })).rejects.toThrow('AUDITED_TRANSACTION_REQUIRED'); expect(f.tx.$queryRaw).not.toHaveBeenCalled();
  });
  it('uses matching list/count filters and stable pagination order', async () => {
    const f = fixture(); expect(await f.repository.listRegistry({ page: 2, pageSize: 50, q: 'alias' })).toMatchObject({ total: 151 });
    const query = f.tx.externalCourseProvider.findMany.mock.calls[0][0]; expect(query).toMatchObject({ skip: 50, take: 50, orderBy: [{ canonicalName: 'asc' }, { id: 'asc' }] });
    expect(f.tx.externalCourseProvider.count.mock.calls[0][0].where).toEqual(query.where);
  });
});

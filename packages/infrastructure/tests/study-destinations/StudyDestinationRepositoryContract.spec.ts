import { describe, it, expect, vi } from 'vitest';
import { PrismaStudyDestinationRepository } from '../../src/study-destinations/PrismaStudyDestinationRepository';
function build() {
  const tx: any = {
    referenceCountry: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(60),
    },
    studyDestinationProfile: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(60),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    $queryRaw: vi.fn().mockResolvedValue([]),
  };
  const prisma: any = { ...tx, $transaction: vi.fn(async (work: any) => work(tx)) };
  return { tx, prisma, repository: new PrismaStudyDestinationRepository(prisma) };
}
describe('Study destination typed persistence contract without a database', () => {
  it('paginates canonical countries before materialization with one join read and one count in a snapshot', async () => {
    const x = build();
    await x.repository.listAdminCountries({
      page: 3,
      pageSize: 20,
      status: 'NO_PROFILE',
      q: 'Yemen',
      missingCheck: 'image',
    });
    expect(x.tx.referenceCountry.findMany).toHaveBeenCalledTimes(1);
    expect(x.tx.referenceCountry.count).toHaveBeenCalledTimes(1);
    const args = x.tx.referenceCountry.findMany.mock.calls[0][0];
    expect(args).toMatchObject({
      skip: 40,
      take: 20,
      include: { studyDestinationProfile: { include: { studyLanguages: true } } },
      where: { isActive: true, lifecycleState: 'ACTIVE', studyDestinationProfile: { is: null } },
    });
    expect(args.where.AND[0].OR[1]).toEqual({
      studyDestinationProfile: { is: { imageAssetId: null } },
    });
    expect(x.tx.referenceCountry.count).toHaveBeenCalledWith({ where: args.where });
    expect(x.prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'RepeatableRead',
    });
  });
  it('puts published status, active parent, freshness and proof constraints into row and count queries', async () => {
    const x = build();
    await x.repository.listPublished({ page: 2, pageSize: 20, isFeatured: true });
    const args = x.tx.studyDestinationProfile.findMany.mock.calls[0][0];
    expect(args).toMatchObject({
      skip: 20,
      take: 20,
      where: {
        status: 'PUBLISHED',
        sourceVerificationStatus: 'VERIFIED',
        isFeatured: true,
        countryReference: { isActive: true, lifecycleState: 'ACTIVE' },
      },
    });
    expect(args.where.AND).toHaveLength(2);
    expect(x.tx.studyDestinationProfile.count).toHaveBeenCalledWith({ where: args.where });
  });
  it('fails closed outside a transaction or on a stale revision without changing language joins', async () => {
    const x = build();
    await expect(
      x.repository.update('profile', { studyLanguageReferenceIds: ['lang'] }, undefined, 1),
    ).rejects.toThrow('TRANSACTION_REQUIRED');
    const bound = x.repository.withTransaction({
      boundaryId: 'test',
      transactionClient: x.tx,
    } as any);
    await expect(
      bound.update('profile', { studyLanguageReferenceIds: ['lang'] }, undefined, 1),
    ).rejects.toThrow('VERSION_CONFLICT');
    expect(x.tx.studyDestinationProfile.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'profile', revision: 1, updatedAt: undefined } }),
    );
  });
});

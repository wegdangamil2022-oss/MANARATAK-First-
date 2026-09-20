import { describe, expect, it, vi } from 'vitest';
import { Phase10CatalogRepository } from '../../src/majors/Phase10CatalogRepository';

describe('Phase10CatalogRepository canonical identity projection', () => {
  it('returns Major.id and keeps MajorLevelProfile.id separate', async () => {
    const prisma = {
      majorLevelProfile: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'profile-1',
            majorId: 'major-1',
            code: 'MJR-0001',
            status: 'READY_TO_REVIEW',
            completenessStatus: 'COMPLETE',
            displayName: 'Computer Science',
            localizedNameAr: null,
            localizedNameEn: null,
            metadata: {},
            updatedAt: new Date('2026-01-01'),
          },
        ]),
      },
    };
    const repository = new Phase10CatalogRepository(prisma as any);
    vi.spyOn(repository, 'loadCatalog').mockReturnValue([
      {
        id: 'cat-MJR-0001',
        code: 'MJR-0001',
        displayName: 'Computer Science',
        degreeLevel: 'BACHELOR',
        catalogKind: 'BACHELOR',
        targetDomain: 'MAJOR',
        status: 'DRAFT',
      },
    ]);
    (repository as any).loadDetails = () => new Map();

    const result = await repository.listCatalog({ page: 1, pageSize: 10 });

    expect(result.data[0]).toMatchObject({
      id: 'major-1',
      profileId: 'profile-1',
      hasDbDetails: true,
    });
    expect(prisma.majorLevelProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({ majorId: true }),
      }),
    );
  });
});

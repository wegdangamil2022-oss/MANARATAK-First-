import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { PrismaMajorRepository } from '../../src/majors/PrismaMajorRepository';

function fixture() {
  const prisma = {
    majorVersion: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'version-1', profileId: 'profile-1', majorId: 'major-1',
        status: 'READY_TO_REVIEW', publishedAt: null,
        profile: { majorId: 'major-1', status: 'READY_TO_REVIEW' },
      }),
      update: vi.fn(),
    },
    majorContentSection: {
      findUnique: vi.fn().mockResolvedValue({ profileId: 'profile-2', versionId: 'version-2', sectionKey: 'overview' }),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    majorLevelProfile: { update: vi.fn() },
  };
  const base = new PrismaMajorRepository(prisma as unknown as PrismaClient);
  const bound = base.withTransaction({ boundaryId: 'test', transactionClient: prisma } as never);
  const sections = [{ id: 'foreign-section', sectionKey: 'overview', content: 'Draft text' }];
  return { prisma, base, bound, sections };
}

describe('Major content section write boundaries', () => {
  it('refuses any write outside the audited transaction', async () => {
    const { prisma, base, sections } = fixture();
    await expect(base.updateContentSections!('profile-1', 'version-1', sections)).rejects.toThrow('TRANSACTION_REQUIRED');
    expect(prisma.majorVersion.findUnique).not.toHaveBeenCalled();
  });

  it('refuses a section belonging to another profile or version before any write', async () => {
    const { prisma, bound, sections } = fixture();
    await expect(bound.updateContentSections!('profile-1', 'version-1', sections)).rejects.toThrow('FOREIGN_SECTION');
    expect(prisma.majorContentSection.update).not.toHaveBeenCalled();
    expect(prisma.majorContentSection.upsert).not.toHaveBeenCalled();
  });

  it('refuses edits to a published version before any write', async () => {
    const { prisma, bound, sections } = fixture();
    prisma.majorVersion.findUnique.mockResolvedValue({
      id: 'version-1', profileId: 'profile-1', majorId: 'major-1',
      status: 'PUBLISHED', publishedAt: new Date(), profile: { majorId: 'major-1', status: 'PUBLISHED' },
    });
    await expect(bound.updateContentSections!('profile-1', 'version-1', sections)).rejects.toThrow('IMMUTABLE');
    expect(prisma.majorContentSection.update).not.toHaveBeenCalled();
  });
});

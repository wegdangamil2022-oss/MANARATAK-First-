import { describe, expect, it, vi } from 'vitest';
import { DegreeLevelUseCases } from '../../src/degree-level/DegreeLevelUseCases';
import {
  DegreeLevelDto,
  DegreeLevelStatus,
  IDegreeLevelRepository,
} from '@manaratak/domain';

describe('DegreeLevelUseCases', () => {
  const existing: DegreeLevelDto = {
    id: 'degree-master',
    canonicalCode: 'MASTER',
    nameEn: 'Master',
    nameAr: 'ماجستير',
    displayRank: 40,
    status: DegreeLevelStatus.DEPRECATED,
    aliases: { en: ['Masters'] },
    metadata: { source: 'canonical' },
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
  };

  const repository = (): IDegreeLevelRepository => ({
    listDegreeLevels: vi.fn(),
    getDegreeLevelByCode: vi.fn(),
    getDegreeLevelById: vi.fn().mockResolvedValue(existing),
    upsertDegreeLevel: vi.fn().mockImplementation(async (data) => ({
      ...existing,
      ...data,
      updatedAt: new Date('2026-01-03'),
    })),
  });

  it('preserves displayRank and lifecycle status on partial update', async () => {
    const repo = repository();
    const useCases = new DegreeLevelUseCases(repo);

    await useCases.update(existing.id, { nameEn: 'Master Degree', nameAr: 'درجة الماجستير' });

    expect(repo.upsertDegreeLevel).toHaveBeenCalledWith({
      canonicalCode: 'MASTER',
      nameEn: 'Master Degree',
      nameAr: 'درجة الماجستير',
      displayRank: 40,
      status: DegreeLevelStatus.DEPRECATED,
      aliases: existing.aliases,
      metadata: existing.metadata,
    });
  });

  it('applies an explicitly supplied valid lifecycle status', async () => {
    const repo = repository();
    const useCases = new DegreeLevelUseCases(repo);

    await useCases.update(existing.id, {
      nameEn: existing.nameEn,
      nameAr: existing.nameAr,
      status: DegreeLevelStatus.ARCHIVED,
      displayRank: 55,
    });

    expect(repo.upsertDegreeLevel).toHaveBeenCalledWith(expect.objectContaining({
      status: DegreeLevelStatus.ARCHIVED,
      displayRank: 55,
    }));
  });

  it('fails closed if persisted canonical code is outside the frozen catalog', async () => {
    const repo = repository();
    vi.mocked(repo.getDegreeLevelById).mockResolvedValue({ ...existing, canonicalCode: 'UNKNOWN' as any });
    const useCases = new DegreeLevelUseCases(repo);

    await expect(useCases.update(existing.id, { nameEn: 'X', nameAr: 'X' }))
      .rejects.toThrow('Unsupported canonical DegreeLevel code: UNKNOWN');
    expect(repo.upsertDegreeLevel).not.toHaveBeenCalled();
  });
});

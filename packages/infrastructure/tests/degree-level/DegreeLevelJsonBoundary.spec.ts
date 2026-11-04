import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { DegreeLevelStatus, type UpsertDegreeLevelDto } from '@manaratak/domain';
import { DegreeLevelRepository } from '../../src/degree-level/DegreeLevelRepository';

const input: UpsertDegreeLevelDto = { canonicalCode: 'MASTER', nameEn: 'Master', nameAr: 'ماجستير' };
function fixture() {
  const upsert = vi.fn().mockResolvedValue({ ...input, id: 'master', status: DegreeLevelStatus.ACTIVE,
    displayRank: 1, aliases: { ar: ['ماجستير'] }, metadata: { source: 'approved-source' },
    createdAt: new Date(), updatedAt: new Date() });
  const repository = new DegreeLevelRepository({ degreeLevel: { upsert } } as unknown as PrismaClient);
  return { repository, upsert };
}

describe('degree reference JSON boundary', () => {
  it('preserves nested aliases and metadata without modifying the caller input', async () => {
    const { repository, upsert } = fixture();
    const data = { ...input, aliases: { en: ['MSc', 'MA'] }, metadata: { provenance: { source: 'original' }, approved: true } };
    const before = structuredClone(data);
    const result = await repository.upsertDegreeLevel(data);
    const query = upsert.mock.calls[0][0];
    for (const operation of [query.create, query.update]) {
      expect(operation.aliases).toEqual(data.aliases);
      expect(operation.metadata).toEqual(data.metadata);
    }
    expect(data).toEqual(before);
    expect(result.aliases).toEqual({ ar: ['ماجستير'] });
    expect(result.metadata).toEqual({ source: 'approved-source' });
  });

  it('leaves omitted existing provenance untouched and retains the previous null-to-empty-object contract', async () => {
    const { repository, upsert } = fixture();
    await repository.upsertDegreeLevel(input);
    expect(upsert.mock.calls[0][0].update).toMatchObject({ aliases: undefined, metadata: undefined });
    expect(upsert.mock.calls[0][0].create).toMatchObject({ aliases: {}, metadata: {} });
    await repository.upsertDegreeLevel({ ...input, aliases: null, metadata: null });
    expect(upsert.mock.calls[1][0].update).toMatchObject({ aliases: {}, metadata: {} });
  });

  it('rejects unsupported or cyclic metadata before issuing any database write', async () => {
    const { repository, upsert } = fixture();
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    for (const metadata of [{ number: 1n }, { number: Infinity }, { callback: () => 'invalid' }, cyclic]) {
      await expect(repository.upsertDegreeLevel({ ...input, metadata })).rejects.toThrow();
    }
    expect(upsert).not.toHaveBeenCalled();
  });
});

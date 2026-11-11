import { expect, it, vi } from 'vitest';
import type { IScholarshipRepository, ScholarshipDto } from '@manaratak/domain';
import { scholarshipImportPageReads } from '../../src/scholarships/import-center/ScholarshipImportPageReads';

it('matches duplicate candidates by their exact keys, including misses and repeated reads', async () => {
  const existing = { id: 'existing', canonicalDedupKey: 'legacy-key' } as ScholarshipDto;
  const findByDedupKeys = vi.fn(async () => [existing]);
  const reads = await scholarshipImportPageReads([], {
    findByDedupKeys,
  } as unknown as IScholarshipRepository);
  const result = await Promise.all(
    ['absent-key', 'legacy-key', 'legacy-key'].map(reads.findDuplicate),
  );
  expect(result).toEqual([null, existing, existing]);
  expect(findByDedupKeys).toHaveBeenCalledExactlyOnceWith(['absent-key', 'legacy-key']);
});

it('propagates a failed bulk duplicate lookup instead of treating unavailable data as no match', async () => {
  const findByDedupKeys = vi.fn(async () => {
    throw new Error('DATABASE_UNAVAILABLE');
  });
  const reads = await scholarshipImportPageReads([], {
    findByDedupKeys,
  } as unknown as IScholarshipRepository);
  await expect(Promise.all(['one', 'two'].map(reads.findDuplicate))).rejects.toThrow(
    'DATABASE_UNAVAILABLE',
  );
});

import { describe, expect, it, vi } from 'vitest';
import type { PublicInternationalTestDto } from '../../api/client';
import { loadPublishedTestReference } from './publishedTestReference';

const test: PublicInternationalTestDto = {
  id: 'test-outside-first-page', slug: 'toefl-ibt', canonicalName: 'TOEFL iBT',
  displayName: 'TOEFL iBT', providerName: 'ETS', testCategory: 'LANGUAGE_PROFICIENCY',
  status: 'PUBLISHED', isPubliclyVisible: true,
};

describe('canonical public test navigation', () => {
  it('loads a requirement by owner ID independently of catalog pagination', async () => {
    const load = vi.fn().mockResolvedValue(test);
    expect(await loadPublishedTestReference(test.id, load)).toBe(test);
    expect(load).toHaveBeenCalledExactlyOnceWith(test.id);
  });

  it.each([
    { ...test, id: 'unrelated' }, { ...test, status: 'NEEDS_REVIEW' },
    { ...test, status: 'ARCHIVED' }, { ...test, isPubliclyVisible: false },
  ])('rejects an unavailable or unrelated relationship target', async dto => {
    await expect(loadPublishedTestReference(test.id, async () => dto)).rejects.toThrow('PUBLISHED_TEST_REFERENCE_UNAVAILABLE');
  });

  it('propagates withdrawal without returning a cached or prototype substitute', async () => {
    const load = vi.fn().mockResolvedValueOnce(test).mockRejectedValueOnce(new Error('Not found'));
    await loadPublishedTestReference(test.id, load);
    await expect(loadPublishedTestReference(test.id, load)).rejects.toThrow('Not found');
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { CsrfClientManager } from '@manaratak/shared';
import { ApiClient } from './client';

afterEach(() => vi.restoreAllMocks());

describe('public program facet choices API envelope', () => {
  it.each(['DEGREE', 'MAJOR', 'LANGUAGE'] as const)('unwraps %s choices and preserves the next cursor', async facet => {
    const page = { items: [{ id: 'canonical-choice', label: 'Published choice' }], total: 2, nextCursor: 'next-owner-page' };
    const fetch = vi.spyOn(CsrfClientManager.prototype, 'fetchWithCsrf').mockResolvedValue(Response.json({ data: page }));
    const controller = new AbortController();
    await expect(ApiClient.getPublicProgramFacetChoices({ locale: 'en', facet, query: 'published', cursor: 'owner-page', signal: controller.signal })).resolves.toEqual(page);
    const [url, options] = fetch.mock.calls[0];
    const params = new URL(String(url), 'http://localhost').searchParams;
    expect(params.get('facet')).toBe(facet);
    expect(params.get('facetSearch')).toBe('published');
    expect(params.get('facetCursor')).toBe('owner-page');
    expect(params.get('locale')).toBe('en');
    expect(options?.signal).toBe(controller.signal);
  });

  it('returns an empty published-owner page without inventing choices from reference tables', async () => {
    const page = { items: [], total: 0, nextCursor: null };
    vi.spyOn(CsrfClientManager.prototype, 'fetchWithCsrf').mockResolvedValue(Response.json({ data: page }));
    await expect(ApiClient.getPublicProgramFacetChoices({ locale: 'ar', facet: 'LANGUAGE' })).resolves.toEqual(page);
  });

  it('retains the unavailable state when the owner endpoint fails', async () => {
    vi.spyOn(CsrfClientManager.prototype, 'fetchWithCsrf').mockResolvedValue(Response.json({ error: 'EXPLORER_OWNER_UNAVAILABLE' }, { status: 503 }));
    await expect(ApiClient.getPublicProgramFacetChoices({ locale: 'ar', facet: 'DEGREE' })).rejects.toThrow('PUBLIC_DEGREE_CHOICES_UNAVAILABLE');
  });
});

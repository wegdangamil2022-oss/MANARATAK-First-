import { describe, expect, it, vi } from 'vitest';
import { reviewSources, sourceAllowed } from '../../src/features/review-queue/ReviewSources';
import { projectReviewItem, mergeReviewItems } from '../../src/features/review-queue/ReviewContracts';
import { initialSourceState, readNextReviewPage } from '../../src/features/review-queue/ReviewLoader';
const destinations = reviewSources.filter(s => s.domain === 'study-destinations');
const captured = '2026-10-15T00:00:00Z';
const row = (source: typeof destinations[number], index = 1) => ({
  country: { id: `country-reference-${index}`, iso2Code: 'SA', name: 'Saudi Arabia' },
  profile: source.params.status === 'NO_PROFILE' ? null : { id: `profile-uuid-${index}`, status: source.params.status, completenessStatus: source.params.completenessStatus ?? 'INCOMPLETE', updatedAt: captured },
});
describe('B07 destination review contract', () => {
  it.each(destinations)('uses owner lifecycle and separate identifiers for $key', source => {
    const item = projectReviewItem(source, row(source), captured)!;
    expect(item.href).toBe('/study-destinations/SA');
    expect(item.id).toBe('country-reference-1');
    expect(item.auditTarget?.id ?? null).toBe(source.params.status === 'NO_PROFILE' ? null : 'country-reference-1');
    expect(sourceAllowed(source, p => p === 'admin:study-destinations:read')).toBe(true);
    expect(sourceAllowed(source, p => p === 'admin:platform:manage')).toBe(false);
    expect(source.params.status).not.toBe('READY_TO_REVIEW');
    expect(source.params.status).not.toBe('READY_TO_PUBLISH');
  });
  it('uses owner totals and pages beyond the first 50 with nested country/profile rows', async () => {
    const source = destinations[0];
    const request = vi.fn(async (url: string) => {
      const params = new URL(url, 'https://local').searchParams;
      expect(params.get('status')).toBe('IN_REVIEW');
      const page = Number(params.get('page'));
      return { data: Array.from({ length: page === 1 ? 50 : 20 }, (_, i) => row(source, (page - 1) * 50 + i)), page, pageSize: 50, total: 70 };
    });
    let state = await readNextReviewPage(initialSourceState(source, true), request, new AbortController().signal);
    expect(state).toMatchObject({ availability: 'partial', total: 70, nextPage: 2 });
    state = await readNextReviewPage(state, request, new AbortController().signal);
    expect(state).toMatchObject({ availability: 'ready', total: 70, nextPage: null });
    expect(state.rows).toHaveLength(70);
  });
  it('preserves empty, contract-error and permission-denied states without fabricated totals', async () => {
    const source = destinations[0], signal = new AbortController().signal;
    const empty = await readNextReviewPage(initialSourceState(source, true), async () => ({ data: [], total: 0, page: 1, pageSize: 50 }), signal);
    expect(empty).toMatchObject({ availability: 'ready', total: 0, nextPage: null });
    const denied = await readNextReviewPage(initialSourceState(source, true), async () => { throw new Error('[403] denied'); }, signal);
    expect(denied).toMatchObject({ availability: 'access_denied', total: null, rows: [] });
    const invalid = await readNextReviewPage(initialSourceState(source, true), async () => ({ data: [{ ...row(source), country: { id: 'uuid', iso2Code: 'profile-uuid' } }], total: 1, page: 1, pageSize: 50 }), signal);
    expect(invalid).toMatchObject({ availability: 'unavailable', total: null, errorCode: 'SOURCE_CONTRACT_INVALID' });
  });
  it('rejects rows from a different workflow rather than silently reviewing a published profile', () => {
    const source = destinations[0];
    expect(() => projectReviewItem(source, { ...row(source), profile: { id: 'p', status: 'PUBLISHED' } }, captured)).toThrow('SOURCE_DESTINATION_STATUS_INVALID');
  });
  it('links University review rows to the existing detail screen', () => {
    const source = reviewSources.find(s => s.domain === 'universities')!;
    expect(projectReviewItem(source, { id: 'university-uuid', displayName: 'University' }, captured)?.href).toBe('/universities/university-uuid');
  });
  it('retains exactly the two existing career sources and merges multiple signals per owner', () => {
    const sources = reviewSources.filter(s => s.domain === 'careers');
    expect(sources.map(s => s.key)).toEqual(['careers:READY_TO_REVIEW', 'careers:READY_TO_PUBLISH']);
    expect(sources.every(s => s.endpoint === '/admin/careers/review-page')).toBe(true);
    const items = sources.map(source => projectReviewItem(source, { id: 'job-uuid', title: 'Engineer' }, captured)!);
    expect(mergeReviewItems(items)).toHaveLength(1);
    expect(mergeReviewItems(items)[0].signals).toHaveLength(2);
  });
});

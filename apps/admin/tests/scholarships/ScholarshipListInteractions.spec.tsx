import React from 'react';
import { act, create } from 'react-test-renderer';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('../../src/api/client', () => ({ adminApiClient: state }));
vi.mock('../../src/i18n/I18nProvider', () => ({
  useTranslation: () => ({ language: 'en', dir: 'ltr' }),
}));
vi.mock('../../src/components/OwnerDraftCreateForm', () => ({ OwnerDraftCreateForm: () => null }));
vi.mock('../../src/components/AdminLink', () => ({
  AdminLink: ({ to, children }: any) => <a href={to}>{children}</a>,
}));
vi.mock('../../src/components/ScholarshipCanonicalFilters', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  ScholarshipCanonicalFilters: ({ children }: any) => <>{children}</>,
}));
import { ScholarshipListPage } from '../../src/pages/ScholarshipListPage';
import {
  readScholarshipListQuery,
  useScholarshipListQuery,
} from '../../src/features/scholarships/useScholarshipListQuery';
let tree: ReturnType<typeof create>;
let navigate: ReturnType<typeof useNavigate>;
let query: ReturnType<typeof useScholarshipListQuery>;
let location: ReturnType<typeof useLocation>;
const row = {
  id: 'sch-1',
  displayName: 'First scholarship',
  status: 'IMPORTED',
  completenessStatus: 'INCOMPLETE',
  studyCountry: 'Austria',
};
const page = (name = 'First scholarship', total = 50, index = 1) => ({
  data: [{ ...row, displayName: name }],
  total,
  page: index,
  pageSize: 24,
  totalPages: Math.ceil(total / 24),
});
function Probe() {
  navigate = useNavigate();
  location = useLocation();
  query = useScholarshipListQuery();
  return null;
}
async function mount(url = '/scholarships', list = true) {
  await act(async () => {
    tree = create(
      <MemoryRouter initialEntries={[url]}>
        <Probe />
        {list && <ScholarshipListPage />}
      </MemoryRouter>,
    );
  });
}
const button = (text: string) =>
  tree.root
    .findAllByType('button')
    .find((node) =>
      JSON.stringify(node.children.filter((child) => typeof child === 'string')).includes(text),
    );
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  state.request
    .mockReset()
    .mockImplementation(async (url: string) =>
      url.endsWith('/summary') ? { all: 100, published: 10 } : page(),
    );
});
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
});
describe('Scholarship list navigation and authoritative reads', () => {
  it('restores all filters from links and browser history and resets pagination on filtering', async () => {
    await mount(
      '/scholarships?query=medicine&status=PUBLISHED&fundingType=FULL&deadlineStatus=OPEN&completenessStatus=COMPLETE&page=3&universityId=uni-1',
      false,
    );
    expect(query).toMatchObject({
      searchTerm: 'medicine',
      statusFilter: 'PUBLISHED',
      fundingFilter: 'FULL',
      deadlineFilter: 'OPEN',
      completenessFilter: 'COMPLETE',
      page: 3,
      canonical: { universityId: 'uni-1' },
    });
    await act(async () => query.setCompletenessFilter('INCOMPLETE'));
    expect(query.page).toBe(1);
    expect(location.search).toContain('completenessStatus=INCOMPLETE');
    await act(async () => navigate('/scholarships?query=second&page=2'));
    expect(query.searchTerm).toBe('second');
    await act(async () => navigate(-1));
    expect(query.searchTerm).toBe('medicine');
    expect(query.completenessFilter).toBe('INCOMPLETE');
    await act(async () => query.handleResetFilters());
    expect(query.hasActiveFilters).toBe(false);
    expect(query.page).toBe(1);
  });
  it('bounds search and rejects invalid enum and pagination values before querying', () => {
    const parsed = readScholarshipListQuery(
      'query=' +
        'x'.repeat(250) +
        '&status=bad&page=Infinity&verificationStatus=bad&sort=bad&translationLocale=bad',
    );
    expect(parsed.filters.query).toHaveLength(200);
    expect(parsed.filters.status).toBe('');
    expect(parsed.page).toBe(1);
    expect(parsed.canonical).toMatchObject({
      verificationStatus: '',
      sort: 'CREATED_DESC',
      translationLocale: 'en',
    });
  });
  it('retains an independent summary error and never replaces the global total with filtered results', async () => {
    state.request.mockImplementation(async (url: string) => {
      if (url.endsWith('/summary')) throw new Error('offline');
      return page('Filtered scholarship', 13);
    });
    await mount('/scholarships?status=PUBLISHED');
    expect(JSON.stringify(tree.toJSON())).toContain(
      'Summary unavailable; missing counts are not zero.',
    );
    expect(JSON.stringify(tree.toJSON())).toContain('Filtered scholarship');
    // Global count must remain unavailable while the matching-results count is 13.
    const allCard = tree.root
      .findAllByType('button')
      .find((node) =>
        node.findAllByType('span').some((span) => span.children.includes('Total Scholarships')),
      );
    expect(allCard).toBeDefined();
    expect(
      JSON.stringify(
        allCard!
          .findAllByType('div')
          .map((node) => node.children.filter((child) => typeof child === 'string')),
      ),
    ).not.toContain('13');
  });
  it('clears old results on filter changes and shows a retry instead of a false empty state after failure', async () => {
    await mount();
    expect(JSON.stringify(tree.toJSON())).toContain('First scholarship');
    state.request.mockRejectedValue(new Error('Read failed'));
    await act(async () => query.setSearchTerm('new filter'));
    const text = JSON.stringify(tree.toJSON());
    expect(text).not.toContain('First scholarship');
    expect(text).toContain('Read failed');
    expect(text).not.toContain('No scholarships found matching your filters.');
    state.request.mockImplementation(async (url: string) =>
      url.endsWith('/summary') ? { all: 100 } : page('Recovered scholarship'),
    );
    await act(async () => button('Retry loading scholarships')!.props.onClick());
    expect(JSON.stringify(tree.toJSON())).toContain('Recovered scholarship');
  });
  it('discards late responses from an earlier filter scope and aborts their transport', async () => {
    let resolveOld!: (value: ReturnType<typeof page>) => void;
    let signal: AbortSignal | undefined;
    state.request.mockImplementation((url: string, options: RequestInit) => {
      if (url.endsWith('/summary')) return Promise.resolve({ all: 100 });
      if (url.includes('query=old')) {
        signal = options.signal as AbortSignal;
        return new Promise((resolve) => {
          resolveOld = resolve;
        });
      }
      return Promise.resolve(page('Current results'));
    });
    await mount('/scholarships?query=old');
    await act(async () => query.setSearchTerm('current'));
    expect(signal?.aborted).toBe(true);
    await act(async () => resolveOld(page('Obsolete results')));
    expect(JSON.stringify(tree.toJSON())).toContain('Current results');
    expect(JSON.stringify(tree.toJSON())).not.toContain('Obsolete results');
  });
  it('offers pagination in card view and preserves unknown funding and deadline in table view', async () => {
    await mount();
    expect(button('Next')).toBeDefined();
    expect(tree.root.findByProps({ role: 'img', 'aria-label': 'Austria' }).children).toEqual([
      '🌐',
    ]);
    await act(async () =>
      tree.root
        .findAllByType('button')
        .find((node) => node.props.title === 'عرض الجدول')!
        .props.onClick(),
    );
    const cells = tree.root
      .findAllByType('td')
      .map((node) => node.children.filter((child) => typeof child === 'string').join(' '));
    expect(JSON.stringify(tree.toJSON())).toContain('Funding unspecified');
    expect(cells).toContain('Deadline unspecified');
  });
});

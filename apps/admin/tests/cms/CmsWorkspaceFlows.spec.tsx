import { act, create } from 'react-test-renderer';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({
  request: vi.fn(),
  permissions: ['admin:cms:view', 'admin:cms:author', 'admin:cms:publish'],
  answer: {} as Record<string, string> | null,
}));
vi.mock('../../src/api/client', () => ({ adminApiClient: { request: state.request } }));
vi.mock('../../src/security/AdminAuthorizationContext', () => ({
  useAdminAuthorization: () => ({
    hasPermission: (value: string) => state.permissions.includes(value),
  }),
}));
vi.mock('../../src/i18n/I18nProvider', () => ({ useTranslation: () => ({ language: 'en' }) }));
vi.mock('../../src/features/reference-data/useAdministrationDraftGuard', () => ({
  useAdministrationDraftGuard: vi.fn(),
}));
vi.mock('../../src/features/cms/CmsActionDialog', () => ({
  useCmsActionDialog: () => ({ requestAction: async () => state.answer, actionDialog: null }),
}));
import {
  useCmsWorkspace,
  CmsWorkspace,
  safeListSearch,
} from '../../src/features/cms/useCmsWorkspace';
import { CmsOperationsPanels } from '../../src/features/cms/CmsOperationsPanels';
let current: CmsWorkspace,
  renderer: ReturnType<typeof create>,
  route: string,
  move: (path: string) => void;
function Probe() {
  current = useCmsWorkspace();
  route = useLocation().pathname + useLocation().search;
  move = useNavigate();
  return null;
}
const locale = (value: string) => ({
  id: 'local-' + value,
  locale: value,
  localizedSlug: 'test-' + value,
  title: value + ' title',
  body: 'saved ' + value,
  summary: 'summary',
  state: 'DRAFT',
  version: 5,
  tagIds: ['tag'],
  attachmentAssetIds: ['asset'],
  metadata: { retained: true },
  seoMetadata: {
    title: 'seo',
    description: 'seo description',
    keywords: ['saved'],
    openGraphTitle: 'OG title',
    openGraphDescription: 'OG description',
    noIndex: true,
    noFollow: false,
  },
});
const record = {
  id: 'one',
  publicId: 'CMS-1',
  slug: 'test',
  title: 'Test',
  contentType: 'ARTICLE',
  primaryLocale: 'ar',
  siteIdentifier: 'manaratak',
  status: 'DRAFT',
  version: 9,
  updatedAt: '2026-10-27T00:00:00Z',
  publishedLocales: [],
  localizedPayloads: [locale('ar'), locale('en')],
  domainLinks: [],
  tags: [],
  readiness: { ar: { ready: true, missing: [], warnings: [] } },
};
async function mount(path = '/cms/content/one?section=content') {
  await act(async () => {
    renderer = create(
      <MemoryRouter initialEntries={[path]}>
        <Probe />
      </MemoryRouter>,
    );
  });
}
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  state.permissions = ['admin:cms:view', 'admin:cms:author', 'admin:cms:publish'];
  state.answer = {};
  vi.stubGlobal('window', { confirm: vi.fn(() => true) });
  state.request
    .mockReset()
    .mockImplementation(async (path: string) =>
      path === '/admin/cms/content/one'
        ? record
        : path.startsWith('/admin/cms/content?')
          ? { data: [record], total: 41, page: 2, pageSize: 20, totalPages: 3 }
          : { data: [] },
    );
});
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  vi.unstubAllGlobals();
});
describe('CMS workspace flows', () => {
  it('preserves the draft and blocks another write after an accepted but stale readback', async () => {
    await mount();
    await act(async () => current.updateEditor({ body: 'Submitted body' }));
    await act(async () => current.saveLocale({ preventDefault() {} } as any));
    expect(current.notice).toBeNull();
    expect(current.error).toContain('operation was accepted');
    expect(current.editors.ar.body).toBe('Submitted body');
    expect(current.canAuthor).toBe(false);
    await act(async () => current.saveLocale({ preventDefault() {} } as any));
    expect(
      state.request.mock.calls.filter(([, options]) => options?.method === 'PUT'),
    ).toHaveLength(1);
    await act(async () => current.openContent('one'));
    expect(current.canAuthor).toBe(true);
  });
  it('announces publication only after the exact locale has a newer published version', async () => {
    await mount();
    state.request.mockImplementation(async (path: string, options?: any) =>
      options?.method
        ? {}
        : path.endsWith('/one')
          ? {
              ...record,
              localizedPayloads: [
                { ...locale('ar'), version: 6, state: 'PUBLISHED' },
                locale('en'),
              ],
            }
          : { data: [] },
    );
    await act(async () => current.runWorkflow('publish'));
    expect(current.localizedState).toBe('PUBLISHED');
    expect(current.notice).toBeTruthy();
    expect(current.error).toBeNull();
  });
  it('does not read or announce a previous owner after an accepted late save', async () => {
    await mount();
    let finish!: (value: unknown) => void;
    state.request.mockImplementation(async (path: string, options?: any) =>
      options?.method
        ? new Promise((resolve) => {
            finish = resolve;
          })
        : path.endsWith('/two')
          ? { ...record, id: 'two' }
          : { data: [] },
    );
    await act(async () => {
      void current.saveLocale({ preventDefault() {} } as any);
    });
    await act(async () => move('/cms/content/two'));
    const calls = state.request.mock.calls.length;
    await act(async () => finish({}));
    expect(state.request.mock.calls).toHaveLength(calls);
    expect(current.selected?.id).toBe('two');
    expect(current.notice).toBeNull();
  });
  it('rejects a wrong owner returned by the detail endpoint', async () => {
    state.request.mockResolvedValue({ ...record, id: 'other' });
    await mount();
    expect(current.selected).toBeNull();
    expect(current.error).toContain('does not match');
  });
  it('opens a deep-linked material without fetching the library or operational panels', async () => {
    await mount();
    expect(current.selected?.id).toBe('one');
    expect(current.section).toBe('content');
    expect(state.request.mock.calls.map(([path]) => path)).toEqual(
      expect.arrayContaining([
        '/admin/cms/content/one',
        '/admin/cms/categories',
        '/admin/cms/tags',
      ]),
    );
    expect(
      state.request.mock.calls.some(
        ([path]) => path.includes('/content?') || path.includes('/navigation?'),
      ),
    ).toBe(false);
  });
  it('preserves search context through details and back to the correct server page', async () => {
    await mount('/cms/content?q=admission&page=2&status=DRAFT&type=ARTICLE');
    expect(state.request.mock.calls[0][0]).toContain('page=2');
    await act(async () => current.chooseContent('one'));
    expect(route).toContain('/cms/content/one?return=');
    await act(async () => current.go(current.listUrl));
    expect(route).toBe('/cms/content?q=admission&page=2&status=DRAFT&type=ARTICLE');
  });
  it('resets server pagination when a filter changes and does not refetch catalogues', async () => {
    await mount('/cms/content?page=2');
    const count = state.request.mock.calls.filter(
      ([path]) => path === '/admin/cms/categories',
    ).length;
    await act(async () => current.setQuery('new search'));
    expect(current.page).toBe(1);
    expect(route).toContain('q=new+search');
    expect(
      state.request.mock.calls.filter(([path]) => path === '/admin/cms/categories'),
    ).toHaveLength(count);
  });
  it('saves all locale fields, including hidden media, SEO and metadata without changing English', async () => {
    await mount();
    await act(async () => current.updateEditor({ title: 'Edited Arabic' }));
    await act(async () => current.saveLocale({ preventDefault() {} } as any));
    const call = state.request.mock.calls.find(
      ([path, options]) => path.endsWith('/localized') && options?.method === 'PUT',
    )!;
    const body = JSON.parse(call[1].body);
    expect(body).toMatchObject({
      locale: 'ar',
      expectedVersion: 5,
      title: 'Edited Arabic',
      attachmentAssetIds: ['asset'],
      tagIds: ['tag'],
      metadata: { retained: true },
      seoMetadata: {
        openGraphTitle: 'OG title',
        openGraphDescription: 'OG description',
        noIndex: true,
      },
    });
    expect(current.editors.en.body).toBe('saved en');
    expect(state.request.mock.calls.some(([path]) => path.endsWith('/publish'))).toBe(false);
  });
  it('keeps the edited text and dirty state after a version conflict', async () => {
    await mount();
    state.request.mockImplementation(async (path: string) => {
      if (path.endsWith('/localized')) throw new Error('[409] CMS_VERSION_CONFLICT');
      return record;
    });
    await act(async () => current.updateEditor({ body: 'Do not lose me' }));
    await act(async () => current.saveLocale({ preventDefault() {} } as any));
    expect(current.error).toContain('Another user');
    expect(current.editors.ar.body).toBe('Do not lose me');
    expect(current.dirty).toBe(true);
  });
  it('sends the root CAS version for canonical relationship saves', async () => {
    await mount();
    await act(async () =>
      current.setDomainLinks([
        {
          targetType: 'UNIVERSITY',
          targetId: '11111111-1111-4111-8111-111111111111',
          relationType: 'RELATED',
          sortOrder: 0,
        },
      ]),
    );
    await act(async () => current.saveDomainLinks());
    const call = state.request.mock.calls.find(([path]) => path.endsWith('/domain-links'))!;
    expect(JSON.parse(call[1].body).expectedVersion).toBe(9);
  });
  it('blocks duplicate relationships before a mutation', async () => {
    await mount();
    const link = {
      targetType: 'UNIVERSITY',
      targetId: '11111111-1111-4111-8111-111111111111',
      relationType: 'RELATED',
      sortOrder: 0,
    };
    await act(async () => current.setDomainLinks([link, link]));
    await act(async () => current.saveDomainLinks());
    expect(state.request.mock.calls.some(([path]) => path.endsWith('/domain-links'))).toBe(false);
  });
  it('does not issue authoring requests without the capability', async () => {
    state.permissions = ['admin:cms:view'];
    await mount();
    await act(async () => current.saveLocale({ preventDefault() {} } as any));
    expect(state.request.mock.calls.some(([, options]) => options?.method === 'PUT')).toBe(false);
  });
  it('cancels navigation when unsaved changes are declined', async () => {
    await mount();
    await act(async () => current.updateEditor({ title: 'Unsaved' }));
    window.confirm = vi.fn(() => false);
    await act(async () => current.go('/cms/content'));
    expect(route).toContain('/cms/content/one');
  });
  it('ignores delayed detail responses after a route change', async () => {
    let resolve: (value: any) => void = () => {};
    state.request.mockImplementation((path: string) =>
      path.endsWith('/one')
        ? new Promise((done) => {
            resolve = done;
          })
        : Promise.resolve(path.endsWith('/two') ? { ...record, id: 'two' } : { data: [] }),
    );
    await mount();
    await act(async () => move('/cms/content/two'));
    await act(async () => resolve(record));
    expect(current.selected?.id).toBe('two');
  });
  it('fetches only the active site area', async () => {
    await act(async () => {
      renderer = create(<CmsOperationsPanels area="redirects" locale="ar" />);
    });
    expect(state.request.mock.calls).toHaveLength(1);
    expect(state.request.mock.calls[0][0]).toContain('/redirects?');
  });
  it('saves classification independently with root version and preserves locale changes', async () => {
    await mount();
    const pendingLink = {
      targetType: 'UNIVERSITY',
      targetId: '11111111-1111-4111-8111-111111111111',
      relationType: 'RELATED',
      sortOrder: 0,
    };
    await act(async () => current.updateEditor({ body: 'Unsaved locale body' }));
    await act(async () => current.setDomainLinks([pendingLink]));
    await act(async () => current.setCategoryId('category-2'));
    await act(async () => current.saveClassification());
    const call = state.request.mock.calls.find(
      ([path, options]) => path === '/admin/cms/content/one' && options?.method === 'PATCH',
    )!;
    expect(JSON.parse(call[1].body)).toEqual({ categoryId: 'category-2', expectedVersion: 9 });
    expect(current.editors.ar.body).toBe('Unsaved locale body');
    expect(current.domainLinks).toEqual([pendingLink]);
    expect(current.linksDirty).toBe(true);
  });
  it('refreshes saved relationships while retaining pending classification and locale edits', async () => {
    await mount();
    const links = [
      {
        targetType: 'UNIVERSITY',
        targetId: '11111111-1111-4111-8111-111111111111',
        relationType: 'RELATED',
        sortOrder: 0,
      },
    ];
    await act(async () => {
      current.setDomainLinks(links);
      current.setCategoryId('pending-category');
      current.updateEditor({ body: 'Pending body' });
    });
    state.request.mockResolvedValue({ ...record, version: 10, domainLinks: links });
    await act(async () => current.saveDomainLinks());
    expect(current.selected?.version).toBe(10);
    expect(current.linksDirty).toBe(false);
    expect(current.categoryId).toBe('pending-category');
    expect(current.editors.ar.body).toBe('Pending body');
  });
  it('retains independent root edits when saving a locale', async () => {
    await mount();
    const links = [
      {
        targetType: 'UNIVERSITY',
        targetId: '11111111-1111-4111-8111-111111111111',
        relationType: 'RELATED',
        sortOrder: 0,
      },
    ];
    await act(async () => {
      current.setDomainLinks(links);
      current.setCategoryId('pending-category');
      current.updateEditor({ body: 'Saved body' });
    });
    state.request.mockResolvedValue({
      ...record,
      localizedPayloads: [{ ...locale('ar'), body: 'Saved body', version: 6 }, locale('en')],
    });
    await act(async () => current.saveLocale({ preventDefault() {} } as any));
    expect(current.dirtyLocales.ar).toBe(false);
    expect(current.categoryId).toBe('pending-category');
    expect(current.domainLinks).toEqual(links);
    expect(current.linksDirty).toBe(true);
  });
  it('sanitizes return paths to local list parameters', () => {
    expect(safeListSearch('q=test&page=3&return=https://evil&section=seo')).toBe('q=test&page=3');
    expect(safeListSearch('reviewSearch=CMS-123')).toBe('q=CMS-123');
  });
});

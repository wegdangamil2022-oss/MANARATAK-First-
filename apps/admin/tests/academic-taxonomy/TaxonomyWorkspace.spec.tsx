import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
const state = vi.hoisted(() => ({ request: vi.fn(), denied: new Set<string>() }));
vi.mock('../../src/api/client', () => ({ adminApiClient: { request: state.request } }));
vi.mock('../../src/i18n/I18nProvider', () => ({ useTranslation: () => ({ language: 'en' }) }));
vi.mock('../../src/security/AdminAuthorizationContext', () => ({
  useAdminAuthorization: () => ({
    hasPermission: (permission: string) => !state.denied.has(permission),
  }),
}));
vi.mock('../../src/features/reference-data/useAdministrationDraftGuard', () => ({
  useAdministrationDraftGuard: () => {},
}));
import { AcademicTaxonomyAdminPage } from '../../src/pages/AcademicTaxonomyAdminPage';
import { AcademicTaxonomyDetailPage } from '../../src/pages/AcademicTaxonomyDetailPage';
import {
  AcademicTaxonomyOperationsWorkspace,
  useTaxonomyRead,
} from '../../src/components/academic-taxonomy/AcademicTaxonomyOperationsWorkspace';
import { AcademicTaxonomyImportWorkspace } from '../../src/components/academic-taxonomy/AcademicTaxonomyImportWorkspace';
import { CanonicalAcademicGovernancePanel } from '../../src/components/academic-taxonomy/CanonicalAcademicGovernancePanel';

let tree: ReactTestRenderer, navigate: ReturnType<typeof useNavigate>;
function Probe() {
  navigate = useNavigate();
  return null;
}
function text(node: any): string {
  return (
    node.children
      ?.map((child: any) => (typeof child === 'string' ? child : text(child)))
      .join('') ?? ''
  );
}
function button(label: string) {
  const found = tree.root.findAllByType('button').find((node) => text(node) === label);
  if (!found) throw new Error('Missing button ' + label);
  return found;
}
async function click(label: string) {
  await act(async () => button(label).props.onClick());
}
async function mount(element: React.ReactNode, path = '/academic-taxonomy') {
  await act(async () => {
    tree = create(
      <MemoryRouter initialEntries={[path]}>
        <Probe />
        <Routes>
          <Route path="/academic-taxonomy/:nodeId" element={<AcademicTaxonomyDetailPage />} />
          <Route path="*" element={element} />
        </Routes>
      </MemoryRouter>,
    );
  });
}
function node(id = 'one') {
  return {
    nodeId: id,
    nodeType: 'ACADEMIC_FIELD',
    canonicalCode: id,
    canonicalName: 'Field ' + id,
    standardType: 'ISCED',
    standardCode: '01',
    status: 'ACTIVE',
    updatedAt: '2026-10-27T01:00:00.000Z',
    localizedNames: { ar: 'المجال', en: 'Field', fr: 'Conserver' },
    description: 'Original',
  };
}
function fixture(path: string, options?: any): any {
  if (options?.method) return Promise.resolve({});
  if (path.includes('/crosswalk?')) return Promise.resolve({ counts: {}, data: [], total: 0 });
  if (path.includes('/diagnostics?'))
    return Promise.resolve({
      version: 'version-1',
      asOf: '2026-10-27',
      nodeCount: 0,
      boundaryEdges: 0,
      counts: {},
      data: [],
      total: 0,
    });
  if (path.endsWith('/usage'))
    return Promise.resolve({
      kind: 'TAXONOMY_NODE',
      id: 'one',
      totalReferences: 3,
      counts: { majorClassificationMappings: 3 },
      observedAt: '2026-10-27',
    });
  if (path.endsWith('/paths'))
    return Promise.resolve({ path: [], alternativeTotal: 0, termination: 'ROOT' });
  if (path.endsWith('/mapped-majors'))
    return Promise.resolve({
      data: [
        {
          id: 'map',
          relationshipType: 'EXACT',
          major: { id: 'major / one', canonicalName: 'Major' },
          profile: { id: 'profile/one', displayName: 'Profile', level: 'MASTER' },
        },
      ],
    });
  if (/\/nodes\/[^/]+$/.test(path))
    return Promise.resolve(node(decodeURIComponent(path.split('/').at(-1)!)));
  return Promise.resolve({ data: [], total: 0, hasNextPage: false });
}
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  state.request.mockReset();
  state.request.mockImplementation(fixture);
  state.denied.clear();
  vi.stubGlobal('window', { confirm: vi.fn(() => true) });
});
afterEach(() => {
  if (tree) act(() => tree.unmount());
  vi.unstubAllGlobals();
});

describe('Academic classification workspace', () => {
  it('keeps the selected section and deep-linked governance view in the URL', async () => {
    await mount(<AcademicTaxonomyAdminPage />, '/academic-taxonomy?view=governance&section=review');
    expect(button('Review queue').props['aria-pressed']).toBe(true);
    await click('Classification integrity');
    expect(button('Classification integrity').props['aria-pressed']).toBe(true);
    expect(state.request.mock.calls.some(([path]) => path.includes('/diagnostics?'))).toBe(true);
  });
  it('keeps previous-page navigation available when the last page becomes empty', async () => {
    let reads = 0;
    state.request.mockImplementation((path) =>
      path.includes('/nodes?')
        ? Promise.resolve({
            data: ++reads === 1 ? [node()] : [],
            total: 1,
            hasNextPage: reads === 1,
          })
        : fixture(path),
    );
    await mount(<AcademicTaxonomyAdminPage />);
    await click('Next');
    expect(button('Previous').props.disabled).toBe(false);
    await click('Previous');
    expect(state.request.mock.calls.at(-1)![0]).toContain('page=1');
  });
  it('clears stale rows when a refreshed read fails', async () => {
    let reads = 0;
    state.request.mockImplementation((path) =>
      path.includes('/nodes?')
        ? ++reads === 1
          ? Promise.resolve({ data: [node()], total: 1 })
          : Promise.reject(new Error('Unavailable'))
        : fixture(path),
    );
    await mount(<AcademicTaxonomyAdminPage />);
    expect(JSON.stringify(tree.toJSON())).toContain('Field one');
    await click('Refresh data');
    expect(JSON.stringify(tree.toJSON())).not.toContain('Field one');
    expect(JSON.stringify(tree.toJSON())).toContain('Unable to load');
  });
  it('filters degree references locally and retains the server-defined rank order', async () => {
    state.request.mockImplementation((path) =>
      path.endsWith('/degree-levels')
        ? Promise.resolve({
            data: [
              {
                id: 'b',
                canonicalCode: 'MASTER',
                nameAr: 'ماجستير',
                nameEn: 'Master',
                status: 'ACTIVE',
                displayRank: 2,
              },
              {
                id: 'a',
                canonicalCode: 'BACHELOR',
                nameAr: 'بكالوريوس',
                nameEn: 'Bachelor',
                status: 'ACTIVE',
                displayRank: 1,
              },
            ],
          })
        : fixture(path),
    );
    await mount(<AcademicTaxonomyAdminPage />, '/academic-taxonomy?view=degrees');
    const search = tree.root.findByProps({ type: 'search' });
    await act(async () => search.props.onChange({ target: { value: 'ماجستير' } }));
    expect(JSON.stringify(tree.toJSON())).toContain('MASTER');
    expect(JSON.stringify(tree.toJSON())).not.toContain('BACHELOR');
  });
  it('does not offer external workspace links without the relevant permission', async () => {
    state.denied.add('admin:majors:manage');
    await mount(<AcademicTaxonomyAdminPage />);
    expect(tree.root.findAllByProps({ to: '/majors' })).toHaveLength(0);
  });
  it('keeps new classifications out of archived and active states', async () => {
    await mount(<AcademicTaxonomyAdminPage />);
    await click('Add classification');
    const form = tree.root.findByType('form');
    const status = form.findAllByType('select').find((control) => control.props.value === 'DRAFT')!;
    expect(status.findAllByType('option').map((option) => option.props.value)).toEqual([
      'DRAFT',
      'READY_TO_REVIEW',
    ]);
  });
});

describe('Classification relationships and editing', () => {
  it('opens the source of an incoming mapping rather than linking back to the current target', async () => {
    state.request.mockImplementation((path, options) =>
      path.endsWith('/mappings') && !options?.method
        ? Promise.resolve({
            data: [
              {
                mappingId: 'mapping',
                sourceNodeId: 'source/other',
                targetNodeId: 'one',
                sourceStandard: 'CIP',
                targetStandard: 'ISCED',
                strength: 'BROAD',
              },
            ],
          })
        : fixture(path, options),
    );
    await mount(null, '/academic-taxonomy/one?tab=mappings');
    expect(
      tree.root.findAllByProps({ to: '/academic-taxonomy/source%2Fother?tab=mappings' }).length,
    ).toBeGreaterThan(0);
    expect(JSON.stringify(tree.toJSON())).toContain('Incoming mapping from:');
  });
  it('blocks status changes when their impact cannot be read', async () => {
    state.request.mockImplementation((path, options) =>
      path.endsWith('/usage') ? Promise.reject(new Error('Unavailable')) : fixture(path, options),
    );
    await mount(null, '/academic-taxonomy/one');
    await click('Edit Node Details');
    const form = tree.root.findByType('form');
    const status = form
      .findAllByType('select')
      .find((control) => control.props.value === 'ACTIVE')!;
    await act(async () => status.props.onChange({ target: { value: 'ARCHIVED' } }));
    await act(async () => form.props.onSubmit({ preventDefault() {} }));
    expect(
      state.request.mock.calls.filter(([, options]) => options?.method === 'PUT'),
    ).toHaveLength(0);
    expect(JSON.stringify(tree.toJSON())).toContain('Wait for the impact report.');
  });
  it('links the exact major and its level profile using encoded canonical IDs', async () => {
    await mount(null, '/academic-taxonomy/one?tab=majors');
    expect(
      tree.root.findAllByProps({ to: '/majors/major%20%2F%20one?profileId=profile%2Fone' }).length,
    ).toBeGreaterThan(0);
  });
  it('keeps all translations, immutable identity and revision while explicitly clearing optional text', async () => {
    await mount(null, '/academic-taxonomy/one');
    await click('Edit Node Details');
    const form = tree.root.findByType('form');
    const textarea = form
      .findAllByType('textarea')
      .find((control) => control.props.value === 'Original')!;
    await act(async () => textarea.props.onChange({ target: { value: '' } }));
    await act(async () => form.props.onSubmit({ preventDefault() {} }));
    const request = state.request.mock.calls.find(
      ([path, options]) =>
        path === '/admin/academic-taxonomy/nodes/one' && options?.method === 'PUT',
    )!;
    expect(JSON.parse(request[1].body)).toMatchObject({
      canonicalCode: 'one',
      standardType: 'ISCED',
      expectedUpdatedAt: '2026-10-27T01:00:00.000Z',
      description: '',
      localizedNames: { fr: 'Conserver', ar: 'المجال', en: 'Field' },
    });
    expect(JSON.parse(request[1].body)).not.toHaveProperty('metadata');
  });
  it('prevents duplicate saves before the pending request finishes', async () => {
    let resolve!: (value: unknown) => void;
    state.request.mockImplementation((path, options) =>
      options?.method === 'PUT'
        ? new Promise((done) => {
            resolve = done;
          })
        : fixture(path, options),
    );
    await mount(null, '/academic-taxonomy/one');
    await click('Edit Node Details');
    const submit = tree.root.findByType('form').props.onSubmit;
    await act(async () => {
      void submit({ preventDefault() {} });
      void submit({ preventDefault() {} });
    });
    expect(
      state.request.mock.calls.filter(([, options]) => options?.method === 'PUT'),
    ).toHaveLength(1);
    await act(async () => resolve({}));
  });
  it('isolates an old node response from the next node workspace', async () => {
    let resolve!: (value: unknown) => void;
    state.request.mockImplementation((path, options) =>
      path.endsWith('/nodes/old')
        ? new Promise((done) => {
            resolve = done;
          })
        : fixture(path, options),
    );
    await mount(null, '/academic-taxonomy/old');
    await act(async () => navigate('/academic-taxonomy/new'));
    await act(async () => resolve(node('OLD-PRIVATE')));
    expect(JSON.stringify(tree.toJSON())).not.toContain('OLD-PRIVATE');
    expect(JSON.stringify(tree.toJSON())).toContain('Field new');
  });
  it('shows impact as counts of relationships and gates consumer links by permission', async () => {
    state.denied.add('admin:majors:manage');
    await mount(null, '/academic-taxonomy/one?tab=usage');
    expect(JSON.stringify(tree.toJSON())).toContain('Relationship count');
    expect(tree.root.findAllByProps({ to: '/majors' })).toHaveLength(0);
  });
});

describe('Read isolation and impact retry', () => {
  it('never exposes data from a previous endpoint, including the render before its effect', async () => {
    const observed: string[] = [];
    function Reader({ endpoint }: { endpoint: string }) {
      const read = useTaxonomyRead<{ name: string }>(endpoint);
      observed.push(endpoint + ':' + (read.data?.name ?? ''));
      return null;
    }
    state.request.mockResolvedValue({ name: 'old' });
    await act(async () => {
      tree = create(<Reader endpoint="old" />);
    });
    state.request.mockImplementation(() => new Promise(() => {}));
    await act(async () => tree.update(<Reader endpoint="new" />));
    expect(observed).not.toContain('new:old');
  });
  it('lets the operator retry unavailable usage before changing lifecycle state', async () => {
    let reads = 0;
    state.request.mockImplementation(() =>
      ++reads === 1
        ? Promise.reject(new Error('unavailable'))
        : Promise.resolve({ counts: { majorProfiles: 2 }, totalReferences: 2 }),
    );
    const ready = vi.fn();
    await mount(
      <CanonicalAcademicGovernancePanel
        endpoint="/usage"
        isAr={false}
        requiresDecision
        decision={{ reason: '', acknowledgeHistoricalReferences: false }}
        onDecision={() => {}}
        onReady={ready}
      />,
    );
    expect(ready).not.toHaveBeenCalledWith(true);
    await click('Refresh data');
    expect(ready).toHaveBeenLastCalledWith(true);
  });
});

describe('Governed import and bulk review actions', () => {
  it('does not query crosswalk coverage with an invalid confidence filter', async () => {
    await mount(
      <AcademicTaxonomyOperationsWorkspace isAr={false} />,
      '/academic-taxonomy?section=crosswalk',
    );
    state.request.mockClear();
    await act(async () =>
      tree.root.findByProps({ type: 'number' }).props.onChange({ target: { value: '2' } }),
    );
    expect(state.request).not.toHaveBeenCalled();
    expect(JSON.stringify(tree.toJSON())).toContain('Confidence must be a number between 0 and 1.');
  });
  const plan = {
    id: 'plan',
    status: 'APPROVED',
    version: 3,
    previewHash: 'a'.repeat(64),
    record: { nodes: [] },
    preview: { issues: [] },
  };
  function importFixture(path: string, options?: any): any {
    if (options?.method) return Promise.resolve(plan);
    if (path.endsWith('/imports/plan')) return Promise.resolve(plan);
    if (path.includes('/imports?'))
      return Promise.resolve({ data: [{ ...plan, version: 1 }], total: 1 });
    return fixture(path, options);
  }
  it('reads the current plan before applying and requires explicit confirmation', async () => {
    state.request.mockImplementation(importFixture);
    await mount(<AcademicTaxonomyImportWorkspace isAr={false} />);
    await click('plan · APPROVED · Version 1');
    expect(state.request).toHaveBeenCalledWith('/admin/academic-taxonomy/imports/plan', {
      cache: 'no-store',
    });
    expect(button('Apply the reviewed content').props.disabled).toBe(true);
    await act(async () =>
      tree.root.findByProps({ type: 'checkbox' }).props.onChange({ target: { checked: true } }),
    );
    await click('Apply the reviewed content');
    const call = state.request.mock.calls.find(([path]) => path.endsWith('/apply'))!;
    expect(JSON.parse(call[1].body)).toEqual({ expectedVersion: 3, previewHash: plan.previewHash });
  });
  it('does not link the upload workspace without imports permission', async () => {
    state.denied.add('admin:imports:manage');
    await mount(<AcademicTaxonomyImportWorkspace isAr={false} />);
    expect(tree.root.findAllByProps({ to: '/imports/academic-taxonomy' })).toHaveLength(0);
  });
  it('binds a bulk decision to the previewed reason and selected record revisions', async () => {
    state.request.mockImplementation((path, options) =>
      path.endsWith('/review/bulk')
        ? Promise.resolve({
            previewHash: 'hash',
            canApply: true,
            data: [{ nodeId: 'one', issues: [], impact: { totalReferences: 3 } }],
          })
        : path.includes('/nodes?')
          ? Promise.resolve({ data: [node()], total: 1 })
          : fixture(path, options),
    );
    await mount(
      <AcademicTaxonomyOperationsWorkspace isAr={false} />,
      '/academic-taxonomy?section=review',
    );
    await click('Select page');
    await act(async () =>
      tree.root.findByType('textarea').props.onChange({ target: { value: 'Reviewed evidence' } }),
    );
    const checkbox = tree.root.findAllByProps({ type: 'checkbox' }).at(-1)!;
    await act(async () => checkbox.props.onChange({ target: { checked: true } }));
    await click('Preview decision');
    expect(button('Apply previewed decision').props.disabled).toBe(false);
    await act(async () =>
      tree.root.findByType('textarea').props.onChange({ target: { value: 'Changed evidence' } }),
    );
    expect(button('Apply previewed decision').props.disabled).toBe(true);
    await click('Preview decision');
    await click('Apply previewed decision');
    const call = state.request.mock.calls.filter(([path]) => path.endsWith('/review/bulk')).at(-1)!;
    expect(JSON.parse(call[1].body)).toMatchObject({
      dryRun: false,
      previewHash: 'hash',
      reason: 'Changed evidence',
      nodes: [{ nodeId: 'one', expectedUpdatedAt: node().updatedAt }],
    });
  });
});

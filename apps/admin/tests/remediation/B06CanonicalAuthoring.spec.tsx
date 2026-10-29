import React from 'react';
import { act, create } from 'react-test-renderer';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ request: vi.fn(), reference: vi.fn() }));
vi.mock('../../src/api/client', () => ({ adminApiClient: { request: mocks.request } }));
vi.mock('../../src/api/referenceData', () => ({ getReferenceDataPage: mocks.reference }));
vi.mock('../../src/i18n/I18nProvider', () => ({ useTranslation: () => ({ language: 'ar', dir: 'rtl' }) }));
import { CanonicalPicker } from '../../src/components/CanonicalPicker';
import { canonicalPickerApi } from '../../src/api/canonicalPickers';
import { ScholarshipCanonicalFilters, emptyScholarshipCanonicalFilters, type ScholarshipCanonicalFilterState } from '../../src/components/ScholarshipCanonicalFilters';
import { ScholarshipRelationshipEditorPage } from '../../src/pages/ScholarshipRelationshipEditorPage';
let tree: ReturnType<typeof create>;
const record = (id: string, lifecycle = 'ACTIVE') => ({ id, label: id, lifecycle });
const flush = () => act(async () => { await vi.advanceTimersByTimeAsync(205); });
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers(); mocks.request.mockReset(); mocks.reference.mockReset();
});
afterEach(async () => { if (tree) await act(async () => tree.unmount()); vi.useRealTimers(); });
async function mount(element: React.ReactElement) { await act(async () => { tree = create(element); }); }
function button(text: string) { return tree.root.findAllByType('button').find(node => node.children.some(child => typeof child === 'string' && child.trim() === text.trim()))!; }

describe('B06 canonical choices', () => {
  it('keeps bounded navigation and exact selections in compact scholarship filters', async () => {
    const load = vi.fn(async (_query?: string, page = 1, _cursor?: string, _signal?: AbortSignal) => page === 1
      ? Array.from({ length: 50 }, (_, index) => record(`country-${index}`))
      : [record('country-51')]);
    const change = vi.fn();
    await mount(<CanonicalPicker label="Country" value="country-existing" onChange={change} load={load} compact paged optional allowInactive />);
    await flush();
    expect(tree.root.findAllByType('input')).toHaveLength(0);
    expect(tree.root.findAllByType('button')).toHaveLength(0);
    await act(async () => tree.root.findByType('select').props.onChange({target:{value:'__canonical_more__'}})); await flush();
    expect(load).toHaveBeenLastCalledWith('', 2, undefined, expect.any(AbortSignal));
    expect(load.mock.calls.at(-1)?.[3]?.aborted).toBe(false);
    expect(tree.root.findByType('select').props.value).toBe('country-existing');
    expect(tree.root.findAllByType('option').some(node => node.props.value === 'country-0')).toBe(true);
    expect(tree.root.findAllByType('option').some(node => node.props.value === 'country-51')).toBe(true);
    expect(tree.root.findAllByType('option').some(node => node.props.value === '__canonical_more__')).toBe(false);
    expect(change).not.toHaveBeenCalled();
  });
  it.each(['countries', 'majors'] as const)('reaches page three and searches %s without dropping the off-page ID', async kind => {
    mocks.reference.mockImplementation(async (_kind, { page }) => ({ data: [{ id: `country-${page}`, name: `Country ${page}` }] }));
    mocks.request.mockImplementation(async path => ({ data: [{ id: `major-${new URL(path, 'https://local').searchParams.get('page')}`, displayName: 'Major' }] }));
    const change = vi.fn();
    await mount(<CanonicalPicker label="Owner" value="existing-150" onChange={change} load={canonicalPickerApi[kind]} paged optional />);
    await flush();
    for (let i = 0; i < 2; i++) { await act(async () => button('التالي').props.onClick()); await flush(); }
    const latest = kind === 'countries' ? mocks.reference.mock.calls.at(-1)![1].page : new URL(mocks.request.mock.calls.at(-1)![0], 'https://local').searchParams.get('page');
    expect(String(latest)).toBe('3');
    expect(tree.root.findByType('select').props.value).toBe('existing-150');
    expect(tree.root.findAllByType('option').some(n => n.props.value === 'existing-150')).toBe(true);
    await act(async () => tree.root.findByType('input').props.onChange({ target: { value: 'Rare' } }));
    await flush();
    if (kind === 'countries') expect(mocks.reference).toHaveBeenLastCalledWith('countries', expect.objectContaining({ q: 'Rare', page: 1 }));
    else expect(mocks.request.mock.calls.at(-1)![0]).toContain('search=Rare');
    expect(change).not.toHaveBeenCalled();
  });
  it('pages program choices with the owner cursor and resets it on search', async () => {
    mocks.request.mockImplementation(async path => {
      const params = new URL(path, 'https://local').searchParams;
      return { items: [{ id: params.get('cursor') ? 'program-101' : 'program-1', sourceProgramName: 'Program' }], nextCursor: params.get('cursor') ? null : 'owner-cursor' };
    });
    await mount(<CanonicalPicker label="Program" value="program-existing" onChange={vi.fn()}
      load={(query, page, cursor) => canonicalPickerApi.programs('university-exact', query, page, cursor)} paged />);
    await flush();
    await act(async () => button('التالي').props.onClick()); await flush();
    const second = new URL(mocks.request.mock.calls.at(-1)![0], 'https://local');
    expect(second.pathname).toBe('/public/university-programs');
    expect(second.searchParams.get('universityId')).toBe('university-exact');
    expect(second.searchParams.get('cursor')).toBe('owner-cursor');
    expect(button('التالي').props.disabled).toBe(true);
    expect(tree.root.findByType('select').props.value).toBe('program-existing');
    await act(async () => tree.root.findByType('input').props.onChange({ target: { value: 'Rare' } })); await flush();
    const searched = new URL(mocks.request.mock.calls.at(-1)![0], 'https://local');
    expect(searched.searchParams.get('search')).toBe('Rare');
    expect(searched.searchParams.has('cursor')).toBe(false);
  });
  it('shows inactive and suspended references but prevents new authoring selection', async () => {
    const change = vi.fn();
    await mount(<CanonicalPicker label="Owner" value="old" onChange={change} load={async () => [record('old', 'INACTIVE'), record('suspended', 'SUSPENDED')]} />);
    await flush();
    expect(tree.root.findAllByType('option').filter(n => n.props.value).every(n => n.props.disabled)).toBe(true);
    await act(async () => tree.root.findByType('select').props.onChange({ target: { value: 'suspended' } }));
    expect(change).not.toHaveBeenCalled();
  });
  it('retains the current ID on a failed page and ignores superseded responses', async () => {
    let resolve!: (value: any) => void;
    const load = vi.fn().mockImplementationOnce(() => new Promise(r => { resolve = r; })).mockRejectedValueOnce(new Error('offline'));
    await mount(<CanonicalPicker label="Owner" value="kept" onChange={vi.fn()} load={load} />); await flush();
    await act(async () => tree.root.findByType('input').props.onChange({ target: { value: 'new query' } })); await flush();
    await act(async () => resolve([record('stale')]));
    expect(tree.root.findAllByType('option').some(n => n.props.value === 'kept')).toBe(true);
    expect(tree.root.findAllByType('option').some(n => n.props.value === 'stale')).toBe(false);
  });
  it('allows historical inactive records for read filters only', async () => {
    const change = vi.fn();
    await mount(<CanonicalPicker label="Filter" value="" onChange={change} load={async () => [record('old', 'ARCHIVED')]} allowInactive />); await flush();
    await act(async () => tree.root.findByType('select').props.onChange({ target: { value: 'old' } }));
    expect(change).toHaveBeenCalledWith('old', expect.objectContaining({ lifecycle: 'ARCHIVED' }));
  });
});

describe('B06 canonical filters', () => {
  it('emits ID filters and resets only a changed program parent', async () => {
    mocks.request.mockResolvedValue({ data: [], items: [], nextCursor: null });
    mocks.reference.mockResolvedValue({ data: [{ id: 'country-exact', name: 'Similar country name', isActive: false }] });
    let observed: ScholarshipCanonicalFilterState = { ...emptyScholarshipCanonicalFilters, academicProgramId: 'program-kept' };
    function Filters() {
      const [value, setValue] = React.useState(observed);
      return <ScholarshipCanonicalFilters ar={false} value={value} onChange={next => { observed = next; setValue(next); }} />;
    }
    await mount(<Filters />); await flush();
    const select = (label: string) => tree.root.findAllByType('select').find(node => node.props['aria-label'] === label)!;
    await act(async () => select('Country').props.onChange({ target: { value: 'country-exact' } }));
    expect(observed.countryReferenceId).toBe('country-exact');
    expect(observed.academicProgramId).toBe('program-kept');
    await act(async () => select('Major').props.onChange({ target: { value: '' } }));
    expect(observed.academicProgramId).toBe('program-kept');
    expect(Object.keys(observed)).not.toContain('degreeLabel');
    expect(Object.keys(observed)).not.toContain('countryLabel');
  });
});

describe('B06 shared relationship editor', () => {
  it('saves exact IDs, metadata and independent source labels with the loaded revision', async () => {
    const detail = { id: 's1', revision: 8, status: 'IMPORTED', publicationStatus: 'DRAFT', displayName: 'Scholarship', studyLanguageReferenceId: 'lang-150', degreeTargets: [{ targetKey: 'degree', degreeLevelId: 'degree-1', sourceLabel: 'Official source degree' }], majorTargets: [{ targetKey: 'major', majorId: 'major-150', sourceLabel: 'Official source major', metadata: { degreeTargetKey: 'degree' } }] };
    let revision=8;
    mocks.request.mockImplementation(async (path, options) => {
      if(options?.method==='PUT'){revision=9;return {...detail,revision};}
      return path==='/admin/scholarships/s1'?{...detail,revision}:{data:[]};
    });
    mocks.reference.mockResolvedValue({ data: [] });
    const saved = vi.fn();
    await mount(<MemoryRouter initialEntries={['/s1']}><Routes><Route path="/:id" element={<ScholarshipRelationshipEditorPage embedded onSaved={saved} />} /></Routes></MemoryRouter>);
    const reason = tree.root.findAllByType('input').find(n => n.props.placeholder === 'وضح سبب تعديل العلاقات')!;
    await act(async () => reason.props.onChange({ target: { value: 'Reviewed official source' } }));
    await act(async () => button('Save all canonical relationships').props.onClick());
    const call = mocks.request.mock.calls.find(([, options]) => options?.method === 'PUT')!;
    expect(call[1].headers['If-Match']).toBe('8');
    expect(JSON.parse(call[1].body)).toMatchObject({ studyLanguageReferenceId: 'lang-150', degreeTargets: detail.degreeTargets, majorTargets: detail.majorTargets });
    expect(saved).toHaveBeenCalledOnce();
  });
});

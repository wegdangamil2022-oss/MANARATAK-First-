import React from 'react';
import { act, create } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ language: 'ar', scholarships: vi.fn(), universities: vi.fn(), courses: vi.fn(), articles: vi.fn(), countries: vi.fn(), degrees: vi.fn() }));
vi.mock('../../src/i18n/I18nProvider', () => ({ useTranslation: () => ({ language: state.language, dir: state.language === 'ar' ? 'rtl' : 'ltr', t: (key: string) => key }) }));
vi.mock('../../src/api/client', () => ({ ApiClient: { getScholarships: state.scholarships, getUniversities: state.universities, getCourses: state.courses, getCmsContent: state.articles, getReferenceCountries: state.countries, getPublicProgramFacetChoices: state.degrees } }));
vi.mock('../../src/features/public-template/publicScholarshipDataSource', () => ({ mapPublicScholarshipDto: (row: unknown) => row }));
vi.mock('../../src/features/public-template/publicLiveDataSource', () => ({ mapPublicUniversityDto: (row: unknown) => row, mapCourse: (row: unknown) => row, mapArticle: (row: unknown) => row }));
import { PublishedCatalogDiscovery } from '../../src/features/public-template/components/PublishedCatalogDiscovery';
import { PublicCatalogChoices } from '../../src/features/public-template/components/PublicCatalogChoices';
import { SmartSearchPage } from '../../src/features/public-template/components/SmartSearchPage';
let tree: ReturnType<typeof create>;
const flush = () => act(async () => { await vi.advanceTimersByTimeAsync(250); });
const button = (text: string) => tree.root.findAllByType('button').find(node => node.children.includes(text))!;
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers(); state.language = 'ar';
  for (const name of ['scholarships','universities','courses','articles','countries','degrees'] as const) state[name].mockReset();
  state.countries.mockResolvedValue([{ id: 'country-uuid', name: 'Same display label' }]);
  state.degrees.mockImplementation(async ({ facet }) => ({ items: [{ id: `${facet.toLowerCase()}-uuid`, label: facet }], total: 1, nextCursor: null }));
  state.scholarships.mockImplementation(async ({ cursor }, locale) => {
    const page = Number(cursor ?? 1);
    return { data: Array.from({ length: 20 }, (_, i) => ({ id: String((page - 1) * 20 + i + 1), title: `${locale}-Result-${(page - 1) * 20 + i + 1}`, country: 'Country' })), total: 120, nextCursor: page < 6 ? String(page + 1) : null };
  });
  state.universities.mockResolvedValue({ data: [{ id: 'university-101', name: 'Late University', country: 'Country' }], total: 1, nextCursor: null });
});
afterEach(async () => { if (tree) await act(async () => tree.unmount()); vi.useRealTimers(); });
async function mount(element: React.ReactElement) { await act(async () => { tree = create(element); }); await flush(); }
describe('B08 owner discovery', () => {
  it('keeps destination nationality and funding organization filters distinct across paging and reset',async()=>{
    state.language='en';await mount(<PublishedCatalogDiscovery kind="scholarships"/>);
    for(const [label,value] of [['Study destination','destination-id'],['Nationality explicitly included in eligibility','nationality-id'],['Funding organization','Donor']]){await act(async()=>tree.root.findByProps({'aria-label':label}).props.onChange({target:{value}}));await flush();}
    await act(async()=>button('Load more').props.onClick());
    expect(state.scholarships).toHaveBeenLastCalledWith(expect.objectContaining({countryReferenceId:'destination-id',nationalityCountryReferenceId:'nationality-id',sponsorName:'Donor',cursor:'2'}),'en',expect.any(AbortSignal));
    await act(async()=>button('Reset filters').props.onClick());await flush();
    expect(state.scholarships).toHaveBeenLastCalledWith(expect.objectContaining({countryReferenceId:undefined,nationalityCountryReferenceId:undefined,sponsorName:undefined,cursor:undefined}),'en',expect.any(AbortSignal));
  });
  it('reaches result 101 by explicit pagination and opens its actual owner identity', async () => {
    const open = vi.fn();
    await mount(<PublishedCatalogDiscovery kind="scholarships" onScholarship={open} />);
    expect(state.scholarships).toHaveBeenCalledOnce();
    for (let i = 0; i < 5; i++) await act(async () => button('تحميل المزيد').props.onClick());
    await act(async () => button('ar-Result-101').props.onClick());
    expect(open).toHaveBeenCalledWith(expect.objectContaining({ id: '101' }));
    expect(state.scholarships).toHaveBeenCalledTimes(6);
  });
  it('passes country and degree IDs to the owner and preserves them and locale on continuation', async () => {
    state.language = 'en'; await mount(<PublishedCatalogDiscovery kind="scholarships" />);
    await act(async () => tree.root.findByProps({ 'aria-label': 'Study destination' }).props.onChange({ target: { value: 'country-uuid' } }));
    await flush();
    await act(async () => tree.root.findByProps({ 'aria-label': 'degree' }).props.onChange({ target: { value: 'degree-uuid' } })); await flush();
    for (const field of ['major', 'language']) { await act(async () => tree.root.findByProps({ 'aria-label': field }).props.onChange({ target: { value: field + '-uuid' } })); await flush(); }
    await act(async () => button('Load more').props.onClick());
    expect(state.scholarships).toHaveBeenLastCalledWith(expect.objectContaining({ countryReferenceId: 'country-uuid', degreeLevelId: 'degree-uuid', majorId: 'major-uuid', studyLanguageReferenceId: 'language-uuid', cursor: '2' }), 'en', expect.any(AbortSignal));
  });
  it('searches universities beyond the preview using the owner query', async () => {
    await mount(<PublishedCatalogDiscovery kind="universities" />);
    await act(async () => tree.root.findByProps({ 'aria-label': 'Catalog search' }).props.onChange({ target: { value: 'Rare University' } })); await flush();
    expect(state.universities).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'Rare University', locale: 'ar', limit: 25 }), expect.any(AbortSignal));
    expect(JSON.stringify(tree.toJSON())).toContain('Late University');
  });
  it('cancels stale language work and ignores a response even if its transport ignores abort', async () => {
    let resolve!: (result: unknown) => void;
    state.scholarships.mockImplementationOnce(() => new Promise(done => { resolve = done; })).mockResolvedValue({ data: [{ id: 'en', title: 'NEW-EN', country: 'Country' }], total: 1 });
    await mount(<PublishedCatalogDiscovery kind="scholarships" />);
    const oldSignal = state.scholarships.mock.calls[0][2];
    state.language = 'en'; await act(async () => tree.update(<PublishedCatalogDiscovery kind="scholarships" />)); await flush();
    expect(oldSignal.aborted).toBe(true);
    await act(async () => resolve({ data: [{ id: 'old', title: 'STALE-AR', country: 'Country' }], total: 1 }));
    expect(JSON.stringify(tree.toJSON())).toContain('NEW-EN'); expect(JSON.stringify(tree.toJSON())).not.toContain('STALE-AR');
  });
  it('shows owner failure without substituting prototype results or a fake zero total', async () => {
    state.scholarships.mockRejectedValue(new Error('offline'));
    await mount(<PublishedCatalogDiscovery kind="scholarships" />);
    expect(JSON.stringify(tree.toJSON())).toContain('تعذر التحميل');
    expect(JSON.stringify(tree.toJSON())).not.toContain('ar-Result');
  });
  it('offers country 101 through bounded option continuation without clearing the current ID', async () => {
    state.countries.mockImplementation(async ({ page }) => Array.from({ length: 50 }, (_, i) => ({ id: String((page - 1) * 50 + i + 1), name: 'Country' })));
    await mount(<PublicCatalogChoices kind="country" value="selected-outside-page" onChange={vi.fn()} />);
    await act(async () => button('خيارات أكثر').props.onClick()); await act(async () => button('خيارات أكثر').props.onClick());
    expect(tree.root.findAllByType('option').some(option => option.props.value === '101')).toBe(true);
    expect(tree.root.findByType('select').props.value).toBe('selected-outside-page');
  });
  it('preserves the course track, category, access and locale on the next owner page', async () => {
    state.language = 'en';
    state.courses.mockResolvedValue({ data: [{ course: { id: 'course-slug', title: 'Published course' }, imported: null, track: 'native' }], total: 41, nextCursor: 'next-course' });
    await mount(<PublishedCatalogDiscovery kind="courses" courseTrack="native" initialQuery="Computing" />);
    await act(async () => button('Load more').props.onClick());
    expect(state.courses).toHaveBeenLastCalledWith(expect.objectContaining({ category: 'Computing', originType: 'NATIVE_MANARATAK_COURSE', cursor: 'next-course' }), 'en', expect.any(AbortSignal));
  });
  it('continues editorial discovery with the actual CMS offset contract', async () => {
    state.language = 'en'; state.articles.mockImplementation(async ({ page }) => ({ data: [{ id: String(page), titleAr: 'Article', titleEn: 'Published article', body: 'Body' }], total: 101, totalPages: 6 }));
    await mount(<PublishedCatalogDiscovery kind="articles" />);
    await act(async () => button('Load more').props.onClick());
    expect(state.articles).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, pageSize: 20, locale: 'en' }), expect.any(AbortSignal));
  });
  it('submits the live smart entry to the canonical public search instead of ranking preview cards', async () => {
    const search = vi.fn();
    await mount(<SmartSearchPage initialQuery="Find 101" scholarships={[]} universities={[]} onBack={vi.fn()} onOpenNormalSearch={search} onOpenScholarship={vi.fn()} onOpenUniversity={vi.fn()} onNavigateCategory={vi.fn()} />);
    await act(async () => tree.root.findByType('form').props.onSubmit({ preventDefault() {} }));
    expect(search).toHaveBeenCalledWith('Find 101');
    expect(state.scholarships).not.toHaveBeenCalled();
  });
});

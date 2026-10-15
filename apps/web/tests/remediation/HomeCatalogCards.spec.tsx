import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FeaturedUniversities } from '../../src/features/public-template/components/FeaturedUniversities';
import { FeaturedCourses } from '../../src/features/public-template/components/FeaturedCourses';
import { ar } from '../../src/i18n/ar';
import { en } from '../../src/i18n/en';
import type { Course, University } from '../../src/features/public-template/types';
const locale = vi.hoisted(() => ({ value: 'ar' as 'ar' | 'en' }));
vi.mock('../../src/i18n/I18nProvider', () => ({ useTranslation: () => ({
  language: locale.value, dir: locale.value === 'ar' ? 'rtl' : 'ltr',
  t: (key: keyof typeof en) => (locale.value === 'ar' ? ar : en)[key] ?? key,
}) }));
const noop = () => {};
const university = { id: 'owner-published-university', name: 'جامعة منشورة للاختبار', nameEn: 'Published Fixture University', globalRank: null,
  country: 'بلد الاختبار', countryFlag: '', scholarshipCount: null, imageUrl: '' } as University;
const course = (originType = 'EXTERNAL_LINKED_COURSE') => ({ id: `published-${originType}`, title: `Published fixture ${originType}`, provider: 'Owner provider', imageUrl: '', originType } as Course);
let tree: ReactTestRenderer | undefined;
beforeEach(() => { locale.value = 'ar'; globalThis.IS_REACT_ACT_ENVIRONMENT = true; });
afterEach(async () => { if (tree) await act(async () => tree!.unmount()); tree = undefined; });
const render = (element: React.ReactElement) => renderToStaticMarkup(element);
async function mount(element: React.ReactElement) { await act(async () => { tree = create(element); }); return tree!; }

describe('home catalog design survives owner states', () => {
  it.each(['ar', 'en'] as const)('keeps university frame, three inert slots and browse action in %s', language => {
    locale.value = language;
    const html = render(<FeaturedUniversities universities={[]} status="empty" onSelectUniversity={noop} onViewAllClick={noop} />);
    expect(html).toContain('featured-universities-section'); expect(html).toContain('btn-view-all-universities');
    expect(html.match(/data-catalog-slot="universities"/g)).toHaveLength(3);
    expect(html).toContain(language === 'ar' ? ar.public_home_universities_empty : en.public_home_universities_empty);
    expect(html).not.toContain('role="button"'); expect(html).not.toContain('tabindex'); expect(html).toContain('/preview-art/universities.svg'); expect(html).not.toContain('>#1<');
  });
  it('displays skeletons on loading and retry on failure, without calling failure empty', async () => {
    const retry = vi.fn();
    const view = await mount(<FeaturedUniversities universities={[]} status="loading" onRetry={retry} onSelectUniversity={noop} onViewAllClick={noop} />);
    expect(view.root.findAllByProps({ 'aria-busy': true })).toHaveLength(1);
    await act(async () => view.update(<FeaturedUniversities universities={[]} status="unavailable" onRetry={retry} onSelectUniversity={noop} onViewAllClick={noop} />));
    expect(JSON.stringify(view.toJSON())).toContain(ar.public_home_catalog_unavailable);
    expect(JSON.stringify(view.toJSON())).not.toContain(ar.public_home_universities_empty);
    expect(view.root.findAllByProps({ 'data-catalog-slot': 'universities' })).toHaveLength(3);
    await act(async () => view.root.findAllByType('button').find(n => n.children.includes(ar.public_home_catalog_retry))!.props.onClick());
    expect(retry).toHaveBeenCalledOnce();
  });
  it('updates the same university section from empty to published and back after withdrawal', async () => {
    const select = vi.fn(); const browse = vi.fn();
    const props = { onSelectUniversity: select, onViewAllClick: browse };
    const view = await mount(<FeaturedUniversities {...props} universities={[]} status="empty" />);
    await act(async () => view.update(<FeaturedUniversities {...props} universities={[university]} status="ready" />));
    expect(view.root.findAllByProps({ 'data-catalog-slot': 'universities' })).toHaveLength(0);
    const card = view.root.findByProps({ role: 'button' });
    await act(async () => card.props.onKeyDown({ key: 'Enter', preventDefault: noop })); expect(select).toHaveBeenCalledWith(university);
    await act(async () => view.root.findByProps({ id: 'btn-view-all-universities' }).props.onClick()); expect(browse).toHaveBeenCalledOnce();
    await act(async () => view.update(<FeaturedUniversities {...props} universities={[]} status="empty" />));
    expect(view.root.findAllByProps({ 'data-catalog-slot': 'universities' })).toHaveLength(3);
  });
  it.each(['ar', 'en'] as const)('retains both course controls and three slots with no courses in %s', language => {
    locale.value = language; const dict = language === 'ar' ? ar : en;
    const html = render(<FeaturedCourses courses={[]} status="empty" onViewAllClick={noop} />);
    expect(html).toContain('featured-courses-section'); expect(html).toContain('btn-view-all-courses');
    expect(html).toContain(dict.public_global_platforms); expect(html).toContain(dict.public_manaratak_courses);
    expect(html.match(/data-catalog-slot="courses"/g)).toHaveLength(3); expect(html).toContain('/preview-art/courses.svg');
  });
  it('keeps global failure independent of native published records and native empty independent of global records', async () => {
    const select = vi.fn(); const native = course('NATIVE_MANARATAK_COURSE'); const global = course();
    const view = await mount(<FeaturedCourses courses={[]} previews={{ global: { status: 'unavailable', courses: [] }, native: { status: 'ready', courses: [native] } }} onRetry={noop} onSelectCourse={select} onViewAllClick={noop} />);
    expect(JSON.stringify(view.toJSON())).toContain(ar.public_home_catalog_unavailable);
    const nativeTab = () => view.root.findAllByType('button').find(n => n.props['aria-controls'] === 'home-course-cards' && n.props['aria-pressed'] === false)!;
    await act(async () => nativeTab().props.onClick());
    expect(JSON.stringify(view.toJSON())).toContain(native.title); expect(JSON.stringify(view.toJSON())).not.toContain(ar.public_home_catalog_unavailable);
    await act(async () => view.root.findByProps({ role: 'button' }).props.onClick()); expect(select).toHaveBeenCalledWith(native);
    await act(async () => view.update(<FeaturedCourses courses={[]} previews={{ global: { status: 'ready', courses: [global] }, native: { status: 'empty', courses: [] } }} onViewAllClick={noop} />));
    expect(JSON.stringify(view.toJSON())).toContain(ar.public_home_courses_empty);
    await act(async () => nativeTab().props.onClick()); expect(JSON.stringify(view.toJSON())).toContain(global.title);
  });
  it('keeps successfully loaded records visible alongside an explicit partial warning', () => {
    // Tab state is selected through the actual button, not inferred from a provider name.
    const html = render(<FeaturedCourses courses={[]} previews={{ global: { status: 'unavailable', courses: [course()] }, native: { status: 'empty', courses: [] } }} onRetry={noop} onViewAllClick={noop} />);
    expect(html).toContain(ar.public_home_catalog_partial); expect(html).toContain(course().title);
  });
});

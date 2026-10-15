import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { FeaturedScholarships } from '../../src/features/public-template/components/FeaturedScholarships';
import { FeaturedUniversities } from '../../src/features/public-template/components/FeaturedUniversities';
import { FeaturedCourses } from '../../src/features/public-template/components/FeaturedCourses';
import { FeaturedCountries } from '../../src/features/public-template/components/FeaturedCountries';
import { HomeShowcaseFrame } from '../../src/features/public-template/components/HomeShowcaseFrame';
import {
  HOME_DESIGN_COURSES, HOME_DESIGN_COUNTRIES, HOME_DESIGN_SCHOLARSHIPS, HOME_DESIGN_UNIVERSITIES,
} from '../../src/features/public-template/homeDesignPreviewData';
import { ar } from '../../src/i18n/ar';

vi.mock('../../src/i18n/I18nProvider', () => ({ useTranslation: () => ({
  language: 'ar' as const, dir: 'rtl' as const, t: (key: keyof typeof ar) => ar[key] ?? key,
}) }));
const noop = () => {};
const render = (node: React.ReactElement) => renderToStaticMarkup(node);

describe('original photographic home design without published owner records', () => {
  it('uses original images and names of preview universities inside an inert labeled section', () => {
    const html = render(<HomeShowcaseFrame active>
      <FeaturedUniversities universities={HOME_DESIGN_UNIVERSITIES} status="ready" onSelectUniversity={noop} onViewAllClick={noop} />
    </HomeShowcaseFrame>);
    expect(html).toContain('inert=""');
    expect(html).toContain('معاينة تصميم فقط');
    expect(html).toContain('جامعة أكسفورد');
    expect(html).toContain('جامعة تسينغهوا');
    expect(html).toContain('photo-1541339907198-e08756dedf3f');
    expect(html).not.toContain('data-catalog-slot="universities"');
  });
  it('restores the original scholarships, study destinations and course photos', () => {
    const grants = render(<HomeShowcaseFrame active>
      <FeaturedScholarships scholarships={HOME_DESIGN_SCHOLARSHIPS} selection="featured" status="ready" onViewAllClick={noop} />
    </HomeShowcaseFrame>);
    const countries = render(<HomeShowcaseFrame active>
      <FeaturedCountries countries={HOME_DESIGN_COUNTRIES} dataMode="prototype" status="ready" onSelectCountry={noop} onViewAllClick={noop} />
    </HomeShowcaseFrame>);
    const courses = render(<HomeShowcaseFrame active>
      <FeaturedCourses courses={HOME_DESIGN_COURSES} dataMode="prototype" status="ready" onViewAllClick={noop} />
    </HomeShowcaseFrame>);
    expect(grants).toContain('منحة الحكومة الصينية');
    expect(grants).toContain('photo-1508804185872-d7badad00f7d');
    expect(countries).toContain('ماليزيا');
    expect(countries).toContain('photo-1596422846543-75c6fc197f07');
    expect(courses).toContain('Stanford Online');
    expect(courses).toContain('photo-1677442136019-21780efad99a');
  });
  it('has no details, eligibility, or real owner identifiers and turns off inert for real published cards', () => {
    expect(HOME_DESIGN_UNIVERSITIES.every(item => item.id.startsWith('home-preview-'))).toBe(true);
    expect(HOME_DESIGN_COURSES.every(item => item.id.startsWith('home-preview-'))).toBe(true);
    expect(HOME_DESIGN_SCHOLARSHIPS.every(item => item.id.startsWith('home-preview-'))).toBe(true);
    expect(render(<HomeShowcaseFrame active={false}><p>Published</p></HomeShowcaseFrame>)).not.toContain('inert=""');
  });
});

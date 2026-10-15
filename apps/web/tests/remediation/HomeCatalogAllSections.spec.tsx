import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FeaturedScholarships } from '../../src/features/public-template/components/FeaturedScholarships';
import { FeaturedCountries } from '../../src/features/public-template/components/FeaturedCountries';
import { FeaturedExams } from '../../src/features/public-template/components/FeaturedExams';
import { FeaturedArticles } from '../../src/features/public-template/components/FeaturedArticles';
import { FeaturedServices } from '../../src/features/public-template/components/FeaturedServices';
import { AIToolsBanner } from '../../src/features/public-template/components/AIToolsBanner';
import { ar } from '../../src/i18n/ar';
import { en } from '../../src/i18n/en';
import type { CountryDestination, PublicArticle, Scholarship } from '../../src/features/public-template/types';

const locale = vi.hoisted(() => ({ value: 'ar' as 'ar' | 'en' }));
vi.mock('../../src/i18n/I18nProvider', () => ({ useTranslation: () => ({
  language: locale.value, dir: locale.value === 'ar' ? 'rtl' : 'ltr',
  t: (key: keyof typeof en) => (locale.value === 'ar' ? ar : en)[key] ?? key,
}) }));
const noop = () => {};
const render = (element: React.ReactElement) => renderToStaticMarkup(element);

describe('public home sections retain inert card layouts without owner data', () => {
  beforeEach(() => { locale.value = 'ar'; });
  const emptySections = [
    { kind: 'scholarships', count: 2, render: () => <FeaturedScholarships scholarships={[]} status="empty" onViewAllClick={noop} /> },
    { kind: 'countries', count: 8, render: () => <FeaturedCountries countries={[]} status="empty" onSelectCountry={noop} onViewAllClick={noop} /> },
    { kind: 'exams', count: 6, render: () => <FeaturedExams exams={[]} status="empty" onViewAllClick={noop} /> },
    { kind: 'articles', count: 4, render: () => <FeaturedArticles articles={[]} status="empty" dataMode="api" onViewAllClick={noop} onSelectArticle={noop} /> },
    { kind: 'services', count: 3, render: () => <FeaturedServices services={[]} status="empty" onViewAllClick={noop} /> },
  ] as const;

  it.each(['ar', 'en'] as const)('keeps decorative empty slots in %s', language => {
    locale.value = language;
    for (const section of emptySections) {
      const html = render(section.render());
      expect(html, section.kind).toContain('data-home-empty-kind="' + section.kind + '"');
      expect(html.match(new RegExp('data-home-empty-slot="' + section.kind + '"', 'g'))).toHaveLength(section.count);
      expect(html, section.kind).not.toContain('role="button"');
      expect(html, section.kind).not.toContain('https://images.unsplash.com/');
    }
  });

  it('keeps real published records when returned and never substitutes sample editorial data', () => {
    const scholarship = { id: 's1', title: 'Published scholarship', featured: true, imageUrl: '', country: 'Test country' } as Scholarship;
    const country = { id: 'c1', slug: 'country-c1', name: 'Published country', flag: '', isFeatured: false } as CountryDestination;
    const article = { id: 'a1', titleAr: 'Published article' } as PublicArticle;
    const s = render(<FeaturedScholarships scholarships={[scholarship]} status="ready" onViewAllClick={noop} />);
    const c = render(<FeaturedCountries countries={[country]} status="ready" onSelectCountry={noop} onViewAllClick={noop} />);
    const a = render(<FeaturedArticles articles={[article]} status="ready" dataMode="api" onViewAllClick={noop} onSelectArticle={noop} />);
    expect(s).toContain('Published scholarship'); expect(s).not.toContain('data-home-empty-slot');
    expect(c).toContain('Published country'); expect(c).not.toContain('data-home-empty-slot');
    expect(a).toContain('Published article'); expect(a).not.toContain('data-home-empty-slot');
  });

  it('shows explicit retry only on unavailable rather than treating an API error as empty', () => {
    const failed = render(<FeaturedScholarships scholarships={[]} status="unavailable" onRetry={noop} onViewAllClick={noop} />);
    const loading = render(<FeaturedScholarships scholarships={[]} status="loading" onRetry={noop} onViewAllClick={noop} />);
    expect(failed).toContain('data-catalog-state="unavailable"');
    expect(failed).toContain(ar.public_home_catalog_retry);
    expect(loading).toContain('data-catalog-state="loading"');
    expect(loading).toContain('aria-busy="true"');
    expect(loading).not.toContain('public_home_scholarships_empty');
  });

  it('keeps tool designs visible but disabled in live mode, with a clear preview notice', () => {
    const html = render(<AIToolsBanner dataMode="api" onOpenAiTools={noop} />);
    expect(html).toContain(ar.public_home_tools_preview_notice);
    expect(html).toContain('disabled=""');
    expect(html).toContain('home-tools-preview-note');
    expect(html).toContain('btn-view-all-ai-tools');
  });
});

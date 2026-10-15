import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
vi.mock('../../src/i18n/I18nProvider', () => ({ useTranslation: () => ({ language: 'en', dir: 'ltr', setLanguage: vi.fn(), t: (key: string) => key }) }));
import { PublicInfoPage } from '../../src/features/public-template/components/PublicInfoPage';
import { FeaturedScholarships } from '../../src/features/public-template/components/FeaturedScholarships';
import { FeaturedMajors } from '../../src/features/public-template/components/FeaturedMajors';
const noop = () => {};
describe('B08 published placement and editorial promises', () => {
  it('shows the selected published preview without inventing an admin featured flag or fixture', () => {
    const html = renderToStaticMarkup(<FeaturedScholarships selection="published-preview" scholarships={[{ id: 'owner', title: 'ACTUAL-PUBLISHED', country: 'Country', imageUrl: '/image', featured: false } as any]} onViewAllClick={noop} />);
    expect(html).toContain('ACTUAL-PUBLISHED');
    expect(html).not.toMatch(/csc-china|scholarship-fixture/);
  });
  it('does not infer global major counts from snapshot length', () => {
    const html = renderToStaticMarkup(<FeaturedMajors dataMode="api" majors={[]} onSelectMajor={noop} onViewAllClick={noop} />);
    expect(html).not.toMatch(/840|1114|1116|360/);
  });
  it('uses accurate live FAQ text and keeps demonstration claims explicit to preview mode', () => {
    const live = renderToStaticMarkup(<PublicInfoPage page="faq" onBack={noop} onServices={noop} />);
    expect(live).toContain('Search queries published items');
    expect(live).toContain('Account actions require sign-in');
    expect(live).not.toContain('demonstration results');
    const preview = renderToStaticMarkup(<PublicInfoPage page="faq" dataMode="prototype" onBack={noop} onServices={noop} />);
    expect(preview).toContain('demonstration results');
  });
});

import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { FeaturedUniversities } from '../../src/features/public-template/components/FeaturedUniversities';
import { FeaturedCourses } from '../../src/features/public-template/components/FeaturedCourses';
import { ar } from '../../src/i18n/ar';
import { en } from '../../src/i18n/en';
const state = vi.hoisted(() => ({ locale: 'ar' }));
vi.mock('../../src/i18n/I18nProvider', () => ({ useTranslation: () => ({
  t: (key: keyof typeof en) => (state.locale === 'en' ? en : ar)[key],
}) }));
describe('isolated bilingual home component render (public English activation unchanged)', () => {
  it.each(['ar', 'en'])('renders %s copy and can export a CSS/browser fixture', locale => {
    state.locale = locale;
    const html = renderToStaticMarkup(<div className="mx-auto w-full max-w-3xl px-3"><FeaturedUniversities universities={[]} status="empty" onSelectUniversity={() => {}} onViewAllClick={() => {}} /><FeaturedCourses courses={[]} status="empty" onViewAllClick={() => {}} /></div>);
    expect(html).toContain((locale === 'ar' ? ar : en).public_home_universities_empty);
    expect(html.match(/data-catalog-slot=/g)).toHaveLength(6);
    const output = process.env.HOME_CATALOG_RENDER_OUTPUT;
    if (output) {
      fs.mkdirSync(output, { recursive: true });
      const css = fs.readdirSync('apps/web/dist/assets').find(file => file.endsWith('.css'));
      if (!css) throw new Error('BUILD_WEB_BEFORE_EXPORTING_VISUAL_FIXTURES');
      fs.writeFileSync(path.join(output, `${locale}-components.html`), `<!doctype html><html lang="${locale}" dir="${locale === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="http://127.0.0.1:4179/assets/${css}"></head><body>${html}</body></html>`);
    }
  });
});

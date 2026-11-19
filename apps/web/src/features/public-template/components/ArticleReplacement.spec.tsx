import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../../i18n/I18nProvider';
import type { PublicArticle } from '../types';
import { ArticleDetail } from './ArticleDetail';
import { ArticlesSearchPage } from './ArticlesSearchPage';

afterEach(() => vi.unstubAllEnvs());

describe('replacement article design respects published content', () => {
  it('uses the published record even when its identity matches a design example', () => {
    vi.stubEnv('VITE_PUBLIC_TEMPLATE_DATA_MODE', 'api');
    const article: PublicArticle = {
      id: 'art_cultural_exchange', slug: 'yemen-cultural-exchange-scholarships-guide',
      titleAr: 'عنوان منشور من المالك', titleEn: 'Published owner title', contentType: 'STUDY_GUIDE',
      contentTypeLabelAr: 'دليل', categoryAr: 'الدراسة', author: 'المؤلف المعتمد', updatedAt: '2026-11-19',
      excerptAr: 'ملخص منشور', body: 'النص المنشور من لوحة الإدارة', sections: [],
      linkedEntities: [{ type: 'EXAM', id: 'canonical-test-id', name: 'اختبار مرتبط منشور' }],
    };
    const html = renderToStaticMarkup(<I18nProvider><ArticleDetail article={article} onBack={() => {}} /></I18nProvider>);
    expect(html).toContain(article.titleAr);
    expect(html).toContain(article.body);
    expect(html).toContain('اختبار مرتبط منشور');
    expect(html).not.toContain('وزارة التعليم العالي والبحث العلمي');
  });

  it('does not replace a missing live detail with a sample article', () => {
    vi.stubEnv('VITE_PUBLIC_TEMPLATE_DATA_MODE', 'api');
    const html = renderToStaticMarkup(<I18nProvider><ArticleDetail articleId="art_cultural_exchange" onBack={() => {}} /></I18nProvider>);
    expect(html).toContain('المقال غير متاح');
  });

  it('does not inject a cultural exchange design record into an empty live catalog', () => {
    vi.stubEnv('VITE_PUBLIC_TEMPLATE_DATA_MODE', 'api');
    const html = renderToStaticMarkup(<I18nProvider><ArticlesSearchPage articles={[]} onSelectArticle={() => {}} /></I18nProvider>);
    expect(html).not.toContain('art_cultural_exchange');
    expect(html).not.toContain('الدليل الشامل لمنح التبادل الثقافي');
  });
});

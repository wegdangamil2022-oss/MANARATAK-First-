import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FeaturedCourses } from './components/FeaturedCourses';
import { FeaturedServices } from './components/FeaturedServices';
import { loadPublicPrototypeSnapshot } from './publicPrototypeDataSource';

describe('public design import boundaries', () => {
  it('retains the supplied course and service datasets for explicit prototype mode', () => {
    const snapshot = loadPublicPrototypeSnapshot();
    expect(snapshot.data.courses.length).toBeGreaterThanOrEqual(6);
    expect(snapshot.data.services.length).toBeGreaterThanOrEqual(6);
    expect(snapshot.data.courses.some(course => course.provider.includes('منارتك'))).toBe(true);
    expect(snapshot.data.courses.some(course => !course.provider.includes('منارتك'))).toBe(true);
    const countryIds = new Set(snapshot.data.countries.map(country => country.id));
    for (const scholarship of snapshot.data.scholarships) {
      expect(countryIds.has(scholarship.countryReferenceId || '')).toBe(true);
    }
  });

  it('does not replace an empty live course response with fixtures', () => {
    const html = renderToStaticMarkup(createElement(FeaturedCourses, { courses: [], onViewAllClick() {} }));
    expect(html).toContain('لا توجد دورات حالياً في هذا القسم.');
    expect(html).not.toContain('IELTS خطوة بخطوة');
  });

  it('renders a small supplied course response without swapping its identity', () => {
    const course = { ...loadPublicPrototypeSnapshot().data.courses[0], id: 'live-course', provider: 'Live Academy', title: 'Live supplied course' };
    const html = renderToStaticMarkup(createElement(FeaturedCourses, { courses: [course], onViewAllClick() {} }));
    expect(html).toContain('Live supplied course');
    expect(html).not.toContain('IELTS خطوة بخطوة');
  });

  it('does not replace an empty live service response with fixtures', () => {
    const html = renderToStaticMarkup(createElement(FeaturedServices, { services: [] }));
    for (const service of loadPublicPrototypeSnapshot().data.services) expect(html).not.toContain(service.title);
  });

  it('retains tracker navigation and excludes the archive Admin switcher and global mock API', () => {
    const app = readFileSync(resolve('apps/web/src/features/public-template/PublicTemplateApp.tsx'), 'utf8');
    expect(app).toContain("activeTab === 'tracker'");
    expect(app).toContain('<LearnerProgressTracker');
    expect(app).toContain('<LiveStudentWorkspacePage initialTab="JOURNEY"');
    expect(existsSync(resolve('preview/entry.ts'))).toBe(false);
    expect(existsSync(resolve('preview/mock-api.ts'))).toBe(false);
    expect(app).not.toContain('بيانات تجريبية •');
  });
});

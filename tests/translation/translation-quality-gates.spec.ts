import { describe, expect, it } from 'vitest';
import { ApplicationLocaleProjectionService } from '../../packages/application/src/localization/ApplicationLocaleProjectionService';
import { parseRequestLocale } from '../../apps/api/src/presentation/api/locale/LocaleQueryContract';
import { buildLocalizedSeoLinks, toOpenGraphLocale } from '../../apps/web/src/seo/localeSeo';
import { getLocaleDirection } from '../../packages/shared/src/localization/locale';

describe('translation quality gates', () => {
  const projection = new ApplicationLocaleProjectionService();

  it('keeps the same University canonical publicId across AR/EN projections', () => {
    const university = {
      id: 'university-db-id',
      publicId: 'INS-ITA-0010',
      slug: 'example-university',
      canonicalName: 'Example University',
      displayName: 'Example University',
      officialWebsite: 'https://example.edu',
      country: 'Italy',
      institutionType: 'University',
      status: 'PUBLISHED',
      completenessStatus: 'COMPLETE',
      optionalFields: {},
      sourceRecords: [{ sourceLocale: 'en' }],
      translations: [
        { locale: 'ar', displayName: 'جامعة المثال', description: 'وصف عربي', reviewStatus: 'PUBLISHED' },
        { locale: 'en', displayName: 'Example University', description: 'English description', reviewStatus: 'PUBLISHED' },
      ],
      localizedTexts: [],
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    } as unknown as Parameters<ApplicationLocaleProjectionService['projectUniversity']>[0];
    const before = JSON.stringify(university);

    const ar = projection.projectUniversity(university, 'ar');
    const en = projection.projectUniversity(university, 'en');

    expect(ar.publicId).toBe('INS-ITA-0010');
    expect(en.publicId).toBe('INS-ITA-0010');
    expect(ar.displayName).toBe('جامعة المثال');
    expect(en.displayName).toBe('Example University');
    expect(JSON.stringify(university)).toBe(before);
  });

  it('keeps the same Major-family publicId and selects locale-specific content sections', () => {
    const major = {
      id: 'major-db-id',
      publicId: 'MJR-0001',
      slug: 'computer-science',
      canonicalName: 'Computer Science',
      displayName: 'علوم الحاسب',
      localizedNameAr: 'علوم الحاسب',
      localizedNameEn: 'Computer Science',
      degreeLevel: 'Bachelor',
      sourceClassificationSystem: 'MANARATAK',
      status: 'PUBLISHED',
      completenessStatus: 'COMPLETE',
      optionalFields: {},
      sources: [{ sourceLocale: 'ar' }],
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    } as unknown as Parameters<ApplicationLocaleProjectionService['projectMajor']>[0];
    const sections = [
      { sectionKey: 'overview', locale: 'ar', title: 'النبذة', content: 'محتوى عربي', reviewStatus: 'PUBLISHED' },
      { sectionKey: 'overview', locale: 'en', title: 'Overview', content: 'English content', reviewStatus: 'PUBLISHED' },
    ] as unknown as Parameters<ApplicationLocaleProjectionService['projectMajor']>[1];
    const before = JSON.stringify({ major, sections });

    const ar = projection.projectMajor(major, sections, 'ar');
    const en = projection.projectMajor(major, sections, 'en');

    expect(ar.publicId).toBe('MJR-0001');
    expect(en.publicId).toBe('MJR-0001');
    expect(ar.displayName).toBe('علوم الحاسب');
    expect(en.displayName).toBe('Computer Science');
    expect(ar.contentSections?.[0]?.content).toBe('محتوى عربي');
    expect(en.contentSections?.[0]?.content).toBe('English content');
    expect(JSON.stringify({ major, sections })).toBe(before);
  });

  it('enforces strict API locale validation and Arabic default', () => {
    expect(parseRequestLocale({ locale: 'ar' })).toBe('ar');
    expect(parseRequestLocale({ locale: 'en' })).toBe('en');
    expect(parseRequestLocale({})).toBe('ar');
    expect(() => parseRequestLocale({ locale: 'fr' })).toThrow();
  });

  it('keeps locale route, canonical, hreflang and metadata language consistent', () => {
    const links = buildLocalizedSeoLinks({
      baseUrl: 'https://manaratak.example',
      pathname: '/ar/universities/example-university',
      locale: 'ar',
    });

    expect(links.canonical).toBe('https://manaratak.example/ar/universities/example-university');
    expect(links.alternates.ar).toBe('https://manaratak.example/ar/universities/example-university');
    expect(links.alternates.en).toBe('https://manaratak.example/en/universities/example-university');
    expect(links.xDefault).toBe(links.alternates.ar);
    expect(toOpenGraphLocale('ar')).toBe('ar_AR');
    expect(toOpenGraphLocale('en')).toBe('en_US');
    expect(getLocaleDirection('ar')).toBe('rtl');
    expect(getLocaleDirection('en')).toBe('ltr');
  });
});

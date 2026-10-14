import { mapInternationalTestToExam } from '../../packages/ui/src/public-tests/presentation';
import { describe, it, expect, vi } from 'vitest';
import {
  PUBLIC_TEMPLATE_LOCALES,
  resolveSourceLocaleEvidence,
  assessLocalizedPage,
} from '../../packages/shared/src/localization/readiness';
import { readStoredLocale, writeStoredLocale } from '../../apps/web/src/i18n/browserStorage';
import { parseRequestLocale } from '../../apps/api/src/presentation/api/locale/LocaleQueryContract';
import { buildLocalizedSeoLinks } from '../../apps/web/src/seo/localeSeo';
describe('Section 17 release and source contracts', () => {
  it('keeps English shells and their SEO out of release until copy parity is proven', () => {
    expect(PUBLIC_TEMPLATE_LOCALES).toEqual(['ar']);
    const links = buildLocalizedSeoLinks({
      baseUrl: 'https://example.test',
      pathname: '/en/universities',
      locale: 'en',
    });
    expect(links.indexable).toBe(false);
    expect(links.alternates.en).toBeUndefined();
  });
  it('does not count approved or fallback fields as fully published localized content', () => {
    expect(
      assessLocalizedPage('en', [{ value: 'Name', reviewStatus: 'APPROVED', resolvedLocale: 'en' }])
        .fullyLocalized,
    ).toBe(false);
    expect(
      assessLocalizedPage('en', [{ value: 'اسم', reviewStatus: 'PUBLISHED', resolvedLocale: 'ar' }])
        .fullyLocalized,
    ).toBe(false);
    expect(
      assessLocalizedPage('ar', [{ value: 'اسم', reviewStatus: 'PUBLISHED', resolvedLocale: 'ar' }])
        .fullyLocalized,
    ).toBe(true);
  });
  it('ignores archived provenance and reports equally authoritative conflicts honestly', () => {
    expect(
      resolveSourceLocaleEvidence([
        { sourceLocale: 'ar', status: 'ARCHIVED' },
        { sourceLocale: 'en', isCurrent: true },
      ]).locale,
    ).toBe('en');
    expect(resolveSourceLocaleEvidence([{ sourceLocale: 'ar' }, { sourceLocale: 'en' }])).toEqual({
      locale: null,
      status: 'AMBIGUOUS',
    });
  });
  it('selects newer owner import provenance independently of array order', () => {
    expect(
      resolveSourceLocaleEvidence([
        { sourceLocale: 'ar', importedAt: '2026-01-01' },
        { sourceLocale: 'en', importedAt: '2026-02-01' },
      ]).locale,
    ).toBe('en');
  });
  it('rejects repeated locale parameters instead of selecting the last one', () => {
    expect(() => parseRequestLocale({ locale: ['ar', 'en'] })).toThrow();
    expect(parseRequestLocale({ locale: 'ar' })).toBe('ar');
    expect(parseRequestLocale({})).toBe('ar');
  });
  it('survives browsers that deny storage access', () => {
    vi.stubGlobal('window', {
      get localStorage() {
        throw new Error('Storage denied');
      },
    });
    expect(readStoredLocale()).toBeNull();
    expect(() => writeStoredLocale('en')).not.toThrow();
    vi.unstubAllGlobals();
  });
  it('retains test-name fallback provenance through the shared public mapper', () => {
    const localization = {
      requestedLocale: 'en',
      resolvedLocale: 'ar',
      availability: 'SOURCE',
      fullyLocalized: false,
      indexable: false,
    };
    const exam = mapInternationalTestToExam({
      id: 'test',
      canonicalName: 'Canonical test',
      displayName: 'Source name',
      testCategory: 'LANGUAGE',
      providerName: 'Owner',
      status: 'PUBLISHED',
      locale: 'en',
      localization,
    });
    expect(exam.localization).toEqual(localization);
    expect(exam.name).toBe('Source name');
  });
});

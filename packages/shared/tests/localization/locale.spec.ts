import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  getLocaleDirection,
  isSupportedLocale,
  parseSupportedLocale,
  resolveLocalePreference,
  resolveLocalizedLocale,
} from '../../src/localization/locale';

describe('canonical locale contract', () => {
  it('supports exactly Arabic and English', () => {
    expect(SUPPORTED_LOCALES).toEqual(['ar', 'en']);
    expect(isSupportedLocale('ar')).toBe(true);
    expect(isSupportedLocale('en')).toBe(true);
    expect(isSupportedLocale('fr')).toBe(false);
    expect(isSupportedLocale(' en ')).toBe(false);
    expect(parseSupportedLocale(undefined)).toBeNull();
  });

  it('derives direction deterministically', () => {
    expect(getLocaleDirection('ar')).toBe('rtl');
    expect(getLocaleDirection('en')).toBe('ltr');
  });

  it('uses the approved locale-preference precedence', () => {
    expect(
      resolveLocalePreference({
        explicitPublicUrlLocale: 'en',
        explicitAdminLocale: 'ar',
        userPreferredLocale: 'ar',
        persistedBrowserLocale: 'ar',
      }),
    ).toEqual({
      locale: 'en',
      direction: 'ltr',
      source: 'PUBLIC_URL',
    });

    expect(
      resolveLocalePreference({
        explicitAdminLocale: 'en',
        userPreferredLocale: 'ar',
        persistedBrowserLocale: 'ar',
      }).source,
    ).toBe('ADMIN_SELECTION');

    expect(
      resolveLocalePreference({
        userPreferredLocale: 'en',
        persistedBrowserLocale: 'ar',
      }).source,
    ).toBe('USER_PREFERENCE');

    expect(
      resolveLocalePreference({
        persistedBrowserLocale: 'en',
      }).source,
    ).toBe('BROWSER_PREFERENCE');
  });

  it('defaults to Arabic when no preference is supplied', () => {
    expect(DEFAULT_LOCALE).toBe('ar');
    expect(resolveLocalePreference({})).toEqual({
      locale: 'ar',
      direction: 'rtl',
      source: 'PLATFORM_DEFAULT',
    });
  });

  it('prefers the requested localized representation when present', () => {
    expect(
      resolveLocalizedLocale({
        requestedLocale: 'en',
        sourceLocale: 'ar',
        availableLocales: ['ar', 'en'],
      }),
    ).toMatchObject({
      locale: 'en',
      availability: 'REQUESTED',
    });
  });

  it('preserves the original source locale before generic fallback', () => {
    expect(
      resolveLocalizedLocale({
        requestedLocale: 'ar',
        sourceLocale: 'en',
        fallbackLocale: 'ar',
        availableLocales: ['en'],
      }),
    ).toMatchObject({
      locale: 'en',
      availability: 'SOURCE',
      sourceLocale: 'en',
    });
  });

  it('uses explicit fallback only after requested and source locales are unavailable', () => {
    expect(
      resolveLocalizedLocale({
        requestedLocale: 'en',
        sourceLocale: null,
        fallbackLocale: 'ar',
        availableLocales: ['ar'],
      }),
    ).toMatchObject({
      locale: 'ar',
      availability: 'FALLBACK',
    });
  });

  it('returns MISSING instead of inventing or guessing a locale', () => {
    expect(
      resolveLocalizedLocale({
        requestedLocale: 'en',
        sourceLocale: 'en',
        fallbackLocale: 'ar',
        availableLocales: [],
      }),
    ).toMatchObject({
      locale: null,
      availability: 'MISSING',
    });
  });
});

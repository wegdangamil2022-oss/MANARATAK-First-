import { describe, expect, it } from 'vitest';
import {
  getPathLocale,
  localizeLocation,
  localizePathname,
  resolveLegacyPublicLocale,
  resolvePublicLocationLocale,
  stripLocalePrefix,
} from '../../apps/web/src/i18n/localeRouting';

describe('public locale routing', () => {
  it('recognizes only supported locale prefixes', () => {
    expect(getPathLocale('/ar/universities')).toBe('ar');
    expect(getPathLocale('/en/majors/ai')).toBe('en');
    expect(getPathLocale('/fr/universities')).toBeNull();
    expect(getPathLocale('/universities')).toBeNull();
  });

  it('adds a canonical locale prefix without duplicating an existing prefix', () => {
    expect(localizePathname('/universities', 'ar')).toBe('/ar/universities');
    expect(localizePathname('/ar/universities', 'en')).toBe('/en/universities');
    expect(localizePathname('/en', 'ar')).toBe('/ar');
    expect(localizePathname('/', 'en')).toBe('/en');
  });

  it('preserves query strings and hashes while switching locale', () => {
    expect(
      localizeLocation(
        {
          pathname: '/ar/universities/example',
          search: '?tab=fees',
          hash: '#admissions',
        },
        'en',
      ),
    ).toBe('/en/universities/example?tab=fees#admissions');
  });

  it('strips only a real locale prefix', () => {
    expect(stripLocalePrefix('/ar/majors')).toBe('/majors');
    expect(stripLocalePrefix('/en')).toBe('/');
    expect(stripLocalePrefix('/universities')).toBe('/universities');
  });

  it('uses explicit URL locale before persisted browser preference', () => {
    expect(
      resolvePublicLocationLocale({
        pathname: '/en/universities',
        persistedBrowserLocale: 'ar',
      }),
    ).toBe('en');
  });

  it('uses persisted preference for legacy unprefixed URLs', () => {
    expect(
      resolvePublicLocationLocale({
        pathname: '/universities',
        persistedBrowserLocale: 'en',
      }),
    ).toBe('en');
  });

  it('defaults legacy unprefixed URLs to Arabic without a valid preference', () => {
    expect(resolveLegacyPublicLocale(null)).toBe('ar');
    expect(resolveLegacyPublicLocale('fr')).toBe('ar');
  });
});

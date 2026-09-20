import { describe, expect, it } from 'vitest';
import {
  buildLocalizedSeoLinks,
  getAlternateOpenGraphLocale,
  normalizePublicBaseUrl,
  toOpenGraphLocale,
} from '../../apps/web/src/seo/localeSeo';

describe('multilingual SEO contract', () => {
  it('normalizes the configured public base URL', () => {
    expect(normalizePublicBaseUrl('https://manaratak.example/')).toBe(
      'https://manaratak.example',
    );
  });

  it('rejects non-absolute public base URLs', () => {
    expect(() => normalizePublicBaseUrl('/')).toThrow(
      'Public SEO base URL must be an absolute http(s) URL.',
    );
  });

  it('builds canonical and alternate URLs for the same entity path', () => {
    expect(
      buildLocalizedSeoLinks({
        baseUrl: 'https://manaratak.example',
        pathname: '/en/universities/example-university',
        locale: 'en',
      }),
    ).toEqual({
      canonical: 'https://manaratak.example/en/universities/example-university',
      alternates: {
        ar: 'https://manaratak.example/ar/universities/example-university',
        en: 'https://manaratak.example/en/universities/example-university',
      },
      xDefault:
        'https://manaratak.example/ar/universities/example-university',
    });
  });

  it('ignores query strings because pathname is the canonical SEO identity', () => {
    expect(
      buildLocalizedSeoLinks({
        baseUrl: 'https://manaratak.example/',
        pathname: '/ar/majors/artificial-intelligence',
        locale: 'ar',
      }).canonical,
    ).toBe(
      'https://manaratak.example/ar/majors/artificial-intelligence',
    );
  });

  it('uses Arabic as x-default because Arabic is the platform default', () => {
    expect(
      buildLocalizedSeoLinks({
        baseUrl: 'https://manaratak.example',
        pathname: '/en/universities',
        locale: 'en',
      }).xDefault,
    ).toBe('https://manaratak.example/ar/universities');
  });

  it('maps locales to Open Graph locale codes deterministically', () => {
    expect(toOpenGraphLocale('ar')).toBe('ar_AR');
    expect(toOpenGraphLocale('en')).toBe('en_US');
    expect(getAlternateOpenGraphLocale('ar')).toBe('en_US');
    expect(getAlternateOpenGraphLocale('en')).toBe('ar_AR');
  });
});

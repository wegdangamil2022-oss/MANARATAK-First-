import {
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from '@manaratak/shared';
import {
  localizePathname,
  stripLocalePrefix,
} from '../i18n/localeRouting';

export interface LocalizedSeoLinks {
  canonical: string;
  alternates: Record<SupportedLocale, string>;
  xDefault: string;
}

export function normalizePublicBaseUrl(baseUrl: string): string {
  const normalized = baseUrl.trim().replace(/\/+$/, '');

  if (!/^https?:\/\//i.test(normalized)) {
    throw new Error('Public SEO base URL must be an absolute http(s) URL.');
  }

  return normalized;
}

export function buildLocalizedSeoLinks(input: {
  baseUrl: string;
  pathname: string;
  locale: SupportedLocale;
}): LocalizedSeoLinks {
  const baseUrl = normalizePublicBaseUrl(input.baseUrl);
  const barePath = stripLocalePrefix(input.pathname);

  const alternates = Object.fromEntries(
    SUPPORTED_LOCALES.map((locale) => [
      locale,
      `${baseUrl}${localizePathname(barePath, locale)}`,
    ]),
  ) as Record<SupportedLocale, string>;

  return {
    canonical: alternates[input.locale],
    alternates,
    xDefault: alternates.ar,
  };
}

export function toOpenGraphLocale(locale: SupportedLocale): 'ar_AR' | 'en_US' {
  return locale === 'ar' ? 'ar_AR' : 'en_US';
}

export function getAlternateOpenGraphLocale(
  locale: SupportedLocale,
): 'ar_AR' | 'en_US' {
  return locale === 'ar' ? 'en_US' : 'ar_AR';
}

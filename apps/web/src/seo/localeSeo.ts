import {
  PUBLIC_TEMPLATE_LOCALES,
  type SupportedLocale,
} from '@manaratak/shared';
import {
  localizePathname,
  stripLocalePrefix,
} from '../i18n/localeRouting';

export interface LocalizedSeoLinks {
  canonical: string;
  alternates: Partial<Record<SupportedLocale, string>>;
  indexable: boolean;
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
  availableLocales?: readonly SupportedLocale[];
}): LocalizedSeoLinks {
  const baseUrl = normalizePublicBaseUrl(input.baseUrl);
  const barePath = stripLocalePrefix(input.pathname);

  const alternates = Object.fromEntries(
    (input.availableLocales ?? PUBLIC_TEMPLATE_LOCALES).filter(locale=>PUBLIC_TEMPLATE_LOCALES.includes(locale)).map((locale) => [
      locale,
      `${baseUrl}${localizePathname(barePath, locale)}`,
    ]),
  ) as Partial<Record<SupportedLocale, string>>;

  return {
    canonical: `${baseUrl}${localizePathname(barePath,input.locale)}`,
    indexable: Boolean(alternates[input.locale]),
    alternates,
    xDefault: alternates.ar ?? alternates.en ?? `${baseUrl}/ar`,
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

import {
  DEFAULT_LOCALE,
  parseSupportedLocale,
  resolveLocalePreference,
  type SupportedLocale,
} from '@manaratak/shared';

export interface BrowserLocationLike {
  pathname: string;
  search?: string;
  hash?: string;
}

export function getPathLocale(pathname: string): SupportedLocale | null {
  const firstSegment = pathname.split('/').filter(Boolean)[0] ?? null;
  return parseSupportedLocale(firstSegment);
}

export function stripLocalePrefix(pathname: string): string {
  const locale = getPathLocale(pathname);
  if (!locale) {
    return normalizePathname(pathname);
  }

  const withoutLocale = pathname.replace(new RegExp(`^/${locale}(?=/|$)`), '');
  return normalizePathname(withoutLocale || '/');
}

export function localizePathname(
  pathname: string,
  locale: SupportedLocale,
): string {
  const barePath = stripLocalePrefix(pathname);
  return barePath === '/' ? `/${locale}` : `/${locale}${barePath}`;
}

export function localizeLocation(
  location: BrowserLocationLike,
  locale: SupportedLocale,
): string {
  return `${localizePathname(location.pathname, locale)}${location.search ?? ''}${location.hash ?? ''}`;
}

export function resolveLegacyPublicLocale(
  persistedBrowserLocale: unknown,
): SupportedLocale {
  return resolveLocalePreference({
    persistedBrowserLocale: parseSupportedLocale(persistedBrowserLocale),
    platformDefaultLocale: DEFAULT_LOCALE,
  }).locale;
}

export function resolvePublicLocationLocale(input: {
  pathname: string;
  persistedBrowserLocale?: unknown;
}): SupportedLocale {
  return resolveLocalePreference({
    explicitPublicUrlLocale: getPathLocale(input.pathname),
    persistedBrowserLocale: parseSupportedLocale(input.persistedBrowserLocale),
    platformDefaultLocale: DEFAULT_LOCALE,
  }).locale;
}

function normalizePathname(pathname: string): string {
  if (!pathname || pathname === '/') {
    return '/';
  }

  const withLeadingSlash = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return withLeadingSlash.length > 1
    ? withLeadingSlash.replace(/\/+$/, '')
    : withLeadingSlash;
}

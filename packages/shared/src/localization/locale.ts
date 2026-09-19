export const SUPPORTED_LOCALES = ['ar', 'en'] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export type LocaleDirection = 'rtl' | 'ltr';

export type SourceLocale = SupportedLocale;
export type RequestedLocale = SupportedLocale;
export type FallbackLocale = SupportedLocale;

export const DEFAULT_LOCALE: SupportedLocale = 'ar';

export type LocaleResolutionSource =
  | 'PUBLIC_URL'
  | 'ADMIN_SELECTION'
  | 'USER_PREFERENCE'
  | 'BROWSER_PREFERENCE'
  | 'PLATFORM_DEFAULT';

export interface LocalePreference {
  explicitPublicUrlLocale?: SupportedLocale | null;
  explicitAdminLocale?: SupportedLocale | null;
  userPreferredLocale?: SupportedLocale | null;
  persistedBrowserLocale?: SupportedLocale | null;
  platformDefaultLocale?: SupportedLocale | null;
}

export interface LocaleResolutionResult {
  locale: SupportedLocale;
  direction: LocaleDirection;
  source: LocaleResolutionSource;
}

export type TranslationAvailability =
  | 'REQUESTED'
  | 'SOURCE'
  | 'FALLBACK'
  | 'MISSING';

export interface LocalizedLocaleResolution {
  requestedLocale: RequestedLocale;
  sourceLocale: SourceLocale | null;
  fallbackLocale: FallbackLocale;
  locale: SupportedLocale | null;
  availability: TranslationAvailability;
}

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return value === 'ar' || value === 'en';
}

export function parseSupportedLocale(value: unknown): SupportedLocale | null {
  return isSupportedLocale(value) ? value : null;
}

export function getLocaleDirection(locale: SupportedLocale): LocaleDirection {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

export function resolveLocalePreference(
  preference: LocalePreference,
): LocaleResolutionResult {
  if (preference.explicitPublicUrlLocale) {
    return createLocaleResult(preference.explicitPublicUrlLocale, 'PUBLIC_URL');
  }

  if (preference.explicitAdminLocale) {
    return createLocaleResult(preference.explicitAdminLocale, 'ADMIN_SELECTION');
  }

  if (preference.userPreferredLocale) {
    return createLocaleResult(preference.userPreferredLocale, 'USER_PREFERENCE');
  }

  if (preference.persistedBrowserLocale) {
    return createLocaleResult(preference.persistedBrowserLocale, 'BROWSER_PREFERENCE');
  }

  return createLocaleResult(
    preference.platformDefaultLocale ?? DEFAULT_LOCALE,
    'PLATFORM_DEFAULT',
  );
}

export function resolveLocalizedLocale(input: {
  requestedLocale: RequestedLocale;
  sourceLocale?: SourceLocale | null;
  fallbackLocale?: FallbackLocale;
  availableLocales: readonly SupportedLocale[];
}): LocalizedLocaleResolution {
  const sourceLocale = input.sourceLocale ?? null;
  const fallbackLocale = input.fallbackLocale ?? DEFAULT_LOCALE;
  const available = new Set<SupportedLocale>(input.availableLocales);

  if (available.has(input.requestedLocale)) {
    return {
      requestedLocale: input.requestedLocale,
      sourceLocale,
      fallbackLocale,
      locale: input.requestedLocale,
      availability: 'REQUESTED',
    };
  }

  if (sourceLocale && available.has(sourceLocale)) {
    return {
      requestedLocale: input.requestedLocale,
      sourceLocale,
      fallbackLocale,
      locale: sourceLocale,
      availability: 'SOURCE',
    };
  }

  if (available.has(fallbackLocale)) {
    return {
      requestedLocale: input.requestedLocale,
      sourceLocale,
      fallbackLocale,
      locale: fallbackLocale,
      availability: 'FALLBACK',
    };
  }

  return {
    requestedLocale: input.requestedLocale,
    sourceLocale,
    fallbackLocale,
    locale: null,
    availability: 'MISSING',
  };
}

function createLocaleResult(
  locale: SupportedLocale,
  source: LocaleResolutionSource,
): LocaleResolutionResult {
  return {
    locale,
    direction: getLocaleDirection(locale),
    source,
  };
}

import { z } from 'zod';
import {
  APPLICATION_DEFAULT_LOCALE,
  APPLICATION_SUPPORTED_LOCALES,
  isApplicationSupportedLocale,
  type ApplicationSupportedLocale,
} from '@manaratak/application';

export const UNSUPPORTED_LOCALE_ERROR_CODE = 'UNSUPPORTED_LOCALE' as const;

function normalizeQueryValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.at(-1);
  return value;
}

export const supportedLocaleQueryValueSchema = z.preprocess(
  normalizeQueryValue,
  z.custom<ApplicationSupportedLocale>(isApplicationSupportedLocale, {
    message: `Unsupported locale. Supported locales: ${APPLICATION_SUPPORTED_LOCALES.join(', ')}`,
  }),
);

export const localeQuerySchema = z.object({
  locale: supportedLocaleQueryValueSchema.optional().default(APPLICATION_DEFAULT_LOCALE),
});

export interface ApiValidationErrorPayload {
  error: 'Validation Error';
  code?: typeof UNSUPPORTED_LOCALE_ERROR_CODE;
  supportedLocales?: readonly ApplicationSupportedLocale[];
  details: z.ZodIssue[];
}

export function parseRequestLocale(query: unknown): ApplicationSupportedLocale {
  return localeQuerySchema.parse(query).locale;
}

export function toApiValidationErrorPayload(error: z.ZodError): ApiValidationErrorPayload {
  const hasLocaleIssue = error.issues.some((issue) => issue.path[0] === 'locale');
  return {
    error: 'Validation Error',
    ...(hasLocaleIssue
      ? {
          code: UNSUPPORTED_LOCALE_ERROR_CODE,
          supportedLocales: APPLICATION_SUPPORTED_LOCALES,
        }
      : {}),
    details: error.issues,
  };
}

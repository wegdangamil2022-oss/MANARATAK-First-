import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { parseRequestLocale, toApiValidationErrorPayload } from '../../../../src/presentation/api/locale/LocaleQueryContract';

describe('LocaleQueryContract', () => {
  it.each(['ar', 'en'] as const)('accepts %s', (locale) => {
    expect(parseRequestLocale({ locale })).toBe(locale);
  });

  it('uses the WP01 default when locale is omitted', () => {
    expect(parseRequestLocale({})).toBe('ar');
  });

  it('normalizes repeated query values to the last value', () => {
    expect(parseRequestLocale({ locale: ['en', 'ar'] })).toBe('ar');
  });

  it('rejects unsupported locale with stable API metadata', () => {
    try {
      parseRequestLocale({ locale: 'fr' });
      throw new Error('expected locale parsing to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(z.ZodError);
      expect(toApiValidationErrorPayload(error as z.ZodError)).toMatchObject({
        error: 'Validation Error', code: 'UNSUPPORTED_LOCALE', supportedLocales: ['ar', 'en'],
      });
    }
  });
});

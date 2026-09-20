/**
 * Canonical Unicode identity rules for owner-domain names/titles.
 *
 * Authority: MNT-AUD-0091.
 * - NFKC compatibility normalization.
 * - Locale-independent Unicode lower-casing.
 * - Arabic tatweel and combining-mark removal.
 * - Deliberate Arabic identity variants: Alef variants -> ا, ى -> ي.
 * - Arabic-Indic/Persian digits -> ASCII digits for numeric identity stability.
 * - All Unicode letters/numbers remain significant; punctuation becomes whitespace.
 *
 * Deliberately NOT normalized: ة, ؤ, ئ. Collapsing those changes lexical identity too
 * aggressively for a cross-domain canonical key.
 */

const ARABIC_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/gu;
const ARABIC_TATWEEL = /\u0640/gu;
const NON_IDENTITY_CHARACTERS = /[^\p{L}\p{N}]+/gu;

export interface UnicodeIdentityOptions {
  ignoredTokens?: readonly string[];
}

function normalizeArabicDigits(value: string): string {
  return value
    .replace(/[٠-٩]/gu, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/gu, (digit) => String(digit.charCodeAt(0) - 0x06f0));
}

function normalizeArabicLetters(value: string): string {
  return value
    .replace(/[أإآٱ]/gu, 'ا')
    .replace(/ى/gu, 'ي');
}

function normalizeBase(value: string): string {
  return normalizeArabicDigits(
    normalizeArabicLetters(
      value
        .normalize('NFKC')
        .toLowerCase()
        .replace(ARABIC_TATWEEL, '')
        .replace(ARABIC_DIACRITICS, ''),
    ),
  )
    .replace(NON_IDENTITY_CHARACTERS, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

export function canonicalizeUnicodeIdentity(value: string, options: UnicodeIdentityOptions = {}): string {
  const canonical = normalizeBase(value);
  if (!canonical || !options.ignoredTokens?.length) return canonical;

  const ignored = new Set(
    options.ignoredTokens
      .map((token) => normalizeBase(token))
      .filter(Boolean),
  );
  return canonical
    .split(' ')
    .filter((token) => !ignored.has(token))
    .join(' ')
    .trim();
}

/** Human-readable path segment. It is intentionally separate from dedup identity. */
export function unicodeSlugSegment(value: string): string {
  const canonical = normalizeBase(value);
  if (!canonical) throw new Error('SLUG_SOURCE_REQUIRES_UNICODE_LETTER_OR_NUMBER');
  return canonical.replace(/\s+/gu, '-');
}

export const unicodeCanonicalizationPolicy = Object.freeze({
  normalizationForm: 'NFKC',
  stripsArabicTatweel: true,
  stripsArabicDiacritics: true,
  normalizesAlefVariants: true,
  normalizesAlefMaqsuraToYeh: true,
  preservesTaMarbuta: true,
  preservesHamzaCarriers: true,
  preservesUnicodeLettersAndNumbers: true,
  normalizesArabicDigits: true,
});

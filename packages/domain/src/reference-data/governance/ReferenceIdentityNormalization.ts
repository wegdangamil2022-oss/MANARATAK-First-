/**
 * P7 reference identity policy v1: Unicode NFKC + locale-independent lowercasing,
 * retaining every Unicode letter, mark and number. Keep the country/region scope
 * OUTSIDE this token, in the identity composite. Do not mutate persisted keys.
 */
export function normalizeReferenceIdentityToken(value: string): string {
  return value.normalize('NFKC').toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ').replace(/\s+/gu, ' ').trim();
}

/** Search-only folding; NEVER use this to derive canonical IDs or aliases. */
export function normalizeReferenceSearchToken(value: string): string {
  return normalizeReferenceIdentityToken(value.normalize('NFKD').replace(/\p{M}/gu, ''));
}

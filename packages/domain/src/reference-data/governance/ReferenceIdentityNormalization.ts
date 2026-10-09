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

/** Exact pre-hash CITY identity scope, not a database key or a fuzzy candidate. */
export function referenceCityScopeKey(input: {
  countryIso2Code: string; name: string; administrativeRegionId?: string | null; region?: string | null;
}): string {
  const country = input.countryIso2Code.trim().toUpperCase();
  const name = normalizeReferenceIdentityToken(input.name);
  if (!/^[A-Z]{2}$/.test(country) || !name) throw new Error('REFERENCE_CITY_SCOPED_IDENTITY_INVALID');
  const regionName = normalizeReferenceIdentityToken(input.region ?? '');
  const region = input.administrativeRegionId
    ? `id:${input.administrativeRegionId.trim().toLowerCase()}`
    : regionName ? `text:${regionName}` : '~';
  return [country, name, region].join('|');
}

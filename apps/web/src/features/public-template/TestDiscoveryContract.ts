export interface TestDiscoveryPublicPage {
  ownerDomain: 'STUDENT_TOOLS' | 'SERVICES';
  state: 'AVAILABLE' | 'EMPTY' | 'UNAVAILABLE';
  hasMore: boolean;
  nextCursor: string | null;
  data: Array<{
    publicId: string;
    displayName: string;
    href: string;
    requiresSignIn?: boolean;
    fulfillmentPolicy?: 'FREE' | 'CHARGEABLE' | 'QUOTE_REQUIRED';
  }>;
}
export function validTestDiscoveryHref(
  value: unknown,
  owner: TestDiscoveryPublicPage['ownerDomain'],
): value is string {
  if (typeof value !== 'string' || value.length > 1000 || /%(?:2f|5c|00)/i.test(value))
    return false;
  return (
    owner === 'STUDENT_TOOLS'
      ? /^\/tools\/(?!\.{1,2}$)[a-zA-Z0-9_%.-]+$/
      : /^\/services\/(?!\.{1,2}$)[a-zA-Z0-9_%.-]+$/
  ).test(value);
}
export function parseTestDiscoveryPage(
  raw: unknown,
  owner: TestDiscoveryPublicPage['ownerDomain'],
): TestDiscoveryPublicPage {
  const value = (raw as { data?: TestDiscoveryPublicPage })?.data;
  const text = (x: unknown) => typeof x === 'string' && x.trim().length > 0 && x.length <= 2000;
  if (
    !value ||
    value.ownerDomain !== owner ||
    !['AVAILABLE', 'EMPTY', 'UNAVAILABLE'].includes(value.state) ||
    typeof value.hasMore !== 'boolean' ||
    (value.hasMore
      ? typeof value.nextCursor !== 'string' ||
        !value.nextCursor.trim() ||
        value.nextCursor.length > 160
      : value.nextCursor !== null)
  )
    throw new Error('TEST_DISCOVERY_RESPONSE_INVALID');
  if (
    !Array.isArray(value.data) ||
    value.data.length > 50 ||
    (value.state !== 'AVAILABLE' && (value.data.length > 0 || value.hasMore)) ||
    value.data.some(
      (row) =>
        !row ||
        !text(row.publicId) ||
        !text(row.displayName) ||
        !validTestDiscoveryHref(row.href, owner) ||
        (row.requiresSignIn !== undefined && typeof row.requiresSignIn !== 'boolean') ||
        (row.fulfillmentPolicy !== undefined &&
          !['FREE', 'CHARGEABLE', 'QUOTE_REQUIRED'].includes(row.fulfillmentPolicy)),
    )
  )
    throw new Error('TEST_DISCOVERY_RESPONSE_INVALID');
  return value;
}

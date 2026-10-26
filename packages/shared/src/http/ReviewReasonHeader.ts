/** Fetch Headers accept byte strings. Carry a Unicode review reason without losing its exact text. */
export function reviewReasonHeaders(reason: string): Record<string, string> {
  const bytes = new TextEncoder().encode(reason.trim());
  return {
    'X-Review-Reason': btoa(String.fromCharCode(...bytes)),
    'X-Review-Reason-Encoding': 'base64utf8',
  };
}
export function readReviewReasonHeader(
  value: string | undefined,
  encoding: string | undefined,
): string | undefined {
  if (!encoding) return value;
  if (encoding !== 'base64utf8' || value === undefined)
    throw Error('REVIEW_REASON_ENCODING_INVALID');
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(
      Uint8Array.from(atob(value), (c) => c.charCodeAt(0)),
    );
  } catch {
    throw Error('REVIEW_REASON_ENCODING_INVALID');
  }
}

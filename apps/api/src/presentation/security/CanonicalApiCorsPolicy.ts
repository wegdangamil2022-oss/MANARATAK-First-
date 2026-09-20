export const CANONICAL_API_REQUEST_HEADERS = Object.freeze([
  'Content-Type',
  'Authorization',
  'X-Requested-With',
  'Accept',
  'Origin',
  'X-CSRF-Token',
  'X-Student-Tools-Session',
  'Idempotency-Key',
  'X-Correlation-ID',
  'X-Request-ID',
  'Idempotency-Replayed',
  'Retry-After',
] as const);

export const CANONICAL_API_EXPOSED_HEADERS = Object.freeze([
  'X-Student-Tools-Session',
  'X-Student-Tools-Session-Expires-At',
  'X-Correlation-ID',
  'X-Request-ID',
  'Idempotency-Replayed',
  'Retry-After',
] as const);

/**
 * Build the browser origins accepted by the API from the canonical public/admin
 * deployment contract plus any explicitly enumerated compatibility origins.
 */
export function buildCanonicalCorsOrigins(values: {
  corsOrigin?: string;
  publicWebUrl?: string;
  adminWebUrl?: string;
  additionalOrigins?: string;
}): string[] {
  const candidates = [
    values.corsOrigin,
    values.publicWebUrl,
    values.adminWebUrl,
    ...(values.additionalOrigins?.split(',') ?? []),
  ];
  return Array.from(new Set(candidates.map(value => value?.trim()).filter((value): value is string => Boolean(value))));
}

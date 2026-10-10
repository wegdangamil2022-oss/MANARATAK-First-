import { createHash } from 'node:crypto';
function canonical(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0).map(([key, item]) => [key, canonical(item)]));
}
/** JSONB key order and Date JSON round-trips cannot invalidate a reviewed revision. */
export const taxonomyRevisionHash = (value: unknown): string => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');

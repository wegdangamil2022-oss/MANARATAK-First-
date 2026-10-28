function ordered(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(ordered);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, entry]) => [key, ordered(entry)]),
    );
  return value;
}
/** JSON object key order can change after PostgreSQL jsonb storage. Array order is meaningful. */
export function jsonEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(ordered(left)) === JSON.stringify(ordered(right));
}

/** Retains an unresolved requested ID as review input; never marks it resolved. */
export function scholarshipCanonicalReviewInput(
  entry: Record<string, unknown>,
): string | undefined {
  const stringValue = (value: unknown) =>
    typeof value === 'string' && value.trim() ? value.trim() : undefined;
  return (
    stringValue(entry.rawValue) ??
    stringValue(entry.requestedCanonicalId) ??
    stringValue(entry.canonicalId)
  );
}

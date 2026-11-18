/**
 * Reject paths whose meaning can change across URL decoders or path normalizers.
 * This check is shared by the source allowlist and signed credential scope.
 */
export function isUnambiguousSourcePath(pathname: string): boolean {
  // Reject malformed escapes and invalid UTF-8 rather than guessing how an
  // upstream server will interpret them. The original path is still sent.
  try { decodeURIComponent(pathname); } catch { return false; }

  let current = pathname;
  for (let round = 0; round < 8; round++) {
    // Some servers strip matrix parameters before resolving dot segments.
    if (/[\\\x00-\x1f\x7f]/.test(current) || /(?:^|\/)\.\.?(?:;[^/]*)?(?:\/|$)/.test(current)) return false;
    // A second decoder can reveal invalid UTF-8, including overlong separators.
    for (const sequence of current.match(/(?:%[0-9a-f]{2})+/gi) ?? []) {
      try { decodeURIComponent(sequence); } catch { return false; }
    }
    // A separator must never appear only after a decoder has examined the path.
    if (/%(?:2f|5c)/i.test(current)) return false;
    // Decode ASCII escapes only; non-ASCII UTF-8 remains untouched. Repeating
    // catches nested and mixed forms such as %252f and %25%32%66.
    const next = current.replace(/%([0-7][0-9a-f])/gi, (_escape, hex: string) =>
      String.fromCharCode(parseInt(hex, 16)));
    if (next === current) return true;
    current = next;
  }
  // Excessive nesting is ambiguous; fail closed rather than spend unbounded work.
  return false;
}

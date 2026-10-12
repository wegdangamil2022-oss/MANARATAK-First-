/** Bounded, recursive export policy. Errors are codes, never exception payloads. */
export function sanitizeDiagnostic(input: unknown): unknown {
  const seen = new WeakSet<object>();
  let remaining = 2_000;
  const clean = (value: unknown, depth: number): unknown => {
    if (--remaining < 0 || depth > 6) return '[LIMIT]';
    if (value === null || typeof value === 'boolean') return value;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value === 'string')
      return value
        .replace(/\b[a-z][a-z0-9+.-]*:\/\/[^\s<>"']+/gi, '[REDACTED_URL]')
        .replace(/\b(?:Bearer\s+\S+|sk-[\w-]+|eyJ[\w-]+\.[\w-]+\.[\w-]+)\b/gi, '[REDACTED]')
        .replace(
          /\b(?:password|secret|token|api[_-]?key|authorization)\s*[=:]\s*\S+/gi,
          '[REDACTED]',
        )
        .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED_CONTACT]')
        .replace(/-----BEGIN [\s\S]*?-----END [^-]+-----/g, '[REDACTED_KEY]')
        .slice(0, 500);
    if (typeof value !== 'object') return '[UNSUPPORTED]';
    if (seen.has(value)) return '[CIRCULAR]';
    seen.add(value);
    if (Array.isArray(value)) return value.slice(0, 50).map((item) => clean(item, depth + 1));
    const result: Record<string, unknown> = Object.create(null);
    for (const [key, item] of Object.entries(value).slice(0, 50)) {
      if (
        /(secret|password|token|credential|connection|url|uri|dsn|authorization|cookie|email|phone|address|payload|body|stack|private|api.?key|headers|recipient|student|session|userId|identityId|subject|full.?name)/i.test(
          key,
        )
      )
        continue;
      result[key.slice(0, 100)] = clean(item, depth + 1);
    }
    return result;
  };
  return clean(input, 0);
}
export function diagnosticErrorCode(value: unknown): string | undefined {
  return typeof value === 'string'
    ? /^[A-Z][A-Z0-9_]{0,119}$/.test(value)
      ? value
      : 'HEALTH_PROBE_FAILED'
    : undefined;
}

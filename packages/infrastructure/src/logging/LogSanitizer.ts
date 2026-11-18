import { AuditSecretSanitizer } from '../audit/AuditSecretSanitizer';

/** Strip URL credentials and all query/fragment data, including search terms. */
export function sanitizeLogText(value: string): string {
  return value
    .replace(/[^\s"'<>]+/g, (token) => {
      // Work one whitespace-delimited token at a time: searching separately
      // from each slash makes long request paths quadratic to process.
      let result = token;
      const schemeEnd = result.indexOf('://');
      if (schemeEnd >= 0) {
        let schemeStart = schemeEnd;
        while (schemeStart > 0 && /[a-z0-9+.-]/i.test(result[schemeStart - 1])) schemeStart--;
        const candidate = result.slice(schemeStart);
        try {
          const url = new URL(candidate);
          url.username = '';
          url.password = '';
          url.search = '';
          url.hash = '';
          result = result.slice(0, schemeStart) + url.toString();
        } catch {
          // A malformed URL might itself contain credentials: do not emit it.
          return result.slice(0, schemeStart) + '[REDACTED_URL]';
        }
      }
      const query = result.indexOf('?');
      return query >= 0 && result.slice(0, query).includes('/') ? result.slice(0, query) : result;
    })
    .replace(/\b(?:bearer|basic)\s+[^\s,;]+/gi, '[REDACTED_AUTH]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[REDACTED_JWT]')
    .replace(/\b(password|passwd|pwd|(?:access|refresh|session|csrf)[_-]?token|token|secret|api[_-]?key|authorization|cookie|credential)(["']?\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;&}]+)/gi, '$1$2[REDACTED]');
}

/** Preserve the existing key redaction and additionally clean text in context. */
export function sanitizeLogContext<T>(value: T): T {
  const sanitized = AuditSecretSanitizer.sanitize(value);
  const clean = (item: unknown): unknown => {
    if (typeof item === 'string') return sanitizeLogText(item);
    if (item instanceof Date || !item || typeof item !== 'object') return item;
    if (Array.isArray(item)) return item.map(clean);
    return Object.fromEntries(Object.entries(item).map(([key, child]) => [key, clean(child)]));
  };
  return clean(sanitized) as T;
}

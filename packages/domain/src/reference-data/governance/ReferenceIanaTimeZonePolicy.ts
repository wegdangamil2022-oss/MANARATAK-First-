/**
 * Runtime IANA/ICU guard — no claim of complete authoritative tzdb coverage.
 * UTC is valid but Intl.supportedValuesOf('timeZone') traditionally omits it.
 * The DateTimeFormat constructor is used as a fallback because supportedValues
 * omits valid ICU-resolvable names on some runtimes.
 */
export function isRuntimeSupportedIanaTimeZone(zone: unknown): zone is string {
  if (typeof zone !== 'string' || !zone || zone !== zone.trim() || zone.length > 128 ||
      !/^[A-Za-z0-9_+\-/]+$/.test(zone)) return false;
  if (zone === 'UTC') return true;
  // Avoid bare natural-language labels that can look like time zone names.
  if (!zone.includes('/') || zone.split('/').some(segment => !segment || segment === '.' || segment === '..')) return false;
  try {
    new Intl.DateTimeFormat('en', { timeZone: zone }).format(0);
    return true;
  } catch {
    return false;
  }
}

export function runtimeIanaTimeZoneCandidates(): string[] {
  try {
    return Array.from(new Set(['UTC', ...Intl.supportedValuesOf('timeZone')])).sort();
  } catch {
    return ['UTC'];
  }
}

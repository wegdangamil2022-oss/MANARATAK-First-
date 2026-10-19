export function readStoredLocale(): string | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage.getItem('absheer_lang');
  } catch {
    return null;
  }
}
export function writeStoredLocale(locale: string): void {
  try {
    if (typeof window !== 'undefined') window.localStorage.setItem('absheer_lang', locale);
  } catch {
    /* URL remains authoritative without browser storage. */
  }
}

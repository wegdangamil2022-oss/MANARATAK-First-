export function readStored(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
export function writeStored(key: string, value: string): void {
  try { window.localStorage.setItem(key, value); } catch { /* Private/restricted browsing: retain the current in-memory session. */ }
}
export function readStoredArray<T extends {id: string}>(key: string, fallback: T[]): T[] {
  try {
    const saved = JSON.parse(readStored(key) || 'null');
    return Array.isArray(saved) && saved.every(item => item && typeof item.id === 'string') ? saved : fallback;
  } catch { return fallback; }
}


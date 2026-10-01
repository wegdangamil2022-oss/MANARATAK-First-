/** Remove retired browser caches; authenticated student APIs remain authoritative. */
export function clearLegacyStudentCache(): void {
  try {
    for (const key of ['manaratak_favorites_v2', 'manaratak_milestones', 'manaratak_notifications', 'manaratak_nav_state_v2']) {
      globalThis.localStorage?.removeItem(key);
    }
  } catch { /* Restricted browser storage must not block authentication. */ }
}

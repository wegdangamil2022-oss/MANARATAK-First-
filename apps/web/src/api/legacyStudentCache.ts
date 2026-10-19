/** Remove retired browser caches; authenticated student APIs remain authoritative. */
export function clearLegacyStudentCache(): void {
  try {
    for (const key of ['absheer_favorites_v2', 'absheer_milestones', 'absheer_notifications', 'absheer_nav_state_v2']) {
      globalThis.localStorage?.removeItem(key);
    }
  } catch { /* Restricted browser storage must not block authentication. */ }
}

/** Formatting only: cycle IDs remain the sole identity used by writes. */
export function applicationCycleLabel(key: unknown, language: 'ar' | 'en'): string {
  if (typeof key !== 'string' || !key || key === 'LEGACY')
    return language === 'en' ? 'Historical application' : 'ملف تقديم تاريخي';
  const [year, name, deadline] = key.split('|');
  const parts = [year === 'NO_YEAR' ? '' : year, name === 'DEFAULT' ? '' : name];
  if (deadline && deadline !== 'ROLLING' && Number.isFinite(Date.parse(deadline)))
    parts.push(
      new Date(deadline).toLocaleDateString(language === 'en' ? 'en-GB' : 'ar', {
        timeZone: 'UTC',
      }),
    );
  return (
    parts.filter(Boolean).join(' · ') ||
    (language === 'en' ? 'Published application cycle' : 'دورة تقديم منشورة')
  );
}

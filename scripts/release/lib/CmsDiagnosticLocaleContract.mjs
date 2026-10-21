import assert from 'node:assert/strict';

export function assertCmsDiagnosticLocale({ locale, enabledLocales, status, robots }) {
  const enabled = enabledLocales.includes(locale);
  assert.equal(status, enabled ? 200 : 404, 'CMS_PUBLIC_TEMPLATE_SOURCE_POLICY');
  if (!enabled) assert.match(robots ?? '', /noindex.*nofollow/, 'CMS_DISABLED_LOCALE_NOT_INDEXABLE');
  return enabled;
}

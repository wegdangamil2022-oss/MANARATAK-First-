import test from 'node:test';
import assert from 'node:assert/strict';
import { assertCmsDiagnosticLocale } from '../../scripts/release/lib/CmsDiagnosticLocaleContract.mjs';

test('enabled CMS delivery requires200; source-disabled locale requires404 and noindex/nofollow', () => {
  assert.equal(assertCmsDiagnosticLocale({ locale: 'ar', enabledLocales: ['ar'], status: 200 }), true);
  assert.equal(assertCmsDiagnosticLocale({ locale: 'en', enabledLocales: ['ar'], status: 404, robots: 'noindex, nofollow' }), false);
  for (const invalid of [
    { locale: 'ar', enabledLocales: ['ar'], status: 404 },
    { locale: 'en', enabledLocales: ['ar'], status: 200, robots: 'noindex, nofollow' },
    { locale: 'en', enabledLocales: ['ar'], status: 404 },
    { locale: 'en', enabledLocales: ['ar'], status: 404, robots: 'index, follow' },
  ]) assert.throws(() => assertCmsDiagnosticLocale(invalid));
});

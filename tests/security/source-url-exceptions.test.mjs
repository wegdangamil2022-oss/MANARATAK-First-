import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isKnownNonSecretSourceUrl } from '../../scripts/security/source-url-exceptions.mjs';

const url = 'https://upy.ac.id/berita/yp-upy-serahkan-' +
  ['sk', 'beasiswa-pendidikan-kepada-awardee-tahun-ajaran-2026-2027/'].join('-');
const markdown = 'workspace/import-sources/scholarships/MANARATAK_Degree_Scholarships_Master_v6_6_2027_Audit_001_010_947.md';
const jsonl = 'workspace/import-sources/reconciliation/m10-12-14/scholarships-sections.jsonl';
const findings = (source, file = markdown, kind = 'OPENAI_KEY') =>
  [...source.matchAll(/\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g)]
    .filter(match => !isKnownNonSecretSourceUrl(file, source, kind, match));

test('accepts only the exact university news slug in governed Markdown and derived JSON', () => {
  assert.equal(findings(`- ${url}\n`).length, 0);
  assert.equal(findings(JSON.stringify({ applicationUrls: [url] }), jsonl).length, 0);
});

test('still detects a separate credential on the same source line', () => {
  const synthetic = `sk-proj-${'X'.repeat(32)}`;
  assert.deepEqual(findings(`${url} ${synthetic}`).map(match => match[0]), [synthetic]);
});

test('does not exempt changed hosts, paths, slugs, other files or other signatures', () => {
  for (const changed of [url.replace('upy.ac.id', 'other.example'), url.replace('/berita/', '/other/'), url.replace('2027/', '2027-extra/')]) {
    assert.equal(findings(changed).length, 1);
  }
  assert.equal(findings(url, 'apps/api/src/config.ts').length, 1);
  assert.equal(findings(url, markdown, 'GITHUB_TOKEN').length, 1);
  assert.equal(findings(url.slice(url.indexOf('sk-'), -1)).length, 1);
});

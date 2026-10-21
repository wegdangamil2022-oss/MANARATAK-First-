// Indonesian "SK beasiswa" is part of this university news URL's title,
// not an OpenAI credential. Bind the exception to the exact URL and two
// governed source artifacts; never exempt a directory, hostname or sk- prefix.
const newsUrl = 'https://upy.ac.id/berita/yp-upy-serahkan-' +
  ['sk', 'beasiswa-pendidikan-kepada-awardee-tahun-ajaran-2026-2027/'].join('-');
const slugOffset = newsUrl.indexOf('sk-');
const slug = newsUrl.slice(slugOffset, -1);
const sourcePaths = new Set([
  'workspace/import-sources/scholarships/MANARATAK_Degree_Scholarships_Master_v6_6_2027_Audit_001_010_947.md',
  'workspace/import-sources/reconciliation/m10-12-14/scholarships-sections.jsonl',
]);

export function isKnownNonSecretSourceUrl(file, source, kind, match) {
  if (kind !== 'OPENAI_KEY' || !sourcePaths.has(file) || match[0] !== slug) return false;
  const start = match.index - slugOffset;
  return start >= 0 && source.slice(start, start + newsUrl.length) === newsUrl;
}

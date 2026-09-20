import fs from 'node:fs';
import process from 'node:process';

const args = process.argv.slice(2);
const urls = [];
const artifacts = [];
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--url' && args[i + 1]) urls.push(args[++i]);
  else if (args[i] === '--artifact' && args[i + 1]) artifacts.push(args[++i]);
}

const REQUIRED = [
  ['x-frame-options', /^DENY$/i],
  ['content-security-policy', /frame-ancestors\s+'none'/i],
  ['content-security-policy', /script-src\s+'self'(?:;|$)/i],
  ['content-security-policy', /object-src\s+'none'/i],
];

function inspectHeaderMap(headers, label) {
  const failures = [];
  for (const [name, pattern] of REQUIRED) {
    const value = headers.get(name) || '';
    if (!pattern.test(value)) failures.push(`${label}: missing/invalid ${name} (${pattern})`);
  }
  const csp = headers.get('content-security-policy') || '';
  if (/script-src[^;]*unsafe-inline/i.test(csp)) failures.push(`${label}: script-src permits unsafe-inline`);
  if (/style-src\s[^;]*unsafe-inline/i.test(csp)) failures.push(`${label}: style-src permits unsafe-inline`);
  return failures;
}

function artifactHeaders(text) {
  const map = new Map();
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([^:#][^:]*):\s*(.+)$/);
    if (match) map.set(match[1].trim().toLowerCase(), match[2].trim());
  }
  return { get: (name) => map.get(name.toLowerCase()) || null };
}

const failures = [];
for (const file of artifacts) {
  if (!fs.existsSync(file)) {
    failures.push(`${file}: artifact not found`);
    continue;
  }
  failures.push(...inspectHeaderMap(artifactHeaders(fs.readFileSync(file, 'utf8')), file));
}

for (const url of urls) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    const response = await fetch(url, { method: 'GET', redirect: 'follow', signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) failures.push(`${url}: HTTP ${response.status}`);
    failures.push(...inspectHeaderMap(response.headers, url));
  } catch (error) {
    failures.push(`${url}: probe failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (urls.length === 0 && artifacts.length === 0) {
  console.error('Usage: verify-frontend-security-headers.mjs --url <https://...> [--url ...] [--artifact path]');
  process.exit(2);
}

if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exit(1);
}

console.log(`FRONTEND_SECURITY_HEADERS_VERIFIED targets=${urls.length + artifacts.length}`);

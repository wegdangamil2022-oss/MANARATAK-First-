#!/usr/bin/env node
// ABSHEER source-only handoff audit. Scan tracked working-tree files only.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const report = (kind, file) => errors.push(kind + ': ' + file);
const isText = (file) => /\.(?:tsx?|jsx?|mjs|cjs|js|json|jsonl|md|yaml|yml|sql|sh|xml|svg|css|html|toml|txt|example|properties)$/i.test(file)
  || path.basename(file).startsWith('.env') || path.basename(file) === 'Dockerfile';

const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).split('\0').filter(Boolean);
const bannedPrefixes = ['workspace/', 'release-artifacts/', 'evidence/', 'docs/remediation/', 'docs/reviews/', 'docs/templates/'];
const signatures = [
  ['PRIVATE_KEY', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ['OPENAI_TOKEN', /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/],
  ['GITHUB_TOKEN', /\bgh[pousr]_[A-Za-z0-9]{36,}\b/],
  ['AWS_ACCESS_KEY', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ['GOOGLE_API_KEY', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['SLACK_TOKEN', /\bxox[baprs]-[0-9A-Za-z-]{20,}\b/],
  ['STRIPE_SECRET', /\bsk_live_[0-9A-Za-z]{20,}\b/],

];
for (const file of tracked) {
  if (bannedPrefixes.some(prefix => file.startsWith(prefix))) report('LEGACY_DATA_PATH', file);
  if (/(?:^|\/)(?:\.env(?:\.local|\.production|\.test|\.development)?|id_rsa|id_ed25519|service-account[^/]*)$/.test(file)
      || /\.(?:pem|p12|pfx|key|sqlite|db|bak|dump|tar|zip|xlsx?|csv|jsonl)$/i.test(file)) report('BANNED_HANDOFF_FILE', file);
  if (!isText(file) || !existsSync(file) || statSync(file).size > 2 * 1024 * 1024) continue;
  let source;
  try { source = readFileSync(file, 'utf8'); } catch { continue; }
  for (const [name, pattern] of signatures) {
    if (pattern.test(source)) report(name, file);
  }
  // Ignore variable-composed strings and disposable/example/test database credentials.
  // Flag literal credentials for external database hosts only.
  for (const hit of source.matchAll(/\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^/\s:@]+:[^@\s/]+@[A-Za-z0-9_.-]+/ig)) {
    const value = hit[0];
    if (value.includes('
    for (const line of source.split(/\r?\n/)) {
      const m = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
      if (!m) continue;
      if (/(?:SECRET|TOKEN|PASSWORD|API_KEY|PRIVATE_KEY|DATABASE_URL|DIRECT_URL|REDIS_URL|SIGNING_KEY)$/i.test(m[1])
          && m[2].trim() !== '') report('POPULATED_ENV_CREDENTIAL', file + ':' + m[1]);
    }
  }
  if (file.startsWith('.github/workflows/')) {
    for (const line of source.split(/\r?\n/)) {
      const m = line.match(/^\s*(JWT_SECRET|SESSION_SECRET|CSRF_SECRET|POSTGRES_PASSWORD|PGPASSWORD):\s*(.*)$/);
      if (m && m[2].trim() && !/^\$\{\{\s*secrets\.[A-Z0-9_]+\s*\}\}$/.test(m[2].trim())) report('HARDCODED_CI_CREDENTIAL', file + ':' + m[1]);
    }
  }
}
const ensure = (file, rule, kind) => {
  if (!existsSync(file)) { report('MISSING_ESSENTIAL', file); return; }
  if (!rule(readFileSync(file, 'utf8'))) report(kind, file);
};
for (const critical of ['apps/admin/src/App.tsx', 'apps/api/src/app.ts', 'packages/infrastructure/prisma/schema.prisma']) {
  if (!existsSync(critical)) report('MISSING_CORE_MODULE', critical);
}
ensure('apps/web/src/router/index.tsx', x => /index:\s*true,\s*element:\s*<EmptyStudentHomepage\s*\/>/.test(x), 'LEGACY_HOME_ROUTE');
ensure('apps/web/src/features/handoff/EmptyStudentHomepage.tsx', x => x.includes('data-absheer-home-slot="empty"'), 'MISSING_EMPTY_HOME');
ensure('apps/web/src/features/public-template/PublicTemplateApp.tsx', x => !/<HeroBanner\b/.test(x) && !/<HomeShowcaseFrame\b/.test(x), 'LEGACY_HOMEPAGE_MARKUP');
ensure('scripts/bootstrap-admin.ts', x => !x.includes('admin@manaratak.org') && x.includes('ADMIN_BOOTSTRAP_EMAIL must be set'), 'LEGACY_ADMIN_BOOTSTRAP');
for (const file of [
  'apps/web/src/features/public-template/data/mockData.ts',
  'apps/web/src/features/public-template/data/articleData.ts',
  'apps/web/src/features/public-template/data/personalPreviewData.ts',
  'apps/web/src/features/public-template/data/serviceData.ts',
  'apps/web/src/features/public-template/data/scholarshipsFaqData.ts',
  'apps/web/src/features/public-template/components/scholarshipFaqData.ts',
  'apps/web/src/features/public-template/homeDesignPreviewData.ts',
]) {
  ensure(file, x => !/=\s*\[\s*\{/.test(x), 'LEFTOVER_SAMPLE_ROWS');
}
console.log(JSON.stringify({ scan: 'ABSHEER_HANDOFF_AUDIT', trackedFiles: tracked.length, violations: errors.length, status: errors.length ? 'FAIL' : 'PASS' }, null, 2));
for (const error of errors) console.error(error);
if (errors.length) process.exitCode = 1;
 + '{') || value.includes('$(') || value.includes('<') || value.includes('%7B')) continue;
    const host = value.split('@').pop()?.toLowerCase() || '';
    if (host === 'localhost' || host === '127.0.0.1' || host === 'postgres' || host === 'db'
      || host.endsWith('.example') || host.endsWith('.example.com') || host.endsWith('.invalid')
      || host.includes('fixture') || host.includes('testhost') || host.startsWith('postgres-host')) continue;
    if (/(?:^|\/)(?:tests?|__tests__)\/|(?:\.spec|\.test)\./.test(file)) continue;
    report('EXTERNAL_LITERAL_DATABASE_CREDENTIAL', file);
  }
  if (/^\.env.*\.example$/.test(path.basename(file))) {
    for (const line of source.split(/\r?\n/)) {
      const m = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
      if (!m) continue;
      if (/(?:SECRET|TOKEN|PASSWORD|API_KEY|PRIVATE_KEY|DATABASE_URL|DIRECT_URL|REDIS_URL|SIGNING_KEY)$/i.test(m[1])
          && m[2].trim() !== '') report('POPULATED_ENV_CREDENTIAL', file + ':' + m[1]);
    }
  }
  if (file.startsWith('.github/workflows/')) {
    for (const line of source.split(/\r?\n/)) {
      const m = line.match(/^\s*(JWT_SECRET|SESSION_SECRET|CSRF_SECRET|POSTGRES_PASSWORD|PGPASSWORD):\s*(.*)$/);
      if (m && m[2].trim() && !/^\$\{\{\s*secrets\.[A-Z0-9_]+\s*\}\}$/.test(m[2].trim())) report('HARDCODED_CI_CREDENTIAL', file + ':' + m[1]);
    }
  }
}
const ensure = (file, rule, kind) => {
  if (!existsSync(file)) { report('MISSING_ESSENTIAL', file); return; }
  if (!rule(readFileSync(file, 'utf8'))) report(kind, file);
};
for (const critical of ['apps/admin/src/App.tsx', 'apps/api/src/app.ts', 'packages/infrastructure/prisma/schema.prisma']) {
  if (!existsSync(critical)) report('MISSING_CORE_MODULE', critical);
}
ensure('apps/web/src/router/index.tsx', x => /index:\s*true,\s*element:\s*<EmptyStudentHomepage\s*\/>/.test(x), 'LEGACY_HOME_ROUTE');
ensure('apps/web/src/features/handoff/EmptyStudentHomepage.tsx', x => x.includes('data-absheer-home-slot="empty"'), 'MISSING_EMPTY_HOME');
ensure('apps/web/src/features/public-template/PublicTemplateApp.tsx', x => !/<HeroBanner\b/.test(x) && !/<HomeShowcaseFrame\b/.test(x), 'LEGACY_HOMEPAGE_MARKUP');
ensure('scripts/bootstrap-admin.ts', x => !x.includes('admin@manaratak.org') && x.includes('ADMIN_BOOTSTRAP_EMAIL must be set'), 'LEGACY_ADMIN_BOOTSTRAP');
for (const file of [
  'apps/web/src/features/public-template/data/mockData.ts',
  'apps/web/src/features/public-template/data/articleData.ts',
  'apps/web/src/features/public-template/data/personalPreviewData.ts',
  'apps/web/src/features/public-template/data/serviceData.ts',
  'apps/web/src/features/public-template/data/scholarshipsFaqData.ts',
  'apps/web/src/features/public-template/components/scholarshipFaqData.ts',
  'apps/web/src/features/public-template/homeDesignPreviewData.ts',
]) {
  ensure(file, x => !/=\s*\[\s*\{/.test(x), 'LEFTOVER_SAMPLE_ROWS');
}
console.log(JSON.stringify({ scan: 'ABSHEER_HANDOFF_AUDIT', trackedFiles: tracked.length, violations: errors.length, status: errors.length ? 'FAIL' : 'PASS' }, null, 2));
for (const error of errors) console.error(error);
if (errors.length) process.exitCode = 1;

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const config = fs.readFileSync(path.join(root, 'packages/config/src/AppConfig.ts'), 'utf8');
const requiredBlock = config.match(/PRODUCTION_REQUIRED_CONFIG_KEYS = Object.freeze\(\[([\s\S]*?)\]/)?.[1] || '';
const required = new Set([...requiredBlock.matchAll(/'([A-Z][A-Z0-9_]+)'/g)].map((m) => m[1]));
const variables = new Map();
function add(name, source) {
  if (!/^[A-Z][A-Z0-9_]+$/.test(name)) return;
  if (!variables.has(name)) variables.set(name, new Set());
  variables.get(name).add(source);
}
const files = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' }).split('\0');
for (const file of new Set(files)) {
  if (!file || file.startsWith('docs/') || file.startsWith('workspace/') ||
      file.startsWith('scripts/aistudio/') || file === '.env.aistudio.example') continue;
  if (!/\.(?:ts|tsx|js|mjs|cjs|yml|yaml|sh|prisma)$/.test(file) && !/\.env.*example$/.test(file)) continue;
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  for (const match of text.matchAll(/\b(?:process\.env|import\.meta\.env|env|config|values|currentEnv)\??\.(?:\s*)([A-Z][A-Z0-9_]*)/g)) add(match[1], file);
  for (const match of text.matchAll(/\b(?:process\.env|import\.meta\.env|env)\[['"]([A-Z][A-Z0-9_]*)['"]\]/g)) add(match[1], file);
  for (const match of text.matchAll(/\benv\(['"]([A-Z][A-Z0-9_]*)['"]\)/g)) add(match[1], file);
  if (/\.env.*example$/.test(file) || /\.(yml|yaml|sh)$/.test(file)) {
    for (const match of text.matchAll(/^\s*(?:export )?([A-Z][A-Z0-9_]*)\s*[=:]/gm)) add(match[1], file);
  }
  if (/\.[cm]?[jt]sx?$/.test(file)) {
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    function visit(node) {
      if (ts.isVariableDeclaration(node) && ts.isObjectBindingPattern(node.name) &&
          node.initializer && /^(process\.env|env|currentEnv)$/.test(node.initializer.getText(source))) {
        for (const element of node.name.elements) add((element.propertyName ?? element.name).getText(source), file);
      }
      if (file === 'packages/config/src/AppConfig.ts' && ts.isPropertyAssignment(node)) {
        add(node.name.getText(source).replace(/['"]/g, ''), file);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
}
for (const name of required) add(name, 'packages/config/src/AppConfig.ts');
for (const name of ['MANARATAK_GOOGLE_AI_STUDIO', 'MANARATAK_RUNTIME_PROFILE', 'VITE_API_URL',
  'VITE_API_BASE_URL', 'VITE_PUBLIC_WEB_URL', 'VITE_ADMIN_URL', 'DIRECT_URL', 'DISABLE_HMR']) {
  add(name, 'docs/operations/GOOGLE_AI_STUDIO.md');
}
const defaults = {
  MANARATAK_GOOGLE_AI_STUDIO: 'true', MANARATAK_RUNTIME_PROFILE: 'google-ai-studio',
  VITE_API_URL: '', VITE_API_BASE_URL: '', VITE_PUBLIC_WEB_URL: '', VITE_ADMIN_URL: '',
  VITE_PUBLIC_TEMPLATE_DATA_MODE: 'api', VITE_LOCAL_ADMIN_READ_ONLY: 'false',
  DISABLE_HMR: 'false',
};
function category(name, sources) {
  if (name.startsWith('VITE_')) return 'Browser / public (never secret)';
  if (name in defaults) return 'Web preview configuration';
  if (/DATABASE|SQL_|REDIS|JWT|CSRF|SECRET|TOKEN|PASSWORD|PRIVATE_KEY|API_KEY|SIGNING/.test(name)) return 'Server / restricted';
  if (sources.some((s) => /^(apps\/api|packages\/)/.test(s))) return 'Server configuration';
  return 'Tooling / CI / optional capability';
}
const rows = [...variables].sort(([a], [b]) => a.localeCompare(b)).map(([name, locations]) => {
  const sources = [...locations].sort();
  return { name, sources, category: category(name, sources), requirement:
    required.has(name) ? 'Required for staging/production Full API; not Web preview' :
    name === 'DIRECT_URL' ? 'Required for experimental direct connection; not Web preview' :
    name === 'VITE_API_URL' ? 'Optional for preview; required to fetch external application data' :
    name in defaults ? 'Defaulted by preview launcher/example' :
    'Optional/conditional; consult source contract for the enabled capability' };
});
const table = [
  '# Google AI Studio environment inventory', '',
  'Generated from tracked source/configuration only. No environment values are read or exported.',
  'Original definitions, defaults and validators remain in the linked source files. This inventory does not relax them.',
  'All server variables are unnecessary for Web-only preview. Entries used only by tests/CI are not app secrets.',
  'For optional/conditional settings, the source contract is authoritative. No secret values have been transferred.',
  '', '| Variable | Scope / classification | Requirement | Definition/source |',
  '|---|---|---|---|',
  ...rows.map((r) => `| \`${r.name}\` | ${r.category} | ${r.requirement} | ${r.sources.map((s) => `[${s}](../../${s})`).join('<br>')} |`), '',
].join('\n');
const example = [
  '# Google AI Studio: copy to .env.aistudio.local (gitignored), or use the environment UI.',
  '# No secret is needed for Web preview. VITE_* values are exposed to the browser.',
  '# Use only an independent experimental API/database. Never copy original service credentials.',
  ...Object.entries(defaults).map(([key, value]) => `${key}=${value}`),
  '', '# Backend/tooling inventory: placeholders only, intentionally commented out.',
  '# Do not uncomment all entries. Configure only a separately approved Full Runtime capability.',
  '# Required status and definition links: docs/operations/GOOGLE_AI_STUDIO_ENVIRONMENT.md',
  ...rows.filter((r) => !(r.name in defaults)).flatMap((r) => [
    `# ${r.category}; ${r.requirement}`, `# ${r.name}=`,
  ]), '',
].join('\n');
export const environmentArtifacts = new Map([
  ['docs/operations/GOOGLE_AI_STUDIO_ENVIRONMENT.md', table], ['.env.aistudio.example', example],
]);
if (process.argv.includes('--write')) {
  for (const [file, content] of environmentArtifacts) fs.writeFileSync(path.join(root, file), content);
  console.log('Environment inventory generated: ' + rows.length + ' variable names; no secret values.');
}
if (process.argv.includes('--check')) {
  for (const [file, content] of environmentArtifacts) {
    if (fs.readFileSync(path.join(root, file), 'utf8').replaceAll('\r\n', '\n') !== content) {
      throw new Error('Environment inventory stale: run node scripts/aistudio/environment.mjs --write');
    }
  }
  console.log('Environment inventory current: ' + rows.length + ' variable names.');
}

import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { createHash } from 'node:crypto';

const root = process.cwd();
const allowedRootDirectories = new Set(['.devcontainer', '.git', '.github', '.husky', 'apps', 'config', 'docs', 'packages', 'scripts', 'storage', 'tests', 'vendor', 'workspace']);
const allowedRootFiles = new Set([
  '.git', '.dockerignore', '.editorconfig', '.env.example', '.env.runtime.example', '.env.compose.example',
  '.gitattributes', '.gitignore', '.npmrc', '.nvmrc', '.prettierrc',
  // Reviewed source-suite entry points used by the section and B-package validation plans.
  // Keep explicit names: an arbitrary hidden config must still fail this gate.
  '.b01-vitest.config.ts',
  '.b02-vitest.config.ts',
  '.b03-vitest.config.ts',
  '.b04-vitest.config.ts',
  '.b05-vitest.config.ts',
  '.b06-vitest.config.ts',
  '.b07-vitest.config.ts',
  '.b08-vitest.config.ts',
  '.b09-vitest.config.ts',
  '.b10-typecheck.json',
  '.b10a-vitest.config.ts',
  '.b10b-vitest.config.ts',
  '.b10c-vitest.config.ts',
  '.b10d-vitest.config.ts',
  '.b11-vitest.config.ts',
  '.b12-vitest.config.ts',
  '.b13-vitest.config.ts',
  '.certificates-isolated-vitest.config.ts',
  '.home-catalog-vitest.config.ts',
  '.postclosure-review-vitest.config.ts',
  '.section15-completion-vitest.config.ts',
  '.section15-source-recheck-vitest.config.ts',
  '.section17-localization-vitest.config.ts',
  '.section18-ai-vitest.config.ts',
  '.section19-student-tools-vitest.config.ts',
  '.section20-finance-vitest.config.ts',
  '.section21-services-vitest.config.ts',
  '.section22-careers-vitest.config.ts',
  '.section23-notifications-vitest.config.ts',
  '.section24-review-ui-vitest.config.ts',
  '.section25-health-ui-vitest.config.ts',
  '.section26-dashboard-ui-vitest.config.ts',
  '.section27-owner-links-vitest.config.ts',
  '.section27-vitest.config.ts',
  '.sections08-09-completion-vitest.config.ts',
  '.certificates-vitest.config.ts', '.section08-vitest.config.ts', '.section09-vitest.config.ts',
  '.section15-vitest.config.ts', '.section16-vitest.config.ts', 'vitest.database.config.ts', 'vitest.health.config.ts',
  'docker-compose.yml', 'eslint.config.js', 'LICENSE', 'package-lock.json', 'package.json', 'vercel.json',
  'README.md', 'metadata.json', 'server.js', 'tsconfig.base.json', 'tsconfig.json', 'turbo.json', 'vitest.config.ts', 'vitest.workspace.ts',
]);
const excludedDirectories = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.cache', '.turbo', '.vite', 'playwright-report', 'test-results', 'release-artifacts', 'archive']);

function walk(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(target));
    else files.push(target);
  }
  return files;
}

function resolvesImport(importer, specifier) {
  const candidate = path.resolve(path.dirname(importer), specifier);
  const bases = [candidate];
  // Build outputs may not exist yet at the source gate. Verify their owning
  // source module instead of depending on a previous build's artifacts.
  const relative = path.relative(root, candidate).replaceAll('\\', '/');
  if (/^(?:apps|packages)\/[^/]+\/dist\//.test(relative))
    bases.push(path.join(root, relative.replace('/dist/', '/src/')));
  const candidates = bases.flatMap(base => [base, `${base}.ts`, `${base}.tsx`, `${base}.d.ts`, `${base}.js`, `${base}.jsx`, `${base}.mjs`, `${base}.cjs`, path.join(base, 'index.ts'), path.join(base, 'index.tsx'), path.join(base, 'index.d.ts')]);
  for (const base of bases) if (base.endsWith('.js')) candidates.push(`${base.slice(0, -3)}.ts`, `${base.slice(0, -3)}.tsx`, `${base.slice(0, -3)}.d.ts`);
  return candidates.some((item) => fs.existsSync(item));
}

const rootEntries = fs.readdirSync(root, { withFileTypes: true });
const unexpectedRootDirectories = rootEntries.filter((entry) => entry.isDirectory() && !allowedRootDirectories.has(entry.name) && !excludedDirectories.has(entry.name)).map((entry) => entry.name);
const unexpectedRootFiles = rootEntries.filter((entry) => entry.isFile() && !allowedRootFiles.has(entry.name)).map((entry) => entry.name);
const allFiles = walk(root);
const temporaryArtifacts = allFiles.map((file) => path.relative(root, file).replaceAll('\\', '/'))
  .filter((file) => /(?:\.log|\.pid|\.tmp|\.bak|\.patch|\.diff)$/i.test(file)
    // Reviewed validation logs are project evidence, not disposable runtime output.
    && !/^docs\/(?:remediation|reviews)\/evidence\/.*\.log$/i.test(file));

// Archived lab harnesses retain their original external working-directory imports.
// Treat only indexed, byte-verified copies as evidence, never as runnable source.
const archivedHarnesses = [], evidenceIntegrityIssues = [];
function isVerifiedArchivedHarness(file) {
  const relative = path.relative(root, file).replaceAll('\\', '/');
  const match = relative.match(/^docs\/reviews\/evidence\/post28\/([a-f0-9]{40})\/([^/]+)\/(.+)$/);
  if (!match) return false;
  const directory = path.join(root, 'docs/reviews/evidence/post28', match[1], match[2]);
  try {
    const indexFile = path.join(directory, 'evidence-index.json');
    if (fs.lstatSync(indexFile).isSymbolicLink() || fs.lstatSync(file).isSymbolicLink()) throw new Error('SYMLINK');
    const index = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
    const rows = index.files?.filter(row => row.path === match[3]);
    const bytes = fs.readFileSync(file);
    if (index.sourceSha !== match[1] || rows?.length !== 1 || rows[0].bytes !== bytes.length ||
        rows[0].sha256 !== createHash('sha256').update(bytes).digest('hex')) throw new Error('DIGEST');
    archivedHarnesses.push(relative);
    return true;
  } catch {
    evidenceIntegrityIssues.push(relative);
    return false;
  }
}
const sourceFiles = allFiles.filter((file) => /\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(file) && !path.relative(root, file).startsWith(`workspace${path.sep}`) && !isVerifiedArchivedHarness(file));
const brokenRelativeImports = [];
for (const file of sourceFiles) {
  const source = fs.readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  function visit(node) {
    const module = ts.isImportDeclaration(node) || ts.isExportDeclaration(node) ? node.moduleSpecifier
      : ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword ? node.arguments[0] : null;
    // Source fixture strings and comments are not executable imports.
    if (module && ts.isStringLiteralLike(module) && /^\.{1,2}\//.test(module.text) && !resolvesImport(file, module.text))
      brokenRelativeImports.push(`${path.relative(root, file).replaceAll('\\', '/')}: ${module.text}`);
    ts.forEachChild(node, visit);
  }
  visit(ast);
}

const importantMarkdown = [path.join(root, 'README.md'), ...allFiles.filter((file) =>
  (file.includes(`${path.sep}docs${path.sep}remediation${path.sep}`) || file.includes(`${path.sep}docs${path.sep}operations${path.sep}`)) && file.endsWith('.md'))];
const brokenImportantLinks = [];
for (const file of importantMarkdown) {
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1].split('#')[0].trim();
    if (!target || /^(?:https?:|mailto:|#)/i.test(target)) continue;
    const decoded = decodeURIComponent(target.replace(/^<|>$/g, ''));
    if (!fs.existsSync(path.resolve(path.dirname(file), decoded))) brokenImportantLinks.push(`${path.relative(root, file).replaceAll('\\', '/')}: ${target}`);
  }
}

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const report = {
  unexpectedRootDirectories,
  unexpectedRootFiles,
  temporaryArtifacts,
  brokenRelativeImports,
  archivedHarnesses,
  evidenceIntegrityIssues,
  brokenImportantLinks,
  packageManager: 'npm',
  activeLockfiles: ['package-lock.json'].filter((file) => fs.existsSync(path.join(root, file))),
  competingRootLockfiles: ['bun.lock', 'pnpm-lock.yaml', 'yarn.lock', 'yarn.lock.yml'].filter((file) => fs.existsSync(path.join(root, file))),
  npmWorkspaces: packageJson.workspaces,
  internationalTestSourcePresent: fs.existsSync(path.join(root, 'workspace/import-sources/international-tests/unified-56')),
  majorCatalogSourcePresent: fs.existsSync(path.join(root, 'workspace/phase-10-major-catalogs')),
  universityImportFilesInRoot: rootEntries.filter((entry) => entry.isFile() && /universit.*\.(?:xlsx|xls|csv)$/i.test(entry.name)).map((entry) => entry.name),
};

console.log(JSON.stringify(report, null, 2));
if (
  unexpectedRootDirectories.length || unexpectedRootFiles.length || temporaryArtifacts.length ||
  brokenRelativeImports.length || evidenceIntegrityIssues.length || brokenImportantLinks.length || report.competingRootLockfiles.length || report.activeLockfiles.length !== 1 ||
  !report.internationalTestSourcePresent || !report.majorCatalogSourcePresent || report.universityImportFilesInRoot.length
) process.exitCode = 1;

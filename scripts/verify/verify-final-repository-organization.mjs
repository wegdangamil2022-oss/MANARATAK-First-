import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const allowedRootDirectories = new Set(['.devcontainer', '.git', '.github', '.husky', 'apps', 'config', 'docs', 'packages', 'scripts', 'tests', 'vendor', 'workspace']);
const allowedRootFiles = new Set([
  '.dockerignore', '.editorconfig', '.env.example', '.env.aistudio.example', '.env.compose.example',
  '.gitattributes', '.gitignore', '.npmrc', '.nvmrc', '.prettierrc',
  '.certificates-vitest.config.ts', '.section08-vitest.config.ts', '.section09-vitest.config.ts',
  '.section15-vitest.config.ts', '.section16-vitest.config.ts', 'vitest.database.config.ts',
  'docker-compose.yml', 'eslint.config.js', 'LICENSE', 'package-lock.json', 'package.json',
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
  const candidates = [candidate, `${candidate}.ts`, `${candidate}.tsx`, `${candidate}.js`, `${candidate}.mjs`, `${candidate}.cjs`, path.join(candidate, 'index.ts'), path.join(candidate, 'index.tsx')];
  if (candidate.endsWith('.js')) candidates.push(`${candidate.slice(0, -3)}.ts`, `${candidate.slice(0, -3)}.tsx`);
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

const sourceFiles = allFiles.filter((file) => /\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(file) && !file.includes(`${path.sep}workspace${path.sep}`));
const brokenRelativeImports = [];
for (const file of sourceFiles) {
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(/(?:from\s+|import\s*\(\s*|import\s+)['"](\.{1,2}\/[^'"]+)['"]/g)) {
    if (!resolvesImport(file, match[1])) brokenRelativeImports.push(`${path.relative(root, file).replaceAll('\\', '/')}: ${match[1]}`);
  }
}

const importantMarkdown = [path.join(root, 'README.md'), ...allFiles.filter((file) => file.includes(`${path.sep}docs${path.sep}remediation${path.sep}`) && file.endsWith('.md'))];
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
  brokenRelativeImports.length || brokenImportantLinks.length || report.competingRootLockfiles.length || report.activeLockfiles.length !== 1 ||
  !report.internationalTestSourcePresent || !report.majorCatalogSourcePresent || report.universityImportFilesInRoot.length
) process.exitCode = 1;

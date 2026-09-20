import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const diagnose = process.argv.includes('--diagnose');
const configRef = process.argv.find(arg => arg.startsWith('--config-ref='))?.slice('--config-ref='.length);
assert.ok(!configRef || diagnose, '--config-ref is for before/after diagnostics only');
assert.equal(ts.version, '5.8.3', 'Revalidate the Vercel loader model when upgrading TypeScript');

// @vercel/node/src/typescript.ts: readConfig applies fixConfig before resolving extends.
// build.ts registers with project: entrypoint path, files: true, nodeVersionMajor: 22.
// https://github.com/vercel/vercel/blob/3c3fe0de8b5ee17992735fd5560f753387455538/packages/node/src/typescript.ts
function vercelConfig(configPath) {
  const result = ts.readConfigFile(configPath, ts.sys.readFile);
  assert.equal(result.error, undefined);
  const config = configRef
    ? ts.parseConfigFileTextToJson(configPath, execFileSync('git', ['show', `${configRef}:${relative(root, configPath).replaceAll('\\', '/')}`], { cwd: root, encoding: 'utf8' })).config
    : result.config;
  config.compilerOptions = {
    ...config.compilerOptions,
    sourceMap: true,
    inlineSourceMap: false,
    inlineSources: true,
    declaration: false,
    noEmit: false,
    outDir: '$$ts-node$$',
  };
  const options = config.compilerOptions;
  for (const key of ['out', 'outFile', 'composite', 'declarationDir', 'declarationMap',
    'emitDeclarationOnly', 'tsBuildInfoFile', 'incremental']) delete options[key];
  options.target ??= 'ES2021';
  options.esModuleInterop ??= true;
  if (options.module === undefined) {
    options.module = 'NodeNext';
    options.moduleResolution = 'NodeNext';
    options.strict = false;
  }
  return ts.parseJsonConfigFileContent(config, ts.sys, dirname(configPath), undefined, configPath);
}

const contexts = [
  // One loader is reused for traced files. Exercise the reported frontend/Vite
  // files in the API loader too, in addition to their own workspace contexts.
  ['apps/api/tsconfig.json', [
    'apps/api/src/server.ts', 'apps/admin/src/App.tsx',
    'apps/admin/src/pages/MajorDetailPage.tsx',
    'apps/admin/src/pages/AcademicTaxonomyDetailPage.tsx',
    'apps/admin/src/pages/AcademicTaxonomyAdminPage.tsx',
    'apps/web/src/router/index.tsx', 'apps/web/src/components/Seo.tsx',
    'apps/web/src/api/localizedEntities.ts', 'apps/web/src/api/client.ts',
    'apps/admin/vite.config.ts', 'apps/web/vite.config.ts',
  ]],
  ['apps/admin/tsconfig.json', [
    'apps/admin/src/App.tsx',
    'apps/admin/src/pages/MajorDetailPage.tsx',
    'apps/admin/src/pages/AcademicTaxonomyDetailPage.tsx',
    'apps/admin/src/pages/AcademicTaxonomyAdminPage.tsx',
    'apps/admin/vite.config.ts',
  ]],
  ['apps/web/tsconfig.json', [
    'apps/web/src/router/index.tsx', 'apps/web/src/components/Seo.tsx',
    'apps/web/src/api/localizedEntities.ts', 'apps/web/src/api/client.ts',
    'apps/web/vite.config.ts',
  ]],
  ['tsconfig.json', ['apps/admin/vite.config.ts', 'apps/web/vite.config.ts']],
];
// Vercel can trace test sources outside tsconfig's src-only include. Discover
// the entire API test tree, including helpers and future tests, for type checking
// only; runtime/database test exclusions must not hide compiler diagnostics.
const apiTestFiles = ts.sys.readDirectory(resolve(root, 'apps/api/tests'),
  ['.ts', '.tsx', '.mts', '.cts'], ['**/node_modules/**', '**/dist/**']);
assert.ok(apiTestFiles.length > 0, 'API test discovery must not silently become empty');
console.log(`API_TEST_TYPESCRIPT_FILES=${apiTestFiles.length}`);
let failures = 0;
assert.equal(
  ts.findConfigFile(resolve(root, 'apps/api/src/server.ts'), ts.sys.fileExists),
  resolve(root, 'apps/api/tsconfig.json').replaceAll('\\', '/'),
  'Vercel API entrypoint must discover the guarded API config',
);
for (const [configName, entrypoints] of contexts) {
  const configPath = resolve(root, configName);
  // The Vite config files reside inside their workspaces; also inspect the root
  // solution context explicitly, as requested for monorepo loader diagnostics.
  for (const entry of entrypoints) {
    console.log(`DETECTED ${entry}: ${relative(root, ts.findConfigFile(resolve(root, entry), ts.sys.fileExists))}`);
  }
  const config = vercelConfig(configPath);
  const options = config.options;
  console.log(`${configName}: ${JSON.stringify({
    target: ts.ScriptTarget[options.target], module: ts.ModuleKind[options.module],
    moduleResolution: ts.ModuleResolutionKind[options.moduleResolution], strict: options.strict ?? false,
    strictNullChecks: options.strictNullChecks ?? options.strict ?? false,
    esModuleInterop: options.esModuleInterop, jsx: ts.JsxEmit[options.jsx] ?? 'None',
  })}`);
  if (!diagnose) {
    const raw = ts.readConfigFile(configPath, ts.sys.readFile).config.compilerOptions;
    const target = configName === 'apps/web/tsconfig.json' ? 'ESNext' : 'ES2022';
    for (const [key, expected] of Object.entries({target, module: 'ESNext', moduleResolution: 'bundler', strict: true, esModuleInterop: false})) {
      assert.equal(raw?.[key], expected, `${configName} must explicitly pin ${key} before Vercel resolves extends`);
    }
    assert.equal(options.strict, true);
    assert.equal(options.strictNullChecks ?? options.strict, true);
    assert.equal(options.module, ts.ModuleKind.ESNext);
    assert.equal(options.moduleResolution, ts.ModuleResolutionKind.Bundler);
  }
  // Like Vercel's language service, resolve workspace source imports without
  // project-reference redirection and report semantic/syntactic diagnostics.
  const tracedTests = configName === 'apps/api/tsconfig.json' ? apiTestFiles : [];
  const program = ts.createProgram([...new Set([...config.fileNames, ...entrypoints.map(p => resolve(root, p)), ...tracedTests])], options);
  // These are the loader's built-in exclusions, not project workarounds:
  // traced sources can live outside rootDir; solution configs can have no inputs.
  const loaderIgnoredCodes = [6059, 18002, 18003];
  const allDiagnostics = [...config.errors, ...program.getSyntacticDiagnostics(), ...program.getSemanticDiagnostics()];
  const diagnostics = allDiagnostics.filter(d => !loaderIgnoredCodes.includes(d.code));
  console.log(`VERCEL_BUILT_IN_EXCLUSIONS=${allDiagnostics.length - diagnostics.length}`);
  console.log(ts.formatDiagnostics(diagnostics, {
    getCurrentDirectory: () => root, getCanonicalFileName: p => p, getNewLine: () => '\n',
  }));
  console.log(`CONTEXT_DIAGNOSTICS ${configName}=${diagnostics.length}`);
  failures += diagnostics.length;
}
console.log(`VERCEL_TYPESCRIPT_CONTEXT=${failures ? 'FAIL' : 'PASS'} diagnostics=${failures}`);
process.exitCode = failures ? 1 : 0;

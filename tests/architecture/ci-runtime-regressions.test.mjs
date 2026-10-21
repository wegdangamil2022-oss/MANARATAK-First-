import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, rmSync, rmdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const read = (file) => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');

test('The repository retains real configuration, runtime contracts and source datasets', () => {
  for (const file of [
    'packages/config/src/AppConfig.ts',
    'packages/config/src/ProductionReadinessValidator.ts',
    'packages/core/src/domain/IdentifierGenerator.ts',
    'packages/core/src/application/auth/ITokenProvider.ts',
    'packages/domain/src/academic-taxonomy/validation.ts',
    'packages/domain/src/academic-taxonomy/isced-f-baseline.ts',
    'workspace/reconciliation/majors/snapshot-500.json',
    'workspace/reference-data/cities/asia/MANARATAK_Asia_Cities_All_Combined.csv',
    'workspace/reference-data/countries/MANARATAK_All_Continents_Country_Records_CLEAN_IMPORT_READY.xlsx',
    'workspace/phase-10-major-catalogs/MANARATAK_Master_Specializations_By_Academic_Fields_v1.0.md',
  ]) assert.ok(existsSync(new URL(`../../${file}`, import.meta.url)), file);
  assert.match(read('packages/config/src/index.ts'), /export \* from '\.\/ProductionReadinessValidator'/);
  assert.match(read('packages/core/src/index.ts'), /export \* from '\.\/domain\/IdentifierGenerator'/);
});

test('npm workspace manifests keep API runtime guards and full build orchestration', () => {
  const root = JSON.parse(read('package.json'));
  assert.equal(root.scripts.build, 'npm run build --workspaces --if-present');
  assert.equal(root.scripts.start, 'node server.js');
  const api = JSON.parse(read('apps/api/package.json'));
  assert.match(api.scripts.typecheck, /verify-api-native-esm-specifiers\.mjs/);
  assert.match(api.scripts.typecheck, /resolve-api-workspace-esm\.mjs/);
  assert.match(api.scripts['runtime:verify'], /verify-vercel-api-handler\.mjs/);
  for (const app of ['api', 'admin', 'web']) {
    const manifest = JSON.parse(read(`apps/${app}/package.json`));
    for (const [name, version] of Object.entries(manifest.dependencies)) {
      if (name.startsWith('@manaratak/')) assert.equal(version, '*', `${app}: ${name}`);
    }
  }
});

test('branch policy accepts scoped Dependabot updates but rejects arbitrary branch names', () => {
  for (const [name, status] of [
    ['dependabot/github_actions/github/codeql-action/analyze-4.38.0', 0],
    ['dependabot/npm_and_yarn/vite-6.4.3', 0],
    ['main', 0], ['fix/ci-closure', 0], ['dependabot/arbitrary/change', 1], ['random', 1],
  ]) {
    assert.equal(spawnSync(process.execPath, ['scripts/git/validate-branch-name.mjs', name]).status, status, name);
  }
});

test('source-only Prisma job uses the isolated validation gate, never deployment credentials', () => {
  const workflow = read('.github/workflows/imported-courses-runtime-closure.yml');
  assert.match(workflow,/actions\/checkout@[^\n]+\n\s+with:\n\s+fetch-depth: 0/);
  assert.match(workflow, /run: npm run db:source:verify/);
  assert.doesNotMatch(workflow, /npx prisma validate/);
  const gate = read('scripts/ci/prisma-source-gate.mjs');
  assert.match(gate, /DATABASE_URL: sourceDatabaseUrl, DIRECT_URL: sourceDatabaseUrl/);
  assert.match(gate, /\['validate', 'generate'\]/);
});

test('commit policy validates published merge/config categories and rejects malformed messages',()=>{
  for(const [message,status]of [
    ['merge(r07): integrate tested R06 fixes while retaining artifact tooling',0],
    ['config(post28): pin R03 isolated Neon G/S targets and explicit blockers',0],
    ['fix(api): preserve privacy boundary',0],['config(post28): x',1],
    ['merge(r07) missing delimiter',1],['arbitrary(api): allow everything',1],['',2],
  ])assert.equal(spawnSync(process.execPath,['scripts/git/validate-commit-message.mjs',message]).status,status,message);
});

test('translation builds runtime artifacts before behavioral tests', () => {
  const manifest = JSON.parse(read('package.json'));
  assert.match(manifest.scripts['translation:ci'], /^tsc -b packages\/application &&/);
  assert.match(manifest.scripts['translation:ci'], /npm run translation:test$/);
});

test('CodeQL init/analyze stay on the same immutable revision and Dependabot updates them together', () => {
  const workflow = read('.github/workflows/security.yml');
  const init = workflow.match(/github\/codeql-action\/init@([a-f0-9]{40})/)[1];
  const analyze = workflow.match(/github\/codeql-action\/analyze@([a-f0-9]{40})/)[1];
  assert.equal(init, analyze);
  assert.match(read('.github/dependabot.yml'), /groups:[\s\S]*codeql:[\s\S]*github\/codeql-action\/\*/);
});

test('Preview Prisma ownership remains in resource authority and operational verifier is explicitly classified', () => {
  assert.doesNotMatch(read('apps/api/src/infrastructure/runtime/PreviewDatabaseProbe.ts'), /from ['"]@prisma\/client['"]|new PrismaClient/);
  const policy = JSON.parse(read('scripts/architecture/operational-tooling-boundary.json'));
  assert.ok(policy.classifiedDirectPrismaScripts.includes('scripts/verify-vercel-api-handler.mjs'));
});

test('source CI catches inventory drift and negative guard contracts before the full closure matrix', () => {
  const workflow = read('.github/workflows/ci.yml');
  assert.ok(workflow.indexOf('npm run ci:preflight') < workflow.indexOf('npm run ci:closure:manifest'));
  const runner = read('scripts/ci/source-preflight.mjs');
  for (const contract of ['verify-source-architecture-guards.mjs', 'verify-di-reachability.mjs', 'verify-admin-audit-coverage.mjs', 'environment-inventory.mjs', '--check', 'w2-migration-recovery-source.test.mjs', 'admin-audit-coverage.test.mjs', 'dictionary-source.test.mjs']) assert.ok(runner.includes(contract), contract);
  assert.match(runner, /if \(result.status !== 0\) process.exit/);
});

test('release build and retrieval stop on command failure instead of certifying stale artifacts', (t) => {
  const cwd=mkdtempSync(path.join(os.tmpdir(),'r07-ci-failure-'));
  t.after(()=>{rmSync(path.join(cwd,'artifact-retrieval.txt'),{force:true});rmdirSync(cwd);});
  const workflow=read('.github/workflows/ci.yml');
  const bash=process.platform==='win32'?'C:/Program Files/Git/bin/bash.exe':'bash';
  const block=name=>{
    const step=workflow.split('      - name: '+name+'\n')[1]?.split('\n      - ')[0];
    assert.ok(step,name);
    assert.match(step,/shell: bash/);
    return step.split('        run: |\n')[1].split('\n').map(line=>line.replace(/^          /,'')).join('\n');
  };
  const build=block('Build deterministic immutable release artifacts');
  assert.match(build,/RELEASE_ARTIFACT_OUTPUT_DIR/);
  assert.match(workflow,/path: \$\{\{ runner.temp \}\}\/r07-built-release/);
  const buildFailure=spawnSync(bash,['-c',"npm(){ return 73; }; export -f npm;\n"+build+'\necho UNSAFE_CONTINUATION'],{cwd,encoding:'utf8',env:{...process.env,RELEASE_ARTIFACT_OUTPUT_DIR:'/unused',GITHUB_OUTPUT:'/unused'}});
  assert.equal(buildFailure.status,73,buildFailure.stderr);assert.doesNotMatch(buildFailure.stdout,/UNSAFE_CONTINUATION/);
  const retrieval=block('Verify independently retained manifest digest and every unit');
  const retrievalFailure=spawnSync(bash,['-c',"sha256sum(){ cat >/dev/null; return 0; }; node(){ return 74; }; export -f sha256sum node;\n"+retrieval+'\necho UNSAFE_CONTINUATION'],{cwd,encoding:'utf8',env:{...process.env,EXPECTED_MANIFEST_SHA256:'a'.repeat(64),RUNNER_TEMP:'/unused'}});
  assert.equal(retrievalFailure.status,74,retrievalFailure.stderr);assert.doesNotMatch(retrievalFailure.stdout,/UNSAFE_CONTINUATION/);
});

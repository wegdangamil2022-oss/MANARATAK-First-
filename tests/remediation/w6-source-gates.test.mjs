import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { providerReplayForceReanalysisInvariant } from '../../scripts/wp-ic-10-runtime-lib.mjs';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('translation source gate avoids the known implementation-literal false positives and delegates behavior to tests', () => {
  const source = read('scripts/verify-translation-quality-source.ts');
  assert.ok(!source.includes("const language: Language = 'ar'"));
  assert.ok(!source.includes('localizedNames: _localizedNames'));
  assert.ok(source.includes('translation:test'));
  assert.ok(source.includes('tests/translation/translation-quality-gates.spec.ts'));
});

test('provider replay force invariant is owned by the canonical operations use case', () => {
  const operationsSource = read('packages/application/src/courses/use-cases/CourseImportOperationsUseCases.ts');
  const identityDiffSource = read('packages/application/src/courses/use-cases/CourseImportIdentityDiffUseCase.ts');
  assert.equal(providerReplayForceReanalysisInvariant({ operationsSource, identityDiffSource }), true);
  assert.equal(providerReplayForceReanalysisInvariant({ operationsSource: operationsSource.replace('{ force: true }', '{}'), identityDiffSource }), false);
});

test('phase16 verifier references only live canonical CMS composition files', () => {
  const source = read('scripts/verify-phase16-source.mjs');
  assert.ok(!source.includes('CmsContentDetail.tsx'));
  for (const live of ['CmsPublicRouter.ts', 'publicLiveDataSource.ts', 'PublicTemplateApp.tsx']) assert.ok(source.includes(live));
});

test('all external actions are immutable full-SHA refs', () => {
  const sha = /^[0-9a-f]{40}$/i;
  for (const file of fs.readdirSync(path.join(root, '.github/workflows')).filter((x) => /\.ya?ml$/.test(x))) {
    const source = read(`.github/workflows/${file}`);
    for (const match of source.matchAll(/\buses:\s*([^\s#]+)/g)) {
      const ref = match[1];
      if (ref.startsWith('./')) continue;
      assert.ok(sha.test(ref.slice(ref.lastIndexOf('@') + 1)), `${file}: ${ref}`);
    }
  }
});

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = path.resolve(import.meta.dirname, '..');
const source = fs.readFileSync(path.join(root, 'packages/application/src/canonicalization/UnicodeCanonicalization.ts'), 'utf8');
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInThisContext(`(function(exports,module){${js}\n})`, { filename: 'UnicodeCanonicalization.ts' })(module.exports, module);
const {
  canonicalizeUnicodeIdentity,
  unicodeSlugSegment,
  unicodeCanonicalizationPolicy,
} = module.exports;

let passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
  console.log(`PASS ${name}`);
}

test('Arabic NFKC/tatweel/diacritics/Alef normalization is deliberate', () => {
  assert.equal(canonicalizeUnicodeIdentity('إدَارةُ ــ السَّفَر'), 'ادارة السفر');
  assert.equal(canonicalizeUnicodeIdentity('ادارة السفر'), 'ادارة السفر');
  assert.equal(unicodeCanonicalizationPolicy.preservesTaMarbuta, true);
  assert.equal(unicodeCanonicalizationPolicy.preservesHamzaCarriers, true);
});

test('Arabic and Persian digits normalize without erasing multilingual letters', () => {
  assert.equal(canonicalizeUnicodeIdentity('خدمة ٢٠٢٦'), 'خدمة 2026');
  assert.equal(canonicalizeUnicodeIdentity('خدمة ۲۰۲۶'), 'خدمة 2026');
  assert.equal(canonicalizeUnicodeIdentity('Café 東京 خدمة'), 'café 東京 خدمة');
});

test('ignored-token policy does not erase Arabic identity', () => {
  assert.equal(canonicalizeUnicodeIdentity('Best خِدمةُ التأشيرات', { ignoredTokens: ['best'] }), 'خدمة التاشيرات');
  assert.notEqual(
    canonicalizeUnicodeIdentity('خدمة التأشيرات'),
    canonicalizeUnicodeIdentity('استشارات التأشيرات'),
  );
});

test('Unicode slug retains Arabic letters and rejects punctuation-only names', () => {
  assert.equal(unicodeSlugSegment('خدمات الاستشارات التعليمية'), 'خدمات-الاستشارات-التعليمية');
  assert.throws(() => unicodeSlugSegment('--- !!! ---'), /SLUG_SOURCE_REQUIRES_UNICODE_LETTER_OR_NUMBER/);
});

console.log(`MNT-AUD-0091 runtime canonicalization tests: ${passed}/4 PASS`);

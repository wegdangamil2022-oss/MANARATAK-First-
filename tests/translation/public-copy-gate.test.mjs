import test from 'node:test';
import assert from 'node:assert/strict';
import {untranslatedPublicCopy} from '../../scripts/translation/public-copy-gate.mjs';
test('a deep untranslated interactive control fails copy inspection with file and line',()=>{
 const results=untranslatedPublicCopy('function Deep(){return <button aria-label="إغلاق">اضغط هنا</button>}','Deep.tsx');
 assert.equal(results.length,2);assert.deepEqual(results[0],{file:'Deep.tsx',line:1});
});
test('dictionary copy and non-rendered proper nouns do not fabricate missing UI text',()=>{
 assert.deepEqual(untranslatedPublicCopy("const brand='منارتك'; function Deep(){return <button aria-label={t('close')}>{t('action')}</button>}"),[]);
});

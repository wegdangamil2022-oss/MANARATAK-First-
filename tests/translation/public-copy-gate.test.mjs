import test from 'node:test';
import assert from 'node:assert/strict';
import {untranslatedPublicCopy} from '../../scripts/translation/public-copy-gate.mjs';
import {literalUiTranslationKeys} from '../../scripts/translation/dictionary-source.mjs';
test('a deep untranslated interactive control fails copy inspection with file and line',()=>{
 const results=untranslatedPublicCopy('function Deep(){return <button aria-label="إغلاق">اضغط هنا</button>}','Deep.tsx');
 assert.equal(results.length,2);assert.deepEqual(results[0],{file:'Deep.tsx',line:1});
});
test('dictionary copy and non-rendered proper nouns do not fabricate missing UI text',()=>{
 assert.deepEqual(untranslatedPublicCopy("const brand='منارتك'; function Deep(){return <button aria-label={t('close')}>{t('action')}</button>}"),[]);
});
test('rendered expressions, fallback prose and template accessible names are inspected',()=>{
 const source="function Deep(){return <button aria-label={`فتح ${title}`}>{ready ? 'جاهز' : value ?? 'غير متاح'}</button>}";
 assert.equal(untranslatedPublicCopy(source).length,3);
});
test('machine comparisons and event arguments do not count as rendered copy',()=>{
 assert.deepEqual(untranslatedPublicCopy("function Deep(){return <button onClick={()=>select('الكل')} aria-label={t('select')}>{value === 'الكل' && t('all')}</button>}"),[]);
});
test('aliased translators with named parameters retain missing-key coverage',()=>{
 const source="import {useTranslation as useCopy} from '../../i18n/I18nProvider'; function Deep(){const {t:copy}=useCopy();return <button>{copy('missing_key',{count:2})}</button>}";
 assert.deepEqual(literalUiTranslationKeys(source),['missing_key']);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readDictionaryEntries, literalUiTranslationKeys } from '../../scripts/translation/dictionary-source.mjs';
test('dictionary keys are independent of quote style, indentation and same-line formatting', () => {
  assert.deepEqual(readDictionaryEntries(`export const en = {bare: 'Value', "double": "Two", 'single': 'Three', template: \`Four\`} as const;`), [
    {key:'bare',value:'Value'},{key:'double',value:'Two'},{key:'single',value:'Three'},{key:'template',value:'Four'}]);
});
test('blank values remain detectable; computed, dynamic and duplicate entries fail closed', () => {
  assert.equal(readDictionaryEntries(`export const ar = {a:'  '}`)[0].value.trim(), '');
  for (const object of ["{a:'One',a:'Two'}", "{[key]:'Value'}", "{...other}", "{a: variable}"])
    assert.throws(() => readDictionaryEntries(`export const en = ${object}`));
});

test('UI translation checks resolve provider aliases, inherited callback scopes and local dictionaries', () => {
  const source = `import {useTranslation as useUi} from '../i18n/I18nProvider';
    function Page() {const {t: translate}=useUi(); translate('missing_shared_key'); const callback=()=>translate('another_shared_key');
      {const translate=healthText('ar'); translate('runtimeReady');} return callback;}
    function Quoted(){const {'t': renderCopy}=useUi(); renderCopy('quoted_shared_key');}
    function Health() {const {language}=useUi(); const t=healthText(language); t('stale');}
    // t('comment_is_not_a_translation');`;
  assert.deepEqual(literalUiTranslationKeys(source), ['missing_shared_key','another_shared_key','quoted_shared_key']);
});
test('real missing shared dictionary keys remain checked when another namespace uses t', () => {
  assert.deepEqual(literalUiTranslationKeys(`import {useTranslation} from '../i18n/I18nProvider'; function Page(){const {t}=useTranslation(); t('missing'); function Other(t){ t('other_namespace'); }}`), ['missing']);
});

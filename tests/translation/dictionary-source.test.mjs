import test from 'node:test';
import assert from 'node:assert/strict';
import { readDictionaryEntries } from '../../scripts/translation/dictionary-source.mjs';
test('dictionary keys are independent of quote style, indentation and same-line formatting', () => {
  assert.deepEqual(readDictionaryEntries(`export const en = {bare: 'Value', "double": "Two", 'single': 'Three', template: \`Four\`} as const;`), [
    {key:'bare',value:'Value'},{key:'double',value:'Two'},{key:'single',value:'Three'},{key:'template',value:'Four'}]);
});
test('blank values remain detectable; computed, dynamic and duplicate entries fail closed', () => {
  assert.equal(readDictionaryEntries(`export const ar = {a:'  '}`)[0].value.trim(), '');
  for (const object of ["{a:'One',a:'Two'}", "{[key]:'Value'}", "{...other}", "{a: variable}"])
    assert.throws(() => readDictionaryEntries(`export const en = ${object}`));
});

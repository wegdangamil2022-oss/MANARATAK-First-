import assert from 'node:assert/strict';
import test from 'node:test';
import {
  inspectArabicCopy,
  unapprovedArabicWords,
} from '../../scripts/verify-arabic-semantic-copy.mjs';

test('Arabic semantic gate decodes literals and ignores translation variables', () => {
  const source = `export default { "count": "عرض {count} من {total} نتيجة", "newline": "تفاصيل\\nالمتابعة", 'name': 'مرحباً {name}' };`;
  const result = inspectArabicCopy(source, 'ar.ts');
  assert.equal(result.findings.length, 0);
  assert.equal(result.values.get('newline'), 'تفاصيل\nالمتابعة');
});
test('Arabic semantic gate still rejects English prose next to valid variables', () => {
  const result = inspectArabicCopy(
    `export default { label: "عرض {count} pending results" };`,
    'ar.ts',
  );
  assert.deepEqual(result.findings[0].words, ['pending', 'results']);
  assert.deepEqual(unapprovedArabicWords('عرض {bad placeholder}'), ['bad', 'placeholder']);
});

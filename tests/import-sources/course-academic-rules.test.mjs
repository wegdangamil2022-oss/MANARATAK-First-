import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  classifyCourseAcademicSubjects,
  buildAcademicSubjectIndex,
} from '../../scripts/import/course-academic-rules.mjs';
const classify = (title, topics = '') =>
  classifyCourseAcademicSubjects({ originalSourceTitle: title, shortCourseTopicsRaw: topics });
test('a source programming subject relates to computing, not every engineering major', () => {
  const result = classify('Introduction to Python', 'Programming • Projects');
  assert.ok(
    result.some((hit) => hit.code === '0613' && hit.majorNames.includes('Computer Science')),
  );
  assert.ok(result.every((hit) => !hit.majorNames.includes('Mechanical Engineering')));
  assert.equal(result[0].evidence.text, 'Programming');
});
test('teaching language, provider and a badge never create subjects', () => {
  const result = classifyCourseAcademicSubjects({
    originalSourceTitle: 'Learning Design (English)',
    shortCourseTopicsRaw: 'Achievement Badge',
    learningLanguageRaw: 'Python',
    providerName: 'Law and Medicine Academy',
  });
  assert.ok(result.every((hit) => !['0613', '0421', '0912', '0231'].includes(hit.code)));
  assert.deepEqual(classify('A short course', 'Not officially specified • Achievement Badge'), []);
});
test('office tools and broad personal skills do not fan out into academic majors', () => {
  for (const hit of classify('Excel and Communication Skills', 'Microsoft Excel • Communication'))
    assert.deepEqual(hit.majorNames, []);
});
test('veterinary medicine is not human medicine, scientific law is not legal studies', () => {
  assert.ok(classify('Veterinary Medicine', 'Animal Health').some((hit) => hit.code === '0841'));
  assert.ok(classify('Veterinary Medicine', 'Animal Health').every((hit) => hit.code !== '0912'));
  assert.ok(classify("Ohm's Law", 'Physics').every((hit) => hit.code !== '0421'));
  assert.ok(
    classify('Git version control history', 'Software Development').every(
      (hit) => hit.code !== '0222',
    ),
  );
});
test('clinical health alone is not a reviewed public-health major relationship', () => {
  assert.ok(
    classify('Care of Patients', 'Primary Care').every(
      (hit) => !hit.majorNames.includes('Public Health'),
    ),
  );
  assert.ok(
    classify('Public Health', 'Epidemiology').some((hit) =>
      hit.majorNames.includes('Public Health'),
    ),
  );
});
test('specific multilingual source terms are supported without title translation', () => {
  assert.ok(
    classify('Programação com Python', 'Not officially specified').some(
      (hit) => hit.code === '0613',
    ),
  );
  assert.ok(
    classify('Contabilidade básica', 'Not officially specified').some((hit) => hit.code === '0411'),
  );
  assert.ok(classify('مقدمة في البرمجة', 'الذكاء الاصطناعي').some((hit) => hit.code === '0613'));
});
test('an ambiguous alias is not approved as a particular major', () => {
  const index = buildAcademicSubjectIndex({
    nodes: [
      {
        id: 'a',
        status: 'ACTIVE',
        standardType: 'ISCED',
        canonicalCode: '06',
        canonicalName: 'ICT',
        aliases: [],
      },
    ],
    majors: [
      {
        id: 'm1',
        canonicalName: 'A Discipline',
        status: 'ACTIVE',
        academicFieldId: 'a',
        aliases: [{ alias: 'Shared Subject' }],
      },
      {
        id: 'm2',
        canonicalName: 'Another Discipline',
        status: 'ACTIVE',
        academicFieldId: 'a',
        aliases: [{ alias: 'Shared Subject' }],
      },
    ],
  });
  assert.deepEqual(index({ shortCourseTopicsRaw: 'Shared Subject' }), []);
});
test('exact named majors use existing identities and retain literal source evidence', () => {
  const index = buildAcademicSubjectIndex({
    nodes: [
      {
        id: 'n',
        status: 'ACTIVE',
        standardType: 'ISCED',
        canonicalCode: '051',
        canonicalName: 'Biological sciences',
        aliases: [],
      },
    ],
    majors: [
      {
        id: 'm',
        canonicalName: 'Marine Biology',
        status: 'ACTIVE',
        academicFieldId: 'n',
        aliases: [],
      },
    ],
  });
  const hit = index({ shortCourseTopicsRaw: 'Marine Biology • Achievement Badge' }).find(
    (item) => item.ruleId === 'literal-major',
  );
  assert.deepEqual(hit.majorNames, ['Marine Biology']);
  assert.equal(hit.evidence.text, 'Marine Biology');
});

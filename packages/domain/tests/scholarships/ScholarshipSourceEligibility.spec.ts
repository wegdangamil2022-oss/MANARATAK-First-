import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  appendScholarshipEligibilityEdit,
  assertScholarshipEligibilityMetadataUnchanged,
  literalScholarshipCriteria,
  scholarshipEligibilityView,
  scholarshipEligibilitySource,
} from '../../src/scholarships/ScholarshipSourceEligibility';
import { readScholarshipMasterGuide } from '../../../../scripts/import/ScholarshipMasterGuideReader';

const original =
  'بكالوريوس في أي تخصص أو التخرج قبل أغسطس 2027، سجل أكاديمي قوي، اهتمام واضح بدراسات الصين، أنشطة وقيادة ومسؤولية مجتمعية، وإثبات الإنجليزية وفق الحد الرسمي. المتقدم الدولي يجب أن يكون غير صيني ويحمل جوازًا صالحًا.';
const expected = [
  'بكالوريوس في أي تخصص أو التخرج قبل أغسطس 2027.',
  'سجل أكاديمي قوي.',
  'اهتمام واضح بدراسات الصين.',
  'أنشطة وقيادة ومسؤولية مجتمعية.',
  'إثبات الإنجليزية وفق الحد الرسمي.',
  'المتقدم الدولي يجب أن يكون غير صيني ويحمل جوازًا صالحًا.',
];
const metadata = {
  rawSourceSections: {
    'الشروط ومعايير التقديم': original,
    'ملاحظات مهمة': 'Additional restriction not in criteria.',
    'المستندات المطلوبة': 'TOEFL 100',
  },
  internationalTests: ['IELTS', 'TOEFL'],
  conditionalLanguageEvidence: { exemptions: 'More enrichment' },
};

describe('Source-only scholarship eligibility', () => {
  it('reads 0094 from the real Markdown artifact and produces exactly the six requested conditions', () => {
    const file = fs.readFileSync(
      path.resolve(
        'workspace/import-sources/scholarships/MANARATAK_Degree_Scholarships_Master_v6_6_2027_Audit_001_010_947.md',
      ),
      'utf8',
    );
    const records = readScholarshipMasterGuide(file);
    const record = records.find((row) => row.sourceRecordId === 'SCH-OC-0051')!;
    expect(record.sourceEligibility?.text).toBe(original);
    expect(
      scholarshipEligibilityView({
        ...metadata,
        sourceEligibility: record.sourceEligibility,
      }).items.map((item) => item.text),
    ).toEqual(expected);
    for (const other of records.slice(0, 15)) {
      const source = other.sourceEligibility!;
      const view = scholarshipEligibilityView({
        sourceEligibility: source,
        internationalTests: ['INVENTED_TEST'],
      });
      expect(view.items.every((item) => source.text.includes(item.sourceText))).toBe(true);
      expect(view.items.some((item) => item.text.includes('INVENTED_TEST'))).toBe(false);
    }
  });
  it('ignores every enriched field, the legacy eligibility text, and the former generated cards', () => {
    const view = scholarshipEligibilityView({
      ...metadata,
      eligibilityCriteria: 'INVENTED',
      eligibilityItems: [{ valueText: 'INVENTED' }],
      adminCriteria: { sections: ['INVENTED'] },
    });
    expect(view.items.map((item) => item.text)).toEqual(expected);
    expect(view.source?.text).toBe(original);
  });
  it('never falls back when the original section is empty or unavailable', () => {
    for (const value of [
      {},
      { rawSourceSections: {} },
      {
        rawSourceSections: { 'الشروط ومعايير التقديم': '' },
        sourceEligibility: {
          version: 1,
          section: 'الشروط ومعايير التقديم',
          text: 'Not the original empty section',
        },
      },
    ]) {
      expect(
        scholarshipEligibilityView({
          ...value,
          internationalTests: ['IELTS'],
          eligibilityCriteria: 'Do not use',
          reviewedSourceInterpretation: { corrections: { eligibilityCriteria: 'Do not use' } },
        }).items,
      ).toEqual([]);
    }
  });
  it('keeps explicit test details only when literally stated, without alternatives or score expansion', () => {
    const view = scholarshipEligibilityView({
      rawSourceSections: { 'الشروط ومعايير التقديم': 'IELTS Academic 7.5 أو TOEFL 100/120.' },
      internationalTests: ['GRE'],
      conditionalLanguageEvidence: { alternatives: [{ sourceLabel: 'IELTS', minimumOverall: 9 }] },
    });
    expect(view.items.map((item) => item.text)).toEqual(['IELTS Academic 7.5 أو TOEFL 100/120.']);
  });
  it('handles list markers, compound conditional clauses, decimals and different counts without losing literal words', () => {
    expect(
      literalScholarshipCriteria('1. شهادة جامعية\n2. جواز صالح\n3. خبرة عملية').map(
        (item) => item.text,
      ),
    ).toEqual(['شهادة جامعية.', 'جواز صالح.', 'خبرة عملية.']);
    expect(
      literalScholarshipCriteria(
        'إذا كان المتقدم موظفًا، يجب إرفاق الموافقة. معدل ٣،٥ أو 3.5.',
      ).map((item) => item.text),
    ).toEqual(['إذا كان المتقدم موظفًا، يجب إرفاق الموافقة.', 'معدل ٣،٥ أو 3.5.']);
  });
  it('stores approved edits independently and retains the exact original and other evidence after round-trip', () => {
    const before = JSON.stringify(metadata);
    const saved = appendScholarshipEligibilityEdit(
      metadata,
      'source-criterion-2',
      'سجل أكاديمي متميز.',
      'admin-1',
      'تعديل معتمد من المشرف',
      '2026-10-29T16:00:00Z',
    );
    const roundTrip = JSON.parse(JSON.stringify(saved));
    const view = scholarshipEligibilityView(roundTrip);
    expect(view.source?.text).toBe(original);
    expect(view.items.map((item) => item.text)).toEqual(
      expected.map((text, index) => (index === 1 ? 'سجل أكاديمي متميز.' : text)),
    );
    expect(view.items[1].manuallyEdited).toBe(true);
    expect(roundTrip.conditionalLanguageEvidence).toEqual(metadata.conditionalLanguageEvidence);
    expect(JSON.stringify(metadata)).toBe(before);
    const twice = appendScholarshipEligibilityEdit(
      saved,
      'source-criterion-2',
      'سجل أكاديمي قوي.',
      'admin-2',
      'مراجعة ثانية',
      '2026-10-29T17:00:00Z',
    );
    expect(twice.eligibilityAuthoring.edits).toHaveLength(2);
    expect(scholarshipEligibilityView(twice).items[1].text).toBe('سجل أكاديمي قوي.');
  });
  it('rejects forged generic writes and stale or unknown criterion approvals', () => {
    expect(() =>
      assertScholarshipEligibilityMetadataUnchanged(metadata, { rawSourceSections: {} }),
    ).toThrow('SOURCE_IMMUTABLE');
    expect(() =>
      appendScholarshipEligibilityEdit(
        metadata,
        'unknown',
        'text',
        'admin',
        'reason',
        new Date().toISOString(),
      ),
    ).toThrow('NOT_FOUND');
    expect(() =>
      appendScholarshipEligibilityEdit(
        metadata,
        'source-criterion-1',
        ' ',
        'admin',
        'reason',
        new Date().toISOString(),
      ),
    ).toThrow('INVALID');
    const saved = appendScholarshipEligibilityEdit(
      metadata,
      'source-criterion-1',
      'Approved edit',
      'admin',
      'reason',
      new Date().toISOString(),
    );
    expect(
      scholarshipEligibilityView({
        ...saved,
        rawSourceSections: { 'الشروط ومعايير التقديم': 'A new source section.' },
      }).items[0].text,
    ).toBe('A new source section.');
    expect(
      scholarshipEligibilitySource({
        sourceEligibility: { version: 1, section: 'ملاحظات مهمة', text: 'Not criteria' },
      }),
    ).toBeNull();
  });
});

import React, { useState } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ScholarshipEligibilityItemDto } from '@manaratak/domain';
import {
  scholarshipCriterionSections,
  criterionSectionsText,
  withScholarshipCriterionSections,
} from '../../src/features/scholarships/ScholarshipCriteria';
import { ScholarshipEligibilityCriteria } from '../../src/features/scholarships/ScholarshipEligibilityCriteria';
import { scholarshipEditorValidation } from '../../src/features/scholarships/ScholarshipEditorValidation';

const general = {
  itemKey: 'general',
  itemTypeCode: 'GENERAL',
  isRequired: true,
  valueText:
    'بكالوريوس في أي مجال، أو التخرج بحلول أغسطس، مع سجل أكاديمي قوي واهتمام بدراسة الصين وإنجازات ومؤشرات قيادة وإجادة الإنجليزية وفق البدائل الرسمية. لا يسمح بالتزامن مع برنامج درجة آخر. يلزم جواز سفر صالح؛ تسري شروط إضافية على بعض فئات المتقدمين.',
  metadata: { sourceEvidence: 'retained' },
} as ScholarshipEligibilityItemDto;
const language = {
  itemKey: 'language',
  itemTypeCode: 'LANGUAGE_PROFICIENCY',
  operatorCode: 'ANY_OF_WITH_EXEMPTIONS',
  isRequired: true,
  valueText: [
    'إثبات الإنجليزية وفق البدائل والإعفاءات الرسمية، وليس إلزامًا بجميع الاختبارات.',
    'Accepted alternatives: IELTS Academic: 7 (0-9) / TOEFL iBT: 100 (0-120_AS_PUBLISHED_NO_2026_CONVERSION) / Cambridge English Advanced: 185 / CET 6: 600 / TEM 4: 良好_OR_ABOVE.',
    'Exemptions and applicant-specific rules: Eligible international applicants may be exempt after an English-taught degree. HMT applicants must normally submit a report. Mainland applicants must submit a report.',
    'Test date strictly after 2025-09-01.',
    'Excluded: TOEFL MyBest, TOEFL iBT Home Edition, IELTS Indicator, IELTS Online, IELTS One Skill Retake.',
    'Score delivery: Scores must be sent directly to the academy. TOEFL institution code C488. No score-scale conversion is approved.',
  ].join('\n'),
  metadata: {
    policy: 'ALTERNATIVE_EVIDENCE_WITH_EXEMPTIONS_NOT_ALL_REQUIRED',
    languagePolicyVersion: 1,
    automatedEligibility: false,
    sourceEvidence: { digest: 'unchanged' },
  },
} as ScholarshipEligibilityItemDto;
let tree: ReactTestRenderer;
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
});

describe('Atomic scholarship criteria', () => {
  it('breaks the old Arabic paragraph into separate criteria without separating OR or dropping words', () => {
    const sections = scholarshipCriterionSections(general);
    const texts = sections.flatMap((section) => section.parts.map((part) => part.text));
    expect(texts.length).toBeGreaterThan(6);
    expect(texts[0]).toContain('بكالوريوس في أي مجال، أو التخرج بحلول أغسطس');
    expect(texts).toContain('لا يسمح بالتزامن مع برنامج درجة آخر.');
    expect(criterionSectionsText(sections).replace(/\s+/g, ' ')).toBe(general.valueText);
    expect(general.metadata).toEqual({ sourceEvidence: 'retained' });
  });
  it('keeps five language alternatives together as alternatives, exclusions as exclusions, and one owner condition', () => {
    const sections = scholarshipCriterionSections(language);
    const alternatives = sections.find((section) => section.kind === 'alternatives')!;
    expect(alternatives.parts).toHaveLength(5);
    expect(alternatives.parts[1].text).toContain('100 (0-120_AS_PUBLISHED_NO_2026_CONVERSION)');
    expect(sections.find((section) => section.kind === 'exemptions')?.parts).toHaveLength(3);
    expect(sections.find((section) => section.kind === 'excluded')?.parts).toHaveLength(5);
    expect(criterionSectionsText(sections).replace(/\s+/g, ' ')).toBe(
      language.valueText!.replace(/\s+/g, ' '),
    );
    expect(sections.flatMap((section) => section.parts.map((part) => part.text))).toContain(
      'Test date strictly after 2025-09-01.',
    );
  });
  it('does not split decimals, score scales, dates, URLs or an applicant exception joined by OR', () => {
    const text =
      'IELTS 7.5 (0-9), TOEFL 100/120. Test date after 2025-09-01. Use https://example.edu/apply. A degree or equivalent experience is accepted.';
    const sections = scholarshipCriterionSections({ ...general, valueText: text });
    expect(sections[0].parts.map((part) => part.text)).toEqual([
      'IELTS 7.5 (0-9), TOEFL 100/120.',
      'Test date after 2025-09-01.',
      'Use https://example.edu/apply.',
      'A degree or equivalent experience is accepted.',
    ]);
  });
  it('renders one compact list item per criterion and opens that exact criterion for editing', async () => {
    const onEdit = vi.fn();
    const parts = scholarshipCriterionSections(general).flatMap((section) => section.parts);
    await act(async () => {
      tree = create(
        <ScholarshipEligibilityCriteria items={[general]} language="ar" onEdit={onEdit} />,
      );
    });
    expect(tree.root.findAllByType('li')).toHaveLength(parts.length);
    expect(tree.root.findAllByType('h3')).toHaveLength(0);
    await act(async () => tree.root.findByProps({ 'aria-label': 'تعديل الشرط 2' }).props.onClick());
    expect(onEdit).toHaveBeenCalledWith(parts[1].id);
    expect(tree.root.findAllByType('p').map((node) => node.children.join(''))).toContain(
      parts[1].text,
    );
  });
  it('edits one subcriterion and round-trips stable cards without losing composite policy metadata or other conditions', async () => {
    let current: ScholarshipEligibilityItemDto[] = [];
    function Harness() {
      const [items, setItems] = useState([language, general]);
      current = items;
      return <ScholarshipEligibilityCriteria items={items} onChange={setItems} language="en" />;
    }
    await act(async () => {
      tree = create(<Harness />);
    });
    const originalSections = scholarshipCriterionSections(language);
    const originalSecondId = originalSections[1].parts[0].id;
    await act(async () =>
      tree.root
        .findByProps({ 'aria-label': 'Criterion text 2' })
        .props.onChange({ target: { value: 'IELTS Academic: 7.5 (0-9)' } }),
    );
    expect(current).toHaveLength(2);
    expect(current[0].operatorCode).toBe('ANY_OF_WITH_EXEMPTIONS');
    expect(current[0].metadata).toMatchObject(language.metadata!);
    expect(current[1]).toEqual(general);
    const saved = JSON.parse(JSON.stringify(current[0]));
    const reloaded = scholarshipCriterionSections(saved);
    expect(reloaded[1].parts[0]).toEqual({
      id: originalSecondId,
      text: 'IELTS Academic: 7.5 (0-9)',
    });
    expect(reloaded[1].parts).toHaveLength(5);
    expect(saved.valueText).toContain('TOEFL institution code C488.');
    expect(saved.valueText).toContain('IELTS One Skill Retake.');
  });
  it('rejects an empty subcriterion and ignores stale presentation when canonical text changed elsewhere', () => {
    expect(
      scholarshipEditorValidation(
        {
          displayName: 'Scholarship',
          eligibilityItems: [{ ...general, valueText: null, minimumValue: 18 }],
        },
        false,
      ),
    ).toBeNull();
    const sections = scholarshipCriterionSections(general);
    sections[0].parts[1].text = '';
    const changed = withScholarshipCriterionSections(general, sections);
    expect(
      scholarshipEditorValidation(
        { displayName: 'Scholarship', eligibilityItems: [changed] },
        false,
      ),
    ).toContain('empty card');
    const fromAnotherEditor = { ...changed, valueText: 'An entirely new condition.' };
    expect(scholarshipCriterionSections(fromAnotherEditor)[0].parts[0].text).toBe(
      'An entirely new condition.',
    );
  });
  it('removes just one displayed subcriterion from the draft and retains the other source records', async () => {
    let current: ScholarshipEligibilityItemDto[] = [];
    function Harness() {
      const [items, setItems] = useState([general, language]);
      current = items;
      return <ScholarshipEligibilityCriteria items={items} onChange={setItems} language="en" />;
    }
    const before = scholarshipCriterionSections(general)[0].parts;
    await act(async () => {
      tree = create(<Harness />);
    });
    await act(async () =>
      tree.root.findByProps({ 'aria-label': 'Remove criterion 2' }).props.onClick(),
    );
    expect(current).toHaveLength(2);
    expect(current[1]).toEqual(language);
    expect(scholarshipCriterionSections(current[0])[0].parts.map((part) => part.id)).toEqual(
      before.filter((_, index) => index !== 1).map((part) => part.id),
    );
    expect(current[0].metadata?.sourceEvidence).toBe('retained');
  });
});

import React, { useState } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ScholarshipBenefitDto, ScholarshipDto } from '@manaratak/domain';
import type { ScholarshipCatalogUpdate } from '../../src/api/scholarshipCatalog';
import {
  fundingCardText,
  fundingGroupsText,
  fundingTextGroups,
  originalFundingText,
  withFundingTextGroups,
} from '../../src/features/scholarships/ScholarshipFundingCards';
import { ScholarshipDetailReadView } from '../../src/features/scholarships/ScholarshipDetailReadView';
import { ScholarshipContentEditor } from '../../src/features/scholarships/ScholarshipContentEditor';
import { scholarshipEditorValidation } from '../../src/features/scholarships/ScholarshipEditorValidation';

vi.mock('../../src/components/CanonicalPicker', () => ({ CanonicalPicker: () => null }));
const valueText =
  'يشمل تمويل السنة الأولى الرسوم الدراسية والسكن والتأمين الطبي الأساسي ومخصصًا شهريًا وتكاليف بحثية ومساهمة في رحلة ذهاب وعودة. تمويل السنة الثانية ليس تلقائيًا: يتطلب طلبًا إضافيًا واستمرار المستوى الأكاديمي الجيد والإقامة في بكين، ويشمل الرسوم ودعم السكن والتأمين والمخصص الشهري وفق شروط الأكاديمية.';
const raw =
  'الرسوم الدراسية، السكن، راتب شهري، تذكرة سفر ذهاب وعودة واحدة، وتكاليف الدراسة الميدانية. تمويل السنة الثانية يعتمد على استمرار الأداء الأكاديمي الجيد وشروط Yenching.';
const benefit = {
  benefitKey: 'funding',
  benefitTypeCode: 'OTHER',
  valueText,
  durationText:
    'مدة البرنامج عامان. الزمالة الأولية اثنا عشر شهرًا؛ دعم السنة الثانية مشروط بطلب وقبول إضافيين.',
  notes: 'تطبق شروط الأكاديمية.',
  amount: 0,
  currencyReferenceId: 'currency',
  isCovered: true,
  metadata: { evidence: { url: 'https://example.edu/funding' } },
} as unknown as ScholarshipBenefitDto;
const scholarship = {
  id: 's1',
  displayName: 'Yenching',
  benefits: [benefit],
  metadata: {
    rawSourceSections: { 'المميزات والتمويل': raw },
    sourceReview: { digest: 'original' },
  },
} as unknown as ScholarshipDto;
let tree: ReactTestRenderer;
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
});

describe('Funding benefit cards', () => {
  it('separates programme length, initial fellowship and conditional renewal while retaining the exact duration on save', () => {
    const groups = fundingTextGroups(benefit, 'durationText');
    expect(groups.flatMap((group) => group.cards.map((card) => card.text))).toEqual([
      'مدة البرنامج عامان.',
      'الزمالة الأولية اثنا عشر شهرًا',
      'دعم السنة الثانية مشروط بطلب وقبول إضافيين.',
    ]);
    expect(fundingGroupsText(groups)).toBe(benefit.durationText);
    const edited = withFundingTextGroups(
      benefit,
      groups.map((group, index) =>
        index === 0
          ? {
              ...group,
              cards: group.cards.map((card) => ({ ...card, text: 'مدة البرنامج سنتان.' })),
            }
          : group,
      ),
      'durationText',
    );
    expect(edited.durationText).toBe(
      benefit.durationText!.replace('مدة البرنامج عامان.', 'مدة البرنامج سنتان.'),
    );
    expect(edited.valueText).toBe(valueText);
    expect(fundingTextGroups(edited, 'durationText')[0].cards[0].text).toBe('مدة البرنامج سنتان.');
  });
  it('separates the quoted first and second year lists without turning conditions into benefits', () => {
    const groups = fundingTextGroups(benefit);
    expect(groups).toHaveLength(2);
    expect(groups[0].cards.map((card) => fundingCardText(card.text))).toEqual([
      'الرسوم الدراسية',
      'السكن',
      'التأمين الطبي الأساسي',
      'مخصصًا شهريًا',
      'تكاليف بحثية',
      'مساهمة في رحلة ذهاب وعودة',
    ]);
    expect(groups[1].cards.map((card) => fundingCardText(card.text))).toEqual([
      'الرسوم',
      'دعم السكن',
      'التأمين',
      'المخصص الشهري وفق شروط الأكاديمية',
    ]);
    expect(groups[1].prefix).toBe(
      'تمويل السنة الثانية ليس تلقائيًا: يتطلب طلبًا إضافيًا واستمرار المستوى الأكاديمي الجيد والإقامة في بكين، ويشمل ',
    );
    expect(fundingGroupsText(groups)).toBe(valueText);
  });
  it.each([
    'الرسوم الدراسية، السكن، راتب شهري، تذكرة سفر ذهاب وعودة واحدة.',
    'دعم مشروط بطلب وقبول إضافيين، والإقامة في الحرم الجامعي.',
    'Tuition £1.50 per week. Accommodation subject to availability.',
    'منحة فئة A تشمل الرسوم.\nمنحة فئة B تشمل السكن.',
  ])('round trips different wording without dropping or inventing content: %s', (text) => {
    expect(fundingGroupsText(fundingTextGroups({ ...benefit, valueText: text }))).toBe(text);
  });
  it('edits a single card while keeping its keys, conditions, currency, duration, notes and evidence intact', () => {
    const groups = fundingTextGroups(benefit);
    const edited = withFundingTextGroups(
      benefit,
      groups.map((group, index) =>
        index === 0
          ? {
              ...group,
              cards: group.cards.map((card, cardIndex) =>
                cardIndex === 1 ? { ...card, text: 'والسكن الجامعي' } : card,
              ),
            }
          : group,
      ),
    );
    expect(edited.valueText).toBe(valueText.replace('والسكن', 'والسكن الجامعي'));
    expect(edited).toMatchObject({ ...benefit, valueText: edited.valueText });
    expect(fundingTextGroups(JSON.parse(JSON.stringify(edited)))).toEqual(
      groups.map((group, index) =>
        index === 0
          ? {
              ...group,
              cards: group.cards.map((card, cardIndex) =>
                cardIndex === 1 ? { ...card, text: 'والسكن الجامعي' } : card,
              ),
            }
          : group,
      ),
    );
    expect(benefit.valueText).toBe(valueText);
  });
  it('does not restore stale saved boxes after a different editor replaces the funding text', () => {
    const edited = withFundingTextGroups(benefit, fundingTextGroups(benefit));
    const changed = { ...edited, valueText: 'تمويل مختلف وفق نص جديد.' };
    expect(fundingGroupsText(fundingTextGroups(changed))).toBe(changed.valueText);
    expect(fundingTextGroups(changed).flatMap((group) => group.cards)).toHaveLength(1);
  });
  it('rejects an emptied individual box before saving the funding form', () => {
    const groups = fundingTextGroups(benefit);
    const edited = withFundingTextGroups(
      benefit,
      groups.map((group, index) =>
        index === 0
          ? {
              ...group,
              cards: group.cards.map((card, cardIndex) =>
                cardIndex === 1 ? { ...card, text: '  ' } : card,
              ),
            }
          : group,
      ),
    );
    expect(scholarshipEditorValidation({ ...scholarship, benefits: [edited] }, false)).toContain(
      'Complete the new card text',
    );
  });
  it('reads original funding exclusively from its source section, including the missing-source case', () => {
    expect(originalFundingText(scholarship.metadata)).toBe(raw);
    expect(originalFundingText({ description: valueText })).toBeNull();
    expect(originalFundingText({ rawSourceSections: { 'المميزات والتمويل': '' } })).toBe('');
  });
  it('renders compact separate rows, the full conditional context and the exact original text last', async () => {
    const onEdit = vi.fn();
    await act(async () => {
      tree = create(
        <ScholarshipDetailReadView
          scholarship={scholarship}
          tab="funding"
          language="ar"
          onEdit={onEdit}
        />,
      );
    });
    const rows = tree.root.findAllByProps({ className: 'scholarship-criterion' });
    expect(rows).toHaveLength(16); // 10 benefits + conditional context + 3 duration clauses + notes + amount.
    expect(rows.map((row) => row.findByType('p').children.join(''))).toContain(
      'مساهمة في رحلة ذهاب وعودة',
    );
    const context = rows
      .map((row) => row.findByType('p').children.join(''))
      .find((text) => text.startsWith('تمويل السنة الثانية'));
    expect(context).toContain('طلبًا إضافيًا واستمرار المستوى الأكاديمي الجيد والإقامة في بكين');
    const sections = tree.root.findAllByType('section');
    expect(sections.at(-1)!.findByType('h2').children.join('')).toBe('النص الأصلي من الملف');
    expect(sections.at(-1)!.findByType('p').children.join('')).toBe(raw);
    await act(async () => rows[1].findByType('button').props.onClick());
    expect(onEdit).toHaveBeenCalledWith('funding-card-0-1');
  });
  it('opens and edits the selected benefit box and keeps the original source read only', async () => {
    let current: ScholarshipCatalogUpdate = {};
    function Harness() {
      const [form, setForm] = useState<ScholarshipCatalogUpdate>({ ...scholarship });
      current = form;
      return (
        <ScholarshipContentEditor
          scholarship={scholarship}
          form={form}
          setForm={setForm}
          tab="funding"
          language="en"
          focusField="funding-card-0-1"
          onRelationships={vi.fn()}
        />
      );
    }
    await act(async () => {
      tree = create(<Harness />);
    });
    const inputs = tree.root.findAllByType('textarea');
    const selected = inputs.find((node) => node.props.autoFocus);
    expect(selected!.props.value).toBe('والسكن');
    await act(async () => selected!.props.onChange({ target: { value: 'والسكن الجامعي' } }));
    expect(current.benefits![0].valueText).toBe(valueText.replace('والسكن', 'والسكن الجامعي'));
    expect(current.metadata).toEqual(scholarship.metadata);
    const source = tree.root.findByProps({
      className: 'scholarship-read-card scholarship-funding-original',
    });
    expect(source.findAllByType('textarea')).toHaveLength(0);
    expect(source.findByType('p').children.join('')).toBe(raw);
  });
});

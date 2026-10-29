import React, { useState } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ScholarshipDto } from '@manaratak/domain';
import type { ScholarshipCatalogUpdate } from '../../src/api/scholarshipCatalog';
vi.mock('../../src/components/CanonicalPicker', () => ({
  CanonicalPicker: (props: any) => (
    <input
      aria-label={props.label}
      value={props.value ?? ''}
      onChange={(event) => props.onChange(event.target.value, { label: event.target.value })}
    />
  ),
}));
import { ScholarshipContentEditor } from '../../src/features/scholarships/ScholarshipContentEditor';
import { ScholarshipDegreeGroupsEditor } from '../../src/features/scholarships/ScholarshipDegreeGroupsEditor';
import { ScholarshipDetailReadView } from '../../src/features/scholarships/ScholarshipDetailReadView';
import {
  moveScholarshipBenefit,
  scholarshipPresentation,
  withScholarshipPresentation,
} from '../../src/features/scholarships/ScholarshipPresentation';
import { scholarshipEditorValidation } from '../../src/features/scholarships/ScholarshipEditorValidation';

const source = {
  id: 's1',
  displayName: 'Scholarship',
  providerName: 'University',
  academicYear: '2027',
  countrySourceLabel: 'China',
  studyLanguageSourceLabel: 'English',
  isFullyFunded: true,
  fundingTypeCode: 'FULLY_FUNDED',
  benefits: [
    {
      benefitKey: 'tuition',
      benefitTypeCode: 'TUITION',
      valueText: 'First year tuition',
      durationText: 'First year only',
      notes: 'Second year subject to review',
      amount: 0,
      currencyReferenceId: 'currency-1',
    },
  ],
  degreeTargets: [{ targetKey: 'master', sourceLabel: 'Master', degreeLevelId: 'degree-master' }],
  majorTargets: [],
  eligibilityItems: [],
  requiredDocumentItems: [],
  metadata: {
    sourceReview: { digest: 'immutable-evidence' },
    adminPresentation: {
      fundingGroups: [
        { id: 'university', title: 'University A', benefitKeys: ['tuition'] },
        { id: 'province', title: 'Province B', benefitKeys: [] },
      ],
    },
  },
} as unknown as ScholarshipDto;
let tree: ReactTestRenderer;
let current: ScholarshipCatalogUpdate;
function Harness({ tab }: { tab: string }) {
  const [form, setForm] = useState<ScholarshipCatalogUpdate>({ ...source });
  current = form;
  return (
    <ScholarshipContentEditor
      scholarship={source}
      form={form}
      setForm={setForm}
      tab={tab}
      language="en"
      onRelationships={vi.fn()}
    />
  );
}
const button = (text: string) =>
  tree.root.findAllByType('button').find((node) => node.children.includes(text))!;
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
});

describe('Scholarship card authoring', () => {
  it('keeps imported benefit conditions intact without repeating them as a long card heading', async () => {
    const valueText =
      'First year tuition, accommodation, insurance and travel contribution. '.repeat(3);
    const scholarship = {
      ...source,
      benefits: [
        {
          ...source.benefits![0],
          valueText,
          notes: 'Second year requires a separate application.',
        },
      ],
    };
    await act(async () => {
      tree = create(
        <ScholarshipDetailReadView
          scholarship={scholarship}
          tab="funding"
          language="en"
          onEdit={vi.fn()}
        />,
      );
    });
    expect(tree.root.findAllByType('h3').map((node) => node.children.join(''))).not.toContain(
      valueText,
    );
    const paragraphs = tree.root.findAllByType('p').map((node) => node.children.join(''));
    expect(
      paragraphs.some(
        (text) =>
          text.includes(valueText.trim()) &&
          text.includes('Second year requires a separate application.'),
      ),
    ).toBe(true);
    expect(scholarship.benefits[0].valueText).toBe(valueText);
  });
  it('rejects empty group headings and unsafe custom links before saving', () => {
    expect(
      scholarshipEditorValidation(
        {
          ...source,
          metadata: withScholarshipPresentation(source.metadata, {
            fundingGroups: [{ id: 'a', title: '', benefitKeys: [] }],
          }),
        },
        false,
      ),
    ).toContain('Name each funding group');
    expect(
      scholarshipEditorValidation(
        {
          ...source,
          metadata: withScholarshipPresentation(source.metadata, {
            sourceGroups: [
              {
                id: 'a',
                title: 'Sources',
                links: [{ id: 'b', title: 'Apply', url: 'javascript:alert(1)' }],
              },
            ],
          }),
        },
        false,
      ),
    ).toContain('valid HTTP(S)');
    expect(scholarshipEditorValidation({ ...source }, false)).toBeNull();
  });
  it('limits basic information to the requested eight fields and opens overview editing', async () => {
    const onEdit = vi.fn();
    await act(async () => {
      tree = create(
        <ScholarshipDetailReadView
          scholarship={source}
          tab="identity"
          language="en"
          onEdit={onEdit}
        />,
      );
    });
    expect(tree.root.findAllByType('dt').map((node) => node.children.join(''))).toEqual([
      'Scholarship name',
      'Provider',
      'Study country',
      'Academic year',
      'Study language',
      'Deadline',
      'Educational degree',
      'Funding type',
    ]);
    expect(tree.root.findAllByProps({ className: 'scholarship-card-edit' })).toHaveLength(8);
    await act(async () =>
      tree.update(
        <ScholarshipDetailReadView
          scholarship={source}
          tab="overview"
          language="en"
          onEdit={onEdit}
        />,
      ),
    );
    await act(async () => button('Edit').props.onClick());
    expect(onEdit).toHaveBeenCalledWith('description');
  });
  it('moves a benefit between funding groups without changing coverage, evidence, or amount', async () => {
    await act(async () => {
      tree = create(<Harness tab="funding" />);
    });
    await act(async () =>
      tree.root
        .findByProps({ 'aria-label': 'Move benefit to group' })
        .props.onChange({ target: { value: 'province' } }),
    );
    const groups = scholarshipPresentation({ ...source, ...current }, false).fundingGroups;
    expect(groups.find((group) => group.id === 'university')?.benefitKeys).toEqual([]);
    expect(groups.find((group) => group.id === 'province')?.benefitKeys).toEqual(['tuition']);
    expect(current.benefits).toEqual(source.benefits);
    expect(current.metadata?.sourceReview).toEqual(source.metadata?.sourceReview);
    const reread = scholarshipPresentation(
      JSON.parse(JSON.stringify({ ...source, ...current })),
      false,
    );
    expect(reread.fundingGroups).toEqual(groups);
  });
  it('adds an independently named funding group and a separate benefit card', async () => {
    await act(async () => {
      tree = create(<Harness tab="funding" />);
    });
    await act(async () => button('Add funding group').props.onClick());
    await act(async () =>
      tree.root
        .findAllByProps({ 'aria-label': 'Funding group name' })
        .at(-1)!
        .props.onChange({ target: { value: 'University category C' } }),
    );
    await act(async () =>
      tree.root
        .findAllByType('button')
        .filter((node) => node.children.includes('Add benefit'))
        .at(-1)!
        .props.onClick(),
    );
    await act(async () =>
      tree.root
        .findAllByProps({ 'aria-label': 'Benefit' })
        .at(-1)!
        .props.onChange({ target: { value: 'Medical insurance' } }),
    );
    const group = scholarshipPresentation({ ...source, ...current }, false).fundingGroups.at(-1)!;
    expect(group.title).toBe('University category C');
    expect(
      current.benefits?.find((item) => item.benefitKey === group.benefitKeys[0])?.valueText,
    ).toBe('Medical insurance');
    expect(current.benefits?.[0]).toEqual(source.benefits?.[0]);
  });
  it('keeps benefits visible when a grouping is removed and never duplicates the default group', () => {
    const metadata = withScholarshipPresentation(source.metadata, { fundingGroups: [] });
    expect(
      scholarshipPresentation({ ...source, metadata }, false).fundingGroups[0].benefitKeys,
    ).toEqual(['tuition']);
    const withDefault = withScholarshipPresentation(source.metadata, {
      fundingGroups: [{ id: 'general-benefits', title: 'General', benefitKeys: [] }],
    });
    expect(
      scholarshipPresentation({ ...source, metadata: withDefault }, false).fundingGroups,
    ).toEqual([{ id: 'general-benefits', title: 'General', benefitKeys: ['tuition'] }]);
    expect(moveScholarshipBenefit([], 'tuition', 'missing')).toEqual([]);
  });
  it('adds and removes source sections and restores their links from saved metadata', async () => {
    await act(async () => {
      tree = create(<Harness tab="links_unis" />);
    });
    await act(async () => button('Add link section').props.onClick());
    await act(async () =>
      tree.root
        .findAllByProps({ 'aria-label': 'Link section name' })
        .at(-1)!
        .props.onChange({ target: { value: 'University sources' } }),
    );
    await act(async () =>
      tree.root
        .findAllByType('button')
        .filter((node) => node.children.includes('Add link'))
        .at(-1)!
        .props.onClick(),
    );
    await act(async () =>
      tree.root
        .findByProps({ 'aria-label': 'Link title' })
        .props.onChange({ target: { value: 'Admission requirements' } }),
    );
    await act(async () =>
      tree.root
        .findByProps({ 'aria-label': 'URL' })
        .props.onChange({ target: { value: 'https://example.edu/admission' } }),
    );
    const saved = JSON.parse(JSON.stringify({ ...source, ...current }));
    expect(scholarshipPresentation(saved, false).sourceGroups.at(-1)?.links[0].url).toBe(
      'https://example.edu/admission',
    );
    await act(async () =>
      tree.update(<ScholarshipDetailReadView scholarship={saved} tab="links_unis" language="en" />),
    );
    expect(
      tree.root
        .findAllByType('a')
        .some((link) => link.props.href === 'https://example.edu/admission'),
    ).toBe(true);
  });
  it('removes an official link without leaving a second hidden value that reappears on reload', async () => {
    const original = { ...source, applicationUrl: 'https://example.edu/apply' };
    function OfficialHarness() {
      const [form, setForm] = useState<ScholarshipCatalogUpdate>(original);
      current = form;
      return (
        <ScholarshipContentEditor
          scholarship={original}
          form={form}
          setForm={setForm}
          tab="links_unis"
          language="en"
          onRelationships={vi.fn()}
        />
      );
    }
    await act(async () => {
      tree = create(<OfficialHarness />);
    });
    await act(async () => tree.root.findByProps({ 'aria-label': 'Remove link' }).props.onClick());
    expect(current.applicationUrl).toBeNull();
    expect(
      scholarshipPresentation({ ...original, ...current }, false).sourceGroups.flatMap(
        (group) => group.links,
      ),
    ).toHaveLength(0);
  });
  it('maps a new application link back to the canonical publication field', async () => {
    await act(async () => {
      tree = create(<Harness tab="links_unis" />);
    });
    await act(async () => button('Add link').props.onClick());
    await act(async () =>
      tree.root
        .findByProps({ 'aria-label': 'URL' })
        .props.onChange({ target: { value: 'https://example.edu/apply' } }),
    );
    await act(async () =>
      tree.root
        .findByProps({ 'aria-label': 'Link purpose' })
        .props.onChange({ target: { value: 'applicationUrl' } }),
    );
    expect(current.applicationUrl).toBe('https://example.edu/apply');
    expect(
      scholarshipPresentation({ ...source, ...current }, false).sourceGroups[0].links[0].field,
    ).toBe('applicationUrl');
    await act(async () =>
      tree.root
        .findByProps({ 'aria-label': 'Link purpose' })
        .props.onChange({ target: { value: '' } }),
    );
    expect(current.applicationUrl).toBeNull();
    expect(
      scholarshipPresentation({ ...source, ...current }, false).sourceGroups[0].links[0].url,
    ).toBe('https://example.edu/apply');
  });
  it('retains document instructions and condition evidence while editing their card text', async () => {
    const original = {
      ...source,
      requiredDocumentItems: [
        {
          documentKey: 'statement',
          displayName: 'Personal statement',
          description: 'Maximum 750 words',
          documentTypeCode: 'STATEMENT',
          isRequired: true,
        },
      ],
      eligibilityItems: [
        {
          itemKey: 'language',
          itemTypeCode: 'LANGUAGE',
          valueText: 'IELTS or exemption',
          metadata: { alternatives: ['IELTS', 'English degree exemption'] },
        },
      ],
    } as unknown as ScholarshipDto;
    function DocumentHarness() {
      const [form, setForm] = useState<ScholarshipCatalogUpdate>(original);
      current = form;
      return (
        <ScholarshipContentEditor
          scholarship={original}
          form={form}
          setForm={setForm}
          tab="documents"
          language="en"
          onRelationships={vi.fn()}
        />
      );
    }
    await act(async () => {
      tree = create(<DocumentHarness />);
    });
    await act(async () =>
      tree.root
        .findByProps({ 'aria-label': 'Document' })
        .props.onChange({ target: { value: 'Personal statement up to 750 words' } }),
    );
    expect(current.requiredDocumentItems?.[0].description).toBe('Maximum 750 words');
    expect(current.eligibilityItems).toEqual(original.eligibilityItems);
    expect(JSON.stringify(tree.toJSON())).not.toContain('Document type');
  });
  it('adds majors inside their degree and preserves them as unassigned if that degree is removed', async () => {
    let majors: any[] = [];
    function Degrees() {
      const [degrees, setDegrees] = useState([
        { targetKey: 'master', sourceLabel: 'Master', degreeLevelId: 'master-id' },
      ]);
      const [rows, setRows] = useState<any[]>([]);
      majors = rows;
      return (
        <ScholarshipDegreeGroupsEditor
          degrees={degrees}
          majors={rows}
          setDegrees={setDegrees as never}
          setMajors={setRows}
          language="en"
        />
      );
    }
    await act(async () => {
      tree = create(<Degrees />);
    });
    await act(async () => button('Add major to this degree').props.onClick());
    await act(async () =>
      tree.root
        .findByProps({ 'aria-label': 'Major' })
        .props.onChange({ target: { value: 'computer-science' } }),
    );
    expect(majors[0]).toMatchObject({
      majorId: 'computer-science',
      metadata: { degreeTargetKey: 'master' },
    });
    await act(async () => button('Remove degree and keep majors unassigned').props.onClick());
    expect(majors[0]).toMatchObject({
      majorId: 'computer-science',
      metadata: { degreeTargetKey: null },
    });
    expect(JSON.stringify(tree.toJSON())).toContain('Shared or unassigned majors');
  });
});

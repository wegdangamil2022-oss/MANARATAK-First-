import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ScholarshipDto } from '@manaratak/domain';
import { appendScholarshipEligibilityEdit } from '@manaratak/domain';
vi.mock('../../src/api/scholarshipCatalog', () => ({
  scholarshipCatalogApi: { updateCriterion: vi.fn() },
}));
import { scholarshipCatalogApi } from '../../src/api/scholarshipCatalog';
import { ScholarshipEligibilityCriteria } from '../../src/features/scholarships/ScholarshipEligibilityCriteria';
const original =
  'بكالوريوس في أي تخصص أو التخرج قبل أغسطس 2027، سجل أكاديمي قوي، اهتمام واضح بدراسات الصين، أنشطة وقيادة ومسؤولية مجتمعية، وإثبات الإنجليزية وفق الحد الرسمي. المتقدم الدولي يجب أن يكون غير صيني ويحمل جوازًا صالحًا.';
const scholarship = {
  id: 's1',
  revision: 1,
  metadata: {
    rawSourceSections: { 'الشروط ومعايير التقديم': original },
    internationalTests: ['IELTS', 'TOEFL'],
    conditionalLanguageEvidence: { exemptions: 'Never render this extra evidence' },
  },
} as ScholarshipDto;
let tree: ReactTestRenderer;
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
  vi.clearAllMocks();
});
describe('Source-only eligibility criteria interface', () => {
  it('shows exactly six literal source items without enrichment subheadings and preserves the original', async () => {
    await act(async () => {
      tree = create(
        <ScholarshipEligibilityCriteria
          scholarship={scholarship}
          language="ar"
          onSaved={vi.fn()}
        />,
      );
    });
    expect(tree.root.findAllByType('li')).toHaveLength(6);
    expect(tree.root.findAllByType('h3')).toHaveLength(0);
    expect(
      tree.root
        .findAllByType('p')
        .map((node) => node.children.join(''))
        .join(' '),
    ).not.toContain('IELTS');
    expect(tree.root.findByProps({ className: 'scholarship-long-text' }).children).toEqual([
      original,
    ]);
    expect(tree.root.findAllByType('button')).toHaveLength(6);
  });
  it('shows the explicit missing-source state without creating alternate conditions', async () => {
    await act(async () => {
      tree = create(
        <ScholarshipEligibilityCriteria
          scholarship={{ ...scholarship, metadata: { internationalTests: ['IELTS'] } }}
          language="ar"
        />,
      );
    });
    expect(tree.root.findAllByType('li')).toHaveLength(0);
    expect(tree.root.findAllByType('p').map((node) => node.children.join(''))).toContain(
      'الشروط غير مذكورة في المصدر',
    );
  });
  it('opens and saves only the chosen condition with reason and revision, preserving the source and other data', async () => {
    const onSaved = vi.fn().mockResolvedValue(undefined),
      onDirtyChange = vi.fn();
    await act(async () => {
      tree = create(
        <ScholarshipEligibilityCriteria
          scholarship={scholarship}
          language="ar"
          onSaved={onSaved}
          onDirtyChange={onDirtyChange}
        />,
      );
    });
    await act(async () => tree.root.findByProps({ 'aria-label': 'تعديل الشرط 2' }).props.onClick());
    expect(tree.root.findAllByType('textarea')).toHaveLength(1);
    expect(tree.root.findByType('textarea').props.value).toBe('سجل أكاديمي قوي.');
    await act(async () =>
      tree.root.findByType('textarea').props.onChange({ target: { value: 'سجل أكاديمي متميز.' } }),
    );
    await act(async () =>
      tree.root
        .findByProps({ 'aria-label': 'سبب اعتماد التعديل' })
        .props.onChange({ target: { value: 'اعتماد تصحيح يدوي' } }),
    );
    const updated = {
      ...scholarship,
      revision: 2,
      metadata: appendScholarshipEligibilityEdit(
        scholarship.metadata,
        'source-criterion-2',
        'سجل أكاديمي متميز.',
        'owner',
        'اعتماد تصحيح يدوي',
        new Date().toISOString(),
      ),
    };
    vi.mocked(scholarshipCatalogApi.updateCriterion).mockResolvedValue(updated);
    await act(async () =>
      tree.root
        .findAllByType('button')
        .find((node) => node.children.includes('حفظ هذا الشرط'))!
        .props.onClick(),
    );
    expect(scholarshipCatalogApi.updateCriterion).toHaveBeenCalledWith(
      's1',
      'source-criterion-2',
      'سجل أكاديمي متميز.',
      'اعتماد تصحيح يدوي',
      1,
    );
    expect(onSaved).toHaveBeenCalledWith(updated);
    expect(scholarship.metadata?.rawSourceSections).toEqual({ 'الشروط ومعايير التقديم': original });
    expect(onDirtyChange).toHaveBeenCalledWith(true);
  });
  it('keeps the draft on stale revision failure and never saves on cancel', async () => {
    await act(async () => {
      tree = create(
        <ScholarshipEligibilityCriteria
          scholarship={scholarship}
          language="ar"
          onSaved={vi.fn()}
        />,
      );
    });
    await act(async () => tree.root.findByProps({ 'aria-label': 'تعديل الشرط 1' }).props.onClick());
    await act(async () =>
      tree.root.findByType('textarea').props.onChange({ target: { value: 'Draft text' } }),
    );
    await act(async () =>
      tree.root
        .findByProps({ 'aria-label': 'سبب اعتماد التعديل' })
        .props.onChange({ target: { value: 'reason' } }),
    );
    vi.mocked(scholarshipCatalogApi.updateCriterion).mockRejectedValue(
      new Error('REVISION_MISMATCH'),
    );
    await act(async () =>
      tree.root
        .findAllByType('button')
        .find((node) => node.children.includes('حفظ هذا الشرط'))!
        .props.onClick(),
    );
    expect(tree.root.findByType('textarea').props.value).toBe('Draft text');
    expect(tree.root.findByProps({ role: 'alert' }).children).toEqual(['REVISION_MISMATCH']);
    await act(async () =>
      tree.root
        .findAllByType('button')
        .find((node) => node.children.includes('إلغاء'))!
        .props.onClick(),
    );
    expect(scholarshipCatalogApi.updateCriterion).toHaveBeenCalledTimes(1);
    expect(tree.root.findAllByType('textarea')).toHaveLength(0);
  });
});

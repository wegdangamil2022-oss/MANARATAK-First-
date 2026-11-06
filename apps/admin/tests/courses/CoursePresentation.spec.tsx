import React from 'react';
import { act, create } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
vi.mock('../../src/i18n/I18nProvider', () => ({ useTranslation: () => ({ language: 'ar' }) }));
import { CourseCatalogResults } from '../../src/features/courses/CourseCatalogResults';
import { arabicCourseValue, courseNames, courseProviderNames } from '../../src/features/courses/coursePresentation';
import { externalDetailsPayload, externalFields, externalForm } from '../../src/features/courses/externalCourseFields';
import type { CatalogRow } from '../../src/features/courses/catalogState';

const text = (node: unknown): string => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object' && 'children' in node ? text(node.children) : '';
describe('course source presentation', () => {
  it('keeps Arabic and original English names separate without guessing a translation', () => {
    expect(courseNames({ displayName: 'مقدمة الأعمال', originalSourceTitle: 'Introduction to Business' })).toEqual({ arabic: 'مقدمة الأعمال', english: 'Introduction to Business' });
    expect(courseNames({ displayName: 'Untranslated source', originalSourceTitle: 'Untranslated source' }).arabic).toBe('');
    expect(courseProviderNames({ providerName: 'جامعة سايلور', platformName: 'Saylor University' })).toEqual({ arabic: 'جامعة سايلور', english: 'Saylor University' });
  });
  it('translates descriptive source labels without mutating or silently dropping unknown values', () => {
    const raw = '3 lessons; approx. 30–35 min each';
    expect(arabicCourseValue(raw)).toBe('3 دروس; نحو 30–35 دقيقة لكل درس');
    expect(raw).toBe('3 lessons; approx. 30–35 min each');
    expect(arabicCourseValue('English')).toBe('الإنجليزية');
    expect(arabicCourseValue('Certificate of Completion')).toBe('شهادة إكمال');
    expect(arabicCourseValue('Financial Statements • Decision Support')).toBe('القوائم المالية • دعم اتخاذ القرار');
    expect(arabicCourseValue('New source-specific label')).toBe('New source-specific label');
  });
  it('edits source fields only and never clears hidden content, lineage or certificate availability', () => {
    const form = externalForm();
    Object.assign(form, { displayName: 'عنوان عربي', originalSourceTitle: 'Original English', directCourseUrl: 'https://example.org/original', providerName: 'جهة عربية', isStudyFree: 'true', description: 'must not be sent', prerequisites: 'must not be sent' });
    const payload = externalDetailsPayload(form);
    expect(payload.displayName).toBe('عنوان عربي'); expect(payload.providerName).toBe('جهة عربية'); expect(payload.isStudyFree).toBe(true);
    for (const key of ['originalSourceTitle', 'directCourseUrl', 'description', 'prerequisites', 'certificateAvailable', 'certificateConditions', 'optionalFields', 'externalProviderId']) expect(payload).not.toHaveProperty(key);
    expect(Object.keys(externalFields)).toEqual(['identity', 'learning', 'certificate']);
  });
  for (const cards of [true, false]) it(`shows bilingual names in order and retains selection and opening in ${cards ? 'cards' : 'table'}`, async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const row: CatalogRow = { id: 'c1', publicId: 'private-code', displayName: 'مقدمة المحاسبة', originalSourceTitle: 'Introduction to Accounting', originType: 'EXTERNAL_LINKED_COURSE', status: 'IMPORTED', completenessStatus: 'COMPLETE', version: 1, updatedAt: '2026-11-06', providerName: 'جامعة سايلور', providerDisplayName: 'Saylor University', learningLanguage: 'English', studyDuration: '63 hours', isStudyFree: true, isFreeCertificate: true };
    const onOpen = vi.fn(), onSelect = vi.fn(); let tree!: ReturnType<typeof create>;
    await act(async () => { tree = create(<CourseCatalogResults rows={[row]} cards={cards} selected={new Set()} onSelect={onSelect} onSelectPage={() => {}} onOpen={onOpen}/>); });
    const rendered = text(tree.toJSON());
    expect(rendered.indexOf('مقدمة المحاسبة')).toBeLessThan(rendered.indexOf('Introduction to Accounting'));
    expect(rendered).not.toContain('لا يوجد تصنيف معتمد'); expect(rendered).not.toContain('private-code');
    expect(rendered).toContain('جامعة سايلور'); expect(rendered).toContain('Saylor University');
    await act(async () => tree.root.findAllByType('button').find(button => text(button) === 'مقدمة المحاسبة')!.props.onClick());
    expect(onOpen).toHaveBeenCalledWith(row);
    await act(async () => tree.root.findAllByType('input').find(input => input.props['aria-label'] === 'تحديد مقدمة المحاسبة')!.props.onChange({ target: { checked: true } }));
    expect(onSelect).toHaveBeenCalledWith(row, true);
    if (cards) { expect(rendered).toContain('الإنجليزية'); expect(rendered).toContain('63 ساعة'); }
    await act(async () => tree.unmount());
  });
});

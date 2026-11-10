import React from 'react';
import { act, create } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('../../src/api/client', () => ({ adminApiClient: { request: state.request } }));
vi.mock('../../src/i18n/I18nProvider', () => ({ useTranslation: () => ({ language: 'ar' }) }));
vi.mock('../../src/features/courses/ExternalCourseRelationships', () => ({ ExternalCourseRelationships: () => null }));
import { CourseAcademicLinks } from '../../src/features/courses/CourseAcademicLinks';

let tree: ReturnType<typeof create>;
const text = (node: unknown): string => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object' && 'children' in node ? text(node.children) : '';
const major = { id: 'm1', displayName: 'Computer Science', localizedNameAr: 'علوم الحاسب', status: 'ACTIVE' };
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  state.request.mockReset();
});
afterEach(async () => { if (tree) await act(async () => tree.unmount()); });
async function mount() {
  await act(async () => { tree = create(<MemoryRouter><CourseAcademicLinks id="c1" editable={false} busy={false} command={async () => {}} /></MemoryRouter>); });
}
describe('course academic navigation', () => {
  it('shows approved localized majors once and links to the same canonical identities', async () => {
    state.request.mockResolvedValue({
      taxonomyLinks: [{ id: 'f1', taxonomyNodeId: 'field-1', reviewState: 'APPROVED', taxonomyNode: { canonicalName: 'ICT', localizedNames: { ar: 'تقنية المعلومات' } } }],
      majorProjections: [
        { id: 'p1', majorId: 'm1', major, projectionState: 'APPROVED' },
        { id: 'p2', majorId: 'm1', major, projectionState: 'APPROVED' },
        { id: 'p3', majorId: 'm2', major: { ...major, id: 'm2' }, projectionState: 'PROPOSED' },
        { id: 'p4', majorId: 'm3', major: { ...major, id: 'm3', status: 'ARCHIVED' }, projectionState: 'APPROVED' },
      ],
    });
    await mount();
    const links = tree.root.findAllByType('a');
    expect(links.map(link => link.props.href)).toEqual(['/courses/external?taxonomyNodeId=field-1', '/majors/m1']);
    expect(text(tree.toJSON())).toContain('علوم الحاسب');
    expect(text(tree.toJSON())).toContain('تقنية المعلومات');
  });
  it('reports a failed relationship request and allows retry without claiming there are no links', async () => {
    state.request.mockRejectedValueOnce(new Error('unavailable')).mockResolvedValue({ taxonomyLinks: [], majorProjections: [] });
    await mount();
    expect(tree.root.findAllByProps({ role: 'alert' })).toHaveLength(1);
    expect(text(tree.toJSON())).not.toContain('لا توجد تخصصات مرتبطة معتمدة بعد');
    await act(async () => tree.root.findByType('button').props.onClick());
    expect(state.request).toHaveBeenCalledTimes(2);
    expect(text(tree.toJSON())).toContain('لا توجد تخصصات مرتبطة معتمدة بعد');
  });
});

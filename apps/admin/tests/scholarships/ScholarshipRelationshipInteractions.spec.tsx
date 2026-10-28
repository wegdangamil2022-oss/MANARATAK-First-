import React from 'react';
import { act, create } from 'react-test-renderer';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('../../src/api/client', () => ({ adminApiClient: state }));
vi.mock('../../src/i18n/I18nProvider', () => ({
  useTranslation: () => ({ language: 'en', dir: 'ltr' }),
}));
vi.mock('../../src/components/CanonicalPicker', () => ({ CanonicalPicker: () => null }));
import {
  ScholarshipCanonicalFilters,
  emptyScholarshipCanonicalFilters,
} from '../../src/components/ScholarshipCanonicalFilters';
import { ScholarshipRelationshipEditorPage } from '../../src/pages/ScholarshipRelationshipEditorPage';
let tree: ReturnType<typeof create>;
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  state.request.mockReset();
  vi.stubGlobal('window', { addEventListener: vi.fn(), removeEventListener: vi.fn() });
});
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
  vi.unstubAllGlobals();
});
describe('Scholarship canonical relationships', () => {
  it('rejects a relationship response belonging to another owner', async () => {
    state.request.mockResolvedValue({ id: 'different-owner', revision: 7, displayName: 'Wrong owner', status: 'IMPORTED', publicationStatus: 'DRAFT' });
    await act(async () => { tree = create(<MemoryRouter initialEntries={['/scholarships/sch-1/relationships']}><Routes><Route path="/scholarships/:id/relationships" element={<ScholarshipRelationshipEditorPage />} /></Routes></MemoryRouter>); });
    expect(JSON.stringify(tree.toJSON())).toContain('SCHOLARSHIP_READBACK_TARGET_MISMATCH');
    expect(tree.root.findAllByType('fieldset')).toHaveLength(0);
  });
  it('retries the first failed program page and clears the error after recovery', async () => {
    state.request
      .mockRejectedValueOnce(new Error('Unavailable'))
      .mockResolvedValue({
        items: [{ id: 'program-1', sourceProgramName: 'Verified program' }],
        nextCursor: null,
      });
    await act(async () => {
      tree = create(
        <ScholarshipCanonicalFilters
          value={{ ...emptyScholarshipCanonicalFilters }}
          onChange={vi.fn()}
          ar={false}
        />,
      );
    });
    expect(JSON.stringify(tree.toJSON())).toContain('Matching published programs unavailable.');
    await act(async () =>
      tree.root
        .findAllByType('button')
        .find((node) => node.children.includes('Retry programs'))!
        .props.onClick(),
    );
    expect(JSON.stringify(tree.toJSON())).toContain('Verified program');
    expect(JSON.stringify(tree.toJSON())).not.toContain('Matching published programs unavailable.');
  });
  it('clears an academic program when its university parent changes', async () => {
    state.request.mockResolvedValue({ items: [], nextCursor: null });
    const onChange = vi.fn();
    await act(async () => {
      tree = create(
        <ScholarshipCanonicalFilters
          value={{
            ...emptyScholarshipCanonicalFilters,
            universityId: 'uni-1',
            academicProgramId: 'program-1',
          }}
          onChange={onChange}
          ar={false}
        />,
      );
    });
    const picker = tree.root.findAll(
      (node) => node.props.label === 'University' && typeof node.type === 'function',
    )[0];
    await act(async () => picker.props.onChange('uni-2'));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ universityId: 'uni-2', academicProgramId: '' }),
    );
  });
  it.each(['REJECTED', 'ARCHIVED', 'PUBLISHED'])(
    'prevents standalone relationship editing for %s records',
    async (status) => {
      state.request.mockResolvedValue({
        id: 'sch-1',
        revision: 7,
        displayName: 'Verified owner',
        status,
        publicationStatus: status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT',
      });
      await act(async () => {
        tree = create(
          <MemoryRouter initialEntries={['/scholarships/sch-1/relationships']}>
            <Routes>
              <Route
                path="/scholarships/:id/relationships"
                element={<ScholarshipRelationshipEditorPage />}
              />
            </Routes>
          </MemoryRouter>,
        );
      });
      expect(tree.root.findByType('fieldset').props.disabled).toBe(true);
      expect(
        tree.root
          .findAllByType('button')
          .filter(
            (node) =>
              node.props.onClick &&
              node.children.some((child) => typeof child === 'string' && child.includes('Save')),
          )
          .every((node) => node.props.disabled),
      ).toBe(true);
      expect(
        state.request.mock.calls.every((call) => !call[1]?.method || call[1].method === 'GET'),
      ).toBe(true);
    },
  );
});

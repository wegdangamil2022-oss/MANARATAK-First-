import React from 'react';
import { act, create } from 'react-test-renderer';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ detail: vi.fn(), update: vi.fn(), command: vi.fn() }));
vi.mock('../../src/api/scholarshipCatalog', () => ({ scholarshipCatalogApi: state }));
vi.mock('../../src/i18n/I18nProvider', () => ({
  useTranslation: () => ({ language: 'en', dir: 'ltr', t: (key: string) => key }),
}));
vi.mock('../../src/security/AdminAuthorizationContext', () => ({
  useAdminAuthorization: () => ({ hasPermission: () => true }),
}));
vi.mock('../../src/features/integration/ScholarshipReferenceLifecycleEditor', () => ({
  ScholarshipReferenceLifecycleEditor: () => null,
}));
vi.mock('../../src/components/OwnerDescriptionTranslationPanel', () => ({
  OwnerDescriptionTranslationPanel: () => null,
}));
vi.mock('../../src/pages/ScholarshipRelationshipEditorPage', () => ({
  ScholarshipRelationshipEditorPage: () => <p>Existing canonical relationship editor</p>,
}));
import { ScholarshipDetailPage } from '../../src/pages/ScholarshipCatalogDetailPage';
import {
  ScholarshipDetailReadView,
  scholarshipHttpUrl,
} from '../../src/features/scholarships/ScholarshipDetailReadView';
const scholarship = {
  id: 'sch-1',
  publicId: 'SCH-1',
  displayName: 'Verified source title',
  revision: 7,
  status: 'READY_TO_REVIEW',
  publicationStatus: 'DRAFT',
  verificationStatus: 'UNVERIFIED',
  description: 'Saved scholarship description',
  notes: 'Saved source notes',
  isFullyFunded: false,
  amountMinorUnits: '0',
  amountCurrencyCode: 'USD',
  benefits: [],
  degreeTargets: [],
  majorTargets: [],
  eligibilityItems: [],
  requiredDocumentItems: [],
  universityLinks: [],
};
const detail = () => ({
  scholarship: { ...scholarship },
  publicationReadiness: { eligible: false, blocker: 'SCHOLARSHIP_SOURCE_NOT_VERIFIED' },
  completeness: {
    state: 'INCOMPLETE',
    missingFields: ['officialSourceUrl'],
    identityMissingFields: [],
    coreMissingFields: [],
    optionalMissingFields: [],
    missingCount: 1,
    identityReady: true,
  },
  unresolvedLinks: [],
  history: [],
  historyAvailable: false,
});
let tree: ReturnType<typeof create>;
const button = (text: string) =>
  tree.root.findAllByType('button').find((node) => node.children.includes(text))!;
async function mount() {
  await act(async () => {
    tree = create(
      <MemoryRouter initialEntries={['/scholarships/sch-1']}>
        <Routes>
          <Route path="/scholarships/:id" element={<ScholarshipDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );
  });
}
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('window', { addEventListener: vi.fn(), removeEventListener: vi.fn() });
  vi.stubGlobal('document', { addEventListener: vi.fn(), removeEventListener: vi.fn() });
  state.detail.mockReset().mockImplementation(async () => detail());
  state.update.mockReset().mockResolvedValue({});
  state.command.mockReset();
});
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
  vi.unstubAllGlobals();
});
describe('Scholarship detail template and editing boundaries', () => {
  it('defaults to saved read-only data with nine horizontal accessible tabs', async () => {
    await mount();
    expect(tree.root.findAllByProps({ role: 'tab' })).toHaveLength(9);
    expect(tree.root.findAllByType('input')).toHaveLength(0);
    expect(tree.root.findAllByType('textarea')).toHaveLength(0);
    expect(tree.root.findByProps({ role: 'tablist' }).props.className).toBe(
      'scholarship-detail-tabs',
    );
    expect(JSON.stringify(tree.toJSON())).toContain('Verified source title');
    expect(button('Publish scholarship').props.disabled).toBe(true);
  });
  it('retains edits while switching template tabs and warns on cancel', async () => {
    await mount();
    await act(async () => button('Edit data').props.onClick());
    await act(async () => button('Overview').props.onClick());
    await act(async () =>
      tree.root
        .findByType('textarea')
        .props.onChange({ target: { value: 'Unsaved source correction' } }),
    );
    await act(async () => button('Notes').props.onClick());
    await act(async () => button('Overview').props.onClick());
    expect(tree.root.findByType('textarea').props.value).toBe('Unsaved source correction');
    await act(async () => button('Cancel editing').props.onClick());
    expect(tree.root.findByProps({ role: 'dialog' }).props['aria-label']).toBe('Unsaved changes');
    await act(async () => button('Continue editing').props.onClick());
    expect(tree.root.findByType('textarea').props.value).toBe('Unsaved source correction');
    expect(state.update).not.toHaveBeenCalled();
  });
  it('uses one content save action, requires an edit reason and sends the loaded revision', async () => {
    await mount();
    await act(async () => button('Edit data').props.onClick());
    await act(async () => button('Overview').props.onClick());
    await act(async () =>
      tree.root.findByType('textarea').props.onChange({ target: { value: 'Source correction' } }),
    );
    const form = tree.root.findByType('form');
    expect(form.findAllByProps({ type: 'submit' })).toHaveLength(1);
    await act(async () => form.props.onSubmit({ preventDefault: vi.fn() }));
    expect(state.update).not.toHaveBeenCalled();
    await act(async () =>
      form.findByType('input').props.onChange({ target: { value: 'Reviewed source correction' } }),
    );
    await act(async () => form.props.onSubmit({ preventDefault: vi.fn() }));
    expect(state.update).toHaveBeenCalledWith(
      'sch-1',
      expect.objectContaining({ description: 'Source correction' }),
      'Reviewed source correction',
      7,
    );
    expect(state.detail).toHaveBeenCalledTimes(2);
  });
  it('preserves zero amounts in the saved read view', async () => {
    await act(async () => {
      tree = create(
        <ScholarshipDetailReadView
          scholarship={scholarship as never}
          tab="funding"
          language="en"
        />,
      );
    });
    expect(tree.root.findAllByType('dd').some((node) => node.children.includes('0'))).toBe(true);
  });
  it.each([
    'javascript:alert(1)',
    'data:text/html,x',
    '#',
    'https://user:secret@example.org',
    'https://example.org/\\evil',
    ' https://example.org',
    'https://example.org/\n',
  ])('does not expose unsafe or invalid application links: %s', (url) => {
    expect(scholarshipHttpUrl(url)).toBeNull();
  });
  it('accepts only explicit HTTP(S) links and does not substitute the provider website for an application portal', async () => {
    expect(scholarshipHttpUrl('https://example.org/apply')).toBe('https://example.org/apply');
    await act(async () => {
      tree = create(
        <ScholarshipDetailReadView
          scholarship={
            { ...scholarship, officialWebsite: 'https://example.org', applicationUrl: '#' } as never
          }
          tab="links_unis"
          language="en"
        />,
      );
    });
    expect(tree.root.findAllByType('a').map((node) => node.props.href)).toEqual([
      'https://example.org/',
    ]);
  });
});

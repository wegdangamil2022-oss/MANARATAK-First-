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
  state.update.mockReset().mockImplementation(async (_id, input) => {
    const saved = { ...scholarship, ...input, revision: 8 };
    state.detail.mockResolvedValue({ ...detail(), scholarship: saved });
    return saved;
  });
  state.command.mockReset();
});
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
  vi.unstubAllGlobals();
});
describe('Scholarship detail template and editing boundaries', () => {
  it('shows a verified public link and unpublish action but prevents editing a published owner', async () => {
    state.detail.mockResolvedValue({
      ...detail(),
      scholarship: { ...scholarship, status: 'PUBLISHED', publicationStatus: 'PUBLISHED' },
      publicHref: '/scholarships/verified-source',
    });
    await mount();
    expect(button('Edit data')).toBeUndefined();
    expect(button('Unpublish').props.disabled).toBe(false);
    expect(
      tree.root
        .findAllByType('a')
        .some((link) => link.props.href === '/scholarships/verified-source'),
    ).toBe(true);
  });
  it('does not report success when the saved owner readback differs from the acknowledged version', async () => {
    await mount();
    await act(async () => button('Edit data').props.onClick());
    await act(async () => button('Overview').props.onClick());
    await act(async () =>
      tree.root.findByType('textarea').props.onChange({ target: { value: 'Pending correction' } }),
    );
    const form = tree.root.findByType('form');
    await act(async () =>
      form.findByType('input').props.onChange({ target: { value: 'Verified source correction' } }),
    );
    state.update.mockResolvedValue({
      ...scholarship,
      description: 'Pending correction',
      revision: 8,
    });
    await act(async () => form.props.onSubmit({ preventDefault: vi.fn() }));
    expect(JSON.stringify(tree.toJSON())).toContain('Save accepted but readback failed');
    expect(tree.root.findByType('textarea').props.value).toBe('Pending correction');
  });
  it('localizes the legacy editing panels and health labels into English', async () => {
    await mount();
    await act(async () => button('Edit data').props.onClick());
    for (const tab of tree.root.findAllByProps({ role: 'tab' })) {
      await act(async () => tab.props.onClick());
      const text = tree.root
        .findAll((node) => typeof node.type === 'string')
        .flatMap((node) =>
          node.children.filter((child): child is string => typeof child === 'string'),
        )
        .join(' ');
      expect(text.match(/[\u0600-\u06ff][\u0600-\u06ff\s]+/g) ?? []).toEqual([]);
    }
  });
  it('restores a blocked browser-history transition before the router can discard a draft', async () => {
    const go = vi.fn();
    Object.assign(window, { history: { state: { idx: 2 }, go } });
    await mount();
    await act(async () => button('Edit data').props.onClick());
    await act(async () => button('Overview').props.onClick());
    await act(async () =>
      tree.root
        .findByType('textarea')
        .props.onChange({ target: { value: 'Unsaved history draft' } }),
    );
    const registration = vi
      .mocked(window.addEventListener)
      .mock.calls.find((call) => call[0] === 'popstate')!;
    expect(registration[2]).toBe(true);
    const pop = registration[1] as (event: unknown) => void,
      stopImmediatePropagation = vi.fn();
    await act(async () => pop({ state: { idx: 1 }, stopImmediatePropagation }));
    expect(stopImmediatePropagation).toHaveBeenCalled();
    expect(go).toHaveBeenCalledWith(1);
    expect(tree.root.findByType('textarea').props.value).toBe('Unsaved history draft');
    await act(async () => pop({ state: { idx: 2 }, stopImmediatePropagation: vi.fn() }));
    await act(async () => button('Continue editing').props.onClick());
    expect(tree.root.findByType('textarea').props.value).toBe('Unsaved history draft');
  });
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
  it('reads evidence using the owner contract source type, trust and capture time', async () => {
    await act(async () => {
      tree = create(
        <ScholarshipDetailReadView
          scholarship={
            {
              ...scholarship,
              sourceEvidence: [
                {
                  evidenceKey: 'announcement',
                  sourceTypeCode: 'OFFICIAL_ANNOUNCEMENT',
                  sourceUrl: 'https://example.org/source',
                  sourceName: 'Official announcement',
                  trustLevel: 'HIGH',
                  capturedAt: '2026-10-25T12:00:00.000Z',
                  isOfficial: true,
                },
              ],
            } as never
          }
          tab="links_unis"
          language="en"
        />,
      );
    });
    const values = tree.root.findAllByType('dd').map((node) => node.children.join(''));
    expect(values).toContain('OFFICIAL_ANNOUNCEMENT');
    expect(values).toContain('HIGH');
    expect(values.some((value) => value.includes('2026') && value.includes('UTC'))).toBe(true);
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

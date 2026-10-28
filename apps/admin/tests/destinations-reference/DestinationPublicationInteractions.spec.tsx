import React from 'react';
import { act, create } from 'react-test-renderer';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('../../src/api/client', () => ({ adminApiClient: { request: state.request } }));
vi.mock('../../src/i18n/I18nProvider', () => ({ useTranslation: () => ({ language: 'en' }) }));
vi.mock('../../src/security/AdminAuthorizationContext', () => ({
  useAdminAuthorization: () => ({ permissions: ['*'], hasPermission: () => true }),
}));
vi.mock('../../src/features/reference-data/useAdministrationDraftGuard', () => ({
  useAdministrationDraftGuard: () => {},
}));
vi.mock('../../src/components/CanonicalCityPicker', () => ({ CanonicalCityPicker: () => null }));
vi.mock('../../src/components/AssetPicker', () => ({ AssetPicker: () => null }));
import { StudyDestinationDetailPage } from '../../src/pages/StudyDestinationDetailPage';
let tree: ReturnType<typeof create>, navigate: ReturnType<typeof useNavigate>;
function Probe() {
  navigate = useNavigate();
  return null;
}
let revision = 1,
  status = 'IN_REVIEW';
const aggregate = (iso2 = 'YE') => ({
  country: {
    id: 'country-' + iso2,
    iso2Code: iso2,
    iso3Code: iso2 + 'X',
    name: 'Country ' + iso2,
    isActive: true,
  },
  profile: {
    id: 'profile-' + iso2,
    revision,
    status,
    updatedAt: '2026-10-28T00:00:00Z',
    cityReferenceIds: [],
    admissionHighlightsAr: [],
    admissionHighlightsEn: [],
    visaRequirementsAr: [],
    visaRequirementsEn: [],
    costHighlightsAr: [],
    costHighlightsEn: [],
    studentLifeHighlightsAr: [],
    studentLifeHighlightsEn: [],
    officialLinks: [],
    evidenceSources: [],
    studyLanguageReferenceIds: [],
    isFeatured: false,
    sourceVerificationStatus: 'VERIFIED',
  },
  studyLanguages: [],
  livingCostCurrency: null,
  readiness: {
    readyForReview: true,
    readyForPublish: true,
    completenessStatus: 'COMPLETE',
    checks: [],
  },
});
const text = (value: unknown): string =>
  typeof value === 'string'
    ? value
    : Array.isArray(value)
      ? value.map(text).join('')
      : value && typeof value === 'object' && 'children' in value
        ? text(value.children)
        : '';
const button = (name: string) =>
  tree.root.findAllByType('button').find((node) => text(node) === name)!;
async function mount() {
  await act(async () => {
    tree = create(
      <MemoryRouter initialEntries={['/study-destinations/YE?section=publish']}>
        <Probe />
        <Routes>
          <Route
            path="/study-destinations/:countryIso2Code"
            element={<StudyDestinationDetailPage />}
          />
        </Routes>
      </MemoryRouter>,
    );
  });
  await act(async () =>
    tree.root
      .findAllByType('textarea')[0]
      .props.onChange({ target: { value: 'Reviewed official authorities' } }),
  );
}
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.stubGlobal('window', { confirm: () => true });
  revision = 1;
  status = 'IN_REVIEW';
  state.request
    .mockReset()
    .mockImplementation(async (path: string) => aggregate(path.includes('/JO') ? 'JO' : 'YE'));
});
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
  vi.unstubAllGlobals();
});
describe('Destination publication acceptance', () => {
  it('announces publication after reading the exact updated country profile', async () => {
    await mount();
    state.request.mockImplementation(async (_path: string, options?: { method?: string }) => {
      if (options?.method) {
        revision = 2;
        status = 'PUBLISHED';
        return aggregate();
      }
      return aggregate();
    });
    await act(async () => button('Publish destination').props.onClick());
    expect(text(tree.toJSON())).toContain('Action completed and state reloaded.');
    expect(
      state.request.mock.calls.find(([, options]) => options?.method)?.[1].headers['If-Match'],
    ).toBe('1');
  });
  it('blocks repeated publication when readback has not changed', async () => {
    await mount();
    await act(async () => button('Publish destination').props.onClick());
    expect(button('Publish destination').props.disabled).toBe(true);
    expect(text(tree.toJSON())).not.toContain('Action completed and state reloaded.');
    expect(text(tree.toJSON())).toContain('STUDY_DESTINATION_SAVE_READBACK_MISMATCH');
  });
  it('discards a late decision after navigating to another country', async () => {
    await mount();
    let release!: (value: unknown) => void;
    const pending = new Promise((resolve) => {
      release = resolve;
    });
    state.request.mockImplementation(async (path: string, options?: { method?: string }) =>
      options?.method ? pending : aggregate(path.includes('/JO') ? 'JO' : 'YE'),
    );
    await act(async () => {
      void button('Publish destination').props.onClick();
    });
    await act(async () => navigate('/study-destinations/JO?section=publish'));
    const calls = state.request.mock.calls.length;
    await act(async () => release(aggregate()));
    expect(state.request.mock.calls).toHaveLength(calls);
    expect(text(tree.toJSON())).toContain('Country JO');
    expect(text(tree.toJSON())).not.toContain('Action completed and state reloaded.');
  });
});

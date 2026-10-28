import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
const state = vi.hoisted(() => ({ request: vi.fn(), language: 'en' }));
vi.mock('../../src/api/client', () => ({
  adminApiClient: { request: state.request },
  createAdminIdempotencyKey: () => 'isolated-ui-command',
}));
vi.mock('../../src/i18n/I18nProvider', () => ({
  useTranslation: () => ({
    language: state.language,
    dir: state.language === 'ar' ? 'rtl' : 'ltr',
  }),
}));
vi.mock('../../src/security/AdminAuthorizationContext', () => ({
  useAdminAuthorization: () => ({ hasPermission: () => true }),
}));
vi.mock('../../src/components/CanonicalPicker', () => ({
  CanonicalPicker: ({ label }: { label: string }) => <span>{label}</span>,
}));
vi.mock('../../src/components/CanonicalCityPicker', () => ({ CanonicalCityPicker: () => null }));
vi.mock('../../src/components/UniversityProgramWorkspace', () => ({
  UniversityProgramStudyEditor: () => null,
}));
import { UniversityRelationshipEditorPage } from '../../src/pages/UniversityRelationshipEditorPage';
import {
  universityUrl,
  universityValue,
} from '../../src/features/universities/UniversityStageCard';
let tree: ReactTestRenderer;
let navigate: ReturnType<typeof useNavigate>;
function NavigationProbe() { navigate = useNavigate(); return null; }
let record: Record<string, unknown>;
const snapshot = () => ({
  university: { ...record },
  publicHref: null,
  stages: Array.from({ length: 5 }, (_, index) => ({
    stage: index + 1,
    sourceState: index === 4 ? 'NOT_SUPPLIED' : 'AVAILABLE',
    importState: 'UNKNOWN',
    continent: 'Europe',
    fields: { 'Official English Name': 'Source name' },
    issues: [],
  })),
});
const text = (node: unknown): string =>
  typeof node === 'string'
    ? node
    : Array.isArray(node)
      ? node.map(text).join('')
      : node && typeof node === 'object' && 'children' in node
        ? text(node.children)
        : '';
const button = (name: string) =>
  tree.root.findAllByType('button').find((node) => text(node) === name)!;
const tab = (index: number) => tree.root.findAllByProps({ role: 'tab' })[index];
const card = () => tree.root.findByProps({ 'aria-labelledby': 'card-basic-identity' });
async function mount() {
  await act(async () => {
    tree = create(
      <MemoryRouter initialEntries={['/universities/u1']}>
        <NavigationProbe />
        <Routes>
          <Route path="/universities/:id" element={<UniversityRelationshipEditorPage />} />
        </Routes>
      </MemoryRouter>,
    );
  });
}
async function editName() {
  await act(async () => card().findAllByType('button')[0].props.onClick());
  const input = card()
    .findAllByType('input')
    .find((node) => node.props.value === 'Saved name')!;
  await act(async () => input.props.onChange({ target: { value: 'Reviewed name' } }));
}
beforeEach(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('window', { addEventListener: vi.fn(), removeEventListener: vi.fn() });
  vi.stubGlobal('document', {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    querySelector: () => null,
  });
  record = {
    id: 'u1',
    publicId: 'INS-TEST-1',
    revision: 1,
    displayName: 'Saved name',
    status: 'READY_TO_REVIEW',
    completenessStatus: 'NEEDS_REVIEW',
    campuses: [],
    organizationUnits: [],
    rankings: [],
    academicPrograms: [],
  };
  state.language = 'en';
  state.request.mockReset();
  state.request.mockImplementation(
    async (path: string, options?: { method?: string; body?: string }) => {
      if (path.endsWith('/publication-readiness'))
        return { ready: false, blockingIssues: [], warnings: [] };
      if (options?.method) {
        const body = JSON.parse(options.body ?? '{}');
        record = { ...record, ...body.values, revision: Number(record.revision) + 1 };
        return { ...record };
      }
      return snapshot();
    },
  );
});
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
  vi.unstubAllGlobals();
});
describe('University source stages and independent card editing', () => {
  it('discards a late saved card after changing owners and returning to the original owner', async () => {
    await mount();
    await editName();
    const inputs = card().findAllByType('input');
    await act(async () => {
      inputs.find(i => i.props.type === 'url')!.props.onChange({ target: { value: 'https://example.org/source' } });
      inputs.find(i => i.props.type === 'date')!.props.onChange({ target: { value: '2026-10-24' } });
      inputs.find(i => i.props.maxLength === 2000)!.props.onChange({ target: { value: 'Verified identity' } });
    });
    let release!: (value: unknown) => void;
    const pending = new Promise(resolve => { release = resolve; });
    state.request.mockImplementation(async (path: string, options?: { method?: string }) => {
      if (options?.method) return pending;
      if (path.endsWith('/publication-readiness')) return { ready: false, blockingIssues: [], warnings: [] };
      return snapshot();
    });
    await act(async () => { void button('Save this section').props.onClick(); });
    await act(async () => { record = { ...record, id: 'u2', displayName: 'Second owner' }; navigate('/universities/u2'); });
    await act(async () => { record = { ...record, id: 'u1', displayName: 'Current original owner', revision: 3 }; navigate('/universities/u1'); });
    const readsBeforeRelease = state.request.mock.calls.length;
    await act(async () => release({ id: 'u1', revision: 2 }));
    expect(state.request.mock.calls).toHaveLength(readsBeforeRelease);
    expect(text(tree.toJSON())).toContain('Current original owner');
    expect(tree.root.findAllByProps({ role: 'status' })).toHaveLength(0);
  });
  it('opens the exact program and study editor through the visible actions', async () => {
    record.academicPrograms = [
      {
        id: 'p1',
        sourceProgramName: 'Program one',
        status: 'DRAFT',
        degreeLevelId: 'degree1',
        majorId: null,
        majorMappingState: 'UNMAPPED',
        campusIds: [],
        admissionRequirements: [],
      },
    ];
    await mount();
    await act(async () => tab(2).props.onClick());
    await act(async () => button('Study and intakes').props.onClick());
    expect(button('Close study and intake editor')).toBeDefined();
  });
  it('opens read-first with exactly five source tabs and no old jump navigation', async () => {
    await mount();
    expect(tree.root.findAllByProps({ role: 'tab' })).toHaveLength(5);
    expect(tab(0).props['aria-selected']).toBe(true);
    expect(tree.root.findAllByType('input')).toHaveLength(0);
    expect(
      tree.root
        .findAllByType('a')
        .some((a) => String(a.props.href).includes('#university-section')),
    ).toBe(false);
  });
  it('shows all 44 enrichment fields rather than a shortened alternative template', async () => {
    await mount();
    await act(async () => tab(1).props.onClick());
    expect(tree.root.findAllByType('dt')).toHaveLength(44);
    expect(tree.root.findAllByType('input')).toHaveLength(0);
  });
  it('always shows three independent ranking providers without inventing a ranking', async () => {
    await mount();
    await act(async () => tab(4).props.onClick());
    for (const provider of ['QS', 'THE', 'ARWU'])
      expect(tree.root.findAllByType('h2').some((node) => text(node) === provider)).toBe(true);
    expect(text(tree.toJSON())).toContain('No evidenced saved data.');
    expect(state.request.mock.calls.every(([, options]) => !options?.method)).toBe(true);
  });
  it('guards stage changes and keeps the draft when continuing editing', async () => {
    await mount();
    await editName();
    await act(async () => tab(1).props.onClick());
    expect(tree.root.findAllByProps({ role: 'dialog' })).toHaveLength(1);
    await act(async () => button('Keep editing').props.onClick());
    expect(tab(0).props['aria-selected']).toBe(true);
    expect(
      card()
        .findAllByType('input')
        .some((i) => i.props.value === 'Reviewed name'),
    ).toBe(true);
    await act(async () => tab(1).props.onClick());
    await act(async () => button('Discard and continue').props.onClick());
    expect(tab(1).props['aria-selected']).toBe(true);
    expect(state.request.mock.calls.every(([, options]) => !options?.method)).toBe(true);
  });
  it('saves only the chosen card with proof, reason, loaded revision and independent readback', async () => {
    await mount();
    await editName();
    const inputs = card().findAllByType('input');
    await act(async () => {
      inputs
        .find((i) => i.props.type === 'url')!
        .props.onChange({ target: { value: 'https://example.org/evidence' } });
      inputs
        .find((i) => i.props.type === 'date')!
        .props.onChange({ target: { value: '2026-10-24' } });
      inputs
        .find((i) => i.props.maxLength === 2000)!
        .props.onChange({ target: { value: 'Reviewed official identity' } });
    });
    await act(async () => button('Save this section').props.onClick());
    const write = state.request.mock.calls.find(([, options]) => options?.method)!;
    expect(write[0]).toBe('/admin/universities/u1/stage-cards/basic-identity');
    expect(write[1].headers['If-Match']).toBe('1');
    expect(JSON.parse(write[1].body)).not.toHaveProperty('sourceRecords');
    expect(tree.root.findAllByType('input')).toHaveLength(0);
    expect(text(tree.toJSON())).toContain('Reviewed name');
    expect(tree.root.findAllByProps({ role: 'status' })).toHaveLength(1);
  });
  it('does not claim success or drop the draft when readback is stale', async () => {
    await mount();
    await editName();
    const inputs = card().findAllByType('input');
    await act(async () => {
      inputs
        .find((i) => i.props.type === 'url')!
        .props.onChange({ target: { value: 'https://example.org/source' } });
      inputs
        .find((i) => i.props.type === 'date')!
        .props.onChange({ target: { value: '2026-10-24' } });
      inputs
        .find((i) => i.props.maxLength === 2000)!
        .props.onChange({ target: { value: 'Readback guard' } });
    });
    state.request.mockImplementation(async (path: string, options?: { method?: string }) =>
      options?.method
        ? { ...record, revision: 2 }
        : path.endsWith('/publication-readiness')
          ? { ready: false, blockingIssues: [], warnings: [] }
          : snapshot(),
    );
    await act(async () => button('Save this section').props.onClick());
    expect(tree.root.findAllByProps({ role: 'status' })).toHaveLength(0);
    expect(
      card()
        .findAllByType('input')
        .some((i) => i.props.value === 'Reviewed name'),
    ).toBe(true);
    expect(tree.root.findAllByProps({ role: 'alert' }).length).toBeGreaterThan(0);
  });
  it('never exposes live editors for published, archived or rejected owners', async () => {
    record.status = 'ARCHIVED';
    await mount();
    expect(button('Restore to review')).toBeDefined();
    expect(card().findAllByType('button')[0].props.disabled).toBe(true);
  });
  it.each(['Forbidden [403]', 'Too many requests [429]'])(
    'shows a real read failure and retry: %s',
    async (message) => {
      state.request.mockRejectedValue(Error(message));
      await mount();
      expect(text(tree.toJSON())).toContain(message);
      expect(button('Retry')).toBeDefined();
    },
  );
  it('preserves zero and false and blocks unsafe or credential-bearing source links', () => {
    expect(universityValue(0, false)).toBe('0');
    expect(universityValue(false, false)).toBe('No');
    expect(universityValue(null, false)).toBe('Unavailable');
    for (const url of [
      '#',
      'javascript:alert(1)',
      'https://user:pass@example.org',
      'https://example.org/\\evil',
    ])
      expect(universityUrl(url)).toBeNull();
  });
});

import { act, create } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ getRecord: vi.fn(), saveCountry: vi.fn(), page: vi.fn() }));
vi.mock('../../src/api/referenceData', () => ({
  referenceDataAdminApi: api,
  getReferenceDataPage: api.page,
}));
vi.mock('../../src/security/AdminAuthorizationContext', () => ({
  useAdminAuthorization: () => ({ hasPermission: () => true }),
}));
vi.mock('../../src/features/reference-data/ReferenceDialog', () => ({
  ReferenceDialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('../../src/components/CanonicalPicker', () => ({ CanonicalPicker: () => null }));
vi.mock('../../src/components/ReferenceGovernancePanel', () => ({ GovernanceDialog: () => null }));
import { ReferenceRecordWorkspace } from '../../src/features/reference-data/ReferenceRecordWorkspace';
let tree: ReturnType<typeof create>;
const original = {
  id: 'country-a',
  iso2Code: 'AA',
  iso3Code: 'AAA',
  name: 'Original',
  nameAr: '',
  lifecycleState: 'ACTIVE',
  versionNumber: 1,
};
async function mount() {
  await act(async () => {
    tree = create(
      <MemoryRouter initialEntries={['/?recordId=country-a']}>
        <ReferenceRecordWorkspace collection="countries" isAr={false} onNavigate={() => {}} />
      </MemoryRouter>,
    );
  });
}
function text(node: any): string {
  return typeof node === 'string' ? node : (node?.children ?? []).map(text).join('');
}
async function edit() {
  const group = tree.root.findAllByType('h3').find((node) => text(node) === 'Names')!.parent!
    .parent!;
  await act(async () => group.findByType('button').props.onClick());
  const name = group.findAllByType('input').find((node) => node.props.value === 'Original')!;
  await act(async () => name.props.onChange({ target: { value: 'Edited draft' } }));
}
async function save() {
  await act(async () => {
    tree.root
      .findAllByType('form')
      .at(-1)!
      .props.onSubmit({ preventDefault() {} });
  });
}
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.stubGlobal('window', {
    location: { search: '?recordId=country-a' },
    addEventListener() {},
    removeEventListener() {},
    confirm: () => true,
  });
  api.getRecord.mockReset().mockResolvedValue(original);
  api.saveCountry
    .mockReset()
    .mockResolvedValue({ ...original, name: 'Edited draft', versionNumber: 2 });
  api.page
    .mockReset()
    .mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 25, totalPages: 0 });
});
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
  vi.unstubAllGlobals();
});
describe('Reference owner accepted-save verification', () => {
  it('keeps the edited draft when save is accepted but readback fails, then verifies without a second write', async () => {
    await mount();
    await edit();
    api.getRecord.mockRejectedValueOnce(Error('read offline'));
    await save();
    expect(
      tree.root.findAllByType('input').some((node) => node.props.value === 'Edited draft'),
    ).toBe(true);
    expect(JSON.stringify(tree.toJSON())).not.toContain('Save confirmed by the reference owner.');
    api.getRecord.mockResolvedValue({ ...original, name: 'Edited draft', versionNumber: 2 });
    await save();
    expect(api.saveCountry).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(tree.toJSON())).toContain('Save confirmed by the reference owner.');
  });
  it('does not confirm a mutation acknowledgement for a different canonical identity', async () => {
    await mount();
    await edit();
    api.saveCountry.mockResolvedValue({ ...original, id: 'other-country' });
    await save();
    expect(JSON.stringify(tree.toJSON())).toContain('REFERENCE_SAVE_IDENTITY_MISMATCH');
    expect(
      tree.root.findAllByType('input').some((node) => node.props.value === 'Edited draft'),
    ).toBe(true);
  });
});

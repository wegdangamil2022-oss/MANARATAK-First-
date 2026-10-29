import { act, create } from 'react-test-renderer';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('../../src/api/client', () => ({
  adminApiClient: { request: api.request },
  createAdminIdempotencyKey: () => 'synthetic-attempt',
}));
vi.mock('../../src/i18n/I18nProvider', () => ({
  useTranslation: () => ({ dir: 'ltr', t: (key: string) => key }),
}));
vi.mock('../../src/components/AssetUploadWizard', () => ({ AssetUploadWizard: () => null }));
vi.mock('../../src/components/AssetGovernancePanel', () => ({ AssetGovernancePanel: () => null }));
vi.mock('../../src/components/AssetLifecycleActions', () => ({
  AssetLifecycleActions: () => null,
}));
import { AssetLibraryWorkspace } from '../../src/pages/assets/AssetLibraryWorkspace';
let tree: ReturnType<typeof create>, navigate: ReturnType<typeof useNavigate>;
function Navigation() {
  navigate = useNavigate();
  return null;
}
const fixture = {
  id: 'asset-a',
  reference: 'asset-a',
  lifecycleState: 'ACTIVE',
  ownerType: 'COURSE',
  ownerId: 'course-a',
  metadata: { originalFilename: 'synthetic.pdf', mimeType: 'application/pdf', byteSize: 10 },
};
const rendered = () => JSON.stringify(tree.toJSON());
const button = (key: string) =>
  tree.root.findAllByType('button').find((node) => node.children.includes(key))!;
async function mount() {
  await act(async () => {
    tree = create(
      <MemoryRouter initialEntries={['/?q=first']}>
        <Navigation />
        <AssetLibraryWorkspace />
      </MemoryRouter>,
    );
  });
}
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  api.request
    .mockReset()
    .mockImplementation(async (path: string) =>
      path.includes('?')
        ? { items: [fixture], hasMore: false, nextCursor: null }
        : { ...fixture, metadata: { ...fixture.metadata, fileExtension: 'pdf' } },
    );
});
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
});
describe('Asset owner identity and late reads', () => {
  it('rejects details belonging to a different asset', async () => {
    await mount();
    api.request.mockResolvedValue({ ...fixture, id: 'other-asset' });
    await act(async () => button('asset_text_098').props.onClick());
    expect(rendered()).toContain('ASSET_IDENTITY_MISMATCH');
  });
  it('discards usage from a previous filter scope', async () => {
    await mount();
    let finish!: (value: unknown) => void;
    api.request.mockImplementation((path: string) =>
      path.endsWith('/usages')
        ? new Promise((resolve) => {
            finish = resolve;
          })
        : Promise.resolve({ items: [], hasMore: false, nextCursor: null }),
    );
    const usage = button('asset_text_097');
    await act(async () => usage.props.onClick());
    await act(async () => navigate('/?q=second'));
    await act(async () =>
      finish({
        assetId: fixture.id,
        inUse: true,
        usages: [{ consumer: 'obsolete-private-owner', field: 'cover' }],
      }),
    );
    expect(rendered()).not.toContain('obsolete-private-owner');
  });
  it('rejects usage results belonging to another asset', async () => {
    await mount();
    api.request.mockResolvedValue({ assetId: 'other-asset', inUse: true, usages: [] });
    const usage = button('asset_text_097');
    await act(async () => usage.props.onClick());
    expect(rendered()).toContain('ASSET_USAGE_IDENTITY_MISMATCH');
  });
});

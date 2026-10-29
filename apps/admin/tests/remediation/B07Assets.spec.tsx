import React from 'react';
import { act, create } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('../../src/api/client', () => ({ adminApiClient: { request: state.request } }));
vi.mock('../../src/i18n/I18nProvider', () => ({ useTranslation: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }) }));
vi.mock('../../src/components/CanonicalPicker', () => ({ CanonicalPicker: () => null }));
vi.mock('../../src/components/CanonicalCityPicker', () => ({ CanonicalCityPicker: () => null }));
import { AdminAuthorizationProvider } from '../../src/security/AdminAuthorizationContext';
import { AssetPicker } from '../../src/components/AssetPicker';
import { AssetGovernancePanel } from '../../src/components/AssetGovernancePanel';
import { CareerAdminPage } from '../../src/pages/CareerAdminPage';
let tree: ReturnType<typeof create>;
const asset = { id: 'asset-uuid', reference: 'asset:public-ref', lifecycleState: 'ACTIVE', metadata: { originalFilename: 'logo.png', mimeType: 'image/png' } };
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
  vi.stubGlobal('window', Object.assign(new EventTarget(), {
    setTimeout, clearTimeout, history: { state: { idx: 0 }, go: vi.fn() }, confirm: vi.fn(() => false),
  }));
  vi.stubGlobal('document', new EventTarget());
  state.request.mockReset().mockImplementation(async (path: string) => path.startsWith('/admin/careers') ? { data: [], total: 0, totalPages: 0 } : path.includes('?') ? { items: [asset], hasMore: false, nextCursor: null } : path.endsWith('/selection-audit') ? {} : asset);
});
afterEach(async () => { if (tree) await act(async () => tree.unmount()); vi.useRealTimers(); vi.unstubAllGlobals(); });
async function mount(element: React.ReactNode, permissions: string[]) {
  await act(async () => { tree = create(<MemoryRouter initialEntries={['/careers?tab=employers']}><AdminAuthorizationProvider permissions={permissions}>{element}</AdminAuthorizationProvider></MemoryRouter>); });
}
describe('B07 asset navigation and reuse', () => {
  it('makes no asset requests without reuse permission and preserves the existing ID', async () => {
    await mount(<AssetPicker value="existing-logo" purpose="CAREER_EMPLOYER_LOGO" onChange={vi.fn()} />, ['admin:careers:manage']);
    await act(async () => vi.advanceTimersByTimeAsync(300));
    expect(state.request).not.toHaveBeenCalled();
    expect(JSON.stringify(tree.toJSON())).toContain('existing-logo');
    expect(tree.root.findAllByType('select')).toHaveLength(0);
  });
  it('selects an employer image through the audited picker rather than a raw ID input', async () => {
    await mount(<CareerAdminPage />, ['admin:careers:manage', 'admin:careers:author', 'admin:assets:reuse']);
    await act(async () => tree.root.findAllByType('button').find(b => b.children.includes('Add employer'))!.props.onClick());
    await act(async () => vi.advanceTimersByTimeAsync(300));
    const picker = tree.root.findByType(AssetPicker);
    expect(picker.props.mimeTypePrefix).toBe('image/');
    await act(async () => picker.findByType('select').props.onChange({ target: { value: 'asset-uuid' } }));
    expect(tree.root.findByType(AssetPicker).props.value).toBe('asset-uuid');
    expect(state.request).toHaveBeenCalledWith('/admin/asset-reuse/asset-uuid/selection-audit', expect.objectContaining({ method: 'POST', body: JSON.stringify({ purpose: 'CAREER_EMPLOYER_LOGO' }) }));
    expect(state.request.mock.calls.some(([path]) => path.includes('mimeTypePrefix=image%2F'))).toBe(true);
    expect(tree.root.findAllByType('input').some(input => input.props.value === 'asset-uuid')).toBe(false);
  });
  it.each([false, true])('gates asset owner links by the owner permission (%s) and does not leak metadata', async allowed => {
    const snapshot = { ...asset, ownerType: 'EMPLOYER', ownerId: 'employer-uuid', metadata: { width: 100, height: 100, storageKey: 'PRIVATE-LOCATOR', actorId: 'PRIVATE-ACTOR' } };
    await mount(<AssetGovernancePanel asset={snapshot} />, allowed ? ['admin:careers:manage'] : ['admin:assets:manage']);
    const links = tree.root.findAllByType('a');
    expect(links.map(a => a.props.href)).toEqual(allowed ? ['/careers?tab=employers'] : []);
    expect(JSON.stringify(tree.toJSON())).not.toMatch(/PRIVATE-LOCATOR|PRIVATE-ACTOR/);
    expect(state.request).not.toHaveBeenCalled();
  });
});

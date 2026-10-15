import {act, create} from 'react-test-renderer';
import {MemoryRouter, useNavigate} from 'react-router-dom';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
const state = vi.hoisted(() => ({request: vi.fn(), t: (key: string) => key}));
vi.mock('../../src/api/client', () => ({adminApiClient: {request: state.request}}));
vi.mock('../../src/i18n/I18nProvider', () => ({useTranslation: () => ({t: state.t, dir: 'ltr', language: 'en'})}));
import {FinanceAdminPage} from '../../src/pages/FinanceAdminPage';

let tree: ReturnType<typeof create>;
let navigate: ReturnType<typeof useNavigate>;
function Navigation() {navigate = useNavigate(); return null;}
const page = (reference: string) => ({data: [{id: reference, publicId: reference, ownerReferenceId: 'owner',
  type: 'ASSET', currencyCode: 'USD', scale: 2, active: true, systemManaged: true}], total: 41, page: 2, totalPages: 3});
const text = () => JSON.stringify(tree.toJSON());
const button = (key: string) => tree.root.findAllByType('button').find(node => node.children.includes(key))!;
async function mount() {
  await act(async () => {tree = create(<MemoryRouter initialEntries={['/finance?tab=accounts&page=2&active=false']}>
    <Navigation /><FinanceAdminPage />
  </MemoryRouter>);});
}
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('window', {setTimeout, clearTimeout});
  state.request.mockReset().mockResolvedValue(page('ACCOUNT-1'));
});
afterEach(async () => {if (tree) await act(async () => tree.unmount()); vi.unstubAllGlobals();});
describe('B13 financial account operator read', () => {
  it('loads only bounded account reads and resets pagination for a changed filter', async () => {
    await mount();
    expect(text()).toContain('ACCOUNT-1');
    expect(text()).toContain('finance_account_system');
    expect(state.request.mock.calls[0][0]).toContain('page=2');
    expect(state.request.mock.calls[0][0]).toContain('active=false');
    expect(state.request.mock.calls.every(([path]) => path.startsWith('/admin/finance/accounts?'))).toBe(true);
    await act(async () => tree.root.findByProps({'aria-label': 'finance_account_type'}).props.onChange({target: {value: 'LIABILITY'}}));
    const last = state.request.mock.calls.at(-1)![0];
    expect(last).toContain('page=1'); expect(last).toContain('type=LIABILITY');
    expect(state.request.mock.calls.some(([, options]) => options?.method)).toBe(false);
    expect(tree.root.findAllByType('a')).toHaveLength(0);
  });
  it('uses the header refresh and clears stale accounts on failure', async () => {
    await mount();
    state.request.mockRejectedValue(new Error('FINANCE_READ_FAILED'));
    await act(async () => button('finance_refresh').props.onClick());
    expect(text()).not.toContain('ACCOUNT-1'); expect(text()).toContain('FINANCE_READ_FAILED');
  });
  it('ignores a late response after navigating to a different account filter', async () => {
    let resolve!: (value: unknown) => void;
    state.request.mockImplementationOnce(() => new Promise(done => {resolve = done;}));
    await mount();
    state.request.mockResolvedValue(page('ACCOUNT-NEW'));
    await act(async () => navigate('/finance?tab=accounts&ownerReferenceId=new-owner'));
    await act(async () => resolve(page('ACCOUNT-OLD')));
    expect(text()).toContain('ACCOUNT-NEW'); expect(text()).not.toContain('ACCOUNT-OLD');
  });
});

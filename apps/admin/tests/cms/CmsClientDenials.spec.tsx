import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
const state=vi.hoisted(()=>({fetcher:vi.fn(),dispatch:vi.fn()}));
vi.mock('@manaratak/shared', async original=>({
  ...await original<typeof import('@manaratak/shared')>(),
  CsrfClientManager:{getInstance:()=>({fetchWithCsrf:state.fetcher,clearToken:vi.fn()})},
}));
import { adminApiClient, abortAllPendingAdminRequests, setAdminAuthStatus } from '../../src/api/client';
beforeEach(()=>{
  abortAllPendingAdminRequests();setAdminAuthStatus('AUTHORIZED');state.fetcher.mockReset();state.dispatch.mockReset();
  vi.stubGlobal('window',{dispatchEvent:state.dispatch});
});
afterEach(()=>vi.unstubAllGlobals());
describe('CMS denied requests preserve mounted drafts',()=>{
  it('rejects self approval without broadcasting a permission-loss reload',async()=>{
    state.fetcher.mockResolvedValue(new Response(JSON.stringify({error:'CMS_MAKER_CHECKER_VIOLATION'}),{status:403}));
    await expect(adminApiClient.request('/admin/cms/content/id/approve',{method:'POST',body:'{}'})).rejects.toThrow('CMS_MAKER_CHECKER_VIOLATION');
    expect(state.dispatch).not.toHaveBeenCalled();expect(state.fetcher).toHaveBeenCalledTimes(1);
  });
  it('still rejects expired MFA and requests step-up without remounting the editor',async()=>{
    state.fetcher.mockResolvedValue(new Response(JSON.stringify({code:'MFA_STEP_UP_REQUIRED'}),{status:403}));
    await expect(adminApiClient.request('/admin/cms/content/id/localized',{method:'PUT',body:'{}'})).rejects.toThrow('[403]');
    expect(state.dispatch.mock.calls.map(([event])=>event.type)).toEqual(['manaratak-admin-mfa-required']);
  });
  it('still rechecks permissions when the CMS capability is denied',async()=>{
    state.fetcher.mockResolvedValue(new Response(JSON.stringify({error:'CMS_PERMISSION_DENIED'}),{status:403}));
    await expect(adminApiClient.request('/admin/cms/content/id/localized',{method:'PUT',body:'{}'})).rejects.toThrow('CMS_PERMISSION_DENIED');
    expect(state.dispatch.mock.calls.map(([event])=>event.type)).toEqual(['manaratak-admin-permission-changed']);
  });
});

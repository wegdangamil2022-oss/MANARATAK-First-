import React from 'react';
import {act,create} from 'react-test-renderer';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({request:vi.fn(),permissions:['admin:scholarships:manage']}));
vi.mock('../../src/api/client',()=>({adminApiClient:{request:state.request}}));
vi.mock('../../src/i18n/I18nProvider',()=>({useTranslation:()=>({language:'en',dir:'ltr',t:(key:string)=>key})}));
vi.mock('../../src/security/AdminAuthorizationContext',()=>({useAdminAuthorization:()=>({permissions:state.permissions,hasPermission:(p:string)=>state.permissions.includes(p)})}));
import {AdminDashboardPage} from '../../src/pages/AdminDashboardPage';
let tree:ReturnType<typeof create>;
const view=()=> <MemoryRouter><AdminDashboardPage/></MemoryRouter>;
async function mount(){await act(async()=>{tree=create(view());});}
beforeEach(()=>{(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;state.permissions=['admin:scholarships:manage'];vi.stubGlobal('window',{setInterval,clearInterval,addEventListener:vi.fn(),removeEventListener:vi.fn()});vi.stubGlobal('document',{visibilityState:'visible',addEventListener:vi.fn(),removeEventListener:vi.fn()});state.request.mockReset().mockResolvedValue({total:2741,imported:0,missingFields:0,needsVerification:0,needsTranslation:0});});
afterEach(async()=>{if(tree)await act(async()=>tree.unmount());vi.unstubAllGlobals();});
describe('Dashboard owner permissions and last-good evidence',()=>{
 it('reads only visible headlines and attention evidence, with no hidden publication breakdowns', async()=>{
 await mount();
 expect(state.request.mock.calls.some(([path])=>path.includes('status='))).toBe(false);
 expect(state.request.mock.calls.length).toBe(2);
 expect(tree.root.findAllByType('details')).toHaveLength(0);
 expect(tree.root.findAllByType('a').some(link=>link.props.href==='/scholarships')).toBe(true);
 expect(state.request.mock.calls.some(([path])=>path.includes('/identities'))).toBe(false);
 });
 it('removes counters and owner links when the owner grant is revoked',async()=>{await mount();expect(JSON.stringify(tree.toJSON())).toContain('2,741');
 expect(tree.root.findAllByProps({'aria-labelledby':'dashboard-shortcuts'})).toHaveLength(0);
 expect(tree.root.findAllByType('a').map(link=>link.props.href)).toEqual(['/scholarships']);
 state.permissions=[];state.request.mockClear();await act(async()=>tree.update(view()));expect(JSON.stringify(tree.toJSON())).not.toContain('2,741');expect(JSON.stringify(tree.toJSON())).toContain('Restricted by permissions');expect(state.request).not.toHaveBeenCalled();
 expect(tree.root.findAllByType('a')).toHaveLength(0);
 });
 it('preserves last-good counters explicitly stale after an owner failure',async()=>{await mount();state.request.mockRejectedValue(new Error('[503] unavailable'));const refresh=tree.root.findAllByType('button').find(n=>n.children.includes('Refresh data'))!;await act(async()=>refresh.props.onClick());expect(JSON.stringify(tree.toJSON())).toContain('2,741');expect(JSON.stringify(tree.toJSON())).toContain('Stale — recheck');expect(state.request.mock.calls.some(([,opts])=>opts?.method)).toBe(false);});
});

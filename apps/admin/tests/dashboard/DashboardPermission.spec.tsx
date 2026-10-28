import React from 'react';
import {act,create} from 'react-test-renderer';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({request:vi.fn(),permissions:['admin:scholarships:manage']}));
vi.mock('../../src/api/client',()=>({adminApiClient:{request:state.request}}));
vi.mock('../../src/i18n/I18nProvider',()=>({useTranslation:()=>({language:'en',dir:'ltr',t:(key:string)=>key})}));
vi.mock('../../src/security/AdminAuthorizationContext',()=>({useAdminAuthorization:()=>({permissions:state.permissions,hasPermission:(p:string)=>state.permissions.includes(p)})}));
import {AdminDashboardPage} from '../../src/pages/AdminDashboardPage';
import {dashboardPeriod} from '@manaratak/application';
let tree:ReturnType<typeof create>;
const view=()=> <MemoryRouter><AdminDashboardPage/></MemoryRouter>;
async function mount(){await act(async()=>{tree=create(view());});}
beforeEach(()=>{(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;state.permissions=['admin:scholarships:manage'];vi.stubGlobal('window',{setInterval,clearInterval,addEventListener:vi.fn(),removeEventListener:vi.fn()});vi.stubGlobal('document',{visibilityState:'visible',addEventListener:vi.fn(),removeEventListener:vi.fn()});state.request.mockReset().mockResolvedValue({total:2741,imported:0,missingFields:0,needsVerification:0,needsTranslation:0});});
afterEach(async()=>{if(tree)await act(async()=>tree.unmount());vi.useRealTimers();vi.unstubAllGlobals();});
describe('Dashboard owner permissions and last-good evidence',()=>{
 it('expires executive-only evidence without polling, reports its successful read and renews on focus',async()=>{
   vi.useFakeTimers();Object.assign(window,{setInterval,clearInterval});
   state.permissions=['admin:dashboard:users:view'];
   state.request.mockImplementation(()=>Promise.resolve({period:dashboardPeriod(30),checkedAt:new Date().toISOString(),
     registeredUsers:3,registeredStudents:2,newRegistrations:0,previousRegistrations:0,growthPercent:null,growthState:'no_baseline',
     registrations:[],definition:'VERIFIED_HUMAN_ACCOUNTS_CURRENT_NON_DELETED_ACTIVE_OR_SUSPENDED_CREATION_COHORTS'}));
   await mount();
   expect(JSON.stringify(tree.toJSON())).toContain('Latest successful read');
   expect(JSON.stringify(tree.toJSON())).not.toContain('Stale — refresh required');
   await act(async()=>vi.advanceTimersByTime(65000));
   expect(state.request).toHaveBeenCalledTimes(1);
   expect(JSON.stringify(tree.toJSON())).toContain('Stale — refresh required');
   const focus=vi.mocked(window.addEventListener).mock.calls.find(([name])=>name==='focus')![1] as ()=>void;
   await act(async()=>focus());
   expect(state.request).toHaveBeenCalledTimes(2);
   expect(JSON.stringify(tree.toJSON())).not.toContain('Stale — refresh required');
 });
 it('keeps the service-request attention link for request readers without requiring catalog management',async()=>{
   state.permissions=['admin:platform:manage','admin:dashboard:applications:view','admin:services:requests:view'];
   state.request.mockImplementation((url:string)=>url.startsWith('/admin/dashboard/applications')?Promise.resolve({
     period:dashboardPeriod(30),checkedAt:new Date().toISOString(),status:'available',measurementStartedAt:new Date().toISOString(),coverageFrom:new Date().toISOString(),
     managedServiceRequests:1,processing:1,needsInformation:0,attention:1,managedUniversitySubmissions:0,officialAccepted:0,officialRejected:0,
     directSelfReportedApplications:0,definition:'SERVICE_RECEIPT_IS_NOT_UNIVERSITY_SUBMISSION'}):Promise.reject(new Error('[403]')));
   await mount();
   expect(tree.root.findAllByType('a').some(link=>link.props.href==='/services?tab=requests')).toBe(true);
   state.permissions=['admin:platform:manage','admin:dashboard:applications:view'];
   await act(async()=>tree.update(view()));
   expect(tree.root.findAllByType('a').some(link=>link.props.href==='/services?tab=requests')).toBe(false);
 });
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
 it('expires displayed evidence without polling and refreshes on focus with complete lifecycle cleanup', async()=>{
   vi.useFakeTimers();
   Object.assign(window,{setInterval,clearInterval});
   await mount();
   const calls=state.request.mock.calls.length;
   await act(async()=>vi.advanceTimersByTime(305001));
   expect(JSON.stringify(tree.toJSON())).toContain('Stale — recheck');
   expect(state.request).toHaveBeenCalledTimes(calls);
   const focus=vi.mocked(window.addEventListener).mock.calls.find(([name])=>name==='focus')![1] as ()=>void;
   await act(async()=>focus());
   expect(state.request.mock.calls.length).toBeGreaterThan(calls);
   expect(JSON.stringify(tree.toJSON())).not.toContain('Stale — recheck');
   await act(async()=>tree.unmount());
   expect(window.removeEventListener).toHaveBeenCalledWith('focus',focus);
   expect(document.removeEventListener).toHaveBeenCalledWith('visibilitychange',focus);
   expect(vi.getTimerCount()).toBe(0);
 });
});

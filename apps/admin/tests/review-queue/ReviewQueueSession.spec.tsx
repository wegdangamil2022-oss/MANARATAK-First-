// Updated acceptance tests follow the server-wide section 02 contract.
import React from 'react';
import {act,create} from 'react-test-renderer';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import type {ReviewPage,ReviewRecord} from '@manaratak/shared';
const state=vi.hoisted(()=>({request:vi.fn(),permissions:['admin:platform:manage','admin:scholarships:manage','admin:audit:manage']}));
vi.mock('../../src/api/client',()=>({adminApiClient:{request:state.request},createAdminIdempotencyKey:()=>crypto.randomUUID()}));
vi.mock('../../src/i18n/I18nProvider',()=>({useTranslation:()=>({language:'en',dir:'ltr'})}));
vi.mock('../../src/security/AdminAuthorizationContext',()=>({useAdminAuthorization:()=>({permissions:state.permissions,hasPermission:(permission:string)=>state.permissions.includes(permission)})}));
import {AdminReviewQueuePage} from '../../src/pages/AdminReviewQueuePage';
import {parseWorkspacePage} from '../../src/features/review-queue/WorkspaceData';
let tree:ReturnType<typeof create>;
const record=(id='item1'):ReviewRecord=>({key:'scholarships:'+id+':',ownerId:id,domain:'scholarships',profileId:null,title:'LAST-GOOD-OWNER '+id,titleEn:null,reference:id,status:'READY_TO_REVIEW',reasons:['workflow_review'],priority:'medium',priorityBasis:'suggested',ownerRevision:'a'.repeat(32),modifiedAt:'2026-10-24T12:00:00Z',sourceKind:'unknown',locale:null,sourceUrl:'https://example.invalid',verificationState:'UNKNOWN',importRecordId:null,batchId:null,sourceRowNumber:null,href:'/scholarships/'+id,detail:true,auditType:'SCHOLARSHIP',caseId:'case1',version:1,cycle:1,assigneeId:null,teamId:null,assigneeLabel:null,workState:'OPEN',enteredAt:'2026-10-24T12:00:00Z',dueAt:null,policyId:null,sla:'unknown',synchronizedAt:'2026-10-24T12:00:00Z'});
const page=(records=[record()]):ReviewPage=>({records,total:1,counters:{open:1,mine:0,unassigned:1,urgent:0,overdue:null,withoutSla:1},sources:[],snapshot:'b'.repeat(64),nextCursor:null,coverage:'complete',canCoordinate:true,readAt:'2026-10-24T12:00:00Z'});
const button=(label:string)=>tree.root.findAllByType('button').find(node=>node.children.includes(label))!;
const queries=()=>state.request.mock.calls.filter(([path])=>path.endsWith('/query'));
async function mount(){await act(async()=>{tree=create(<MemoryRouter><AdminReviewQueuePage/></MemoryRouter>);});}
beforeEach(()=>{
  (globalThis as {IS_REACT_ACT_ENVIRONMENT?:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
  vi.stubGlobal('window',{addEventListener:vi.fn(),removeEventListener:vi.fn()});
  vi.stubGlobal('document',{activeElement:{focus:vi.fn()},body:{style:{overflow:''}},addEventListener:vi.fn(),removeEventListener:vi.fn()});
  state.permissions=['admin:platform:manage','admin:scholarships:manage','admin:audit:manage'];
  state.request.mockReset().mockImplementation(async(path:string)=>{
    if(path.endsWith('/query'))return page();
    if(path.startsWith('/admin/audit/'))return {items:[{id:'a1',action:'LAST-GOOD-AUDIT',timestamp:'2026-10-24T12:00:00Z',target:{targetId:'item1',targetType:'SCHOLARSHIP'}}],hasMore:true,nextCursor:'audit-next'};
    return [];
  });
});
afterEach(async()=>{if(tree)await act(async()=>tree.unmount());vi.useRealTimers();vi.unstubAllGlobals();});
describe('Server-wide review queue interaction and session safety',()=>{
  it('shows three explicit tabs and five metrics with no essential accordion',async()=>{await mount();expect(tree.root.findAll(node=>node.props.role==='tab')).toHaveLength(3);expect(tree.root.findByProps({className:'rw-metrics'}).findAllByType('button')).toHaveLength(5);expect(tree.root.findAllByType('details')).toHaveLength(0);expect(JSON.stringify(tree.toJSON())).toContain('LAST-GOOD-OWNER');});
  it('sends filters to a single server query instead of requesting multiple overlapping source pages',async()=>{await mount();state.request.mockClear();const domain=tree.root.findAllByType('select').find(select=>select.findAllByType('option').some(option=>option.props.value==='scholarships'))!;await act(async()=>domain.props.onChange({target:{value:'scholarships'}}));expect(queries()).toHaveLength(1);expect(JSON.parse(queries()[0][1].body)).toMatchObject({domain:'scholarships'});});
  it('debounces private free text into POST body and does not locally filter the existing sample',async()=>{await mount();state.request.mockClear();vi.useFakeTimers();await act(async()=>tree.root.findByProps({id:'rw-search'}).props.onChange({target:{value:'Record beyond 500'}}));expect(queries()).toHaveLength(0);await act(async()=>{await vi.advanceTimersByTimeAsync(310);});expect(queries()).toHaveLength(1);expect(JSON.parse(queries()[0][1].body).search).toBe('Record beyond 500');expect(queries()[0][0]).not.toContain('Record');});
  it('passes the opaque server cursor and restarts at the first page after a filter changes',async()=>{state.request.mockImplementation(async(path:string,options:{body?:string})=>{if(!path.endsWith('/query'))return[];const input=JSON.parse(options.body!);return {...page([record(input.cursor?'second':'first')]),nextCursor:input.cursor?null:'server-cursor'};});await mount();await act(async()=>button('Next').props.onClick());expect(JSON.parse(queries().at(-1)![1].body)).toMatchObject({cursor:'server-cursor',snapshot:'b'.repeat(64)});expect(JSON.stringify(tree.toJSON())).toContain('OWNER second');await act(async()=>button('High / critical').props.onClick());expect(JSON.parse(queries().at(-1)![1].body)).not.toHaveProperty('cursor');});
  it('revalidates after returning from the owner instead of trusting an old sample',async()=>{await mount();state.request.mockClear();const focus=vi.mocked(window.addEventListener).mock.calls.find(([event])=>event==='focus')![1] as ()=>void;await act(async()=>focus());expect(queries()).toHaveLength(1);});
  it('clears last-good owner rows when refresh loses the session',async()=>{await mount();expect(JSON.stringify(tree.toJSON())).toContain('LAST-GOOD-OWNER');state.request.mockRejectedValue(new Error('[401] expired'));await act(async()=>button('Refresh and recheck').props.onClick());expect(JSON.stringify(tree.toJSON())).not.toContain('LAST-GOOD-OWNER');});
  it('clears last-good audit evidence when continuation is unauthorized',async()=>{await mount();await act(async()=>button('Preview').props.onClick());expect(JSON.stringify(tree.toJSON())).toContain('LAST-GOOD-AUDIT');state.request.mockRejectedValue(new Error('[403] denied'));await act(async()=>button('Earlier events').props.onClick());expect(JSON.stringify(tree.toJSON())).not.toContain('LAST-GOOD-AUDIT');expect(JSON.stringify(tree.toJSON())).toContain('Permission restricted');});
  it('distinguishes unknown totals from real zero and rejects duplicates or unsafe links',()=>{const partial={...page([]),coverage:'partial' as const,total:null,counters:{open:null,mine:null,unassigned:null,urgent:null,overdue:null,withoutSla:null}};expect(parseWorkspacePage(partial).total).toBeNull();expect(parseWorkspacePage({...page([]),total:0}).total).toBe(0);expect(()=>parseWorkspacePage(page([record(),record()]))).toThrow('REVIEW_DUPLICATE_INVALID');expect(()=>parseWorkspacePage(page([{...record(),href:'javascript:alert(1)'}]))).toThrow('REVIEW_RECORD_INVALID');expect(parseWorkspacePage(page([{...record(),href:'/imports/scholarships?reviewBatch=abc'}])).records).toHaveLength(1);});
});

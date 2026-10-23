import React from 'react';
import {act,create} from 'react-test-renderer';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({request:vi.fn(),permissions:['admin:scholarships:manage','admin:audit:manage'],hasPermission:(permission:string)=>['admin:scholarships:manage','admin:audit:manage'].includes(permission)}));
vi.mock('../../src/api/client',()=>({adminApiClient:{request:state.request}}));
vi.mock('../../src/i18n/I18nProvider',()=>({useTranslation:()=>({language:'en',dir:'ltr'})}));
vi.mock('../../src/security/AdminAuthorizationContext',()=>({useAdminAuthorization:()=>({permissions:state.permissions,hasPermission:state.hasPermission})}));
import {AdminReviewQueuePage} from '../../src/pages/AdminReviewQueuePage';
let tree:ReturnType<typeof create>;
function button(label:string){return tree.root.findAllByType('button').find(n=>n.children.includes(label))!;}
async function mount(){await act(async()=>{tree=create(<MemoryRouter><AdminReviewQueuePage/></MemoryRouter>);});}
beforeEach(()=>{
 (globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
 vi.stubGlobal('window',{setInterval,clearInterval,addEventListener:vi.fn(),removeEventListener:vi.fn()});
 vi.stubGlobal('document',{visibilityState:'visible',addEventListener:vi.fn(),removeEventListener:vi.fn()});
 state.request.mockReset().mockImplementation(async(path:string)=>{
 const query=new URL(path,'https://local').searchParams;
 if(path.startsWith('/admin/audit/'))return{items:[{id:'audit1',action:'LAST-GOOD-AUDIT',timestamp:'2026-10-14T00:00:00Z',target:{targetId:query.get('targetId'),targetType:query.get('targetType')}}],hasMore:true,nextCursor:'next'};
 return{data:[{id:'item1',title:'LAST-GOOD-OWNER',status:'READY_TO_REVIEW'}],total:1,page:Number(query.get('page')),pageSize:Number(query.get('pageSize'))};
 });
});
afterEach(async()=>{if(tree)await act(async()=>tree.unmount());vi.unstubAllGlobals();});
describe('Review queue session loss clears old evidence',()=>{
 it('reads source-verification evidence when its quick view is selected',async()=>{
 await mount();state.request.mockClear();
 await act(async()=>button('Source verification').props.onClick());
 expect(state.request).toHaveBeenCalledTimes(2);
 expect(state.request.mock.calls.every(([path])=>path.includes('verificationStatus='))).toBe(true);
 expect(state.request.mock.calls.some(([path])=>path.includes('verificationStatus=PENDING'))).toBe(true);
 expect(state.request.mock.calls.some(([path])=>path.includes('verificationStatus=FAILED'))).toBe(true);
 });
 it('shows ten records per page and resets pagination after a local search without another API read',async()=>{
 state.request.mockImplementation(async(path:string)=>{const query=new URL(path,'https://local').searchParams;return{data:Array.from({length:23},(_,index)=>({id:`row-${String(index).padStart(2,'0')}`,title:`Record ${index}`,status:'READY_TO_REVIEW'})),total:23,page:Number(query.get('page')),pageSize:Number(query.get('pageSize'))};});
 await mount();state.request.mockClear();
 const rows=()=>tree.root.findByProps({'aria-labelledby':'review-pending-work'}).findByType('tbody').findAllByType('tr');
 expect(rows()).toHaveLength(10);
 await act(async()=>button('Next').props.onClick());expect(rows()).toHaveLength(10);
 await act(async()=>button('Next').props.onClick());expect(rows()).toHaveLength(3);
 await act(async()=>button('Previous').props.onClick());expect(rows()).toHaveLength(10);
 await act(async()=>tree.root.findByProps({type:'search'}).props.onChange({target:{value:'Record 22'}}));
 expect(rows()).toHaveLength(1);expect(JSON.stringify(rows()[0].findAllByType('bdi').map(node=>node.children))).toContain('Record 22');
 expect(state.request).not.toHaveBeenCalled();
 });
 it('does not reread a fresh sample on window focus',async()=>{
 await mount();
 expect(state.request).toHaveBeenCalledTimes(1);
 const focus=(window.addEventListener as any).mock.calls.find(([event]:[string])=>event==='focus')[1];
 state.request.mockClear();
 await act(async()=>focus());
 expect(state.request).not.toHaveBeenCalled();
 });
 it('reads the selected domain sources instead of leaving its other review reasons unread',async()=>{
 await mount();state.request.mockClear();
 const domain=tree.root.findAllByType('select').find(select=>select.findAllByType('option').some(option=>option.props.value==='scholarships'))!;
 await act(async()=>domain.props.onChange({target:{value:'scholarships'}}));
 expect(state.request.mock.calls.length).toBe(8);
 expect(state.request.mock.calls.every(([path])=>path.startsWith('/admin/scholarships?'))).toBe(true);
 expect(state.request.mock.calls.some(([path])=>path.includes('status=READY_TO_PUBLISH'))).toBe(true);
 });
 it('searches only loaded evidence and clears search without re-requesting sources',async()=>{
 await mount();
 const pending=()=>tree.root.findByProps({'aria-labelledby':'review-pending-work'});
 expect(pending().findAllByType('bdi').some(node=>node.children.includes('LAST-GOOD-OWNER'))).toBe(true);
 state.request.mockClear();
 const search=tree.root.findByProps({type:'search'});
 await act(async()=>search.props.onChange({target:{value:'no matching loaded record'}}));
 expect(pending().findByType('tbody').findAllByType('tr')).toHaveLength(0);
 expect(state.request).not.toHaveBeenCalled();
 await act(async()=>button('Clear filters').props.onClick());
 expect(tree.root.findByProps({type:'search'}).props.value).toBe('');
 expect(pending().findByType('tbody').findAllByType('tr')).toHaveLength(1);
 expect(state.request).not.toHaveBeenCalled();
 });
 it('does not keep last-good owner rows after a 401 refresh',async()=>{
 await mount();expect(JSON.stringify(tree.toJSON())).toContain('LAST-GOOD-OWNER');
 state.request.mockRejectedValue(new Error('[401] expired'));
 await act(async()=>button('Refresh and recheck').props.onClick());
 expect(JSON.stringify(tree.toJSON())).not.toContain('LAST-GOOD-OWNER');
 expect(JSON.stringify(tree.toJSON())).toContain('SESSION_REQUIRED');
 });
 it('clears last-good audit evidence after a 401 continuation',async()=>{
 await mount();await act(async()=>button('Preview evidence').props.onClick({currentTarget:{focus:vi.fn()}}));
 expect(JSON.stringify(tree.toJSON())).toContain('LAST-GOOD-AUDIT');
 state.request.mockRejectedValue(new Error('[401] expired'));
 const next=tree.root.findAllByType('button').find(n=>typeof n.props.onClick==='function'&&n.children.some(c=>typeof c==='string'&&c.includes('audit')))!;
 await act(async()=>next.props.onClick());
 expect(JSON.stringify(tree.toJSON())).not.toContain('LAST-GOOD-AUDIT');
 expect(JSON.stringify(tree.toJSON())).toContain('Forbidden');
 });
});

import React from 'react';
import { act, create } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state=vi.hoisted(()=>({request:vi.fn(),allowed:true}));
vi.mock('../../src/api/client',()=>({adminApiClient:{request:state.request}}));
vi.mock('../../src/security/AdminAuthorizationContext',()=>({useAdminAuthorization:()=>({hasPermission:()=>state.allowed})}));
vi.mock('../../src/components/MajorTranslationPublicationPanel',()=>({MajorTranslationPublicationPanel:()=>null}));
vi.mock('../../src/components/CanonicalPicker',()=>({CanonicalPicker:()=>null}));
import { MajorGovernanceWorkspace } from '../../src/components/MajorGovernanceWorkspace';
let tree:ReturnType<typeof create>;
const onSaved=vi.fn();
const owner=(revision=1,status='READY_TO_PUBLISH')=>({id:'major',revision,profiles:[{id:'profile',level:'BACHELOR',status}]});
const text=(value:unknown):string=>typeof value==='string'?value:Array.isArray(value)?value.map(text).join(''):value&&typeof value==='object'&&'children' in value?text(value.children):'';
const button=(name:string)=>tree.root.findAllByType('button').find(node=>text(node)===name)!;
async function mount(){await act(async()=>{tree=create(<MajorGovernanceWorkspace majorId="major" profileId="profile" mode="publication" onSaved={onSaved}/>);});await act(async()=>tree.root.findAllByType('textarea')[0].props.onChange({target:{value:'Reviewed sources'}}));}
beforeEach(()=>{
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});vi.stubGlobal('window',{confirm:()=>true});state.allowed=true;onSaved.mockReset();
  state.request.mockReset().mockImplementation(async(path:string)=>path.endsWith('/publication-readiness')?{ready:true,blockingIssues:[]}:path==='/admin/majors/major'?owner():{data:[]});
});
afterEach(async()=>{if(tree)await act(async()=>tree.unmount());vi.unstubAllGlobals();});
describe('Major profile publication acceptance',()=>{
  it('requires an independent owner revision and exact degree status before confirming publication',async()=>{
    await mount();let applied=false;
    state.request.mockImplementation(async(path:string,options?:{method?:string})=>{if(options?.method){applied=true;return {success:true};}return path.endsWith('/publication-readiness')?{ready:true,blockingIssues:[]}:path==='/admin/majors/major'?owner(applied?2:1,applied?'PUBLISHED':'READY_TO_PUBLISH'):{data:[]};});
    await act(async()=>button('نشر النسخة المعتمدة').props.onClick());
    expect(onSaved).toHaveBeenCalledOnce();
    expect(text(tree.toJSON())).toContain('تم حفظ القرار والتحقق من الحالة المحفوظة.');
    expect(state.request.mock.calls.find(([,options])=>options?.method)?.[1].headers).toEqual({'If-Match':'1'});
  });
  it.each(['stale','unavailable'])('does not announce success or allow repeated publication when readback is %s',async(mode)=>{
    await mount();
    state.request.mockImplementation(async(path:string,options?:{method?:string})=>{if(options?.method)return {success:true};if(mode==='unavailable')throw Error('Read unavailable');return owner();});
    await act(async()=>button('نشر النسخة المعتمدة').props.onClick());
    expect(onSaved).not.toHaveBeenCalled();
    expect(button('نشر النسخة المعتمدة').props.disabled).toBe(true);
    expect(tree.root.findAllByProps({role:'alert'})).toHaveLength(1);
    expect(text(tree.toJSON())).not.toContain('تم حفظ القرار والتحقق');
  });
  it('discards a late command after its workspace has closed',async()=>{
    await mount();let release!:(value:unknown)=>void;const pending=new Promise(resolve=>{release=resolve;});
    state.request.mockImplementation(()=>pending);
    await act(async()=>{void button('نشر النسخة المعتمدة').props.onClick();});
    await act(async()=>tree.unmount());
    const calls=state.request.mock.calls.length;
    await act(async()=>release({success:true}));
    expect(state.request.mock.calls).toHaveLength(calls);expect(onSaved).not.toHaveBeenCalled();
  });
});

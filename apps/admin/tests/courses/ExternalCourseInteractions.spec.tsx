import React from 'react';
import { act, create } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state=vi.hoisted(()=>({request:vi.fn()}));
vi.mock('../../src/api/client',()=>({adminApiClient:{request:state.request}}));
vi.mock('../../src/i18n/I18nProvider',()=>({useTranslation:()=>({language:'en'})}));
vi.mock('../../src/security/AdminAuthorizationContext',()=>({useAdminAuthorization:()=>({hasPermission:()=>true})}));
vi.mock('../../src/features/courses/CourseDialog',()=>({CourseDialog:({children}:{children:React.ReactNode})=><div>{children}</div>}));
vi.mock('../../src/features/courses/CourseLookup',()=>({CourseLookup:()=>null}));
vi.mock('../../src/features/courses/ExternalCourseRelationships',()=>({ExternalCourseRelationships:()=>null}));
import { ExternalCourseDrawer } from '../../src/features/courses/ExternalCourseDrawer';
let tree:ReturnType<typeof create>;
const onSaved=vi.fn();
let revision=1,status='READY_TO_PUBLISH';
const owner=()=>({id:'c1',displayName:'External course',originType:'EXTERNAL_LINKED_COURSE',version:revision,status,optionalFields:{}});
const text=(value:unknown):string=>typeof value==='string'?value:Array.isArray(value)?value.map(text).join(''):value&&typeof value==='object'&&'children' in value?text(value.children):'';
const button=(name:string)=>tree.root.findAllByType('button').find(node=>text(node)===name)!;
async function read(path:string){return path.endsWith('/readiness')?{version:1,eligible:true,blockers:[]}:path.includes('/history')?{data:[],versions:[],page:1,totalPages:0}:owner();}
async function mount(){await act(async()=>{tree=create(<MemoryRouter><ExternalCourseDrawer id="c1" returnTo="/courses" onSaved={onSaved} onClose={()=>{}}/></MemoryRouter>);});await act(async()=>tree.root.findAllByType('textarea')[0].props.onChange({target:{value:'Reviewed official source'}}));await act(async()=>button('Source and review operations').props.onClick());await act(async()=>button('Check publication readiness').props.onClick());}
beforeEach(()=>{Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});vi.stubGlobal('window',{confirm:()=>true});revision=1;status='READY_TO_PUBLISH';onSaved.mockReset();state.request.mockReset().mockImplementation(read);});
afterEach(async()=>{if(tree)await act(async()=>tree.unmount());vi.unstubAllGlobals();});
describe('External course command readback',()=>{
  it('verifies the exact persisted version and status before notifying the catalog',async()=>{
    await mount();state.request.mockImplementation(async(path:string,options?:{method?:string})=>{if(options?.method){revision=2;status='PUBLISHED';return {success:true};}return read(path);});
    await act(async()=>button('Publish course').props.onClick());expect(onSaved).toHaveBeenCalledWith('c1');expect(text(tree.toJSON())).toContain('Operation completed and recorded');
  });
  it('blocks another command when a successful response has no matching publication readback',async()=>{
    await mount();state.request.mockImplementation(async(path:string,options?:{method?:string})=>options?.method?{success:true}:read(path));
    await act(async()=>button('Publish course').props.onClick());await act(async()=>button('Publish course').props.onClick());
    expect(state.request.mock.calls.filter(([,options])=>options?.method)).toHaveLength(1);expect(onSaved).not.toHaveBeenCalled();expect(button('Reload saved record')).toBeDefined();
  });
});

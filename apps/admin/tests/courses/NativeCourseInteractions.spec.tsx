import React from 'react';
import { act, create } from 'react-test-renderer';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state=vi.hoisted(()=>({request:vi.fn()}));
vi.mock('../../src/api/client',()=>({adminApiClient:{request:state.request}}));
vi.mock('../../src/i18n/I18nProvider',()=>({useTranslation:()=>({language:'en'})}));
vi.mock('../../src/security/AdminAuthorizationContext',()=>({useAdminAuthorization:()=>({permissions:['*'],hasPermission:()=>true})}));
import { NativeCourseEditorPage } from '../../src/features/courses/NativeCourseEditorPage';
let tree:ReturnType<typeof create>,navigate:ReturnType<typeof useNavigate>;
function Probe(){navigate=useNavigate();return null;}
const text=(value:unknown):string=>typeof value==='string'?value:Array.isArray(value)?value.map(text).join(''):value&&typeof value==='object'&&'children' in value?text(value.children):'';
const button=(name:string)=>tree.root.findAllByType('button').find(node=>text(node)===name)!;
let revision=1,status='READY_TO_PUBLISH';
async function read(path:string){if(path.endsWith('/curriculum'))return {modules:[],lessons:[],assets:[],quizzes:[],questions:[],contentBlocks:[]};if(path.endsWith('/access'))return {manage:true,read:true,edit:true,review:true,publish:true,grade:true,learners:true};if(path.endsWith('/readiness'))return {ready:true,percentage:100,checks:[]};if(path.endsWith('/enrollment-policy'))return null;const id=path.split('/').at(-1);return {id,displayName:'Course '+id,version:revision,status,originType:'NATIVE_MANARATAK_COURSE',optionalFields:{}};}
async function mount(){await act(async()=>{tree=create(<MemoryRouter initialEntries={['/courses/c1/editor?tab=publication']}><Probe/><Routes><Route path="/courses/:id/editor" element={<NativeCourseEditorPage/>}/></Routes></MemoryRouter>);});await act(async()=>tree.root.findAllByType('input').find(node=>node.props.maxLength===2000)!.props.onChange({target:{value:'Reviewed course'}}));}
beforeEach(()=>{Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});vi.stubGlobal('window',{confirm:()=>true,addEventListener:vi.fn(),removeEventListener:vi.fn()});revision=1;status='READY_TO_PUBLISH';state.request.mockReset().mockImplementation(read);});
afterEach(async()=>{if(tree)await act(async()=>tree.unmount());vi.unstubAllGlobals();});
describe('Native course owner acceptance',()=>{
  it('verifies the new version and publication state before reporting success',async()=>{
    await mount();state.request.mockImplementation(async(path:string,options?:{method?:string})=>{if(options?.method){revision=2;status='PUBLISHED';return {success:true};}return read(path);});
    await act(async()=>button('Publish course').props.onClick());
    expect(text(tree.toJSON())).toContain('Changes saved in a new version.');
    expect(state.request.mock.calls.find(([,options])=>options?.method)?.[1].headers['If-Match']).toBe('1');
  });
  it('blocks further commands when accepted publication cannot be verified',async()=>{
    await mount();state.request.mockImplementation(async(path:string,options?:{method?:string})=>options?.method?{success:true}:read(path));
    await act(async()=>button('Publish course').props.onClick());
    expect(text(tree.toJSON())).toContain('Saved, but reloading failed.');
    expect(tree.root.findAllByType('button').some(node=>text(node)==='Publish course')).toBe(false);
  });
  it('does not read or overwrite another course when a late command finishes',async()=>{
    await mount();let release!:(value:unknown)=>void;const pending=new Promise(resolve=>{release=resolve;});state.request.mockImplementation(async(path:string,options?:{method?:string})=>options?.method?pending:read(path));
    await act(async()=>{void button('Publish course').props.onClick();});
    await act(async()=>navigate('/courses/c2/editor?tab=publication'));
    const calls=state.request.mock.calls.length;await act(async()=>release({success:true}));
    expect(state.request.mock.calls).toHaveLength(calls);expect(text(tree.toJSON())).toContain('Course c2');expect(text(tree.toJSON())).not.toContain('Changes saved in a new version.');
  });
});

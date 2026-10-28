import React from 'react';
import { act, create } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state=vi.hoisted(()=>({request:vi.fn()}));
vi.mock('../../src/api/client',()=>({adminApiClient:{request:state.request}}));
vi.mock('../../src/i18n/I18nProvider',()=>({useTranslation:()=>({language:'en'})}));
vi.mock('../../src/security/AdminAuthorizationContext',()=>({useAdminAuthorization:()=>({hasPermission:()=>true})}));
vi.mock('../../src/features/courses/CourseDialog',()=>({CourseDialog:({children}:{children:React.ReactNode})=><div>{children}</div>}));
import { CourseBulkPublicationPanel } from '../../src/features/courses/CourseBulkPublicationPanel';
let tree:ReturnType<typeof create>;
const onBatch=vi.fn(),onChanged=vi.fn();
const page=(id:string,index=1)=>({summary:{id,phase:'PREVIEWED',total:1,counts:{PENDING:0,ELIGIBLE:1,BLOCKED:0,SUCCESS:0,FAILED:0,NOT_EXECUTED:0},digest:'digest',createdAt:'2026-10-28T00:00:00Z'},data:[{id:'course-'+id,name:'Course from '+id,version:1,state:'ELIGIBLE',reasons:[]}],page:index,totalPages:2});
const view=(id:string)=><CourseBulkPublicationPanel id={id} onBatch={onBatch} onChanged={onChanged} onClose={()=>{}}/>;
const text=(value:unknown):string=>typeof value==='string'?value:Array.isArray(value)?value.map(text).join(''):value&&typeof value==='object'&&'children' in value?text(value.children):'';
const button=(name:string)=>tree.root.findAllByType('button').find(node=>text(node)===name)!;
beforeEach(()=>{Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});vi.stubGlobal('window',{confirm:()=>true});onBatch.mockReset();onChanged.mockReset();state.request.mockReset().mockImplementation(async(path:string)=>page(path.includes('/B')?'B':'A'));});
afterEach(async()=>{if(tree)await act(async()=>tree.unmount());vi.unstubAllGlobals();});
describe('Frozen course publication batch ownership',()=>{
  it('discards page results from the previous batch',async()=>{
    await act(async()=>{tree=create(view('A'));});let release!:(value:unknown)=>void;const pending=new Promise(resolve=>{release=resolve;});
    state.request.mockImplementation(async(path:string)=>path.includes('A?page=2')?pending:page('B'));
    await act(async()=>{void button('Next').props.onClick();});await act(async()=>tree.update(view('B')));await act(async()=>release(page('A',2)));
    expect(text(tree.toJSON())).toContain('Course from B');expect(text(tree.toJSON())).not.toContain('Course from A');
  });
  it('does not switch the current batch when an earlier confirmation returns late',async()=>{
    await act(async()=>{tree=create(view('A'));});await act(async()=>tree.root.findAllByType('textarea')[0].props.onChange({target:{value:'Reviewed frozen selection'}}));
    let release!:(value:unknown)=>void;const pending=new Promise(resolve=>{release=resolve;});state.request.mockImplementation(async(_path:string,options?:{method?:string})=>options?.method?pending:page('B'));
    await act(async()=>{void button('Confirm eligible publication').props.onClick();});await act(async()=>tree.update(view('B')));await act(async()=>release(page('A')));
    expect(onBatch).not.toHaveBeenCalled();expect(onChanged).not.toHaveBeenCalled();expect(text(tree.toJSON())).toContain('Course from B');
  });
});

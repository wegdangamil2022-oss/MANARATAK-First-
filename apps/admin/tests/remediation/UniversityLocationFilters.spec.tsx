import React from 'react';
import {act,create} from 'react-test-renderer';import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const api=vi.hoisted(()=>({picker:vi.fn()}));
vi.mock('../../src/api/catalogFilters',async original=>({...await original<typeof import('../../src/api/catalogFilters')>(),catalogFilterApi:api}));
vi.mock('../../src/i18n/I18nProvider',()=>({useTranslation:()=>({language:'ar'})}));
import {UniversityLocationFilters} from '../../src/components/UniversityLocationFilters';
let tree:ReturnType<typeof create>;
beforeEach(()=>{Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});vi.useFakeTimers();api.picker.mockReset().mockImplementation(async(_catalog,facet)=>({options:facet==='countryReferenceId'?[{id:'ye',label:'اليمن',lifecycle:'READ_FILTER_OPTION'}]:facet==='regionReferenceId'?[{id:'ibb',label:'Ibb',lifecycle:'READ_FILTER_OPTION'},{id:'capital',label:"Sana'a City (Capital Secretariat)",lifecycle:'READ_FILTER_OPTION'}]:[],nextCursor:null}));});
afterEach(async()=>{if(tree)await act(async()=>tree.unmount());vi.useRealTimers();});
it('uses canonical country and region identities directly and forwards the selected Ibb region',async()=>{
 const changed=vi.fn();await act(async()=>{tree=create(<UniversityLocationFilters countryId="ye" regionId="" cityId="" ar onChange={changed}/>);});await act(async()=>{await vi.advanceTimersByTimeAsync(250);});
 const region=tree.root.findAllByType('select')[2];expect(region.props.disabled).toBe(false);expect(region.findAllByType('option').map(row=>row.children.join(''))).toContain('Ibb');
 await act(async()=>region.props.onChange({target:{value:'ibb'}}));expect(changed).toHaveBeenCalledWith('regionReferenceId','ibb');
 await act(async()=>{tree.update(<UniversityLocationFilters countryId="ye" regionId="ibb" cityId="" ar onChange={changed}/>);});await act(async()=>{await vi.advanceTimersByTimeAsync(250);});
 expect(api.picker).toHaveBeenCalledWith('universities','cityReferenceId',expect.objectContaining({countryReferenceId:'ye',regionReferenceId:'ibb'}),true,'',1);
});
it('does not request regions or cities before a country is selected',async()=>{
 await act(async()=>{tree=create(<UniversityLocationFilters countryId="" regionId="" cityId="" ar onChange={vi.fn()}/>);});await act(async()=>{await vi.advanceTimersByTimeAsync(250);});
 expect(tree.root.findAllByType('select').slice(2).every(row=>row.props.disabled)).toBe(true);
 expect(api.picker.mock.calls.some(([,facet])=>['regionReferenceId','cityReferenceId'].includes(facet))).toBe(false);
});
it('reloads country choices in the selected continent and retains the other list constraints',async()=>{
 await act(async()=>{tree=create(<UniversityLocationFilters continent="Asia" countryId="" regionId="" cityId="" context={{status:'IMPORTED'}} ar onChange={vi.fn()}/>);});await act(async()=>{await vi.advanceTimersByTimeAsync(250);});
 expect(api.picker).toHaveBeenCalledWith('universities','countryReferenceId',expect.objectContaining({continent:'Asia',status:'IMPORTED'}),true,'',1);
 await act(async()=>{tree.update(<UniversityLocationFilters continent="Europe" countryId="" regionId="" cityId="" ar onChange={vi.fn()}/>);});await act(async()=>{await vi.advanceTimersByTimeAsync(250);});
 expect(api.picker).toHaveBeenLastCalledWith('universities','countryReferenceId',expect.objectContaining({continent:'Europe'}),true,'',1);
});

import React from 'react';
import {act,create} from 'react-test-renderer';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const api=vi.hoisted(()=>({filterCountries:vi.fn(),regions:vi.fn(),cities:vi.fn()}));
vi.mock('../../src/api/canonicalPickers',()=>({canonicalPickerApi:api,canonicalOptionIsSelectable:()=>true}));
vi.mock('../../src/i18n/I18nProvider',()=>({useTranslation:()=>({language:'ar'})}));
import {UniversityLocationFilters} from '../../src/components/UniversityLocationFilters';
let tree:ReturnType<typeof create>;
beforeEach(()=>{(globalThis as {IS_REACT_ACT_ENVIRONMENT?:boolean}).IS_REACT_ACT_ENVIRONMENT=true;vi.useFakeTimers();api.filterCountries.mockReset();api.regions.mockReset().mockResolvedValue([]);api.cities.mockReset().mockResolvedValue([]);});
afterEach(async()=>{if(tree)await act(async()=>tree.unmount());vi.useRealTimers();});
it('shows every country and resolves an exact selection beyond the former first page',async()=>{
  api.filterCountries.mockResolvedValue([...Array.from({length:194},(_,i)=>({id:'other-'+i,label:'دولة '+i,code:'ZZ',lifecycle:'ACTIVE'})),{id:'selected',label:'اليمن',code:'YE',lifecycle:'ACTIVE'}]);
  const changed=vi.fn();
  await act(async()=>{tree=create(<UniversityLocationFilters countryId="selected" regionId="region-kept" cityId="city-kept" ar onChange={changed}/>);});
  await act(async()=>{await vi.advanceTimersByTimeAsync(205);});
  expect(tree.root.findAllByType('select')[1].findAllByType('option')).toHaveLength(196);
  expect(api.regions).toHaveBeenCalledWith('YE','',1);
  expect(api.cities).toHaveBeenCalledWith('YE','region-kept','',1);
  expect(tree.root.findAllByType('select').map(node=>node.props.value)).toEqual(['','selected','region-kept','city-kept']);
  expect(changed).not.toHaveBeenCalled();
});
it('keeps dependent geography disabled until a country is selected and resolves its exact code',async()=>{
  api.filterCountries.mockResolvedValue([{id:'country-id',label:'Country',code:'YE',lifecycle:'ACTIVE'}]);
  const changed=vi.fn();
  await act(async()=>{tree=create(<UniversityLocationFilters countryId="" regionId="" cityId="" ar onChange={changed}/>);});
  await act(async()=>{await vi.advanceTimersByTimeAsync(205);});
  expect(tree.root.findAllByType('select').slice(2).every(node=>node.props.disabled)).toBe(true);
  await act(async()=>tree.root.findAllByType('select')[1].props.onChange({target:{value:'country-id'}}));
  expect(changed).toHaveBeenCalledWith('countryReferenceId','country-id');
  await act(async()=>{tree.update(<UniversityLocationFilters countryId="country-id" regionId="" cityId="" ar onChange={changed}/>);await vi.advanceTimersByTimeAsync(205);});
  expect(api.regions).toHaveBeenCalledWith('YE','',1);
});
it('cascades continent choices into countries while preserving canonical country identities',async()=>{
  api.filterCountries.mockResolvedValue([
    {id:'ye',label:'اليمن',code:'YE',lifecycle:'ACTIVE',metadata:{region:'Asia'}},
    {id:'fr',label:'فرنسا',code:'FR',lifecycle:'ACTIVE',metadata:{region:'Europe'}},
    {id:'tw',label:'تايوان',code:'TW',lifecycle:'ACTIVE',metadata:{region:''}},
  ]);
  const changed=vi.fn();
  await act(async()=>{tree=create(<UniversityLocationFilters continent="Asia" countryId="" regionId="" cityId="" ar onChange={changed}/>);});
  await act(async()=>{await vi.advanceTimersByTimeAsync(205);});
  const countries=()=>tree.root.findAllByType('select')[1].findAllByType('option').map(node=>node.props.value);
  expect(countries()).toEqual(['','ye']);
  await act(async()=>tree.root.findAllByType('select')[0].props.onChange({target:{value:'Europe'}}));
  expect(changed).toHaveBeenCalledWith('continent','Europe');
  await act(async()=>{tree.update(<UniversityLocationFilters continent="UNSPECIFIED" countryId="" regionId="" cityId="" ar onChange={changed}/>);});
  await act(async()=>{await vi.advanceTimersByTimeAsync(205);});
  expect(countries()).toEqual(['','tw']);
});

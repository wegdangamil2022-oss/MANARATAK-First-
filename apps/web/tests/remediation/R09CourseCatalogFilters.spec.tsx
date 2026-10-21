import React from 'react';
import {act,create} from 'react-test-renderer';
import {describe,it,expect,vi,beforeEach} from 'vitest';
import {PublishedCatalogDiscovery} from '../../src/features/public-template/components/PublishedCatalogDiscovery';
import {ApiClient} from '../../src/api/client';
const pending=vi.hoisted(()=>({request:Promise.resolve()}));
vi.mock('../../src/api/client',()=>({ApiClient:{getCourses:vi.fn().mockResolvedValue({data:[],total:0,hasMore:false,nextCursor:null})}}));
vi.mock('../../src/i18n/I18nProvider',()=>({useTranslation:()=>({language:'ar'})}));
vi.mock('../../src/features/public-template/useBoundedCatalog',()=>({useBoundedCatalog:(_key:unknown,load:(cursor:null,signal:AbortSignal)=>Promise<unknown>)=>{pending.request=load(null,new AbortController().signal).then(()=>undefined);return{rows:[],busy:false,error:null,total:0,hasMore:false};}}));
vi.mock('../../src/features/public-template/components/PublicCatalogChoices',()=>({PublicCatalogChoices:()=>null}));
vi.mock('../../src/features/public-template/components/FavoriteButton',()=>({FavoriteButton:()=>null}));
vi.mock('../../src/features/public-template/publicLiveDataSource',()=>({mapCourse:vi.fn(),mapArticle:vi.fn(),mapPublicUniversityDto:vi.fn()}));
vi.mock('../../src/features/public-template/publicScholarshipDataSource',()=>({mapPublicScholarshipDto:vi.fn()}));
(globalThis as typeof globalThis & {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
beforeEach(()=>vi.clearAllMocks());
describe('R09 public course track request contract',()=>{
  it('offers canonical free access choices and sends the selected value unchanged',async()=>{
    let view!:ReturnType<typeof create>;await act(async()=>{view=create(<PublishedCatalogDiscovery kind="courses" onBack={()=>{}} />);});await pending.request;
    const values=view.root.findAllByType('option').map(option=>option.props.value);
    expect(values).toEqual(expect.arrayContaining(['FREE_STUDY','FREE_CERTIFICATE','FREE_STUDY_AND_CERTIFICATE','PAID']));expect(values).not.toContain('FREE');
    await act(async()=>view.root.findAllByType('select')[1].props.onChange({target:{value:'FREE_STUDY'}}));await pending.request;
    expect(ApiClient.getCourses).toHaveBeenLastCalledWith(expect.objectContaining({accessType:'FREE_STUDY'}),'ar',expect.any(AbortSignal));act(()=>view.unmount());
  });
  it.each([['native','NATIVE_MANARATAK_COURSE',undefined],['imported','EXTERNAL_LINKED_COURSE',undefined],['paid',undefined,'PAID']] as const)('uses valid API filters for %s',async(track,originType,accessType)=>{
    let view!:ReturnType<typeof create>;await act(async()=>{view=create(<PublishedCatalogDiscovery kind="courses" courseTrack={track} onBack={()=>{}} />);});await pending.request;
    expect(ApiClient.getCourses).toHaveBeenCalledWith(expect.objectContaining({originType,accessType}),'ar',expect.any(AbortSignal));
    act(()=>view.unmount());
  });
});

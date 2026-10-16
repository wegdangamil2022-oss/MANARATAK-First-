import {afterEach,describe,expect,it,vi} from 'vitest';
import {ApiClient} from '../../api/client';
import {loadPublishedMajors,searchPublishedMajors} from './publicLiveDataSource';
afterEach(()=>vi.restoreAllMocks());
const dto:any={slug:'computing',publicId:'MJR-1',displayName:'Computing',canonicalName:'Computing',degreeLevel:'BACHELOR'};
describe('Bounded public major discovery',()=>{
 it('loads only the initial page even when the server offers more pages',async()=>{const spy=vi.spyOn(ApiClient,'getMajors').mockResolvedValue({data:[dto],total:200,nextCursor:'next'} as any);expect(await loadPublishedMajors('en')).toHaveLength(1);expect(spy).toHaveBeenCalledOnce();expect(spy).toHaveBeenCalledWith({locale:'en',limit:20});});
 it('passes query, degree and cursor to the published owner API without draining the catalog',async()=>{const spy=vi.spyOn(ApiClient,'getMajors').mockResolvedValue({data:[dto],total:1,nextCursor:null} as any);const filters={search:'علوم الحاسوب',degreeLevel:'BACHELOR',cursor:'cursor'};const page=await searchPublishedMajors(filters,'ar');expect(page.total).toBe(1);expect(spy).toHaveBeenCalledWith({...filters,locale:'ar',limit:20}, undefined);expect(spy).toHaveBeenCalledOnce();});
 it('surfaces unavailable owner APIs instead of pretending the catalog is empty',async()=>{vi.spyOn(ApiClient,'getMajors').mockRejectedValue(Error('unavailable'));await expect(searchPublishedMajors({search:'computing'})).rejects.toThrow('unavailable');});
});

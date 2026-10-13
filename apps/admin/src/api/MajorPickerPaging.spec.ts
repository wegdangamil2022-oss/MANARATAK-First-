import {afterEach,describe,expect,it,vi} from 'vitest';
import {adminApiClient} from './client';
import {canonicalPickerApi} from './canonicalPickers';
afterEach(()=>vi.restoreAllMocks());
describe('Canonical major picker paging',()=>{
 it('uses server query and requested page on the live owner collection',async()=>{const spy=vi.spyOn(adminApiClient,'request').mockResolvedValue({data:[{id:'root',profileId:'profile',displayName:'Computing',status:'READY_TO_REVIEW'}]} as any);const data=await canonicalPickerApi.majors('Computing',3);const url=new URL(String(spy.mock.calls[0][0]),'https://fixture.test');expect(url.searchParams.get('page')).toBe('3');expect(url.searchParams.get('pageSize')).toBe('50');expect(url.searchParams.get('search')).toBe('Computing');expect(url.searchParams.get('catalog')).toBe('false');expect(data[0].id).toBe('root');});
});

import{afterEach,describe,it,expect,vi}from'vitest';
import{ApiClient}from'../../api/client';
import{loadPublishedUniversities}from'./publicLiveDataSource';
afterEach(()=>vi.restoreAllMocks());
describe('public university initial load resource boundary',()=>{
 it('does not follow every cursor before rendering discovery',async()=>{
  const query=vi.spyOn(ApiClient,'getUniversities').mockResolvedValue({data:[],total:10000,page:1,pageSize:25,totalPages:400,hasMore:true,nextCursor:'next-page'}as any);
  expect(await loadPublishedUniversities('ar')).toEqual([]);expect(query).toHaveBeenCalledTimes(1);expect(query).toHaveBeenCalledWith({locale:'ar',limit:25});
 });
});

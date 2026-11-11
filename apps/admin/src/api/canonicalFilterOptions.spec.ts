import {describe,it,expect,vi,afterEach} from 'vitest';
import {adminApiClient} from './client';
import {canonicalPickerApi} from './canonicalPickers';
afterEach(()=>vi.restoreAllMocks());
describe('Arabic canonical filter options',()=>{
  it('prefers Arabic reference and taxonomy names over canonical English',async()=>{
    vi.spyOn(adminApiClient,'request').mockResolvedValue({data:[{id:'a',nodeId:'a',name:'English',nameAr:'اسم عربي',canonicalName:'English',localizedNames:{ar:'مجال عربي'}}],page:1,pageSize:50,totalPages:1});
    expect((await canonicalPickerApi.taxonomyNodes('ACADEMIC_FIELD'))[0].label).toBe('مجال عربي');
    expect((await canonicalPickerApi.countries())[0].label).toBe('مجال عربي');
  });
  it('loads every bounded country page rather than truncating at the first fifty',async()=>{
    const request=vi.spyOn(adminApiClient,'request').mockImplementation(async endpoint=>{const page=Number(new URL(String(endpoint),'http://local').searchParams.get('page'));return{data:Array.from({length:page===1?100:95},(_,i)=>({id:`country-${(page-1)*100+i}`,nameAr:`دولة ${(page-1)*100+i}`})),page,pageSize:100,totalPages:2,total:195} as never;});
    const result=await canonicalPickerApi.filterCountries();expect(result).toHaveLength(195);expect(new Set(result.map(row=>row.id)).size).toBe(195);expect(request).toHaveBeenCalledTimes(2);
  });
  it('includes all taxonomy pages and preserves Arabic labels for the final page',async()=>{
    vi.spyOn(adminApiClient,'request').mockImplementation(async endpoint=>{const page=Number(new URL(String(endpoint),'http://local').searchParams.get('page'));return{data:Array.from({length:page===1?100:65},(_,i)=>({nodeId:`node-${(page-1)*100+i}`,canonicalName:'English',localizedNames:{ar:'تخصص عربي'}})),page,pageSize:100,totalPages:2,total:165} as never;});
    const result=await canonicalPickerApi.filterTaxonomyNodes();expect(result).toHaveLength(165);expect(result[164].label).toBe('تخصص عربي');
  });
});

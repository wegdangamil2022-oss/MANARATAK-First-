import {describe,expect,it,vi} from 'vitest';
import {PrismaScholarshipRepository} from '../../src/scholarships/PrismaScholarshipRepository';
import {PrismaCmsRepository} from '../../src/cms/PrismaCmsRepository';
import {PrismaInternationalTestRepository} from '../../src/international-tests/PrismaInternationalTestRepository';
import {PrismaCareerRepository} from '../../src/career-alumni/PrismaCareerRepository';

describe('Dashboard counts retain owner predicates without hydrating records',()=>{
  for(const [name,delegate,Class,method,filters] of [
    ['scholarships','scholarship',PrismaScholarshipRepository,'list',{status:'PUBLISHED',query:'دراسة',countryReferenceId:'country'}],
    ['cms','cmsContentNode',PrismaCmsRepository,'listContent',{locale:'ar',status:'PUBLISHED',q:'دراسة'}],
    ['tests','internationalTest',PrismaInternationalTestRepository,'list',{status:'PUBLISHED',searchQuery:'اختبار'}],
    ['careers','careerJobPostingRecord',PrismaCareerRepository,'listJobs',{status:'PUBLISHED',search:'مهندس'}],
  ] as const) it(name,async()=>{
    const model={findMany:vi.fn().mockResolvedValue([]),count:vi.fn().mockResolvedValue(7),groupBy:vi.fn().mockResolvedValue([])};
    const db:any={[delegate]:model};db.$transaction=(work:any)=>work(db);
    const repository:any=new Class(db);
    const counted=await repository[method]({...filters,page:1,pageSize:1,countOnly:true});
    expect(counted.total).toBe(7);expect(counted.data).toEqual([]);expect(model.findMany).not.toHaveBeenCalled();expect(model.groupBy).not.toHaveBeenCalled();
    const predicate=model.count.mock.calls[0][0];
    const ordinary=await repository[method]({...filters,page:1,pageSize:1});
    expect(ordinary.total).toBe(counted.total);expect(model.count.mock.calls[1][0]).toEqual(predicate);expect(model.findMany).toHaveBeenCalledTimes(1);
  });
});

import {describe,expect,it,vi} from 'vitest';
import {Phase10CatalogRepository} from '../../src/majors/Phase10CatalogRepository';
describe('Phase10CatalogRepository canonical identity projection',()=>{
 it('returns Major.id with a separate profileId through bounded SQL enrichment',async()=>{
  const db:any={$queryRaw:vi.fn(async()=>[{data:[{id:'major-1',profileId:'profile-1',hasDbDetails:true,code:'MJR-0001'}],total:'1'}])};
  const repo=new Phase10CatalogRepository(db);vi.spyOn(repo,'loadCatalog').mockReturnValue([{id:'cat-MJR-0001',code:'MJR-0001',displayName:'Computer Science',degreeLevel:'BACHELOR',catalogKind:'BACHELOR',targetDomain:'MAJORS',status:'DRAFT'}]);(repo as any).loadDetails=()=>new Map();
  const result=await repo.listCatalog({page:1,pageSize:10});expect(result.data[0]).toMatchObject({id:'major-1',profileId:'profile-1',hasDbDetails:true});
  const sql=db.$queryRaw.mock.calls[0][0];expect(sql.text).toContain('LEFT JOIN "MajorLevelProfile"');expect(sql.text).toContain("'id',p.\"majorId\"");expect(sql.values).toContain(10);
 });
});

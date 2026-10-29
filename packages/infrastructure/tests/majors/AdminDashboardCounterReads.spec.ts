import {describe,expect,it,vi} from 'vitest';
import {PrismaMajorRepository} from '../../src/majors/PrismaMajorRepository';
import {PrismaUniversityRepository} from '../../src/universities/PrismaUniversityRepository';
import {MajorStatus,UniversityStatus} from '@manaratak/domain';

describe('Admin dashboard counter reads',()=>{
 it('loads a paged major graph in four reads and preserves profile relationships and UTC timestamps',async()=>{
  const db={$queryRaw:vi.fn(async(query:any)=>{
   if(query.text.includes('count(*) AS total'))return[{total:1n,uniqueRootTotal:1n,published:0n,needsReview:1n,complete:1n}];
   if(query.text.includes('SELECT "majorId","profileId"'))return[{majorId:'major',profileId:'profile'}];
   if(query.text.includes('SELECT m.*'))return[{id:'major',displayName:'Root',updatedAt:new Date('2026-01-01T12:00:00Z'),optionalFields:{displayName:'Shadow'},sources:[{importedAt:'2026-01-01T12:00:00'}],levelProfiles:[{id:'profile',level:'BACHELOR',displayName:'Profile',updatedAt:'2026-01-01T12:00:00',academicField:{id:'field',canonicalName:'Canonical field',createdAt:'2026-01-01T12:00:00'},classificationMappings:[{id:'mapping',taxonomyNodeId:'field',relationshipType:'PRIMARY'}]}]}];
   return[{profileId:'profile',state:'NO_CONTENT'}];
  })};
  const result=await new PrismaMajorRepository(db as any).list({page:1,pageSize:24});
  expect(db.$queryRaw).toHaveBeenCalledTimes(4);expect(result.total).toBe(1);
  expect(result.data[0].displayName).toBe('Profile');expect(result.data[0].profileId).toBe('profile');
  expect(new Date(result.data[0].updatedAt!).toISOString()).toBe('2026-01-01T12:00:00.000Z');
  expect(result.data[0].profiles?.[0].academicField?.nodeId).toBe('field');
  expect(result.data[0].profiles?.[0].classificationMappings?.[0].taxonomyNodeId).toBe('field');
 });
 it('counts major profile rows without fetching their full owner graphs, preserving filter semantics',async()=>{
  const aggregates:any[]=[];
  const db={major:{findMany:vi.fn()},$queryRaw:vi.fn(async(query:any)=>{
   if(query.text.includes('count(*) AS total')){aggregates.push(query);return[{total:3n,published:1n,needsReview:2n,complete:0n}];}
   return[];
  })};
  const repository=new PrismaMajorRepository(db as any);
  const filter={status:MajorStatus.READY_TO_REVIEW,search:'الحاسوب',degreeLevel:'BACHELOR',pageSize:1};
  const counter=await repository.list({...filter,countOnly:true});
  expect(counter.total).toBe(3);expect(counter.stats?.needsReview).toBe(2);expect(counter.data).toEqual([]);
  expect(db.$queryRaw).toHaveBeenCalledTimes(1);expect(db.major.findMany).not.toHaveBeenCalled();
  await repository.list(filter);
  expect(aggregates[0].text).toBe(aggregates[1].text);expect(aggregates[0].values).toEqual(aggregates[1].values);
 });
 it('counts universities using the ordinary owner filters and never hydrates programs for counters',async()=>{
  const db={university:{count:vi.fn().mockResolvedValue(7),findMany:vi.fn().mockResolvedValue([])}};
  const repository=new PrismaUniversityRepository(db as any);
  const filter={status:UniversityStatus.READY_TO_REVIEW,countryReferenceId:'country-id',search:'جامعة',pageSize:1};
  const counter=await repository.list({...filter,countOnly:true});
  expect(counter.total).toBe(7);expect(counter.totalPages).toBe(7);expect(counter.data).toEqual([]);expect(db.university.findMany).not.toHaveBeenCalled();
  const countWhere=db.university.count.mock.calls[0][0];
  await repository.list(filter);expect(db.university.findMany).toHaveBeenCalledTimes(1);
  expect(db.university.count.mock.calls[1][0]).toEqual(countWhere);
 });
});

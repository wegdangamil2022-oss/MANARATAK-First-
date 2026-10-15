import {it,expect,vi} from 'vitest';
import {PrismaScholarshipRepository} from '../../src/scholarships/PrismaScholarshipRepository';
it('persists an owner description pair and appends its structural version without changing older snapshots',async()=>{
 let row:any={id:'scholarship',publicId:'exact-id',status:'READY_TO_REVIEW',publicationStatus:'DRAFT',revision:1,optionalFields:{description:'Original'},universityLinks:[]};
 const original={id:'old-version',snapshot:{displayName:'Old published name'}};const create=vi.fn(async({data}:any)=>({id:'new-version',...data}));
 const db:any={$queryRaw:vi.fn(async()=>[]),scholarship:{findUnique:async()=>row,findUniqueOrThrow:async()=>row,update:async({data}:any)=>row={...row,optionalFields:data.optionalFields,revision:row.revision+1}},scholarshipVersion:{findFirst:async()=>({versionNumber:1}),create},scholarshipSponsorContext:{upsert:vi.fn()},scholarshipApplicationCycle:{upsert:vi.fn()}};
 const pair={en:{ownerId:'scholarship',sourceRevision:'1',displayName:'Reviewed title',description:'Reviewed description',sourceDigest:'source',valueDigest:'value',locale:'en'}};
 const result=await new PrismaScholarshipRepository(db,true).update('scholarship',{optionalFields:{ownerLocalizedDescriptions:pair}});
 expect(result.optionalFields?.ownerLocalizedDescriptions).toEqual(pair);expect(create).toHaveBeenCalledOnce();expect(create.mock.calls[0][0].data.snapshot.ownerLocalizedDescriptions).toEqual(pair);expect(create.mock.calls[0][0].data.versionNumber).toBe(2);expect(original.snapshot).toEqual({displayName:'Old published name'});
});

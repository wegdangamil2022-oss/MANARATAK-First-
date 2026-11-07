import {randomUUID} from 'node:crypto';
import {PrismaClient} from '@prisma/client';
import {describe,it,expect} from 'vitest';
import {PrismaMajorRepository} from '../../src/majors/PrismaMajorRepository';

describe('Major college filter follows the degree profile',()=>{
  it('separates colleges on a shared concept and falls back for a blank profile context',async()=>{
    const url=new URL(process.env.DATABASE_URL!);
    if(process.env.MAJOR_FILTER_DATABASE_TESTS!=='YES'||!['127.0.0.1','localhost'].includes(url.hostname)||!url.pathname.startsWith('/majors_full_'))throw Error('ISOLATED_MAJOR_FILTER_DATABASE_REQUIRED');
    const db=new PrismaClient(),tag=randomUUID();
    try {
      await expect(db.$transaction(async tx=>{
        const major=await tx.major.create({data:{publicId:tag,slug:tag,canonicalName:tag,canonicalDedupKey:tag,displayName:tag,facultyName:'Root '+tag,status:'READY_TO_REVIEW',completenessStatus:'NEEDS_REVIEW'}});
        for(const [level,college] of [['BACHELOR','Bachelor '+tag],['MASTER','Master '+tag],['DOCTORATE',' ']])await tx.majorLevelProfile.create({data:{majorId:major.id,level,code:randomUUID(),collegeContext:college,status:'READY_TO_REVIEW',completenessStatus:'NEEDS_REVIEW'}});
        const repo=new PrismaMajorRepository(tx as unknown as PrismaClient);
        expect((await repo.list({collegeOrFaculty:'Bachelor '+tag,countOnly:true})).total).toBe(1);
        expect((await repo.list({collegeOrFaculty:'Master '+tag,degreeLevel:'MASTER',countOnly:true})).total).toBe(1);
        expect((await repo.list({collegeOrFaculty:'Master '+tag,degreeLevel:'BACHELOR',countOnly:true})).total).toBe(0);
        expect((await repo.list({collegeOrFaculty:'Root '+tag,countOnly:true})).total).toBe(1);
        throw Error('ROLLBACK_FILTER_FIXTURE');
      })).rejects.toThrow('ROLLBACK_FILTER_FIXTURE');
    }finally{await db.$disconnect();}
  });
});

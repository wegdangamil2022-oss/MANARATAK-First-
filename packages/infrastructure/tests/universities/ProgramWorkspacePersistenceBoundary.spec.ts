import{describe,it,expect,vi}from'vitest';
import{PrismaUniversityProgramWorkspaceGateway}from'../../src/universities/PrismaUniversityProgramWorkspaceGateway';
const context={actorId:'actor',reason:'review source',expectedRevision:1};
const study={languageReferenceIds:[],studyMode:'UNKNOWN' as const,teachingDelivery:'UNKNOWN' as const,verificationStatus:'UNKNOWN' as const};
function setup(status='IMPORTED'){const db:any={universityAcademicProgram:{findUnique:vi.fn().mockResolvedValue({id:'p',universityId:'u',status:'ACTIVE'})},
 $queryRaw:vi.fn().mockResolvedValue([{revision:1n,status}]),university:{findUniqueOrThrow:vi.fn().mockResolvedValue({id:'u',status}),update:vi.fn()},
 referenceLanguage:{findMany:vi.fn().mockResolvedValue([])},universityProgramStudyProfile:{upsert:vi.fn()},
 universityProgramIntake:{findUnique:vi.fn().mockResolvedValue(null),upsert:vi.fn()}};return{db,gateway:new PrismaUniversityProgramWorkspaceGateway(db),tx:{boundaryId:'tx',transactionClient:db}as any};}
describe('program owner persistence safeguards',()=>{
 it('refuses edits of published parents before writing profile or intake',async()=>{const f=setup('PUBLISHED');await expect(f.gateway.save('p',{study},context,f.tx)).rejects.toThrow('PUBLISHED_IMMUTABLE');expect(f.db.universityProgramStudyProfile.upsert).not.toHaveBeenCalled();});
 it('rechecks root revision before writing',async()=>{const f=setup();await expect(f.gateway.save('p',{study},{...context,expectedRevision:2},f.tx)).rejects.toThrow('STALE_REVISION');expect(f.db.universityProgramStudyProfile.upsert).not.toHaveBeenCalled();});
 it('rejects unresolved or inactive P7 language IDs',async()=>{const f=setup();await expect(f.gateway.save('p',{study:{...study,languageReferenceIds:['unknown']}},context,f.tx)).rejects.toThrow('LANGUAGE_INVALID');expect(f.db.universityProgramStudyProfile.upsert).not.toHaveBeenCalled();});
 it('does not move an intake from another program',async()=>{const f=setup();f.db.universityProgramIntake.findUnique.mockResolvedValue({programId:'other'});await expect(f.gateway.save('p',{intake:{id:'i',intakeStart:'2027-09-01',applicationOpen:'2027-01-01',applicationClose:'2027-03-01',applicantSegment:'INTERNATIONAL',timezone:'UTC',officialSourceUrl:'https://example.edu',verificationStatus:'VERIFIED',status:'ACTIVE'}},context,f.tx)).rejects.toThrow('OWNERSHIP_CONFLICT');expect(f.db.universityProgramIntake.upsert).not.toHaveBeenCalled();});
});

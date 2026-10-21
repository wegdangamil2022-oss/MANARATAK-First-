import {describe,it,expect,vi} from 'vitest';
import {PrismaImportedCourseOperationsRepository as Repository} from '../../src/courses/PrismaImportedCourseOperationsRepository';

const url='https://provider.example.invalid/course',at=new Date('2026-10-19T01:00:00Z');
function fixture(patch:Record<string,unknown>={}){
 const existing={checkedAt:at,verificationState:'BROKEN',responseCode:404,redirectTarget:null,isCurrent:true,url,...patch};
 const db={$queryRaw:vi.fn().mockResolvedValue([]),courseSourceUrlHistory:{findUnique:vi.fn().mockResolvedValue(existing),updateMany:vi.fn().mockResolvedValue({count:1}),upsert:vi.fn().mockResolvedValue({})},courseSourceIdentity:{update:vi.fn().mockResolvedValue({})}};
 const repo=new Repository(db as never).withTransaction({boundaryId:'synthetic-test',transactionClient:db} as never);
 vi.spyOn(repo,'getVerificationContext').mockResolvedValue({courseId:'course',directCourseUrl:url,providerId:'owner',sourceIdentityId:'source'} as never);
 return {repo,db};
}
describe('Imported Course checks with equal observation timestamps',()=>{
 it('cannot overwrite a broken verdict with a verified result at the same timestamp',async()=>{const f=fixture();await expect(f.repo.recordLinkCheck('course',{state:'VERIFIED_DIRECT',checkedAt:at,responseCode:200},url)).rejects.toThrow('IMPORTED_COURSE_LINK_CHECK_CONFLICTING_RESULT');expect(f.db.courseSourceUrlHistory.updateMany).not.toHaveBeenCalled();});
 it('does not silently accept different response details at an identical timestamp',async()=>{const f=fixture();await expect(f.repo.recordLinkCheck('course',{state:'BROKEN',checkedAt:at,responseCode:500},url)).rejects.toThrow('IMPORTED_COURSE_LINK_CHECK_CONFLICTING_RESULT');expect(f.db.courseSourceIdentity.update).not.toHaveBeenCalled();});
 it('does not replace a redirect target at an identical timestamp',async()=>{const f=fixture({verificationState:'REDIRECTED',responseCode:302,redirectTarget:'https://provider.example.invalid/a'});await expect(f.repo.recordLinkCheck('course',{state:'REDIRECTED_VALID',checkedAt:at,responseCode:302,redirectTarget:'https://provider.example.invalid/b'},url)).rejects.toThrow('IMPORTED_COURSE_LINK_CHECK_CONFLICTING_RESULT');});
 it('returns an exact current replay without performing writes',async()=>{const f=fixture();await f.repo.recordLinkCheck('course',{state:'BROKEN',checkedAt:at,responseCode:404},url);expect(f.db.courseSourceUrlHistory.updateMany).not.toHaveBeenCalled();expect(f.db.courseSourceUrlHistory.upsert).not.toHaveBeenCalled();expect(f.db.courseSourceIdentity.update).not.toHaveBeenCalled();});
 it('cannot reactivate an old non-current history row with an equal timestamp',async()=>{const f=fixture({isCurrent:false});await expect(f.repo.recordLinkCheck('course',{state:'BROKEN',checkedAt:at,responseCode:404},url)).rejects.toThrow('IMPORTED_COURSE_LINK_CHECK_CONFLICTING_RESULT');});
});

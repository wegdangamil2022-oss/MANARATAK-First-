import {describe,it,expect,vi} from 'vitest';
import {PrismaImportedCourseOperationsRepository as Repository} from '../../src/courses/PrismaImportedCourseOperationsRepository';
const url='https://provider.example.invalid/course';
const identity=(id:string,providerId:string)=>({id,providerId,currentUrl:url,status:'ACTIVE',urlHistory:[{verificationState:'VERIFIED',checkedAt:new Date(),isCurrent:true}]});
const record=(sourceIdentities:unknown[])=>({id:'course',publicId:'course',slug:'course',externalProviderId:'owner',directCourseUrl:url,sourceIdentities,
 externalProvider:{id:'owner',status:'APPROVED',allowedDomains:[{normalizedDomain:'provider.example.invalid'}]}});
describe('Imported Course source identity belongs to the canonical provider',()=>{
 it('ignores a newer source identity from a foreign provider when checking the canonical link',async()=>{
  const course=record([identity('foreign','other'),identity('owned','owner')]);const db={course:{findFirst:vi.fn().mockResolvedValue(course)}};
  const context=await new Repository(db as never).getVerificationContext('course');expect(context?.sourceIdentityId).toBe('owned');
  const query=db.course.findFirst.mock.calls[0][0];expect(query.select.sourceIdentities.take).toBeUndefined();expect(query.select.sourceIdentities.select.providerId).toBe(true);
 });
 it('returns no verification identity when only foreign evidence is linked',async()=>{
  const db={course:{findFirst:vi.fn().mockResolvedValue(record([identity('foreign','other')]))}};
  expect((await new Repository(db as never).getVerificationContext('course'))?.sourceIdentityId).toBeNull();
 });
 it('does not borrow foreign evidence for an unassigned canonical provider',async()=>{
  const db={course:{findFirst:vi.fn().mockResolvedValue({...record([identity('foreign','other')]),externalProviderId:null})}};
  expect((await new Repository(db as never).getVerificationContext('course'))?.sourceIdentityId).toBeNull();
 });
 it('maps the owned identity consistently in admin detail and publication link health',async()=>{
  const foreign=identity('foreign','other'),owned={...identity('owned','owner'),urlHistory:[{verificationState:'BROKEN'}]};
  const db={course:{findFirst:vi.fn().mockResolvedValue(record([foreign,owned]))}};const detail=await new Repository(db as never).getImportedCourseById('course');
  expect(detail?.sourceIdentity?.id).toBe('owned');expect(detail?.linkHealth).toBe('BROKEN');
 });
 it('foreign verified history cannot supply publication link verification',async()=>{
  const db={course:{findFirst:vi.fn().mockResolvedValue(record([identity('foreign','other')]))}};const detail=await new Repository(db as never).getImportedCourseById('course');
  expect(detail?.sourceIdentity).toBeNull();expect(detail?.linkHealth).toBe('UNKNOWN');
 });
});

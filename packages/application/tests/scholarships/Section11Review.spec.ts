import {describe,it,expect,vi} from 'vitest';
import {ScholarshipStatus,ScholarshipPublicationStatus,ScholarshipCompletenessState,type ScholarshipDto} from '@manaratak/domain';
import {AdminScholarshipUseCases} from '../../src/scholarships/use-cases/AdminScholarshipUseCases';
import {projectPublishedScholarship} from '../../src/scholarships/use-cases/ScholarshipPublicProjection';

function fixture(): ScholarshipDto {
  return {id:'sch-1',publicId:'SCH-1',displayName:'Example',canonicalName:'Example',slug:'example',
    status:ScholarshipStatus.READY_TO_REVIEW,publicationStatus:ScholarshipPublicationStatus.DRAFT,
    completenessStatus:ScholarshipCompletenessState.COMPLETE,verificationStatus:'VERIFIED',
    officialSourceUrl:'https://example.edu/scholarship',versions:[{id:'v1'}],applicationCycles:[{id:'c1'}],
    sponsorContext:{displayName:'Example'},majorTargets:[],universityLinks:[]} as unknown as ScholarshipDto;
}
function service(current=fixture(), candidates:any[]=[]){
  const repo:any={findById:vi.fn(async()=>current),update:vi.fn(),updateLifecycle:vi.fn()};
  const lookup:any={findCandidates:vi.fn(async()=>candidates)};
  return {repo,useCases:new AdminScholarshipUseCases(repo,undefined,lookup)};
}
describe('Section 11 review: public safety and authoring boundaries',()=>{
  it('does not expose internal owner evidence or future optional fields',()=>{
    const source={...fixture(),metadata:{private:'SECRET'},sourceEvidence:[{sourceUrl:'SECRET'}],optionalFields:{futureField:'SECRET'}};
    expect(JSON.stringify(projectPublishedScholarship(source as any,'Example'))).not.toContain('SECRET');
  });
  it('excludes resolved eligibility tied to an unpublished Major',()=>{
    const source={...fixture(),eligibilityItems:[{itemKey:'major-rule',majorId:'private-major',resolutionStatus:'RESOLVED',major:{status:'READY_TO_REVIEW'}}]};
    expect(projectPublishedScholarship(source as any,'Example').eligibilityItems).toEqual([]);
  });
  it('blocks canonical relationship writes without actor and audit context',async()=>{
    const {repo,useCases}=service();
    await expect(useCases.replaceCanonicalRelationships('sch-1',{})).rejects.toThrow('SCHOLARSHIP_REVIEW_REASON_AND_ACTOR_REQUIRED');
    expect(repo.update).not.toHaveBeenCalled();
  });
  it('rejects a canonical lookup result for a different identity',async()=>{
    const {repo,useCases}=service(fixture(),[{id:'other',publicId:'other',lifecycle:'ACTIVE'}]);
    await expect(useCases.replaceCanonicalRelationships('sch-1',{countryReferenceId:'country-1'})).rejects.toThrow('SCHOLARSHIP_CANONICAL_REFERENCE_NOT_FOUND');
    expect(repo.update).not.toHaveBeenCalled();
  });
  it('rejects reversed eligibility ranges before writing',async()=>{
    const {repo,useCases}=service();
    await expect(useCases.replaceCanonicalRelationships('sch-1',{eligibilityItems:[{itemKey:'age',minimumValue:30,maximumValue:20}] as any})).rejects.toThrow('SCHOLARSHIP_ELIGIBILITY_RANGE_INVALID');
    expect(repo.update).not.toHaveBeenCalled();
  });
  it('blocks publication when an eligibility Major is unpublished',async()=>{
    const current={...fixture(),eligibilityItems:[{itemKey:'major-rule',majorId:'private-major',resolutionStatus:'RESOLVED'}]} as any;
    const {useCases}=service(current,[{id:'private-major',lifecycle:'READY_TO_REVIEW'}]);
    await expect(useCases.markReadyToPublish('sch-1')).rejects.toThrow('SCHOLARSHIP_MAJOR_NOT_PUBLISHED');
  });
});

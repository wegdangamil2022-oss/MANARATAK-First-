import {describe,it,expect,vi} from 'vitest';
import {AdminMajorUseCases} from '../../src/majors/use-cases/AdminMajorUseCases';
import {assertMajorReviewCoverage,publicMajorProjection} from '@absheer/domain';
function setup(status='READY_TO_REVIEW') {
  const major:any={id:'owner',status,academicFieldId:'taxonomy',profiles:[]};
  const repo:any={findById:async()=>major,withTransaction:()=>repo,lockForRevision:vi.fn(async(_id,revision)=>{if(revision!==1)throw new Error('STALE');}),advanceRevision:vi.fn(),listLevelProfiles:async()=>major.profiles,allocateNextProfileCode:vi.fn(async()=>'FEL-330'),createLevelProfile:vi.fn(async input=>({...input,id:'profile'})),createSource:vi.fn(),createVersion:vi.fn(async input=>({...input,id:'version'})),createContentSections:vi.fn()};
  const references:any={assertDegreeMatches:vi.fn(async(id,level)=>{if(id!=='degree' || level!=='FELLOWSHIP')throw new Error('DEGREE_MISMATCH');})};
  const atomic:any={execute:async(_spec,fn)=>fn({boundaryId:'test'})};
  return {repo,major,uc:new AdminMajorUseCases(repo,undefined,undefined,undefined,atomic,references)};
}
const input={displayName:'Research fellowship',degreeLevelId:'degree',sourceUri:'https://example.org/evidence',sourceHash:'a'.repeat(64)};
const context={actorId:'editor',reason:'Verified evidence',expectedRevision:1};
describe('B10a fellowship owner authoring',()=>{
  it('creates version, source and private profile under canonical parent with allocated code',async()=>{const h=setup();const profile=await h.uc.createFellowshipProfile('owner',input,context);expect(profile).toMatchObject({majorId:'owner',level:'FELLOWSHIP',code:'FEL-330',status:'READY_TO_REVIEW'});expect(h.repo.createContentSections.mock.calls[0][0]).toHaveLength(6);expect(h.repo.createVersion).toHaveBeenCalledWith(expect.objectContaining({status:'NEEDS_REVIEW',profileId:'profile',sourceHash:input.sourceHash}));expect(publicMajorProjection({...h.major,profiles:[profile]}).profiles).toEqual([]);});
  it.each(['PUBLISHED','ARCHIVED','REJECTED'])('rejects immutable parent %s',async status=>{const h=setup(status);await expect(h.uc.createFellowshipProfile('owner',input,context)).rejects.toThrow('IMMUTABLE');expect(h.repo.createLevelProfile).not.toHaveBeenCalled();});
  it('rejects stale revision before writes',async()=>{const h=setup();await expect(h.uc.createFellowshipProfile('owner',input,{...context,expectedRevision:0})).rejects.toThrow('STALE');expect(h.repo.createLevelProfile).not.toHaveBeenCalled();});
  it('does not use a profile ID as canonical parent',async()=>{const h=setup();await expect(h.uc.createFellowshipProfile('profile',input,context)).rejects.toThrow('CANONICAL_PARENT');});
  it('does not create duplicate fellowship',async()=>{const h=setup();h.major.profiles=[{level:'FELLOWSHIP'}];await expect(h.uc.createFellowshipProfile('owner',input,context)).rejects.toThrow('ALREADY_EXISTS');});
  it('rejects wrong canonical degree before writing',async()=>{const h=setup();await expect(h.uc.createFellowshipProfile('owner',{...input,degreeLevelId:'other'},context)).rejects.toThrow('DEGREE_MISMATCH');expect(h.repo.createVersion).not.toHaveBeenCalled();});
  it('requires distinct documented requirements and benefits in review',()=>{const keys=['identity','overview','requirements','benefits','academic_notice','sources'];const sections=keys.map(id=>({id,content:'Documented evidence'}));expect(()=>assertMajorReviewCoverage('FELLOWSHIP',Object.fromEntries(keys.map(id=>[id,id])),sections)).not.toThrow();expect(()=>assertMajorReviewCoverage('FELLOWSHIP',Object.fromEntries(keys.map(id=>[id,id])),sections.filter(row=>row.id!=='benefits'))).toThrow('INCOMPLETE');});
});

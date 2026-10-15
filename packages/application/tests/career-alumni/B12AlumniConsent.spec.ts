import {describe,it,expect,vi} from 'vitest';
import {careerAlumniConsentCurrent} from '../../src/career-alumni/CareerPolicy';
import {CareerEngagementUseCases} from '../../src/career-alumni/use-cases/CareerEngagementUseCases';
const valid=()=>({studentReferenceId:'owner',visibility:'ALUMNI_ONLY',consentGrantedAt:'2026-01-01T00:00:00Z',consentGrantedBy:'owner',consentSource:'STUDENT_CAREER_WORKSPACE_V1',consentRevokedAt:null});
describe('B12 alumni network existing consent contract',()=>{
 it.each(['missing-date','invalid-date','future-date','missing-source','blank-source','foreign-owner','revoked','private'])( 'rejects %s before reading the alumni-only directory',async mode=>{
  const profile:any=valid();if(mode==='missing-date')profile.consentGrantedAt=null;if(mode==='invalid-date')profile.consentGrantedAt='invalid';if(mode==='future-date')profile.consentGrantedAt='2999-01-01';if(mode==='missing-source')profile.consentSource=null;if(mode==='blank-source')profile.consentSource='   ';if(mode==='foreign-owner')profile.consentGrantedBy='other';if(mode==='revoked')profile.consentRevokedAt='2026-02-01';if(mode==='private')profile.visibility='PRIVATE';
  const repo:any={findAlumniProfile:async()=>profile,listAlumniNetwork:vi.fn()};const uc=new CareerEngagementUseCases({} as any,repo,{assertActiveStudent:vi.fn()} as any);
  await expect(uc.alumniNetwork('owner',1)).rejects.toThrow('ACCESS_DENIED');expect(repo.listAlumniNetwork).not.toHaveBeenCalled();
 });
 it('preserves owner consent until revoked without inventing a retention period',()=>{expect(careerAlumniConsentCurrent(valid(),new Date('2030-01-01'))).toBe(true);expect(careerAlumniConsentCurrent({...valid(),consentRevokedAt:'2026-02-01'})).toBe(false);});
 it('allows current consent and rechecks it on the next read after withdrawal',async()=>{const profile:any=valid();const repo:any={findAlumniProfile:async()=>profile,listAlumniNetwork:vi.fn(async()=>({data:[],total:0}))};const uc=new CareerEngagementUseCases({} as any,repo,{assertActiveStudent:vi.fn()} as any);await uc.alumniNetwork('owner',1);profile.consentRevokedAt=new Date().toISOString();await expect(uc.alumniNetwork('owner',1)).rejects.toThrow('ACCESS_DENIED');expect(repo.listAlumniNetwork).toHaveBeenCalledOnce();});
});

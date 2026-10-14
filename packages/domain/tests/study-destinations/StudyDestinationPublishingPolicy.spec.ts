import { describe, it, expect } from 'vitest';
import { StudyDestinationPublishingPolicy, type StudyDestinationProfileDto } from '../../src/study-destinations';
const now=Date.parse('2026-10-14T12:00:00.000Z');
function fixture(): StudyDestinationProfileDto {
  return {
    overviewAr:'نبذة',overviewEn:'Overview',studySystemSummaryAr:'دراسة',studySystemSummaryEn:'Study',admissionHighlightsAr:['قبول'],admissionHighlightsEn:['Admission'],studyLanguageReferenceIds:['language'],visaSummaryAr:'تأشيرة',visaSummaryEn:'Visa',visaRequirementsAr:['جواز'],visaRequirementsEn:['Passport'],visaOfficialUrl:'https://education.gov.ye',averageMonthlyLivingCostMin:100,averageMonthlyLivingCostMax:200,livingCostCurrencyReferenceId:'currency',officialLinks:[{labelAr:'جهة',labelEn:'Authority',url:'https://education.gov.ye',category:'GOVERNMENT_STUDY'}],evidenceSources:[{label:'Authority',url:'https://education.gov.ye',sourceType:'GOVERNMENT'}],sourceAuditDate:new Date(now).toISOString(),sourceVerificationStatus:'VERIFIED',governance:{lastEditorId:'author',proof:{authorId:'author',reviewerId:'reviewer',reviewedRevision:1,fingerprint:'content-proof',reviewedAt:new Date(now).toISOString(),reason:'Independent review',authorities:[]}},costHighlightsAr:[],costHighlightsEn:[],studentLifeHighlightsAr:[],studentLifeHighlightsEn:[],
  } as StudyDestinationProfileDto;
}
describe('Study destination source publishing policy',()=>{
  it('accepts only the configured age window including its boundary and excludes future dates',()=>{
    const policy=new StudyDestinationPublishingPolicy(180,()=>now);
    expect(policy.isAuditDateFresh(new Date(now-180*86400000).toISOString())).toBe(true);
    expect(policy.isAuditDateFresh(new Date(now-180*86400000-1).toISOString())).toBe(false);
    expect(policy.isAuditDateFresh(new Date(now+1).toISOString())).toBe(false);
    expect(policy.isAuditDateFresh('not-a-date')).toBe(false);
  });
  it('does not elevate a legacy VERIFIED marker or a self-approved proof into publish readiness',()=>{
    const policy=new StudyDestinationPublishingPolicy(180,()=>now),profile=fixture();
    expect(policy.evaluate(profile).readyForPublish).toBe(true);
    profile.governance.proof=null;expect(policy.evaluate(profile).readyForPublish).toBe(false);
    const sameAuthor=fixture();sameAuthor.governance.proof!.reviewerId='author';expect(policy.evaluate(sameAuthor).readyForPublish).toBe(false);
  });
  it('requires bilingual optional structures when present and English official link labels',()=>{
    const policy=new StudyDestinationPublishingPolicy(180,()=>now),profile=fixture();
    profile.costHighlightsAr=[{label:'سكن',value:'100'}];profile.officialLinks[0].labelEn='';profile.studentLifeHighlightsAr=['حياة'];
    const incomplete=policy.evaluate(profile).checks.filter(check=>!check.complete).map(check=>check.key);
    expect(incomplete).toEqual(expect.arrayContaining(['cost-highlights-en','official-links-en','student-life-en']));
  });
});

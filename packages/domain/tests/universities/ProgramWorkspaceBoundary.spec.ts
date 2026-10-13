import{describe,it,expect}from'vitest';
import{validateProgramIntake,validateProgramStudy,intakeWindow,type ProgramIntake,type ProgramStudy}from'../../src/universities/UniversityProgramWorkspace';
const study:ProgramStudy={languageReferenceIds:[],studyMode:'UNKNOWN',teachingDelivery:'UNKNOWN',verificationStatus:'UNKNOWN'};
const intake:ProgramIntake={id:'i',intakeStart:'2027-09-01T00:00:00Z',applicationOpen:'2027-01-01T00:00:00Z',applicationClose:'2027-06-01T00:00:00Z',applicantSegment:'INTERNATIONAL',timezone:'Asia/Aden',officialSourceUrl:'https://example.edu/apply',verificationStatus:'VERIFIED',status:'ACTIVE'};
describe('program-owned study and intake boundaries',()=>{
 it('keeps absent languages explicitly unknown without assuming English',()=>{expect(()=>validateProgramStudy(study)).not.toThrow();expect(study.languageReferenceIds).toEqual([]);});
 it('rejects duplicate canonical languages',()=>expect(()=>validateProgramStudy({...study,languageReferenceIds:['en','en']})).toThrow('STUDY_INVALID'));
 it('requires evidence for verified study',()=>expect(()=>validateProgramStudy({...study,verificationStatus:'VERIFIED'})).toThrow('EVIDENCE_REQUIRED'));
 it('rejects a duration without its unit',()=>expect(()=>validateProgramStudy({...study,durationValue:2})).toThrow('STUDY_INVALID'));
 it('rejects reversed application intervals',()=>expect(()=>validateProgramIntake({...intake,applicationClose:intake.applicationOpen})).toThrow('INTAKE_INVALID'));
 it('rejects an invalid source time zone',()=>expect(()=>validateProgramIntake({...intake,timezone:'Fake/Zone'})).toThrow('TIMEZONE_INVALID'));
 it('rejects unsafe source URLs',()=>expect(()=>validateProgramIntake({...intake,officialSourceUrl:'javascript:alert(1)'})).toThrow('URL_INVALID'));
 it('cannot activate an unverified intake',()=>expect(()=>validateProgramIntake({...intake,verificationStatus:'UNKNOWN'})).toThrow('EVIDENCE_REQUIRED'));
 it('uses a half-open window and never reports an expired intake open',()=>{expect(intakeWindow(intake,new Date(intake.applicationOpen))).toBe('OPEN');expect(intakeWindow(intake,new Date(intake.applicationClose))).toBe('CLOSED');});
 it('does not expose draft intake as open',()=>expect(intakeWindow({...intake,status:'DRAFT'},new Date('2027-03-01'))).toBe('UNKNOWN'));
});

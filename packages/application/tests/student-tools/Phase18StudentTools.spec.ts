import { describe, expect, it, vi } from 'vitest';
import { GpaCalculatorHandler, MotivationLetterGeneratorHandler, OFFICIAL_STUDENT_TOOLS, ScholarshipRecommendationHandler, UniversityComparisonHandler } from '../../src/student-tools';
import { StudentToolExecutionContext } from '@manaratak/domain';

const context: StudentToolExecutionContext = { executionId:'stx_test',requestId:'req',correlationId:'cor',traceId:'trace',toolKey:'test',toolVersion:'1.0.0',locale:'ar',consumerType:'AUTHENTICATED_STUDENT',authenticatedStudentReference:'student',startedAt:new Date() };
describe('Phase 18 official registry',()=>{
  it('contains exactly 83 unique official tools',()=>{expect(OFFICIAL_STUDENT_TOOLS).toHaveLength(83);expect(new Set(OFFICIAL_STUDENT_TOOLS.map((tool)=>tool.toolKey)).size).toBe(83);});
  it('exposes exactly four implemented tools',()=>{expect(OFFICIAL_STUDENT_TOOLS.filter((tool)=>tool.implementationStatus==='IMPLEMENTED').map((tool)=>tool.toolKey).sort()).toEqual(['gpa-calculator','motivation-letter-generator','scholarship-recommendation','university-comparison']);});
  it('never enables a planned tool',()=>{expect(OFFICIAL_STUDENT_TOOLS.filter((tool)=>tool.implementationStatus==='PLANNED').every((tool)=>!tool.featureFlags.globallyEnabled&&tool.visibility!=='ACTIVE')).toBe(true);});
});
describe('GPA calculator',()=>{
  const handler=new GpaCalculatorHandler();
  it('calculates weighted and projected GPAs without early rounding',async()=>{const input=handler.validate({scale:4,courses:[{label:'A',creditHours:3,gradePoints:4},{label:'B',creditHours:2,gradePoints:3}],existingCumulativeGpa:3.25,existingCompletedCredits:40});const result=await handler.execute(context,input);expect(result.semesterGpa).toBe(3.6);expect(result.projectedCumulativeGpa).toBe(3.2889);});
  it('rejects grades above the selected scale',()=>{expect(()=>handler.validate({scale:4,courses:[{label:'A',creditHours:3,gradePoints:5}]})).toThrow('TOOL_INPUT_INVALID');});
  it('requires cumulative GPA and credits as a pair',()=>{expect(()=>handler.validate({scale:4,courses:[{label:'A',creditHours:3,gradePoints:4}],existingCumulativeGpa:3})).toThrow('cumulativePair');});
});
describe('University comparison',()=>{
  it('preserves requested order and reports unavailable canonical ids',async()=>{const gateway={getUniversitiesByPublicIds:vi.fn().mockResolvedValue({available:[{publicId:'u2',slug:'two',displayName:'Two'},{publicId:'u1',slug:'one',displayName:'One'}],unavailableIds:['u3']})};const handler=new UniversityComparisonHandler(gateway);const result=await handler.execute(context,handler.validate({universityIds:['u2','u1','u3']}));expect(result.comparedCanonicalIds).toEqual(['u2','u1']);expect(result.unavailableUniversityIds).toEqual(['u3']);});
  it('requires two to four unique ids',()=>{const handler=new UniversityComparisonHandler({getUniversitiesByPublicIds:vi.fn()});expect(()=>handler.validate({universityIds:['u1']})).toThrow('universityIds');expect(()=>handler.validate({universityIds:['u1','u1']})).toThrow('duplicateUniversityIds');});
});
describe('Motivation letter consumer boundary',()=>{
  it('delegates through a Phase 17 capability without provider or prompt parameters',async()=>{const ai={executeCapability:vi.fn().mockResolvedValue({status:'COMPLETED',result:{draft:'مسودة آمنة',warnings:[]},executionReference:'ai_1',safetyStatus:'ALLOWED'})};const handler=new MotivationLetterGeneratorHandler(ai);const input=handler.validate({target:{program:'Computer Science',degreeLevel:'Masters',applicationType:'ADMISSION'},studentBackground:{education:'Bachelor degree in computing',academicInterests:['AI'],experiences:['Research'],achievements:['Award'],skills:['Writing']},motivation:{whyField:'I value this academic field',whyProgram:'The curriculum fits my goals',careerGoals:'Lead responsible research',contribution:'Community participation',emphasizedExperiences:['Research']},outputPreferences:{language:'ar',targetWords:500,tone:'FORMAL'}});const output=await handler.execute(context,input);expect(output.aiExecutionId).toBe('ai_1');expect(ai.executeCapability).toHaveBeenCalledWith(expect.objectContaining({consumerKey:'phase18-student-tools',capabilityKey:'student-tools.motivation-letter.generate'}));expect(ai.executeCapability.mock.calls[0][0]).not.toHaveProperty('providerKey');expect(ai.executeCapability.mock.calls[0][0]).not.toHaveProperty('promptKey');});
});
describe('Scholarship recommendation',()=>{
  it('accepts omitted academic interests and uses authenticated owner context', async () => {
    const scholarships = { findPublishedCandidates: vi.fn().mockResolvedValue([]) };
    const studentContext = { getMinimalContext: vi.fn().mockResolvedValue({ targetDegree: 'Masters', interests: ['AI'] }) };
    const handler = new ScholarshipRecommendationHandler(scholarships, { executeCapability: vi.fn() }, studentContext);
    await expect(handler.execute(context, { preferredCountries: [] })).resolves.toBeDefined();
    expect(studentContext.getMinimalContext).toHaveBeenCalledWith('student');
    expect(scholarships.findPublishedCandidates).toHaveBeenCalledWith(expect.objectContaining({ targetDegree: 'Masters' }));
  });
  const candidate={publicId:'s1',slug:'grant',displayName:'Published Grant',degreeLevels:['Masters'],fundingType:'FULL',isFullyFunded:true,publicationStatus:'PUBLISHED'};
  it('uses an explicit deterministic fallback when AI is not configured',async()=>{const handler=new ScholarshipRecommendationHandler({findPublishedCandidates:vi.fn().mockResolvedValue([candidate])},{executeCapability:vi.fn().mockResolvedValue({status:'NOT_CONFIGURED'})},{getMinimalContext:vi.fn().mockResolvedValue(null)});const result=await handler.execute(context,handler.validate({preferredCountries:[],fundingPreference:'FULL'}));expect(result.mode).toBe('DETERMINISTIC_FALLBACK');expect(result.recommendations[0].scholarship.publicId).toBe('s1');});
  it('drops hallucinated scholarship ids returned by AI',async()=>{const handler=new ScholarshipRecommendationHandler({findPublishedCandidates:vi.fn().mockResolvedValue([candidate])},{executeCapability:vi.fn().mockResolvedValue({status:'COMPLETED',executionReference:'ai_2',result:{rankings:[{publicId:'invented',explanation:'x'},{publicId:'s1',explanation:'fit'}]}})},{getMinimalContext:vi.fn().mockResolvedValue(null)});const result=await handler.execute(context,handler.validate({preferredCountries:[]}));expect(result.recommendations).toHaveLength(1);expect(result.recommendations[0].scholarship.publicId).toBe('s1');});
});

import {describe,expect,it} from 'vitest';
import {requiredCompletionQuizIds,courseSourceFacts,destinationRevisionDiff} from '../../src/index';
describe('Continuation: canonical completion and source boundaries',()=>{
 it('false editorial assessment flag cannot bypass active quizzes',()=>expect(requiredCompletionQuizIds([{id:'q',status:'PUBLISHED'}],false)).toEqual(['q']));
 it('archived assessments do not impose an unreachable requirement',()=>expect(requiredCompletionQuizIds([{id:'q',status:'ARCHIVED'}],false)).toEqual([]));
 it('explicit required assessment without a quiz fails closed',()=>expect(()=>requiredCompletionQuizIds([],true)).toThrow('ASSESSMENT_REQUIRED_BUT_MISSING'));
 it('a lecture course without assessments can complete without invented quizzes',()=>expect(requiredCompletionQuizIds([],undefined)).toEqual([]));
 it('source facts fingerprint excludes private optional metadata and lifecycle',()=>{const facts=courseSourceFacts({directCourseUrl:'https://p.example/course',isStudyFree:true,optionalFields:{privateToken:'secret'},status:'PUBLISHED',version:3} as any);expect(facts.directCourseUrl).toBe('https://p.example/course');expect(facts.isStudyFree).toBe(true);expect(facts).not.toHaveProperty('optionalFields');expect(facts).not.toHaveProperty('status');expect(facts).not.toHaveProperty('version');});
 it('destination diff explains field changes without arbitrary imported metadata',()=>{const before:any={overviewEn:'Old',privateImportedSecret:'secret'};const after:any={overviewEn:'New',privateImportedSecret:'changed'};expect(destinationRevisionDiff(before,after)).toEqual([{field:'overviewEn',before:'Old',after:'New'}]);});
});

import {describe, expect, it, vi} from 'vitest';
import {CourseProgressUseCases} from '../../src/courses/use-cases/CourseProgressUseCases';
import {AtomicDomainMutationCoordinator} from '../../src/event-foundation/use-cases/AtomicDomainMutationCoordinator';
import {AtomicAuditedOutboxMutationExecutor} from '../../src/event-foundation/use-cases/AtomicAuditedOutboxMutationExecutor';
import {PrismaCourseProgressRepository} from '../../../infrastructure/src/courses/PrismaCourseProgressRepository';

const submittedAt = new Date('2026-10-10T12:00:00.000Z');
function harness() {
  let failOutbox = false;
  const state = {attempt: {id:'a',courseId:'c',quizId:'q',studentReferenceId:'s',status:'IN_PROGRESS',submittedAt:null as Date|null,metadata:null as any,score:null as number|null,passed:null as boolean|null,answers:{} as any}, audits:0, events:0};
  const questions = [
    {id:'auto',quizId:'q',questionType:'TRUE_FALSE',correctAnswer:true,points:2,status:'PUBLISHED',prompt:'Automatic'},
    {id:'essay',quizId:'q',questionType:'ESSAY',points:3,status:'PUBLISHED',prompt:'Explain'},
  ];
  const course:any = {id:'c',status:'PUBLISHED',originType:'NATIVE_MANARATAK_COURSE',optionalFields:{completionCriteria:{assessmentRequired:true}}};
  const courses:any = {findById:async()=>course};
  const curriculum:any = {getCurriculumSnapshot:async()=>({quizzes:[{id:'q',passingScore:60,status:'PUBLISHED'}],questions,modules:[],lessons:[],assets:[]})};
  curriculum.getLearningVersion = async()=>({course, curriculum: await curriculum.getCurriculumSnapshot()});
  const repository:any = {
    withTransaction:()=>repository, findEnrollment:async()=>({id:'e',status:'ACTIVE',progressPercentage:100}), findQuizAttempt:async()=>structuredClone(state.attempt),
    findCompletion:async()=>null, listQuizAttempts:async()=>[state.attempt], getStudentProgressSnapshot:async()=>({enrollment:{id:'e'},lessons:[],quizAttempts:[state.attempt]}),
    submitAssessmentForReview:vi.fn(async(data:any)=>{Object.assign(state.attempt,{answers:data.answers,status:'SUBMITTED',submittedAt,metadata:{assessmentReview:data.review}});return structuredClone(state.attempt);}),
    submitQuizAttempt:vi.fn(async(data:any)=>{Object.assign(state.attempt,{...data,status:data.passed?'PASSED':'FAILED',submittedAt});return structuredClone(state.attempt);}),
    gradeAssessment:vi.fn(async(data:any)=>{if(state.attempt.status!=='SUBMITTED')throw new Error('COURSE_ASSESSMENT_REVIEW_CONFLICT');Object.assign(state.attempt,{score:data.score,passed:data.passed,status:data.passed?'PASSED':'FAILED',metadata:{...state.attempt.metadata,assessmentGrade:{reviewerId:data.reviewerId,reason:data.reason,feedback:data.feedback,questionScores:data.questionScores}}});return structuredClone(state.attempt);}),
    listPendingAssessments:vi.fn(async()=>[state.attempt]),
  };
  const uow:any = {execute:async(fn:any)=>{const before=structuredClone(state);try{return await fn({boundaryId:'grading',transactionClient:{}});}catch(error){Object.assign(state,before);throw error;}}};
  const atomic = new AtomicDomainMutationCoordinator(new AtomicAuditedOutboxMutationExecutor(uow,{saveInTransaction:async()=>{state.audits++;}} as any,{appendInTransaction:async()=>{state.events++;if(failOutbox)throw new Error('OUTBOX_FAILED');}} as any));
  const uc = new CourseProgressUseCases(courses,curriculum,repository,undefined,undefined,atomic);
  const submit = () => uc.submitQuizAttempt({attemptId:'a',courseId:'c',studentReferenceId:'s',answers:{auto:true,essay:'Explanation'}});
  const grade = (overrides:Record<string,unknown>={}) => uc.gradeAssessment('c','a',{expectedSubmittedAt:submittedAt.toISOString(),questionScores:{essay:1},feedback:'Please give examples',reason:'Rubric reviewed',...overrides} as any,{actorId:'reviewer'});
  return {uc,state,repository,questions,course,submit,grade,fail:()=>{failOutbox=true;}};
}

describe('P13 assignments and manual grading',()=>{
  it('resumes an unfinished attempt without consuming another attempt',async()=>{const h=harness();const result=await h.uc.startQuizAttempt({courseId:'c',quizId:'q',studentReferenceId:'s'});expect(result.id).toBe('a');});
  it('stores written submission pending, with no passing result or answer keys',async()=>{const h=harness();const result=await h.submit();expect(result).toMatchObject({status:'SUBMITTED',score:null,passed:null,answers:{essay:'Explanation'}});expect(result.metadata?.assessmentReview).toEqual({passingScore:60,totalPoints:5,automaticPoints:2,questions:[{id:'essay',prompt:'Explain',maximumPoints:3}]});expect(JSON.stringify(result.metadata)).not.toContain('correctAnswer');expect(h.repository.submitQuizAttempt).not.toHaveBeenCalled();});
  it('still automatically grades objective-only quizzes',async()=>{const h=harness();h.questions.splice(1);const result=await h.uc.submitQuizAttempt({attemptId:'a',courseId:'c',studentReferenceId:'s',answers:{auto:true}});expect(result).toMatchObject({score:100,passed:true,status:'PASSED'});});
  it('rejects another student before persisting answers',async()=>{const h=harness();await expect(h.uc.submitQuizAttempt({attemptId:'a',courseId:'c',studentReferenceId:'intruder',answers:{}})).rejects.toThrow('SCOPE_MISMATCH');expect(h.repository.submitAssessmentForReview).not.toHaveBeenCalled();});
  it('requires a nonempty written answer',async()=>{const h=harness();await expect(h.uc.submitQuizAttempt({attemptId:'a',courseId:'c',studentReferenceId:'s',answers:{auto:true,essay:' '}})).rejects.toThrow('WRITTEN_ANSWER_REQUIRED');});
  it('rejects unknown question IDs',async()=>{const h=harness();await expect(h.uc.submitQuizAttempt({attemptId:'a',courseId:'c',studentReferenceId:'s',answers:{auto:true,essay:'Answer',forged:100}})).rejects.toThrow('UNKNOWN_QUESTION');});
  it('rejects invalid question weights',async()=>{const h=harness();h.questions[1].points=NaN;await expect(h.submit()).rejects.toThrow('INVALID_POINTS');});
  it('cannot complete a course while a required assignment is pending',async()=>{const h=harness();await h.submit();await expect(h.uc.completeCourse('c','s')).rejects.toThrow('COURSE_ASSESSMENT_NOT_PASSED:q');});
  it('combines automatic points and reviewer points using the immutable submission rubric',async()=>{const h=harness();await h.submit();h.questions[1].points=100;const result=await h.grade();expect(result).toMatchObject({score:60,passed:true,status:'PASSED'});expect(h.state).toMatchObject({audits:1,events:1});expect(h.repository.gradeAssessment.mock.calls[0][0]).toMatchObject({reviewerId:'reviewer',questionScores:{essay:1}});});
  it('prevents grades outside the saved rubric',async()=>{const h=harness();await h.submit();await expect(h.grade({questionScores:{essay:4}})).rejects.toThrow('POINTS_OUT_OF_RANGE');expect(h.state.audits).toBe(0);});
  it('requires exactly the manual question IDs',async()=>{const h=harness();await h.submit();await expect(h.grade({questionScores:{auto:1}})).rejects.toThrow('QUESTION_SCOPE_MISMATCH');});
  it('rejects a stale submission token',async()=>{const h=harness();await h.submit();await expect(h.grade({expectedSubmittedAt:'2026-10-09T12:00:00.000Z'})).rejects.toThrow('REVIEW_CONFLICT');});
  it('rejects repeated final grading',async()=>{const h=harness();await h.submit();await h.grade();await expect(h.grade()).rejects.toThrow('NOT_PENDING');expect(h.state.audits).toBe(1);});
  it('requires the reviewer reason',async()=>{const h=harness();await h.submit();await expect(h.grade({reason:''})).rejects.toThrow('REVIEW_CONTEXT_REQUIRED');});
  it('rolls grade, audit and event back when outbox persistence fails',async()=>{const h=harness();await h.submit();h.fail();await expect(h.grade()).rejects.toThrow('OUTBOX_FAILED');expect(h.state).toMatchObject({attempt:{status:'SUBMITTED',score:null,passed:null},audits:0,events:0});});
  it('exposes feedback to the learner without reviewer identity/reason or rubric',async()=>{const h=harness();await h.submit();await h.grade();const result=await h.uc.getProgress('c','s');expect(result?.quizAttempts[0].metadata).toEqual({assessmentGrade:{feedback:'Please give examples',gradedAt:undefined}});});
  it('bounds the review queue before hitting persistence',async()=>{const h=harness();await expect(h.uc.listPendingAssessments('c',1,100)).rejects.toThrow('PAGINATION_INVALID');expect(h.repository.listPendingAssessments).not.toHaveBeenCalled();});
});

describe('P13 bound persistence grading guard',()=>{
  it('locks and rejects a concurrently graded attempt without writing or starting a nested transaction',async()=>{
    const tx:any={$queryRaw:vi.fn(async()=>[]),courseQuizAttempt:{findUnique:async()=>({courseId:'c',status:'PASSED',submittedAt}),update:vi.fn()}};
    const repo=new PrismaCourseProgressRepository({} as any).withTransaction({boundaryId:'grading',transactionClient:tx} as any);
    await expect(repo.gradeAssessment!({attemptId:'a',courseId:'c',expectedSubmittedAt:submittedAt.toISOString(),score:60,passed:true,reviewerId:'reviewer',reason:'Reviewed',feedback:'',questionScores:{essay:1}})).rejects.toThrow('REVIEW_CONFLICT');
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);expect(tx.courseQuizAttempt.update).not.toHaveBeenCalled();
  });
});

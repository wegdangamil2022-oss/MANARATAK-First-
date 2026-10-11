import {describe,expect,it} from 'vitest';
import {assertStudentIntegrationEvent} from '../../src/students/StudentIntegrationEventPolicy';
const event={eventId:'e-1',eventVersion:'1.0' as const,sourceDomain:'COURSES',eventType:'CourseCompleted',
  studentReferenceId:'s-1',sourceReferenceId:'enrollment-1',title:'Completed',occurredAt:new Date('2026-10-10'),
  metadata:{courseId:'c-1',enrollmentId:'enrollment-1',progressPercentage:100,status:'COMPLETED'}};
describe('P15 normalized internal owner-event policy',()=>{
  it('accepts the bounded owner completion contract',()=>expect(()=>assertStudentIntegrationEvent(event)).not.toThrow());
  it.each([
    {...event,sourceReferenceId:'foreign-enrollment'},
    {...event,metadata:{...event.metadata,studentReferenceId:'foreign-student'}},
    {...event,metadata:{...event.metadata,completedAt:'not-a-date'}},
    {...event,metadata:{...event.metadata,progressPercentage:101}},
    {...event,metadata:{...event.metadata,progressPercentage:NaN}},
    {...event,metadata:{...event.metadata,status:'IMPERSONATED'}},
    {...event,eventVersion:'9.0'},
    {...event,metadata:{...event.metadata,courseName:'x'.repeat(5000)}},
    {...event,notification:{category:'LEARNING',title:'Title',message:'Message',actionUrl:'//evil.example'}},
  ])('rejects foreign scope, malformed owner facts and unsafe notification URLs before persistence',input=>{
    expect(()=>assertStudentIntegrationEvent(input as any)).toThrow('STUDENT_EVENT_PAYLOAD_INVALID');
  });
  it('rejects known event names attributed to the wrong owner',()=>{
    expect(()=>assertStudentIntegrationEvent({...event,sourceDomain:'CERTIFICATES'})).toThrow('STUDENT_EVENT_TYPE_NOT_ALLOWED');
  });
});

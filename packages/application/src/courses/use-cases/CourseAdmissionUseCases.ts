import type {AtomicPersistenceContext} from '@manaratak/domain';
import {AtomicDomainMutationCoordinator,type AtomicMutationRequestContext} from '../../event-foundation/use-cases/AtomicDomainMutationCoordinator';
export interface CourseAdmissionGateway {
 list(courseId:string,page:number):Promise<unknown>;
 decide(courseId:string,enrollmentId:string,input:{decision:'APPROVE'|'REJECT';reason:string;expectedVersion:number;expectedUpdatedAt:string},actorId:string,persistence:AtomicPersistenceContext):Promise<unknown>;
}
export class CourseAdmissionUseCases {
 constructor(private readonly gateway:CourseAdmissionGateway,private readonly atomic:AtomicDomainMutationCoordinator){}
 list(courseId:string,page:number){return this.gateway.list(courseId,page);}
 decide(courseId:string,enrollmentId:string,input:Parameters<CourseAdmissionGateway['decide']>[2],context:AtomicMutationRequestContext){if(!context.actorId||input.reason.trim().length<3)throw new Error('COURSE_ADMISSION_REVIEW_REQUIRED');return this.atomic.execute({domain:'COURSES',aggregateType:'COURSE_ENROLLMENT',aggregateId:enrollmentId,action:`COURSE_ADMISSION_${input.decision==='APPROVE'?'APPROVED':'REJECTED'}`,context,auditMetadata:{reason:input.reason,expectedVersion:input.expectedVersion}},persistence=>this.gateway.decide(courseId,enrollmentId,input,context.actorId,persistence));}
}

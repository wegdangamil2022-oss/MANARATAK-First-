import type { AtomicPersistenceContext } from '@manaratak/domain';
import { AtomicDomainMutationCoordinator, type AtomicMutationRequestContext } from '../../event-foundation/use-cases/AtomicDomainMutationCoordinator';
export interface CourseSourceReviewGateway {
  approve(courseId:string, expectedVersion:number, actorId:string, reason:string, evidenceUrls:string[], validUntil:string|null, persistence:AtomicPersistenceContext):Promise<unknown>;
  history(courseId:string):Promise<unknown[]>;
}
export class CourseSourceReviewUseCases {
  constructor(private readonly gateway:CourseSourceReviewGateway, private readonly atomic:AtomicDomainMutationCoordinator){}
  history(courseId:string){return this.gateway.history(courseId);}
  approve(courseId:string, input:{expectedVersion:number;reason:string;evidenceUrls:string[];validUntil?:string|null}, context:AtomicMutationRequestContext){
    if(!context.actorId || !Number.isSafeInteger(input.expectedVersion) || input.expectedVersion<1 || input.reason.trim().length<3 || !input.evidenceUrls.length) throw new Error('COURSE_SOURCE_REVIEW_INPUT_REQUIRED');
    if(input.validUntil!=null&&(!Number.isFinite(Date.parse(input.validUntil))||Date.parse(input.validUntil)<=Date.now()))throw new Error('COURSE_SOURCE_REVIEW_EXPIRY_INVALID');
    for(const value of input.evidenceUrls){const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password)throw new Error('COURSE_SOURCE_REVIEW_HTTPS_REQUIRED');}
    return this.atomic.execute({domain:'COURSES',aggregateType:'COURSE',aggregateId:courseId,action:'COURSE_SOURCE_INDEPENDENTLY_APPROVED',context,auditMetadata:{reason:input.reason,expectedVersion:input.expectedVersion}}, persistence=>this.gateway.approve(courseId,input.expectedVersion,context.actorId,input.reason,input.evidenceUrls,input.validUntil??null,persistence));
  }
}

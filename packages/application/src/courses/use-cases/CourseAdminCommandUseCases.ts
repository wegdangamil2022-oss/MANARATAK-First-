import {randomUUID} from 'node:crypto';
import type {AtomicPersistenceContext,ICourseRepository,ILearningPathRepository} from '@manaratak/domain';
import {AtomicDomainMutationCoordinator, type AtomicMutationRequestContext} from '../../event-foundation/use-cases/AtomicDomainMutationCoordinator';
import type {ImportedCourseAdminUseCases} from './ImportedCourseAdminUseCases';
import type {AdminCourseUseCases} from './AdminCourseUseCases';
import type {NativeCourseUseCases} from './NativeCourseUseCases';
import type {CourseCurriculumUseCases} from './CourseCurriculumUseCases';
import type {CourseEnrollmentPolicyUseCases} from './CourseEnrollmentPolicyUseCases';
import type {LearningPathUseCases} from './LearningPathUseCases';
import type {CourseRelationshipResolutionService} from '../services/CourseRelationshipResolutionService';

export interface CourseAdminScope {
  importedCourseAdminUseCases: ImportedCourseAdminUseCases;
  adminCourseUseCases: AdminCourseUseCases;
  nativeCourseUseCases: NativeCourseUseCases;
  courseCurriculumUseCases: CourseCurriculumUseCases;
  courseEnrollmentPolicyUseCases: CourseEnrollmentPolicyUseCases;
  learningPathUseCases: LearningPathUseCases;
  courseRelationshipResolutionService: CourseRelationshipResolutionService;
}
export interface CourseAdminContext extends AtomicMutationRequestContext {reason: string; expectedVersion?: number}
export function bindCourseRepository<T extends object>(repository:T, context:AtomicPersistenceContext):T {
  const port=repository as T & {withTransaction?:(context:AtomicPersistenceContext)=>T};
  if(!port.withTransaction) throw new Error('COURSE_TRANSACTIONAL_PERSISTENCE_REQUIRED');
  return port.withTransaction(context);
}

/** Administrative command, child writes, version checkpoint, Audit and Outbox share one transaction. */
export class CourseAdminCommandUseCases {
  constructor(private readonly courses:ICourseRepository, private readonly paths:ILearningPathRepository,
    private readonly atomic:AtomicDomainMutationCoordinator,
    private readonly factory:(context:AtomicPersistenceContext)=>CourseAdminScope){}

  async execute<T>(kind:'COURSE'|'LEARNING_PATH', id:string|undefined, action:string, context:CourseAdminContext,
    command:(scope:CourseAdminScope)=>Promise<T>):Promise<{value:T;version?:number}> {
    if(!context.actorId || !context.reason?.trim()) throw new Error('COURSE_REVIEW_CONTEXT_REQUIRED');
    if(id && (!Number.isSafeInteger(context.expectedVersion) || context.expectedVersion!<1)) throw new Error('COURSE_VERSION_PRECONDITION_REQUIRED');
    const entityId=id ?? `${kind}-CREATE-${randomUUID()}`;
    const entityReference:{id:string|null}={id:id??null};
    const payload:Record<string,unknown>={entityType:kind,entityId,operation:action};
    return this.atomic.execute({domain:'COURSES',aggregateType:kind,aggregateId:entityId,action,context,
      auditMetadata:{reason:context.reason,expectedVersion:context.expectedVersion ?? null,entityReference},outbox:{payload}},async persistence=>{
      const courses=bindCourseRepository(this.courses,persistence);
      const paths=bindCourseRepository(this.paths,persistence);
      const owner=kind==='COURSE'?courses:paths;
      if(id){
        if(!owner.assertCurrentVersion) throw new Error('COURSE_VERSION_LOCK_REQUIRED');
        await owner.assertCurrentVersion(id,context.expectedVersion!);
        if(kind==='COURSE'){
          const current=await courses.findById(id);
          if(!current) throw new Error('COURSE_NOT_FOUND');
          if(['ARCHIVED','REJECTED'].includes(current.status)) throw new Error('COURSE_INACTIVE_IMMUTABLE');
          if(current.status==='PUBLISHED' && !['COURSE_UNPUBLISH','COURSE_ARCHIVE'].includes(action)) throw new Error('COURSE_PUBLISHED_STRUCTURE_IMMUTABLE_UNPUBLISH_FIRST');
        }
      }
      const value=await command(this.factory(persistence));
      if(!id) {
        if(value && typeof value==='object' && 'id' in value && typeof value.id==='string') {
          entityReference.id=value.id;
          payload.entityId=value.id;
        }
        return {value};
      }
      if(kind==='COURSE'){
        let current=await courses.findById(id);
        if(current?.version===context.expectedVersion) current=await courses.update(id,{});
        return {value,version:current?.version};
      }
      return {value,version:(await paths.findById(id))?.version};
    });
  }
}

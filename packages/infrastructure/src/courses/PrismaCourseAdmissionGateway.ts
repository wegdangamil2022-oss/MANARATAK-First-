import {Prisma,PrismaClient} from '@prisma/client';
import type {AtomicPersistenceContext,ICourseFinancialClearanceGateway} from '@manaratak/domain';
import type {CourseAdmissionGateway} from '@manaratak/application';
export class PrismaCourseAdmissionGateway implements CourseAdmissionGateway {
 constructor(private readonly prisma:PrismaClient,private readonly finance:ICourseFinancialClearanceGateway){}
 async list(courseId:string,page:number){const where={courseId,status:{in:['PENDING','WAITLISTED']}};const [data,total]=await Promise.all([this.prisma.courseEnrollment.findMany({where,orderBy:[{enrolledAt:'asc'},{id:'asc'}],skip:(page-1)*20,take:20,select:{id:true,studentReferenceId:true,status:true,enrolledAt:true,updatedAt:true}}),this.prisma.courseEnrollment.count({where})]);return {data,total,page,totalPages:Math.ceil(total/20)};}
 async decide(courseId:string,enrollmentId:string,input:Parameters<CourseAdmissionGateway['decide']>[2],actorId:string,persistence:AtomicPersistenceContext){const tx=(persistence as AtomicPersistenceContext&{transactionClient?:Prisma.TransactionClient}).transactionClient;if(!persistence.boundaryId||!tx)throw new Error('COURSE_ATOMIC_TRANSACTION_CONTEXT_REQUIRED');
  await tx.$queryRaw`SELECT id FROM "Course" WHERE id=${courseId} FOR UPDATE`;await tx.$queryRaw`SELECT id FROM "CourseEnrollment" WHERE id=${enrollmentId} FOR UPDATE`;
  const [course,enrollment,policy]=await Promise.all([tx.course.findUnique({where:{id:courseId}}),tx.courseEnrollment.findUnique({where:{id:enrollmentId}}),tx.courseEnrollmentPolicy.findUnique({where:{courseId}})]);
  if(!course||!enrollment||enrollment.courseId!==courseId)throw new Error('COURSE_ENROLLMENT_NOT_FOUND');if(course.version!==input.expectedVersion||enrollment.updatedAt.toISOString()!==input.expectedUpdatedAt||!['PENDING','WAITLISTED'].includes(enrollment.status))throw new Error('COURSE_ADMISSION_CONFLICT');
  if(actorId===enrollment.studentReferenceId)throw new Error('COURSE_ADMISSION_INDEPENDENT_REVIEW_REQUIRED');
  if(input.decision==='APPROVE'){
   if(course.status!=='PUBLISHED'||course.originType==='EXTERNAL_LINKED_COURSE')throw new Error('COURSE_ADMISSION_STATE_CONFLICT');
   const metadata=enrollment.metadata as {courseVersion?:unknown}|null;if(metadata?.courseVersion!==course.version)throw new Error('COURSE_ADMISSION_VERSION_CHANGED');
   if(policy?.eligibilityRules&&JSON.stringify(policy.eligibilityRules)!=='{}'&&JSON.stringify(policy.eligibilityRules)!=='null')throw new Error('COURSE_ENROLLMENT_ELIGIBILITY_EVALUATOR_REQUIRED');
   for(const prerequisite of (Array.isArray(policy?.prerequisiteCourseIds)?policy.prerequisiteCourseIds:[]) as string[]){if(!await tx.courseCompletion.findUnique({where:{courseId_studentReferenceId:{courseId:prerequisite,studentReferenceId:enrollment.studentReferenceId}}}))throw new Error('COURSE_PREREQUISITE_NOT_COMPLETED');}
   if((course.accessType==='PAID'||course.originType==='PAID_COURSE'||policy?.requiresFinancialClearance)&&!await this.finance.hasCourseFinancialClearance(courseId,enrollment.studentReferenceId))throw new Error('COURSE_FINANCIAL_CLEARANCE_REQUIRED');
   if(policy?.isCapacityLimited){const occupied=await tx.courseEnrollment.count({where:{courseId,id:{not:enrollmentId},status:{in:['ACTIVE','PENDING']}}});if(policy.maximumSeats==null||occupied>=policy.maximumSeats)throw new Error('COURSE_ENROLLMENT_CAPACITY_FULL');}
  }
  return tx.courseEnrollment.update({where:{id:enrollmentId},data:{status:input.decision==='APPROVE'?'ACTIVE':'CANCELLED',metadata:{...((enrollment.metadata??{}) as Prisma.InputJsonObject),admissionDecision:{decision:input.decision,actorId,reason:input.reason,decidedAt:new Date().toISOString()}}},select:{id:true,status:true,updatedAt:true,studentReferenceId:true}});
 }
}

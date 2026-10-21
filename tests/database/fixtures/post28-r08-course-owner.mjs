import {once} from 'node:events';
import {PrismaClient} from '@prisma/client';
import {CourseImportCoordinator} from '../../../packages/application/src/courses/use-cases/CourseImportCoordinator.ts';
import {AtomicDomainMutationCoordinator} from '../../../packages/application/src/event-foundation/use-cases/AtomicDomainMutationCoordinator.ts';
import {AtomicAuditedOutboxMutationExecutor} from '../../../packages/application/src/event-foundation/use-cases/AtomicAuditedOutboxMutationExecutor.ts';
import {PrismaAtomicPersistenceUnitOfWork} from '../../../packages/infrastructure/src/event-foundation/PrismaAtomicPersistenceUnitOfWork.ts';
import {PrismaTransactionalOutboxStore} from '../../../packages/infrastructure/src/event-foundation/PrismaTransactionalOutboxStore.ts';
import {PrismaAuditRecordRepository} from '../../../packages/infrastructure/src/audit/PrismaAuditRecordRepository.ts';
import {PrismaCourseRepository} from '../../../packages/infrastructure/src/courses/PrismaCourseRepository.ts';
import {PrismaCourseImportTransferGateway} from '../../../packages/infrastructure/src/courses/PrismaCourseImportTransferGateway.ts';
if(!process.send||process.env.POST28_TARGET_LABEL!=='DB-T'||process.env.POST28_DATABASE_SUITE!=='course-import-receipt'||process.env.POST28_TRANSACTION_SETUP_URL)throw Error('POST28_DB_T_RUNNER_REQUIRED');
const mode=process.argv[2];if(!['NORMAL','AFTER_COMMIT'].includes(mode))throw Error('POST28_OWNER_MODE_INVALID');
const input=once(process,'message');process.send({point:'WAITING_CONFIG'});const [command]=await input;
const db=new PrismaClient({log:[],errorFormat:'minimal'});
try{
  if((await db.$queryRaw`SELECT current_user AS role`)[0].role!=='post28_app')throw Error('POST28_APP_ROLE_REQUIRED');
  const row=await db.importRecord.findUniqueOrThrow({where:{id:command.recordId},include:{batch:true}});
  if(row.batch.sourceSystem!=='POST28_SYNTHETIC_STAGED_FIXTURE'||command.actorId!=='POST28_SYNTHETIC_COURSE_REVIEWER')throw Error('POST28_SYNTHETIC_REVIEW_REQUIRED');
  const owner=new CourseImportCoordinator(new PrismaCourseImportTransferGateway(db),new PrismaCourseRepository(db),new AtomicDomainMutationCoordinator(new AtomicAuditedOutboxMutationExecutor(new PrismaAtomicPersistenceUnitOfWork(db),new PrismaAuditRecordRepository(db),new PrismaTransactionalOutboxStore(db))));
  const result=await owner.transfer(command);
  process.send({point:mode==='AFTER_COMMIT'?'COMMITTED':'RESULT',result});
  if(mode==='AFTER_COMMIT')await new Promise(()=>{});
}finally{await db.$disconnect();process.disconnect?.();}

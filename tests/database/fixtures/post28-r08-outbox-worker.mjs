import {PrismaClient} from '@prisma/client';
import {TransactionalOutboxDispatcher} from '../../../packages/application/src/event-foundation/use-cases/TransactionalOutboxDispatcher.ts';
import {PrismaTransactionalOutboxStore} from '../../../packages/infrastructure/src/event-foundation/PrismaTransactionalOutboxStore.ts';
import {StudentWorkspaceOutboxDeliveryGateway} from '../../../packages/application/src/students/use-cases/StudentWorkspaceOutboxDeliveryGateway.ts';
import {StudentWorkspaceUseCases} from '../../../packages/application/src/students/use-cases/StudentWorkspaceUseCases.ts';
import {PrismaStudentWorkspaceRepository} from '../../../packages/infrastructure/src/students/PrismaStudentWorkspaceRepository.ts';
import {PrismaIdentityRepository} from '../../../packages/infrastructure/src/identity/PrismaIdentityRepository.ts';
import {PrismaRoleAssignmentRepository} from '../../../packages/infrastructure/src/authorization/PrismaRoleAssignmentRepository.ts';

if(process.env.POST28_DATABASE_SUITE!=='r08-outbox-chain'||process.env.POST28_TARGET_LABEL!=='DB-T'||process.env.POST28_TRANSACTION_SETUP_URL)throw Error('POST28_DB_T_RUNNER_REQUIRED');
const [eventId,mode='NORMAL']=process.argv.slice(2);
if(!eventId?.startsWith('post28-r08-')||!['NORMAL','BEFORE_EFFECT','AFTER_EFFECT','FAIL'].includes(mode))throw Error('POST28_WORKER_INPUT_INVALID');
const db=new PrismaClient({log:[],errorFormat:'minimal'});
const pause=async point=>{process.send?.({point});await new Promise(resolve=>process.once('message',message=>{if(message==='CONTINUE')resolve();}));};
try{
  const role=(await db.$queryRaw`SELECT current_user AS role`)[0].role;
  if(role!=='post28_app')throw Error('POST28_APP_ROLE_REQUIRED');
  const store=new PrismaTransactionalOutboxStore(db);
  const gateway=new StudentWorkspaceOutboxDeliveryGateway(new StudentWorkspaceUseCases(new PrismaStudentWorkspaceRepository(db)),new PrismaRoleAssignmentRepository(db),new PrismaIdentityRepository(db));
  const delivery={deliver:async(entry,context)=>{
    if(entry.id!==eventId)throw Error('POST28_UNEXPECTED_SYNTHETIC_EVENT');
    if(mode==='FAIL')throw Error('POST28_SYNTHETIC_TRANSIENT');
    if(mode==='BEFORE_EFFECT')await pause('BEFORE_EFFECT');
    await gateway.deliver(entry,context);
    if(mode==='AFTER_EFFECT')await pause('AFTER_EFFECT');
  }};
  const result=await new TransactionalOutboxDispatcher(store,delivery).dispatchBatch({workerId:'post28-r08-'+process.pid,batchSize:1,claimDurationMs:3000,maxAttempts:2,baseBackoffMs:100,maxBackoffMs:100,domain:'AUTHORIZATION',eventTypes:['RoleAssignmentCreated']});
  process.send?.({point:'RESULT',result});
}finally{await db.$disconnect();process.disconnect?.();}

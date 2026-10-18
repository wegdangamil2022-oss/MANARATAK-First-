import {ImportRetryPolicy} from '@manaratak/domain';
import {ImportAdminUseCases} from '../../../packages/application/src/import-foundation/use-cases/ImportAdminUseCases.ts';
import {ImportWorkerProtocol} from '../../../packages/application/src/import-foundation/use-cases/ImportWorkerProtocol.ts';
import {ImportHandoffDispatcher} from '../../../packages/application/src/import-foundation/services/ImportHandoffDispatcher.ts';
import {ImportQueueBackgroundJobHandler} from '../../../packages/application/src/background-jobs/handlers/ImportQueueBackgroundJobHandler.ts';
import {DurableBackgroundWorker,BackgroundWorkerRuntimeState} from '../../../packages/application/src/background-jobs/workers/DurableBackgroundWorker.ts';
import {BackgroundJobHandlerRegistry} from '../../../packages/application/src/background-jobs/workers/BackgroundJobHandlerRegistry.ts';
import {PrismaImportRepository} from '../../../packages/infrastructure/src/import-foundation/PrismaImportRepository.ts';
import {PrismaImportQueueGateway} from '../../../packages/infrastructure/src/import-foundation/PrismaImportQueueGateway.ts';
import {PrismaImportScreeningReceiptStore} from '../../../packages/infrastructure/src/import-foundation/PrismaImportScreeningReceiptStore.ts';
import {PrismaBackgroundJobExecutionGateway} from '../../../packages/infrastructure/src/background-jobs/PrismaBackgroundJobExecutionGateway.ts';

export async function runWorker(db, mode='NORMAL', notify=()=>{}) {
  const pause=async point=>{notify(point);await new Promise(()=>{});};
  const receiptStore=new PrismaImportScreeningReceiptStore(db);
  const receipts={find:handoff=>receiptStore.find(handoff),accept:async(handoff,screen)=>{
    const result=await receiptStore.accept(handoff,screen);
    if(mode==='AFTER_RECEIPT')await pause('AFTER_RECEIPT');
    return result;
  }};
  const consumer={effectMode:'SCREENING_ONLY',accept:async handoff=>{
    notify('SCREENED');
    if(mode==='BEFORE_RECEIPT')await pause('BEFORE_RECEIPT');
    return {accepted:true,handoffId:handoff.handoffId,canonicalWrites:false};
  }};
  const repository=new PrismaImportRepository(db);
  const guardedRepository=new Proxy(repository,{get(target,key){
    const value=Reflect.get(target,key);
    if(key==='updateRecord')return async(...args)=>{
      const result=await value.apply(target,args);
      if(mode==='AFTER_ACK'&&args[1]?.rawPayload?._phase6HandoffState==='DISPATCHED')await pause('AFTER_ACK');
      return result;
    };
    return typeof value==='function'?value.bind(target):value;
  }});
  const queue=new PrismaImportQueueGateway(db);
  const retry=ImportRetryPolicy.create({maxAttempts:3,dlqAfterAttempts:3,backoffStrategy:'fixed',initialDelayMs:1,maxDelayMs:1,retryableErrorCodes:['TRANSIENT']});
  const imports=new ImportAdminUseCases(guardedRepository,queue,new ImportHandoffDispatcher({GENERIC:consumer},receipts),new ImportWorkerProtocol(queue,retry,5000));
  const state=new BackgroundWorkerRuntimeState();
  const worker=new DurableBackgroundWorker(new PrismaBackgroundJobExecutionGateway(db),new BackgroundJobHandlerRegistry([new ImportQueueBackgroundJobHandler(imports)]),state);
  await worker.runOnce({workerId:'post28-import-worker-'+process.pid,batchSize:1,leaseDurationMs:5000,heartbeatIntervalMs:1000});
  await worker.drain();
  return state.snapshot();
}

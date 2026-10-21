import {startPollingWorkers,stopPollingWorkers} from '../../../apps/api/src/infrastructure/workers/PollingWorkerRuntime.ts';
import {PollingWorkerRuntimeRegistry} from '../../../packages/application/src/event-foundation/use-cases/PollingWorkerRuntimeRegistry.ts';
import {freshWorkerEvidence} from '../../../apps/api/src/presentation/monitoring/RuntimeHealthPolicy.ts';

const mode=process.argv[2];
if(!process.send||!['OWNER','STUDENT'].includes(mode))throw Error('R08_ISOLATED_CHILD_REQUIRED');
const calls=[],registry=new PollingWorkerRuntimeRegistry();
let release;
const blocking=()=>new Promise(resolve=>{calls.push('active');release=resolve;process.send({point:'ACTIVE'});});
const next=async()=>{calls.push('unexpected-next-claim');};
const monitoring={getMetrics:()=>({incrementCounter(){},recordHistogram(){}})};
const worker=mode==='OWNER'?{runSettingsOnce:blocking,runCareerOnce:next,runServicesOnce:next}:{runIdentityOnce:blocking,runRoleOnce:next,runCatchupOnce:next,runLearningOnce:next,runCertificatesOnce:next,runReplayOnce:next,runRemindersOnce:next,runTrackerOwnersOnce:next};
const values={pollingWorkerRuntimeRegistry:registry,monitoringService:monitoring,ownerDomainOutboxWorker:worker,studentWorkspaceOutboxWorker:worker};
const enabled=mode==='OWNER'?'OWNER_DOMAIN_OUTBOX_WORKER_ENABLED':'STUDENT_WORKSPACE_OUTBOX_WORKER_ENABLED';
const name=mode==='OWNER'?'owner-domain-outbox':'student-workspace-outbox';
const keepAlive=setInterval(()=>{},1000);
let stop;
function drain(){
  if(stop)return;
  const started=performance.now();
  stop=stopPollingWorkers();
  process.send({point:'DRAIN_STARTED'});
  void stop.then(()=>{
    const snapshot=registry.snapshot(name);
    process.send({point:'STOPPED',calls,snapshot,fresh:freshWorkerEvidence(snapshot,15000),durationMs:performance.now()-started});
    clearInterval(keepAlive);process.disconnect();
  });
}
process.on('SIGTERM',drain);
process.on('message',message=>{if(message==='STOP')drain();if(message==='RELEASE')release?.();});
await startPollingWorkers({resolve:key=>values[key]},{getOptional:key=>key===enabled?true:key.endsWith('_INTERVAL_MS')?10:undefined});

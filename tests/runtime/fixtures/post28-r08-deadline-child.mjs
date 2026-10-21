import fs from 'node:fs';
import vm from 'node:vm';
import http from 'node:http';
import {createRequire} from 'node:module';
const ts=createRequire(import.meta.url)('typescript');
if(!process.send)throw Error('R08_ISOLATED_CHILD_REQUIRED');
const source=fs.readFileSync(new URL('../../../apps/api/src/server.ts',import.meta.url),'utf8');
const body=source.slice(source.indexOf('  let shutdownPromise:'),source.indexOf("  process.once('SIGTERM'"));
const compiled=ts.transpileModule(body+'\nglobalThis.shutdown=gracefulShutdown;',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const server=http.createServer((_req,res)=>res.end('synthetic'));
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const steps=[];
const context={process,console:{log(){},error(){}},SHUTDOWN_TIMEOUT_MS:15000,setTimeout,clearTimeout,server,
  stopPollingWorkers:async()=>{steps.push('polling-stop');},backgroundWorker:null,
  runtimeResources:{beginShutdown(){steps.push('readiness-down');},async closeAll(){steps.push('resources-close');process.send?.({point:'CLEANUP',steps});}},
  monitoringProviderRuntime:{forceFlush:()=>{process.send({point:'FLUSHING',steps});return new Promise(()=>{});}},
};
vm.runInNewContext(compiled,context);
let stopping=false;
function stop(){if(stopping)return;stopping=true;void context.shutdown('SIGTERM');}
process.on('SIGTERM',stop);process.on('message',message=>{if(message==='STOP')stop();});
// Deliberately emulate an adapter with an active handle that never flushes.
setInterval(()=>{},1000);
process.send({point:'READY'});

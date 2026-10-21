import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {ImportSourceDefinition,SourceAccessClassification,SourceConnectorCategory,SourceStatus} from './r06-runtime/packages/domain/src/index.ts';
import {NodeSafeSourceHttpTransport} from './r06-runtime/packages/infrastructure/src/import-foundation/network/NodeSafeSourceHttpTransport.ts';
const phase=process.argv[2];if(!['red','green'].includes(phase))throw Error('PHASE_REQUIRED');
const cwd=new URL('./r06-runtime/',import.meta.url),sourceSha=execFileSync('git',['rev-parse','HEAD'],{cwd,encoding:'utf8'}).trim();
if(execFileSync('git',['status','--porcelain'],{cwd,encoding:'utf8'}).trim())throw Error('CLEAN_SOURCE_REQUIRED');
const url='https://cs50.harvard.edu/x/',source=new ImportSourceDefinition({sourceId:'POST28_CS50_PUBLIC_READ_ONLY',displayName:'CS50 official public reachability probe',baseUrl:url,category:SourceConnectorCategory.STATIC_HTML,accessClassification:SourceAccessClassification.PUBLIC_ALLOWED,status:SourceStatus.ACTIVE,connectorId:'static-html',connectorVersion:'2.0.0',metadata:{allowedUrlScope:{allowedOrigins:['https://cs50.harvard.edu'],allowedPathPrefixes:['/x/']}}});
let proof={sourceSha,nodeVersion:process.version,readOnlyGet:true,url,phase,fullImportAcceptance:false};
try{
 const result=await new NodeSafeSourceHttpTransport().get(source,{targetUrl:url,maxResponseBytes:256*1024,timeoutMs:15000,maxRedirects:2});
 proof={...proof,statusCode:result.statusCode,finalUrl:result.finalUrl,byteSize:result.rawBytes.length,sha256:createHash('sha256').update(result.rawBytes).digest('hex'),fetchedAt:result.fetchedAt.toISOString(),contentType:result.contentType};
 // Keep actual public raw bytes outside the checkout; proof publishes only their digest/size.
 fs.writeFileSync(new URL(`./r06-source-get-${phase}.html`,import.meta.url),result.rawBytes,{flag:'wx'});
}catch(error){proof={...proof,error:error.message,checkedAt:new Date().toISOString()};}
fs.writeFileSync(new URL(`./r06-source-get-${phase}.json`,import.meta.url),JSON.stringify(proof,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(proof));
if(phase==='green'&&proof.statusCode!==200)process.exitCode=1;

// Local integration gateway for freshly unpacked C1 artifacts. No deployment actions.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import https from 'node:https';
import {pathToFileURL} from 'node:url';
import {staticArtifactHandler} from './serve-static-artifact.mjs';
import {requireSha,READINESS_PATH} from './lib/ReleaseContracts.mjs';

export function requireLoopbackApiOrigin(value) {
  const url=new URL(value);
  if(url.protocol!=='http:'||url.hostname!=='127.0.0.1'||!url.port||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new Error('ARTIFACT_GATEWAY_FIXED_LOOPBACK_API_REQUIRED');
  return url;
}

export async function assertGatewayReadiness(apiOrigin,sourceSha) {
  requireSha(sourceSha);
  const origin=requireLoopbackApiOrigin(apiOrigin);
  const response=await fetch(new URL(READINESS_PATH,origin),{redirect:'manual',signal:AbortSignal.timeout(5000)});
  if(response.status!==200||!response.headers.get('content-type')?.startsWith('application/json')||response.headers.get('x-manaratak-source-sha')!==sourceSha)throw new Error('ARTIFACT_GATEWAY_API_REVISION_OR_HEALTH_INVALID');
  if(!response.body)throw new Error('ARTIFACT_GATEWAY_HEALTH_EMPTY');
  const reader=response.body.getReader(),chunks=[];let bytes=0;
  try{for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>16000)throw new Error('ARTIFACT_GATEWAY_HEALTH_TOO_LARGE');chunks.push(Buffer.from(value));}}finally{await reader.cancel().catch(()=>{});}
  const text=Buffer.concat(chunks).toString('utf8');
  const body=JSON.parse(text),checked=Date.parse(body.timestamp);
  if(body.protocolVersion!==2||body.status!=='UP'||body.code!=='AVAILABLE'||!Number.isFinite(checked)||Math.abs(Date.now()-checked)>60000)throw new Error('ARTIFACT_GATEWAY_API_READINESS_INVALID');
}

const HOP_HEADERS=new Set(['connection','keep-alive','proxy-authenticate','proxy-authorization','te','trailer','transfer-encoding','upgrade']);
function endToEndHeaders(headers) {
  const nominated=String(headers.connection??'').toLowerCase().split(',').map(value=>value.trim());
  return Object.fromEntries(Object.entries(headers).filter(([key])=>!HOP_HEADERS.has(key.toLowerCase())&&!nominated.includes(key.toLowerCase())));
}

export function gatewayHandler({apiOrigin,web,admin}) {
  const target=requireLoopbackApiOrigin(apiOrigin);
  return (req,res)=>{
    const fail=(status,error)=>{if(res.headersSent){res.destroy();return;}res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify({error}));};
    // Only origin-form paths are accepted; the request can never choose the upstream.
    if(!req.url?.startsWith('/')||req.url.startsWith('//')||/[\r\n\\]/.test(req.url))return fail(400,'INVALID_REQUEST_TARGET');
    let pathname;try{pathname=decodeURIComponent(new URL(req.url,'https://localhost').pathname);}catch{return fail(400,'INVALID_REQUEST_TARGET');}
    if(pathname!=='/api'&&!pathname.startsWith('/api/'))return pathname==='/admin'||pathname.startsWith('/admin/')?admin(req,res):web(req,res);
    const headers=endToEndHeaders(req.headers);
    for(const name of Object.keys(headers))if(name.startsWith('x-forwarded-')||name==='forwarded')delete headers[name];
    headers.host=target.host;
    headers['x-forwarded-proto']='https';headers['x-forwarded-host']=req.headers.host;headers['x-forwarded-for']=req.socket.remoteAddress;
    const upstream=http.request({hostname:target.hostname,port:target.port,path:req.url,method:req.method,headers,timeout:15000},reply=>{
      res.writeHead(reply.statusCode??502,endToEndHeaders(reply.headers));reply.pipe(res);
      reply.on('error',()=>res.destroy());
    });
    upstream.on('timeout',()=>upstream.destroy(new Error('UPSTREAM_TIMEOUT')));
    upstream.on('error',()=>fail(502,'API_UPSTREAM_UNAVAILABLE'));
    let bytes=0;req.on('data',chunk=>{bytes+=chunk.length;if(bytes>32*1024*1024){upstream.destroy();fail(413,'REQUEST_BODY_TOO_LARGE');req.unpipe(upstream);req.resume();}});
    req.on('aborted',()=>upstream.destroy());res.on('close',()=>{if(!res.writableEnded)upstream.destroy();});
    req.pipe(upstream);
  };
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  const sourceSha=requireSha(process.env.RELEASE_SOURCE_SHA),apiOrigin=process.env.ARTIFACT_API_ORIGIN;
  await assertGatewayReadiness(apiOrigin,sourceSha);
  const web=staticArtifactHandler({directory:path.resolve(process.env.ARTIFACT_WEB_ROOT),unit:'web',sourceSha});
  const admin=staticArtifactHandler({directory:path.resolve(process.env.ARTIFACT_ADMIN_ROOT),unit:'admin',sourceSha});
  const port=Number(process.env.PORT??0);if(!Number.isInteger(port)||port<0||port>65535)throw new Error('ARTIFACT_GATEWAY_PORT_INVALID');
  const server=https.createServer({key:fs.readFileSync(process.env.TLS_KEY_FILE),cert:fs.readFileSync(process.env.TLS_CERT_FILE)},gatewayHandler({apiOrigin,web,admin}));
  server.requestTimeout=30000;server.headersTimeout=15000;server.keepAliveTimeout=5000;
  server.listen(port,'127.0.0.1',()=>console.log(JSON.stringify({kind:'LOCAL_ARTIFACT_INTEGRATION_GATEWAY',sourceSha,port:server.address().port,stageAccepted:false})));
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{server.closeAllConnections();server.close();});
}

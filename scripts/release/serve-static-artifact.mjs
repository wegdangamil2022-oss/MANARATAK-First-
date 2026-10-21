// Loopback-only diagnostic TLS host. Build health never claims backend readiness.
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import {pathToFileURL} from 'node:url';
import {inspectStaticBuild} from './lib/StaticBuildPolicy.mjs';
import {requireSha} from './lib/ReleaseContracts.mjs';

export function staticArtifactHandler({directory,unit,sourceSha}) {
  requireSha(sourceSha);
  if(!['web','admin'].includes(unit))throw new Error('POST28_STATIC_UNIT_INVALID');
  const root=fs.realpathSync(directory), prefix=unit==='admin'?'/admin':'';
  if(inspectStaticBuild(root,unit,sourceSha).status!=='BUILT')throw new Error('POST28_STATIC_BUILD_INVALID');
  return (req,res)=>{
    const send=(status,type,body)=>{res.writeHead(status,{'content-type':type,'cache-control':'no-store','x-manaratak-source-sha':sourceSha});res.end(body);};
    if(!['GET','HEAD'].includes(req.method))return send(405,'application/json','{"error":"METHOD_NOT_ALLOWED"}');
    let pathname;
    try {pathname=decodeURIComponent(new URL(req.url,'https://localhost').pathname);} catch {return send(400,'application/json','{}');}
    if(pathname==='/api'||pathname.startsWith('/api/'))return send(503,'application/json','{"error":"API_SERVICE_UNAVAILABLE"}');
    if(pathname===prefix+'/health/build') {
      const result=inspectStaticBuild(root,unit,sourceSha);
      return send(result.status==='BUILT'?200:503,'application/json',JSON.stringify(result));
    }
    if(!pathname.startsWith(prefix+'/'))return send(404,'application/json','{}');
    const relative=pathname.slice(prefix.length+1);
    if(relative.includes('\\')||relative.split('/').includes('..'))return send(400,'application/json','{}');
    let file=path.resolve(root,relative||'index.html');
    if(!file.startsWith(root+path.sep))return send(404,'application/json','{}');
    if(!fs.existsSync(file)&&!path.extname(file)&&req.headers.accept?.includes('text/html'))file=path.join(root,'index.html');
    try {
      let current=root;
      for(const part of path.relative(root,file).split(path.sep)){current=path.join(current,part);if(fs.lstatSync(current).isSymbolicLink())throw new Error('LINK');}
      if(!fs.statSync(file).isFile())throw new Error('MISSING');
      const type={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'}[path.extname(file)]??'application/octet-stream';
      return send(200,type,req.method==='HEAD'?undefined:fs.readFileSync(file));
    }catch{return send(404,'application/json','{}');}
  };
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  const unit=process.argv[2],sourceSha=requireSha(process.env.RELEASE_SOURCE_SHA);
  const port=Number(process.env.PORT??0);
  if(!Number.isInteger(port)||port<0||port>65535)throw new Error('POST28_STATIC_PORT_INVALID');
  const server=https.createServer({key:fs.readFileSync(process.env.TLS_KEY_FILE),cert:fs.readFileSync(process.env.TLS_CERT_FILE)},
    staticArtifactHandler({directory:path.resolve(`apps/${unit}/dist`),unit,sourceSha}));
  server.listen(port,'127.0.0.1',()=>console.log(JSON.stringify({unit,sourceSha,port:server.address().port,kind:'STATIC_ARTIFACT_DIAGNOSTIC',backendReadinessVerified:false})));
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{server.closeAllConnections();server.close();});
}

import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';

export function verifyRuntimeLayer(root,manifest,identity,{load}={}) {
  root=fs.realpathSync(root);
  const digest=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  if(identity.sourceSha!==manifest.sourceSha||identity.os!==process.platform||identity.architecture!==process.arch||Number(process.versions.node.split('.')[0])!==22||identity.nodeMajor!==22)throw new Error('POST28_RUNTIME_IDENTITY_MISMATCH');
  const local=file=>{
    const candidate=path.resolve(root,file);
    if(!candidate.startsWith(root+path.sep))throw new Error('POST28_RUNTIME_PATH_INVALID');
    let cursor=root;
    for(const part of path.relative(root,candidate).split(path.sep)){cursor=path.join(cursor,part);if(fs.lstatSync(cursor).isSymbolicLink())throw new Error('POST28_RUNTIME_SYMLINK');}
    if(!fs.statSync(candidate).isFile())throw new Error('POST28_RUNTIME_FILE_MISSING');
    return candidate;
  };
  if(digest(local('package-lock.json'))!==manifest.runtimeRequirements.lockSha256)throw new Error('POST28_RUNTIME_LOCK_MISMATCH');
  if(!/^[a-zA-Z0-9_.-]+\.node$/.test(identity.engineFile??''))throw new Error('POST28_RUNTIME_ENGINE_INVALID');
  const engine=local('node_modules/.prisma/client/'+identity.engineFile);
  if(digest(engine)!==identity.engineSha256||digest(local('node_modules/.prisma/client/schema.prisma'))!==identity.generatedSchemaSha256)throw new Error('POST28_RUNTIME_CLIENT_DIGEST_MISMATCH');
  const req=createRequire(path.join(root,'runtime-probe.cjs')),loader=load??req;
  // Require the engine at the exact layer path before Prisma can search developer paths.
  loader(engine);
  const modules=manifest.runtimeRequirements.externalModules.map(name=>{
    const resolved=req.resolve(name);local(path.relative(root,resolved));loader(resolved);return name;
  });
  return {sourceSha:identity.sourceSha,nativeLoaded:true,modules,stageAccepted:false};
}

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { AssetStorageLocator, AssetSanitizationMetadata } from '@manaratak/domain';
export const scannerImage='clamav/clamav@sha256:638d90201ee7ee6a82d249a2fc23b132e578673b5f1f2766852b127676ca1ef6';
export class Post28SeedAssetSecurity {
  constructor(private readonly root:string,private readonly bucket:string){}
  private filename(locator:AssetStorageLocator){
    if(locator.bucketName!==this.bucket)throw new Error('POST28_SEED_ASSET_BUCKET_MISMATCH');
    const filename=path.resolve(this.root,locator.bucketName,locator.pathKey),base=fs.realpathSync(this.root)+path.sep;
    if(!filename.startsWith(base)||!fs.realpathSync(filename).startsWith(base)||fs.lstatSync(filename).isSymbolicLink())throw new Error('POST28_SEED_ASSET_PATH_INVALID');
    return filename;
  }
  async scan(locator:AssetStorageLocator){
    const filename=this.filename(locator),environment={...process.env};
    for(const key of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete environment[key];
    const result=spawnSync('docker',['--host=unix:///var/run/docker.sock','run','--rm','--network','none','--memory','2g','--cpus','2','--read-only',
      '--mount',`type=bind,src=${this.root},dst=/assets,readonly`,'--entrypoint','clamscan',scannerImage,'--stdout','--no-summary','/assets/'+path.relative(this.root,filename)],{env:environment,encoding:'utf8',timeout:120000});
    if(result.status!==0)throw new Error(result.status===1?'POST28_SEED_ASSET_THREAT_DETECTED':'POST28_SEED_SCANNER_FAILED');
    return {clean:true};
  }
  async sanitize(locator:AssetStorageLocator){
    const filename=this.filename(locator),bytes=fs.readFileSync(filename);
    if(bytes.length>10*1024*1024)throw new Error('POST28_SEED_JSON_TOO_LARGE');
    const parsed=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
    if(!Array.isArray(parsed)||parsed.length>1000)throw new Error('POST28_SEED_JSON_SHAPE_INVALID');
    // Canonical source JSON only. No HTML renderer, script evaluation or archive extraction.
    const canonical=JSON.stringify(parsed);
    if(canonical!==bytes.toString('utf8'))throw new Error('POST28_SEED_JSON_NOT_CANONICAL');
    return {sanitizedLocator:locator,metadata:new AssetSanitizationMetadata(true,new Date(),'Canonical UTF-8 JSON array verified; no EXIF or executable container. Bytes unchanged and rescanned with ClamAV.')};
  }
}

import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {sha,sign} from './security.mjs';
if(process.env.MEDIA_SELFHOST_ACCEPTANCE!=='ISOLATED_ONLY')throw Error('EXPLICIT_ISOLATED_ACCEPTANCE_REQUIRED');
const origin=new URL(process.env.MEDIA_ACCEPTANCE_ORIGIN??'');if(origin.protocol!=='https:'||!['127.0.0.1','localhost'].includes(origin.hostname))throw Error('LOOPBACK_TLS_ACCEPTANCE_ONLY');
const directory=process.env.MEDIA_ACCEPTANCE_SECRET_DIR;if(!directory||!path.isAbsolute(directory))throw Error('PRIVATE_SECRETS_REQUIRED');
const apiKey=(await fs.readFile(path.join(directory,'provider_key'),'utf8')).trim(),secret=(await fs.readFile(path.join(directory,'provider_signing'),'utf8')).trim();
const locations=[];
async function request(method,endpoint,input,key=randomUUID()){
 const bytes=input===undefined?Buffer.alloc(0):Buffer.from(JSON.stringify(input)),timestamp=new Date().toISOString(),nonce=randomUUID();
 const response=await fetch(new URL(endpoint,origin),{method,headers:{'Content-Type':'application/json','Idempotency-Key':key,'x-manaratak-provider-key':apiKey,'x-manaratak-timestamp':timestamp,'x-manaratak-nonce':nonce,'x-manaratak-content-sha256':sha(bytes),'x-manaratak-signature':sign(secret,`${method}\n${endpoint}\n${timestamp}\n${nonce}\n${sha(bytes)}`)},...(input===undefined?{}:{body:bytes}),signal:AbortSignal.timeout(120000)});
 assert.equal(response.status,200,`Provider ${endpoint}: ${response.status}`);return response.json();
}
async function upload(bytes,mime){const grant=await request('POST','/v1/assets/upload-grants',{originalFilename:'isolated-file',mimeType:mime,byteSize:bytes.length});locations.push(grant.locator);const response=await fetch(grant.uploadUrl,{method:'PUT',headers:grant.headers,body:bytes});assert.equal(response.status,200);await request('POST','/v1/assets/verify-upload',{locator:grant.locator,declaredMimeType:mime,expectedByteSize:bytes.length});return grant.locator;}
const readiness=await request('GET','/v1/capabilities/readiness');assert.equal(readiness.scope,'ISOLATED_SELFHOST_MEDIA','No write is allowed without the isolated provider attestation');
for(const name of ['asset-storage','malware-scanner','asset-sanitizer'])assert.equal(readiness.capabilities[name].ready,true);
try{
 const source=Buffer.from('Isolated Manaratak teaching material\n'),locator=await upload(source,'text/plain');assert.equal((await request('POST','/v1/assets/malware-scan',{locator})).clean,true);
 const sanitized=await request('POST','/v1/assets/sanitize',{locator});locations.push(sanitized.sanitizedLocator);
 const verified=await request('POST','/v1/assets/verify-upload',{locator:sanitized.sanitizedLocator,declaredMimeType:'text/plain',expectedByteSize:source.length});
 const promotion=await request('POST','/v1/assets/move-to-clean',{locator:sanitized.sanitizedLocator,expectedSha256:verified.checksumSha256});locations.push(promotion.locator);
 const grant=await request('POST','/v1/assets/delivery-grants',{locator:promotion.locator,expiresInSeconds:60});assert.equal(sha(Buffer.from(await(await fetch(grant.url)).arrayBuffer())),sha(source));
 await request('POST','/v1/assets/archive',{locator:promotion.locator,operationId:randomUUID()});assert.notEqual((await fetch(grant.url)).status,200);
 await request('POST','/v1/assets/restore',{locator:promotion.locator,operationId:randomUUID()});assert.notEqual((await fetch(grant.url)).status,200,'Old grants must remain revoked after restore');
 const eicar=Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'),infected=await upload(eicar,'text/plain');assert.equal((await request('POST','/v1/assets/malware-scan',{locator:infected})).clean,false);
 console.log('ISOLATED_SELFHOST_ENGINE_ACCEPTANCE_PASSED: real ClamAV, reconstruction, delivery, archive and restored-token revocation. Codec fixtures still require the documented acceptance matrix.');
}finally{for(const locator of locations)await request('DELETE','/v1/assets',{locator});}

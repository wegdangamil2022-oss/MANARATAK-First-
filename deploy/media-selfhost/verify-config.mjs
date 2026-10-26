import fs from 'node:fs/promises';
import path from 'node:path';
const filename=process.argv[2];if(!filename||!path.isAbsolute(filename))throw Error('PRIVATE_ENV_FILE_REQUIRED');
const values=Object.fromEntries((await fs.readFile(filename,'utf8')).split(/\r?\n/).filter(line=>line&&!line.trim().startsWith('#')).map(line=>{const index=line.indexOf('=');if(index<1)throw Error('ENV_FORMAT_INVALID');return[line.slice(0,index).trim(),line.slice(index+1).trim()];}));
for(const key of ['NODE_IMAGE','CLAMAV_IMAGE'])if(!/^[a-zA-Z0-9./:_-]+@sha256:[a-f0-9]{64}$/.test(values[key]??''))throw Error('AUDITED_IMAGE_DIGEST_REQUIRED');
const repository=path.resolve(import.meta.dirname,'../..');
for(const key of ['MEDIA_DATA_DIR','MEDIA_SECRET_DIR']){const directory=values[key];if(!directory||!path.isAbsolute(directory)||path.resolve(directory)===repository||path.resolve(directory).startsWith(repository+path.sep))throw Error('PRIVATE_OPERATOR_DIRECTORY_REQUIRED');}
for(const key of ['MEDIA_PUBLIC_ORIGIN','MEDIA_ALLOWED_ORIGINS'])for(const value of (values[key]??'').split(',')){const url=new URL(value);if(url.origin!==value||url.protocol!=='https:'||url.username||url.password)throw Error('EXPLICIT_HTTPS_ORIGIN_REQUIRED');}
if(values.MEDIA_DATA_DIR===values.MEDIA_SECRET_DIR)throw Error('SEPARATE_DATA_AND_SECRETS_REQUIRED');
console.log('Private configuration validated; no values or credentials printed. No service started.');

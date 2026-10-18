import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

// Read-only: the recorded hashes are authoritative and are never regenerated here.
export function verifyEvidenceIndex(indexFile,{gitRef,root=process.cwd()}={}) {
 const base=fs.realpathSync(path.dirname(indexFile)),index=JSON.parse(fs.readFileSync(indexFile,'utf8'));
 if(!Array.isArray(index.files)||!index.files.length)throw Error('EVIDENCE_INDEX_INVALID');
 const seen=new Set();
 for(const entry of index.files){
  if(typeof entry.path!=='string'||!entry.path||path.isAbsolute(entry.path)||entry.path.includes('\\')||entry.path.split('/').some(p=>['..','.',''].includes(p))||seen.has(entry.path)||!Number.isSafeInteger(entry.bytes)||entry.bytes<0||!/^[0-9a-f]{64}$/.test(entry.sha256))throw Error('EVIDENCE_ENTRY_INVALID');
  seen.add(entry.path);
  const file=path.resolve(base,entry.path);
  if(!file.startsWith(base+path.sep)||fs.realpathSync(file)!==file||fs.lstatSync(file).isSymbolicLink())throw Error('EVIDENCE_PATH_UNSAFE');
  const bytes=gitRef?execFileSync('git',['show',(gitRef===':'?'':gitRef)+':'+path.relative(root,file).replaceAll('\\','/')],{cwd:root,maxBuffer:32*1024*1024}):fs.readFileSync(file);
  if(bytes.length!==entry.bytes||createHash('sha256').update(bytes).digest('hex')!==entry.sha256)throw Error('EVIDENCE_BYTES_MISMATCH: '+entry.path);
 }
 return {files:seen.size,sourceSha:index.sourceSha,gitRef:gitRef??null,readOnly:true};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 try{console.log(JSON.stringify(verifyEvidenceIndex(path.resolve(process.argv[2]),{gitRef:process.argv[3]})));}
 catch(error){console.error(error.message);process.exitCode=1;}
}

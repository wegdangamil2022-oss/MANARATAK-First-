import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const directory=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(directory,'../../..');
const read=name=>JSON.parse(fs.readFileSync(path.join(directory,name),'utf8'));
const fail=code=>{throw new Error(code);};
const check=entry=>{
 const file=path.resolve(root,entry.path);
 if(!file.startsWith(root+path.sep)||!fs.realpathSync(file).startsWith(root+path.sep))fail('HANDOFF_PATH_INVALID');
 const bytes=fs.readFileSync(file);
 if(bytes.length!==entry.bytes||createHash('sha256').update(bytes).digest('hex')!==entry.sha256)fail('HANDOFF_HASH_MISMATCH');
};
try{
 const matrix=read('required-case-status.json'),ledger=read('postgres-results-ledger.json'),index=read('historical-evidence-index.json'),bundle=read('package-hashes.json');
 if(matrix.rows.length!==26||new Set(matrix.rows.map(r=>r.caseId)).size!==26||matrix.fullCasesAccepted!==0||matrix.rows.some(r=>r.handoffAcceptance!=='NOT_ACCEPTED'||r.fullScenarioPassed!==false||!r.whatSucceeded||!r.whatRemains||!r.acceptanceBlockers.caseSpecific.length))fail('HANDOFF_MATRIX_INVALID');
 if(Object.values(ledger.distinctBySuite).reduce((a,b)=>a+b,0)!==283||ledger.distinctSuccessfulDatabaseCases!==283||ledger.handoffNewExecutionCount!==0)fail('HANDOFF_ACCOUNTING_INVALID');
 for(const file of [...index.files,...bundle.files,...bundle.dependencyEvidence])check(file);
 for(const row of ledger.accountingSources){const file=path.resolve(root,row.path);if(createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==row.sha256)fail('HANDOFF_ACCOUNTING_HASH_MISMATCH');}
 execFileSync('git',['diff','--exit-code',matrix.handoffSourceStateSha,'--','apps','packages','scripts','config','tests'],{cwd:root,stdio:'pipe'});
 console.log(`HANDOFF_READ_ONLY_VERIFY=PASS INDEXED_JSON_FILES=${index.files.length} DISTINCT_POSTGRES_CASES=283 REQUIRED_CASES=26 ACCEPTED_CASES=0`);
}catch(error){console.error(/^HANDOFF_[A-Z_]+$/.test(error.message)?error.message:'HANDOFF_VERIFY_FAILED');process.exitCode=1;}

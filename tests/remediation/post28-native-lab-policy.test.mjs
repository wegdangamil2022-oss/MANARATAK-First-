import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {assertNativeLabState,nativePgEnvironment} from '../../scripts/database/post28-native-lab-policy.mjs';

function fixture(t){
 const lab=fs.mkdtempSync(path.join(os.tmpdir(),'post28-native-policy-'));
 t.after(()=>fs.rmSync(lab,{recursive:true,force:true}));
 const data=path.join(lab,'data'),bin=path.join(lab,'bin');fs.mkdirSync(data);fs.mkdirSync(bin);
 fs.writeFileSync(path.join(bin,'postgres.exe'),'synthetic binary identity fixture');
 fs.writeFileSync(path.join(data,'postmaster.pid'),`1234\n${data}\n0\n54321\n`);
 const state={kind:'POST28_NATIVE_LOCAL_LAB',scope:'DISPOSABLE',runtime:'NATIVE_WINDOWS',status:'EMPTY_TARGETS_VERIFIED',sourceSha:'abc',runId:'run',postgresMajor:16,dataDirectory:data,pgBin:bin,port:54321,postmasterPid:1234,serverIdentity:'server',postgresBinarySha256:createHash('sha256').update(fs.readFileSync(path.join(bin,'postgres.exe'))).digest('hex')};
 const contract={sourceSha:'abc',runId:'run',postgresMajor:16,targets:{'DB-U':{port:54321,host:'127.0.0.1',serverIdentity:'server'}}};
 return {lab,state,contract};
}
test('native identity accepts only the recorded cluster and binary',t=>{
 const {lab,state,contract}=fixture(t);assert.equal(assertNativeLabState(state,contract,'abc',lab).data,state.dataDirectory);
 for(const change of [{sourceSha:'other'},{postgresMajor:17},{postmasterPid:999},{port:54322},{serverIdentity:'other'},{status:'BOOTSTRAPPING'}])assert.throws(()=>assertNativeLabState({...state,...change},contract,'abc',lab));
 fs.appendFileSync(path.join(state.pgBin,'postgres.exe'),'changed');assert.throws(()=>assertNativeLabState(state,contract,'abc',lab),/BINARY_MISMATCH/);
});
test('native identity rejects a contract pointing outside the recorded local server',t=>{
 const {lab,state,contract}=fixture(t);
 for(const change of [{host:'example.com'},{port:5432},{serverIdentity:'other'}])assert.throws(()=>assertNativeLabState(state,{...contract,targets:{'DB-U':{...contract.targets['DB-U'],...change}}},'abc',lab));
});
test('native tools reject privileged roles and non-lab or remote targets',()=>{
 const state={port:54321,pgBin:'synthetic-bin'},valid='postgresql://post28_upgrader:synthetic-password@127.0.0.1:54321/manaratak_post28_upgrade_test?schema=public';
 for(const invalid of [valid.replace('127.0.0.1','example.com'),valid.replace('54321','5432'),valid.replace('post28_upgrader','post28_bootstrap'),valid.replace('manaratak_post28_upgrade_test','existing_database')])assert.throws(()=>nativePgEnvironment(state,invalid),/TARGET_INVALID/);
 const env=nativePgEnvironment(state,valid,{readOnly:true});assert.equal(env.PGPASSWORD,'synthetic-password');assert.equal(env.PGHOST,'127.0.0.1');assert.match(env.PGOPTIONS,/default_transaction_read_only=on/);assert.equal(env.PGSERVICE,undefined);assert.equal(env.DATABASE_URL,undefined);
});

import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

export function assertNativeLabState(state,contract,sourceSha,lab) {
  const realLab=fs.realpathSync(lab),data=fs.realpathSync(state.dataDirectory),bin=fs.realpathSync(state.pgBin);
  if(state.kind!=='POST28_NATIVE_LOCAL_LAB'||state.scope!=='DISPOSABLE'||state.runtime!=='NATIVE_WINDOWS'||state.status!=='EMPTY_TARGETS_VERIFIED'||
    state.sourceSha!==sourceSha||contract.sourceSha!==sourceSha||state.runId!==contract.runId||state.postgresMajor!==16||contract.postgresMajor!==16||
    data!==path.join(realLab,'data')||!Number.isInteger(state.port)||!Number.isInteger(state.postmasterPid)||state.postmasterPid<1)
    throw new Error('POST28_NATIVE_LAB_IDENTITY_MISMATCH');
  const pid=fs.readFileSync(path.join(data,'postmaster.pid'),'utf8').split(/\r?\n/);
  if(Number(pid[0])!==state.postmasterPid||fs.realpathSync(pid[1])!==data||Number(pid[3])!==state.port||
    Object.values(contract.targets).some(target=>target.port!==state.port||target.host!=='127.0.0.1'||target.serverIdentity!==state.serverIdentity))
    throw new Error('POST28_NATIVE_POSTMASTER_MISMATCH');
  if(createHash('sha256').update(fs.readFileSync(path.join(bin,'postgres.exe'))).digest('hex')!==state.postgresBinarySha256)
    throw new Error('POST28_NATIVE_BINARY_MISMATCH');
  return {data,bin};
}

export function nativePgEnvironment(state,url,{readOnly=false}={}) {
  const target=new URL(url);
  if(target.hostname!=='127.0.0.1'||Number(target.port)!==state.port||!/^manaratak_post28_[a-z0-9_]+_test$/.test(target.pathname.slice(1))||
    !/^post28_[a-z0-9_]+$/.test(target.username)||/bootstrap|admin|postgres/.test(target.username))throw new Error('POST28_NATIVE_PG_TARGET_INVALID');
  return {SystemRoot:process.env.SystemRoot,PATH:state.pgBin+';'+process.env.SystemRoot+'\\System32',TEMP:process.env.TEMP,TMP:process.env.TMP,
    PGHOST:'127.0.0.1',PGPORT:String(state.port),PGDATABASE:target.pathname.slice(1),PGUSER:decodeURIComponent(target.username),PGPASSWORD:decodeURIComponent(target.password),PGSSLMODE:'disable',
    PGOPTIONS:'-c statement_timeout=30000 -c lock_timeout=3000'+(readOnly?' -c default_transaction_read_only=on':'')};
}

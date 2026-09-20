#!/usr/bin/env node
import fs from 'node:fs';
const read=(name)=>{const p=process.env[name]; if(!p) throw new Error(`${name}_REQUIRED`); return JSON.parse(fs.readFileSync(p,'utf8'));};
const pg=read('RECOVERY_POSTGRES_READINESS_JSON'); const assets=read('RECOVERY_ASSET_READINESS_JSON'); const failures=[];
if(pg.pitrEnabled!==true) failures.push('postgres PITR disabled');
if(Number(pg.pitrWindowDays)<30) failures.push('postgres PITR window below 30 days');
if(pg.encrypted!==true||pg.immutableCopy!==true||pg.accessAudited!==true) failures.push('postgres backup security controls incomplete');
if(assets.versioningEnabled!==true||assets.crossRegionCopy!==true) failures.push('asset versioning/cross-region copy incomplete');
if(assets.encrypted!==true||assets.immutableCopy!==true||assets.accessAudited!==true) failures.push('asset backup security controls incomplete');
if(failures.length){failures.forEach(x=>console.error(`FAIL ${x}`)); process.exit(1);} console.log('RECOVERY_RUNTIME_BACKUP_READINESS=PASS');

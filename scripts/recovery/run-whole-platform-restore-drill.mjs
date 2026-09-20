#!/usr/bin/env node
import childProcess from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const required=(name)=>{const v=process.env[name]; if(!v) throw new Error(`${name}_REQUIRED`); return v;};
const databaseUrl=required('DATABASE_URL');
const databaseBackup=required('RECOVERY_DATABASE_BACKUP_FILE');
const assetDir=required('RECOVERY_ASSET_RESTORE_DIR');
const assetManifest=required('RECOVERY_ASSET_MANIFEST');
const startedAt=Date.now();
const u=new URL(databaseUrl); const db=u.pathname.replace(/^\//,'').toLowerCase();
if(!/(?:restore|disposable|sandbox|test|ci)/.test(db) && !['localhost','127.0.0.1','::1'].includes(u.hostname)) throw new Error('RECOVERY_DRILL_REQUIRES_DISPOSABLE_DATABASE');
if(!fs.existsSync(databaseBackup)) throw new Error('RECOVERY_DATABASE_BACKUP_NOT_FOUND');
if(!fs.existsSync(assetManifest)) throw new Error('RECOVERY_ASSET_MANIFEST_NOT_FOUND');
const run=(cmd,args,env={})=>childProcess.execFileSync(cmd,args,{stdio:'inherit',env:{...process.env,...env}});
if(/\.(dump|backup)$/i.test(databaseBackup)) run('pg_restore',['--clean','--if-exists','--no-owner','--dbname',databaseUrl,databaseBackup]);
else run('psql',[databaseUrl,'-v','ON_ERROR_STOP=1','-f',databaseBackup]);
const assets=JSON.parse(fs.readFileSync(assetManifest,'utf8'));
for(const item of assets.files??[]){const file=path.join(assetDir,item.path); if(!fs.existsSync(file)) throw new Error(`RECOVERY_ASSET_MISSING:${item.path}`); const sha=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); if(sha!==item.sha256) throw new Error(`RECOVERY_ASSET_HASH_MISMATCH:${item.path}`);}
run('npm',['run','test:database'],{MANARATAK_DATABASE_INTEGRATION_ENABLED:'true'});
const completedAt=Date.now();
const evidence={version:1,kind:'whole-platform-restore-drill',status:'PASS',startedAt:new Date(startedAt).toISOString(),completedAt:new Date(completedAt).toISOString(),rtoMinutes:Number(((completedAt-startedAt)/60000).toFixed(2)),databaseBackup:path.basename(databaseBackup),assetCount:(assets.files??[]).length,gitSha:process.env.GITHUB_SHA??null};
const out=process.env.RECOVERY_EVIDENCE_FILE||'recovery-evidence/RESTORE_DRILL.json'; fs.mkdirSync(path.dirname(out),{recursive:true}); fs.writeFileSync(out,JSON.stringify(evidence,null,2)+'\n'); console.log(`RECOVERY_RESTORE_DRILL=PASS evidence=${out}`);

// Explicit Windows alternative to the Docker creator. Only a NEW cluster can be created.
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import {localLabProfile} from './post28-lab-profile.mjs';

let directory;
try {
  if(process.platform!=='win32'||Number(process.versions.node.split('.')[0])!==22||process.env.NODE_ENV!=='test'||process.env.POST28_LOCAL_LAB_CREATE!=='YES')throw new Error('POST28_NATIVE_LAB_NOT_AUTHORIZED');
  const root=fs.realpathSync(process.cwd()),sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
  if(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim())throw new Error('POST28_CLEAN_SOURCE_REQUIRED');
  const bin=fs.realpathSync(process.env.POST28_NATIVE_PG_BIN),version=execFileSync(path.join(bin,'postgres.exe'),['--version'],{encoding:'utf8',windowsHide:true}).trim();
  if(!/^postgres \(PostgreSQL\) 16\./.test(version))throw new Error('POST28_NATIVE_POSTGRES16_REQUIRED');
  const base=fs.realpathSync(process.env.POST28_LAB_ROOT);
  if(base===root||base.startsWith(root+path.sep))throw new Error('POST28_NATIVE_LAB_OUTSIDE_CHECKOUT_REQUIRED');
  const profile=localLabProfile(process.env.POST28_LOCAL_LAB_PROFILE??'upgrade');
  if(profile.name!=='upgrade')throw new Error('POST28_NATIVE_UPGRADE_PROFILE_ONLY');
  directory=fs.mkdtempSync(path.join(base,'native-pg16-'));
  const account=execFileSync('whoami',[],{encoding:'utf8',windowsHide:true}).trim();
  execFileSync('icacls',[directory,'/inheritance:r','/grant:r',account+':(OI)(CI)F'],{stdio:'pipe',windowsHide:true});
  const id=randomUUID(),passwords=Object.fromEntries(['bootstrap',...profile.roles,'app'].map(key=>[key,randomBytes(24).toString('hex')]));
  const privateEnvironment={...process.env};for(const key of Object.keys(privateEnvironment))if(key.startsWith('PG'))delete privateEnvironment[key];
  privateEnvironment.PATH=bin+';'+process.env.SystemRoot+'\\System32';
  const redact=value=>Object.values(passwords).reduce((text,password)=>text.replaceAll(password,'[REDACTED]'),String(value));
  const command=(name,args,extra={})=>{const result=spawnSync(path.join(bin,name+'.exe'),args,{env:privateEnvironment,encoding:'utf8',windowsHide:true,timeout:120000,...extra});
    fs.appendFileSync(path.join(directory,'bootstrap.log'),redact(result.stdout??'')+redact(result.stderr??''));if(result.status!==0)throw new Error('POST28_NATIVE_'+name.toUpperCase()+'_FAILED');return result.stdout.trim();};
  const data=path.join(directory,'data'),passwordFile=path.join(directory,'bootstrap-password');fs.writeFileSync(passwordFile,passwords.bootstrap+'\n',{flag:'wx'});
  command('initdb',['-D',data,'-U','post28_bootstrap','--pwfile='+passwordFile,'--auth-local=scram-sha-256','--auth-host=scram-sha-256','--encoding=UTF8','--locale=C']);
  const port=await new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const value=server.address().port;server.close(()=>resolve(value));});});
  fs.appendFileSync(path.join(data,'postgresql.conf'),`\nlisten_addresses='127.0.0.1'\nport=${port}\ntimezone='UTC'\nmax_connections=40\nshared_buffers='64MB'\nlog_statement='none'\n`);
  const state={kind:'POST28_NATIVE_LOCAL_LAB',runtime:'NATIVE_WINDOWS',scope:'DISPOSABLE',profile:'upgrade',sourceSha:sha,runId:id,postgresMajor:16,postgresVersion:version,pgBin:bin,dataDirectory:data,directory,port,status:'BOOTSTRAPPING',createdAt:new Date().toISOString(),postgresBinarySha256:createHash('sha256').update(fs.readFileSync(path.join(bin,'postgres.exe'))).digest('hex')};
  fs.writeFileSync(path.join(directory,'lab-state.json'),JSON.stringify(state,null,2)+'\n');
  command('pg_ctl',['-D',data,'-l',path.join(directory,'server.log'),'-w','start']);
  state.postmasterPid=Number(fs.readFileSync(path.join(data,'postmaster.pid'),'utf8').split(/\r?\n/)[0]);
  const quote=value=>"'"+String(value).replaceAll("'","''")+"'";
  const sql=(database,input)=>command('psql',['-X','-v','ON_ERROR_STOP=1','-At'],{input,env:{...privateEnvironment,PGHOST:'127.0.0.1',PGPORT:String(port),PGUSER:'post28_bootstrap',PGPASSWORD:passwords.bootstrap,PGDATABASE:database,PGSSLMODE:'disable'}});
  sql('postgres',Object.entries(passwords).filter(([name])=>name!=='bootstrap').map(([name,password])=>`CREATE ROLE post28_${name} LOGIN PASSWORD ${quote(password)} NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;`).join('\n'));
  const targets={};
  for(const {label,kind,role,roleKind} of profile.targets){
    const database=`manaratak_post28_${kind}_test`,nonce=randomBytes(32).toString('hex');
    sql('postgres',`CREATE DATABASE ${database} OWNER post28_bootstrap TEMPLATE template0 ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C';\nREVOKE ALL ON DATABASE ${database} FROM PUBLIC;\nGRANT CONNECT ON DATABASE ${database} TO post28_${role};\nCOMMENT ON DATABASE ${database} IS ${quote(`POST28_DISPOSABLE:${id}:${label}:${nonce}`)};`);
    sql(database,`CREATE EXTENSION pg_trgm;\nREVOKE ALL ON SCHEMA public FROM PUBLIC;\nALTER SCHEMA public OWNER TO post28_${role};\nGRANT USAGE,CREATE ON SCHEMA public TO post28_${role};\nGRANT EXECUTE ON FUNCTION pg_control_system() TO post28_${role};`);
    if(label===profile.primary){sql('postgres',`GRANT CONNECT ON DATABASE ${database} TO post28_app;`);sql(database,'GRANT USAGE ON SCHEMA public TO post28_app; GRANT EXECUTE ON FUNCTION pg_control_system() TO post28_app;');}
    const identity=JSON.parse(sql(database,"SELECT json_build_object('serverIdentity',(SELECT system_identifier::text FROM pg_control_system()),'databaseOid',(SELECT oid::text FROM pg_database WHERE datname=current_database()));"));
    targets[label]={host:'127.0.0.1',port,database,role:'post28_'+role,roleKind,nonce,...identity};
  }
  state.serverIdentity=targets['DB-U'].serverIdentity;
  const contract={version:1,kind:'POST28_LOCAL_DATABASE_TARGETS',sourceSha:sha,runId:id,postgresMajor:16,targets};
  const contractFile=path.join(directory,'targets.json');fs.writeFileSync(contractFile,JSON.stringify(contract,null,2)+'\n');
  const connection=label=>{const target=targets[label],url=new URL(`postgresql://${target.role}@127.0.0.1:${port}/${target.database}`);url.password=passwords[target.role.replace('post28_','')];url.searchParams.set('schema','public');return url.href;};
  const primary=connection('DB-U'),secondary=connection('DB-V');
  const labEnv={NODE_ENV:'test',POST28_ISOLATED_EXECUTION:'YES',DATABASE_TARGET_CLASS:'DISPOSABLE',POST28_TARGET_CONTRACT_FILE:contractFile,POST28_TARGET_LABEL:'DB-U',UPGRADE_DATABASE_URL:primary,UPGRADE_VERIFY_DATABASE_URL:secondary,DATABASE_URL:primary,DIRECT_URL:primary,
    POST28_UPGRADE_VERIFY_MUTATION_TARGET:`127.0.0.1:${port}/${targets['DB-V'].database}`,POST28_APP_PASSWORD:passwords.app,DATABASE_PROVISIONING_GATE:'APPROVED',ALLOW_DATABASE_MUTATIONS:'YES',DATABASE_MUTATION_ENVIRONMENT:'test',DATABASE_MUTATION_PURPOSE:'migrate',DATABASE_MUTATION_TARGET:`127.0.0.1:${port}/${targets['DB-U'].database}`,ALLOW_PRODUCTION_DATABASE_MUTATIONS:'NO'};
  const envFile=path.join(directory,'lab.env');fs.writeFileSync(envFile,Object.entries(labEnv).map(([key,value])=>`${key}=${value}`).join('\n')+'\n');
  const result=spawnSync(process.execPath,['scripts/database/post28-preflight.mjs','--upgrade-pair','--require-empty'],{env:{...process.env,...labEnv},encoding:'utf8',windowsHide:true});
  fs.writeFileSync(path.join(directory,'target-preflight.log'),redact(result.stdout??'')+redact(result.stderr??''));
  if(result.status!==0)throw new Error('POST28_NATIVE_EMPTY_PREFLIGHT_FAILED');
  state.status='EMPTY_TARGETS_VERIFIED';state.contractFile=contractFile;state.envFile=envFile;fs.writeFileSync(path.join(directory,'lab-state.json'),JSON.stringify(state,null,2)+'\n');
  console.log(JSON.stringify({...state,authenticatedUrlsPrinted:false}));
}catch(error){console.error(error.message?.match(/^POST28_[A-Z0-9_]+$/)?.[0]??'POST28_NATIVE_LAB_CREATION_FAILED');if(directory)console.error('PRIVATE_LAB='+directory);process.exitCode=1;}

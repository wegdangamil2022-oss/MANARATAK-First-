#!/usr/bin/env node
import fs from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
import {validateTargetDeclaration} from './post28-isolation.mjs';
try {
  const contract=JSON.parse(fs.readFileSync(process.env.POST28_TARGET_CONTRACT_FILE,'utf8'));
  const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
  if(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim())throw new Error('POST28_CLEAN_SOURCE_REQUIRED');
  validateTargetDeclaration(contract,'DB-G',process.env.GREENFIELD_DATABASE_URL,process.env,sha);
  const url=new URL(process.env.GREENFIELD_DATABASE_URL);
  const args=process.argv.slice(2);
  if(args.length!==2 || args[0]!=='-Atqc' || !/^\s*SELECT\b/i.test(args[1]))throw new Error('POST28_READ_ONLY_SQL_REQUIRED');
  const connectionEnvironment={...process.env};
  for(const key of ['PGSERVICE','PGSERVICEFILE','PGSYSCONFDIR','PGHOSTADDR','PGPASSFILE'])delete connectionEnvironment[key];
  const result=spawnSync('psql',['-X','-v','ON_ERROR_STOP=1',...args],{encoding:'utf8',env:{...connectionEnvironment,PGSSLMODE:'disable',
    PGHOST:url.hostname,PGPORT:url.port||'5432',PGDATABASE:decodeURIComponent(url.pathname.slice(1)),
    PGUSER:decodeURIComponent(url.username),PGPASSWORD:decodeURIComponent(url.password),
    PGOPTIONS:'-c default_transaction_read_only=on -c statement_timeout=30000'}});
  if(result.status!==0)throw new Error('POST28_CATALOG_READ_FAILED');
  process.stdout.write(result.stdout);
} catch(error) {console.error(error.message?.match(/^POST28_[A-Z_]+$/)?.[0]??'POST28_PSQL_INPUT_INVALID');process.exitCode=1;}

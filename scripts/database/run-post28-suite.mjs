#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {preflightTargets} from './post28-isolation.mjs';
import {readDatabaseIdentity} from './post28-preflight.mjs';
import {databaseSuite} from '../../config/testing/post28-database-suites.mjs';
import {verifyDiscovery,verifySuiteResults,selectedDiscovery,requireCurrentSuiteSelection} from './post28-suite-policy.mjs';
import {requireDatabaseMutationGate} from '../lib/database-mutation-gate.mjs';
import {requirePost28LocalExecution} from './post28-neon-policy.mjs';

import {requireScopedR06Authorization} from './post28-r06-authorization.mjs';
// R04 schema must match accepted evidence. R05 remains blocked under the user's explicit local R06 disposition.
try {
  const name=process.argv[2];databaseSuite(name);
  if (process.argv.length !== 3 && !(process.argv.length === 5 && process.argv[3] === '--case-exact')) throw new Error('POST28_CASE_SELECTION_INVALID');
  const caseExact = process.argv[4];
  requireCurrentSuiteSelection(name,caseExact);
  const authorization=requireScopedR06Authorization();
  if(process.env.POST28_TARGET_LABEL!=='DB-T') throw new Error('POST28_TRANSACTION_TEST_TARGET_REQUIRED');
  requireDatabaseMutationGate('post28 disposable transaction suite',{allowedPurposes:['maintenance']});
  const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
  if(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim())throw new Error('POST28_CLEAN_SOURCE_REQUIRED');
  const contract=JSON.parse(fs.readFileSync(process.env.POST28_TARGET_CONTRACT_FILE,'utf8'));
  // Read-only Neon proof is not a destructive execution capability. Child test
  // harnesses and migration tools require their own reviewed remote adapter.
  requirePost28LocalExecution(contract);
  const targets=await preflightTargets(contract,[{label:'DB-T',url:process.env.DATABASE_URL}],process.env,sha,readDatabaseIdentity,{requireValidatedCatalog:true});
  if(targets[0].publicTables<281)throw new Error('POST28_MIGRATED_SCHEMA_REQUIRED');
  const baseDirectory=path.resolve(process.env.POST28_EVIDENCE_DIR ?? path.join(path.dirname(process.env.POST28_TARGET_CONTRACT_FILE),'R06-suites'));
  fs.mkdirSync(baseDirectory,{recursive:true,mode:0o700});
  const realBase=fs.realpathSync(baseDirectory),root=fs.realpathSync(process.cwd());
  if(realBase===root||realBase.startsWith(root+path.sep))throw new Error('POST28_EVIDENCE_OUTSIDE_CHECKOUT_REQUIRED');
  const out=fs.mkdtempSync(path.join(baseDirectory,name+'-'));
  const env={...process.env,POST28_DATABASE_SUITE:name,RUN_DATABASE_INTEGRATION_TESTS:'true',
    DATABASE_MUTATIONS_ALLOWED:'true',MANARATAK_DATABASE_INTEGRATION_ENABLED:'true',
    W3_DATABASE_TEST_DATABASE_URL:process.env.DATABASE_URL,W3_DATABASE_TEST_DATABASE_IS_DISPOSABLE:'true',
    EAP_EPHEMERAL_DB_TESTS:'true',EAP_LOCAL_DISPOSABLE_DB_TESTS:'true',DIRECT_URL:process.env.DATABASE_URL};
  delete env.POST28_TRANSACTION_SETUP_URL;delete env.POST28_APP_PASSWORD;
  const base=['node_modules/vitest/vitest.mjs'];
  const collected=spawnSync(process.execPath,[...base,'list','--config','config/testing/post28-database-vitest.config.ts','--json'],{encoding:'utf8',maxBuffer:16*1024*1024,env});
  if(collected.status!==0){
    const secrets=['DATABASE_URL','DIRECT_URL','POST28_APP_PASSWORD'].flatMap(key=>{
      const value=env[key];if(!value)return[];
      try{return[value,decodeURIComponent(new URL(value).password)].filter(Boolean);}catch{return[value];}
    });
    const redact=value=>secrets.reduce((text,secret)=>text.replaceAll(secret,'[REDACTED]'),String(value??'')).replace(/postgres(?:ql)?:\/\/[^\s'"<>]+/g,'[REDACTED_POSTGRES_URL]');
    fs.writeFileSync(path.join(out,'discovery-failure.json'),JSON.stringify({sourceSha:sha,suite:name,exit:collected.status,signal:collected.signal,error:collected.error?.code,stdout:redact(collected.stdout),stderr:redact(collected.stderr)},null,2)+'\n');
    throw new Error('POST28_RUNTIME_DISCOVERY_FAILED');
  }
  const rows=JSON.parse(collected.stdout);verifyDiscovery(name,rows);
  const selected = selectedDiscovery(name,rows,caseExact);
  const selectionArgs = caseExact === undefined ? [] : ['--testNamePattern', '^' + caseExact.split(' > ').join(' ').replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'];
  fs.writeFileSync(path.join(out,'selection.json'),JSON.stringify({caseExact:caseExact??null,fullDiscoveryCases:rows.length,selectedCases:selected.length,fullProfileAcceptance:caseExact===undefined},null,2)+'\n');
  fs.writeFileSync(path.join(out,'discovery.json'),JSON.stringify(rows,null,2)+'\n');
  const resultFile=path.join(out,'vitest.json');
  const result=spawnSync(process.execPath,[...base,'run','--config','config/testing/post28-database-vitest.config.ts','--reporter=default','--reporter=json','--outputFile',resultFile,...selectionArgs],{env,stdio:'inherit'});
  if(result.status!==0)throw new Error('POST28_DATABASE_SUITE_EXECUTION_FAILED');
  const counts=verifySuiteResults(name,rows,JSON.parse(fs.readFileSync(resultFile,'utf8')),process.cwd(),caseExact);
  const summary={kind:'POST28_DATABASE_SUITE_EXECUTION',sourceSha:sha,suite:name,caseExact:caseExact??null,fullDiscoveryCases:rows.length,fullProfileAcceptance:caseExact===undefined,authorization,targets,...counts};
  fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));
} catch(error) {
  console.error(error.message?.match(/^POST28_[A-Z_]+$/)?.[0] ?? 'POST28_DATABASE_RUNNER_INPUT_INVALID');process.exitCode=1;
}

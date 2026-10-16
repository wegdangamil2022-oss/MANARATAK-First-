#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {preflightTargets} from './post28-isolation.mjs';
import {readDatabaseIdentity} from './post28-preflight.mjs';
import {databaseSuite} from '../../config/testing/post28-database-suites.mjs';
import {verifyDiscovery,verifySuiteResults} from './post28-suite-policy.mjs';
import {requireDatabaseMutationGate} from '../lib/database-mutation-gate.mjs';
import {requirePost28LocalExecution} from './post28-neon-policy.mjs';

// Must be invoked only after R04/R05 parity and before destructive DB-T tests.
try {
  const name=process.argv[2];databaseSuite(name);
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
  const baseDirectory=path.resolve(process.env.POST28_EVIDENCE_DIR ?? 'test-results/post28');
  fs.mkdirSync(baseDirectory,{recursive:true,mode:0o700});
  const out=fs.mkdtempSync(path.join(baseDirectory,name+'-'));
  const env={...process.env,POST28_DATABASE_SUITE:name,RUN_DATABASE_INTEGRATION_TESTS:'true',
    DATABASE_MUTATIONS_ALLOWED:'true',MANARATAK_DATABASE_INTEGRATION_ENABLED:'true',
    W3_DATABASE_TEST_DATABASE_URL:process.env.DATABASE_URL,W3_DATABASE_TEST_DATABASE_IS_DISPOSABLE:'true',
    EAP_EPHEMERAL_DB_TESTS:'true',EAP_LOCAL_DISPOSABLE_DB_TESTS:'true',DIRECT_URL:process.env.DATABASE_URL};
  const base=['node_modules/vitest/vitest.mjs'];
  const collected=spawnSync(process.execPath,[...base,'list','--config','config/testing/post28-database-vitest.config.ts','--json'],{encoding:'utf8',maxBuffer:16*1024*1024,env});
  if(collected.status!==0)throw new Error('POST28_RUNTIME_DISCOVERY_FAILED');
  const rows=JSON.parse(collected.stdout);verifyDiscovery(name,rows);
  fs.writeFileSync(path.join(out,'discovery.json'),JSON.stringify(rows,null,2)+'\n');
  const resultFile=path.join(out,'vitest.json');
  const result=spawnSync(process.execPath,[...base,'run','--config','config/testing/post28-database-vitest.config.ts','--reporter=json','--outputFile',resultFile],{env,stdio:'inherit'});
  if(result.status!==0)throw new Error('POST28_DATABASE_SUITE_EXECUTION_FAILED');
  const counts=verifySuiteResults(name,rows,JSON.parse(fs.readFileSync(resultFile,'utf8')));
  const summary={kind:'POST28_DATABASE_SUITE_EXECUTION',sourceSha:sha,suite:name,targets,...counts};
  fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));
} catch(error) {
  console.error(error.message?.match(/^POST28_[A-Z_]+$/)?.[0] ?? 'POST28_DATABASE_RUNNER_INPUT_INVALID');process.exitCode=1;
}

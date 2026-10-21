#!/usr/bin/env node
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {migrationInventory,verifyMigrationLedger} from './post28-migration-inventory.mjs';
try {
  const [file]=process.argv.slice(2);
  if(!file||process.argv.length!==3)throw new Error('POST28_LEDGER_FILE_REQUIRED');
  const sourceSha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
  if(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim())throw new Error('POST28_CLEAN_SOURCE_REQUIRED');
  const inventory=migrationInventory();
  const counts=verifyMigrationLedger(inventory,JSON.parse(fs.readFileSync(file,'utf8')));
  console.log(JSON.stringify({kind:'POST28_LEDGER_COMPARISON',sourceSha,chainSha256:inventory.chainSha256,...counts,
    runtimeAcceptance:false,note:'Comparison only; target identity, catalog, parity and provenance are separate required gates.'}));
}catch(error){console.error(error.message?.match(/^POST28_[A-Z_]+$/)?.[0]??'POST28_LEDGER_INPUT_INVALID');process.exitCode=1;}

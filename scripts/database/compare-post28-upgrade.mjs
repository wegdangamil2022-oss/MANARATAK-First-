#!/usr/bin/env node
import fs from 'node:fs';
import {verifyUpgradePreservation} from './post28-upgrade-preservation.mjs';
try {
  if(process.argv.length!==5)throw new Error('POST28_UPGRADE_COMPARISON_INPUT_REQUIRED');
  const [plan,before,after]=process.argv.slice(2).map(file=>JSON.parse(fs.readFileSync(file,'utf8')));
  console.log(JSON.stringify(verifyUpgradePreservation(plan,before,after)));
}catch(error){console.error(error.message?.match(/^POST28_[A-Z_]+$/)?.[0]??'POST28_UPGRADE_COMPARISON_INVALID');process.exitCode=1;}

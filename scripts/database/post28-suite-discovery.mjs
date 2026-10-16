#!/usr/bin/env node
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {databaseSuite} from '../../config/testing/post28-database-suites.mjs';
import {verifyDiscovery} from './post28-suite-policy.mjs';
const name = process.argv[2];
databaseSuite(name);
const result = spawnSync(process.execPath,['node_modules/vitest/vitest.mjs','list','--config',
  'config/testing/post28-database-vitest.config.ts','--json','--staticParse'],
{encoding:'utf8',maxBuffer:8*1024*1024,env:{...process.env,POST28_DATABASE_SUITE:name}});
if (result.status !== 0) {console.error('POST28_STATIC_DISCOVERY_FAILED');process.exit(1);}
const rows=JSON.parse(result.stdout);verifyDiscovery(name,rows);
const report={kind:'POST28_STATIC_DATABASE_DISCOVERY',suite:name,definitions:rows.length,
  files:databaseSuite(name).files,parameterizedCasesExpanded:false,runtimeExecuted:false};
if(process.env.POST28_DISCOVERY_FILE) fs.writeFileSync(process.env.POST28_DISCOVERY_FILE,JSON.stringify({report,rows},null,2)+'\n');
console.log(JSON.stringify(report));

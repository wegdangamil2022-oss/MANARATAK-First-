#!/usr/bin/env node
import Module from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {preflightTargets} from './post28-isolation.mjs';
import {readDatabaseIdentity} from './post28-preflight.mjs';
import {requireDatabaseMutationGate} from '../lib/database-mutation-gate.mjs';
import {requirePost28LocalExecution} from './post28-neon-policy.mjs';

export function prismaDiffArguments(mode, env = process.env) {
  const schema='packages/infrastructure/prisma/schema.prisma';
  if(mode==='replayed') return ['migrate','diff','--from-schema-datasource',schema,'--to-schema-datamodel',schema,'--exit-code'];
  if(mode==='migrations') return ['migrate','diff','--from-migrations','packages/infrastructure/prisma/migrations',
    '--to-schema-datamodel',schema,'--shadow-database-url',env.GREENFIELD_SHADOW_DATABASE_URL,'--exit-code'];
  throw new Error('POST28_DIFF_MODE_INVALID');
}
export function runPrismaMain(entry, args) {
  // Only the Node wrapper/mode is in OS argv. Prisma receives private in-memory
  // argv; Schema Engine receives the URL through its JSON-RPC input stream.
  process.argv=[process.execPath,entry,...args];
  Module.runMain(entry);
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
  try {
    const mode=process.argv[2];
    const args=prismaDiffArguments(mode);
    process.env.DATABASE_URL=process.env.GREENFIELD_DATABASE_URL;
    process.env.DIRECT_URL=process.env.GREENFIELD_DATABASE_URL;
    if(mode==='migrations')requireDatabaseMutationGate('post28 migration-chain shadow diff',{allowedPurposes:['migrate']});
    const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
    if(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim())throw new Error('POST28_CLEAN_SOURCE_REQUIRED');
    const contract=JSON.parse(fs.readFileSync(process.env.POST28_TARGET_CONTRACT_FILE,'utf8'));
    requirePost28LocalExecution(contract);
    await preflightTargets(contract,[{label:'DB-G',url:process.env.GREENFIELD_DATABASE_URL},
      {label:'DB-S',url:process.env.GREENFIELD_SHADOW_DATABASE_URL}],process.env,sha,readDatabaseIdentity);
    process.env.DATABASE_URL=process.env.GREENFIELD_DATABASE_URL;
    process.env.DIRECT_URL=process.env.GREENFIELD_DATABASE_URL;
    for(const stream of [process.stdout,process.stderr]) {
      const write=stream.write.bind(stream);
      stream.write=(chunk,...rest)=>write(String(chunk).replace(/postgres(?:ql)?:\/\/[^\s'"<>]+/g,'[REDACTED_POSTGRES_URL]'),...rest);
    }
    runPrismaMain(path.resolve('node_modules/prisma/build/index.js'),args);
  } catch(error) {
    console.error(error.message?.match(/^(?:POST28_|TARGET_AND_SHADOW_)[A-Z_]+$/)?.[0]??'POST28_DIFF_FAILED');process.exitCode=1;
  }
}

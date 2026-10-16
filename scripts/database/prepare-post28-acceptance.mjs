#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {migrationInventory,digest} from './post28-migration-inventory.mjs';
export function prepareAcceptance(root=process.cwd()) {
  const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
  const inventory=migrationInventory(root);
  const baseline=JSON.parse(fs.readFileSync(path.join(root,'scripts/database/database-baseline.manifest.json'),'utf8'));
  const catalogDirectory=path.join(root,'docs/remediation/post28-readiness-20261016');
  const read=name=>JSON.parse(fs.readFileSync(path.join(catalogDirectory,name+'.json'),'utf8'));
  const relationships=read('relationships'),cases=read('cases'),fixtures=read('fixtures'),decisions=read('decisions');
  const notValidCandidates=inventory.migrations.flatMap(row=>{
    const file=`packages/infrastructure/prisma/migrations/${row.name}/migration.sql`;
    return fs.readFileSync(path.join(root,file),'utf8').split('\n').flatMap((line,index)=>
      /\bNOT\s+VALID\b/i.test(line)&&!/^\s*--/.test(line)?[{file,line:index+1,text:line.trim()}]:[]);
  });
  const dirty=Boolean(git('status','--porcelain'));
  return {version:1,kind:'POST28_ACCEPTANCE_PREPARATION',sourceSha:git('rev-parse','HEAD'),sourceTree:git('rev-parse','HEAD^{tree}'),
    cleanSource:!dirty,diffSha256:digest(git('diff','HEAD')),runtimeExecuted:false,runtimeAcceptance:false,
    migrationInventory:inventory,notValidCandidates,notValidMeaning:'Static review candidates, including CHECK constraints; live pg_constraint and orphan audit remain required.',
    databaseHosting:{provider:'NEON_PLANNED_BY_USER',accountConfirmed:null,connectionConfigured:null,postgresMajor:null,
      recommendedRehearsalMajor:16,declarationPolicy:'scripts/database/post28-neon-policy.mjs (offline checks plus provider/SQL-bound read-only preflight; no remote mutation authority)',existingGuardSupport:'LOCAL_ONLY',remoteExecution:'BLOCKED_PENDING_REMOTE_MUTATION_ADAPTER_AND_AUTHORIZATION',
      remoteReadOnlyPreflight:'IMPLEMENTED_REQUIRES_PROVIDER_AUTH_DIRECT_TLS_TCP_AND_LIMITED_ROLES',
      network:'HTTPS policy alone does not grant PostgreSQL TCP; exact direct endpoint must be configured through environment networking.'},
    relationCoverage:{rows:relationships.rows.length,cases:cases.cases.length,fixtureSpecifications:fixtures.fixtures.length,
      sourceCatalogSha256:digest(fs.readFileSync(path.join(catalogDirectory,'relationships.json'))),decisions:decisions.decisions.map(row=>({id:row.decisionId,status:row.status})),
      executableOwnerFixtures:false,measuredRuntimeCases:0},
    R04:{status:'PREPARED_NOT_EXECUTED',requires:['R02-core','R03 live provider identity and least privilege','clean frozen SHA'],
      sequence:['freeze migration names and checksums','empty DB-G and separate DB-S live preflight','deploy to DB-G','exact ledger comparison','review orphan/catalog and NOT VALID validation','schema and migration-directory diff','deploy again and compare unchanged ledger','baseline counts','required-only seed dry-run/apply/reconciliation/reapply'],
      requiredEvidence:['target identities','migration-ledger.json','migration-ledger-comparison.json','catalog constraints/indexes/triggers','diff exit codes','idempotent redeploy','seed fingerprints and reconciliation'],
      automatedConstraintValidation:false,seedAutomatic:false},
    R05:{status:'PREPARED_PREDECESSOR_AND_DATA_REQUIRED',requires:['R04 accepted','separate DB-U','known predecessor SHA/client/migration prefix','synthetic legacy fixture contract','verified rehearsal backup and separate restore target','approved time/lock budgets'],
      predecessorSha:null,upgradePlan:{version:1,runId:null,beforeSourceSha:null,afterSourceSha:git('rev-parse','HEAD'),
        requiredModels:Object.keys(baseline.models).sort(),requiredInvariants:['immutableReceipts','financialLedger','studentConsent','assetBindings','universityPrograms','scholarshipTargets','courseProjections','publishedVersions']},
      comparisonCommand:'node scripts/database/compare-post28-upgrade.mjs <plan.json> <before.json> <after.json>',
      comparisonScope:'Exact counts, invariant hashes and integer money groups only. No accepted delta until separately reviewed. Not a measurement producer or runtime certification.',
      measuredSnapshotProducer:'REQUIRED_NOT_IMPLEMENTED',fixtureStatus:'SPECIFIED_NOT_PROVISIONED'},
    laterStages:[
      {stage:'R06',target:'DB-T',requires:'R04/R05 accepted; real two-connection owner transactions and rollback barriers; DEC dependencies',status:'NOT_EXECUTED'},
      {stage:'R07',target:'built API/web/admin artifacts',requires:'R01-R06; fixed digests and actual boot/readiness',status:'NOT_EXECUTED'},
      {stage:'R08',target:'DB-E plus isolated Redis/storage/provider stubs',requires:'real worker/outbox/retry/lease effects; no real sending or payments',status:'NOT_EXECUTED'},
      {stage:'R09',target:'DB-E',requires:'three built units, trusted TLS, reviewed 42-case/77-row coverage, FG-024 scope',status:'NOT_EXECUTED'},
      {stage:'R10',target:'DB-R only',requires:'independent approvals/sentinel; non-destructive snapshot/assets measurements',status:'NOT_EXECUTED'},
      {stage:'R11',target:'DB-L',requires:'approved dataset and performance/fault budgets; real distributions',status:'NOT_EXECUTED'},
      {stage:'R12',target:'separate rollback rehearsal',requires:'known prior artifact/worker compatibility; immutable records preserved',status:'NOT_EXECUTED'},
      {stage:'R13',target:'evidence review',requires:'fresh SHA/digest-bound source/runtime signatures and all mandatory gates',status:'NOT_EXECUTED'},
      {stage:'R14',target:'owner decision',requires:'independent authorized Go/No-Go; no automatic merge/deploy',status:'NOT_EXECUTED'},
    ],productionDecision:'NO_GO'};
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
  try {
    if(process.argv.length!==3)throw new Error('POST28_PREPARATION_OUTPUT_REQUIRED');
    const root=fs.realpathSync(execFileSync('git',['rev-parse','--show-toplevel'],{encoding:'utf8'}).trim());
    const output=path.resolve(process.argv[2]);
    // Resolve the existing parent before writing; symlinks cannot place output in Git.
    const parent=fs.realpathSync(path.dirname(output));
    if(parent===root||parent.startsWith(root+path.sep))throw new Error('POST28_PREPARATION_OUTPUT_OUTSIDE_CHECKOUT_REQUIRED');
    const target=path.join(parent,path.basename(output));
    const plan=prepareAcceptance(root);
    fs.writeFileSync(target,JSON.stringify(plan,null,2)+'\n',{flag:'wx',mode:0o600});
    console.log(JSON.stringify({output:target,sourceSha:plan.sourceSha,cleanSource:plan.cleanSource,migrations:plan.migrationInventory.migrations.length,
      staticNotValidCandidates:plan.notValidCandidates.length,runtimeExecuted:false,runtimeAcceptance:false}));
  }catch(error){console.error(error.message?.match(/^POST28_[A-Z_]+$/)?.[0]??'POST28_PREPARATION_FAILED');process.exitCode=1;}
}

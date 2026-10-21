#!/usr/bin/env node
// Source coverage inventory. Does not import database tests or start any service.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {DATABASE_SUITES} from '../../config/testing/post28-database-suites.mjs';
const sourceSha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
try {
  if(process.argv.length!==3)throw new Error('POST28_RUNTIME_PREPARATION_OUTPUT_REQUIRED');
  const root=fs.realpathSync(process.cwd()),file=process.argv[2];
  if(!path.isAbsolute(file))throw new Error('POST28_RUNTIME_PREPARATION_ABSOLUTE_PATH_REQUIRED');
  const parent=fs.realpathSync(path.dirname(file));
  if(parent===root||parent.startsWith(root+path.sep))throw new Error('POST28_RUNTIME_PREPARATION_OUTSIDE_CHECKOUT_REQUIRED');
  const directory='docs/remediation/post28-readiness-20261016';
  const cases=JSON.parse(fs.readFileSync(path.join(directory,'cases.json'),'utf8')).cases;
  const matrix=JSON.parse(fs.readFileSync(path.join(directory,'relationships.json'),'utf8')).rows;
  const runtimeContract=JSON.parse(fs.readFileSync('config/release/runtime-acceptance-contract.json','utf8'));
  const r06Numbers=new Set([...Array.from({length:19},(_,i)=>i+1),26,28,29,30,35,36,40]);
  const report={version:1,kind:'POST28_R06_R09_SOURCE_PREPARATION',sourceSha,cleanSource:!execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),
    R06:{status:'PREPARED_NOT_EXECUTED',target:'DB-T',requires:['R04/R05 accepted','live limited application role','isolated synthetic owner fixtures'],
      caseRequirements:cases.filter(row=>r06Numbers.has(Number(row.caseId.slice(3)))).map(row=>({caseId:row.caseId,owners:row.owners,expected:row.expected,decisionRefs:row.decisionRefs,
        measuredExecution:false,ownerRuntimeCommand:null,expectedRuntimeCount:null})),
      databaseProfiles:Object.entries(DATABASE_SUITES).map(([profile,row])=>({profile,files:row.files,minimumDefinitions:row.minimumCases,
        runtimeExecuted:false,coverage:'Existing profiles cover only their declared files; they do not cover all R06 requirements.'})),
      concurrencyProof:['two independently identified backend PIDs','bounded barriers, not arbitrary sleeps','observed blocking/lease/CAS result','owner+audit+outbox/receipt commit-or-rollback assertions'],
      missingOwnerRuntimeCoverage:['finance SQL rollback/replay/parallel approval','student consent withdrawal and concurrent access','university/major/scholarship compound relation invariants','course projection invalidation','artifact references versus purge lock ordering'],
      accepted:false},
    R07:{status:'DIAGNOSTIC_BUILD_ALLOWED_RUNTIME_BOOT_PENDING',diagnosticCommand:'node scripts/release/post28-diagnostic-build.mjs /absolute/private/fresh-directory',
      requires:['fresh build exact SHA','API/web/admin verified tar digests and SBOM','fresh unpack outside checkout','Node22/native runtime layer/Prisma engines/external modules','live approved DB-E and Redis/storage','trusted TLS and same-source health'],
      staticPresenceIsNotBrowserOrApiBoot:true,accepted:false},
    R08:{status:'SOURCE_TESTS_ONLY_RUNTIME_PENDING',target:'separate DB-E or DB-T',requirements:runtimeContract.gates['worker-effects'],
      sourceRuntimeTests:['tests/runtime/runtime-shutdown-drain-runtime.test.mjs','tests/runtime/runtime-resource-lifecycle-runtime.test.mjs','tests/runtime/monitoring-required-dependency-runtime.test.mjs'],
      limitation:'Tests use isolated resources and do not establish actual two-worker PostgreSQL/Redis or provider effects.',accepted:false},
    R09:{status:'PREPARED_NOT_EXECUTED',relationships:matrix.length,cases:cases.length,domainMatrixCount:runtimeContract.domainMatrixCount,
      dimensions:runtimeContract.domainAssertions,requires:['three built units with actual API/DB and trusted TLS','owner permission negatives','canonical fixture IDs','approved DEC/market/teaching-language scope'],
      interceptedHttpIsNotRuntimeProof:true,accepted:false},
    databaseConnected:false,providersContacted:false,productionDecision:'NO_GO'};
  fs.writeFileSync(path.join(parent,path.basename(file)),JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify({sourceSha,R06RequiredCases:report.R06.caseRequirements.length,relationships:matrix.length,domainMatrixCount:runtimeContract.domainMatrixCount,runtimeExecuted:false}));
}catch(error){console.error(error.message?.match(/^POST28_[A-Z_]+$/)?.[0]??'POST28_RUNTIME_PREPARATION_FAILED');process.exitCode=1;}

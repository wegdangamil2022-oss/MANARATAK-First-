#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const root=process.cwd();
const read=(r)=>fs.readFileSync(path.join(root,r),'utf8');
const exists=(r)=>fs.existsSync(path.join(root,r));
const checks=[];
const check=(name,ok,detail='')=>checks.push({name,ok:Boolean(ok),detail});
const has=(r,m)=>exists(r)&&read(r).includes(m);

const matrix='docs/remediation/CROSS_PHASE_RELATIONSHIP_CLOSURE_MATRIX.md';
const report='docs/remediation/p13/P13_FINAL_SOURCE_CLOSURE_REPORT_2026-09-03.md';
const pending='docs/remediation/p13/P13_RUNTIME_PENDING_REGISTER_2026-09-03.md';
const trace='docs/remediation/p13/P13_TRACEABILITY_MATRIX_2026-09-03.md';
const historical='docs/remediation/p13/P13_HISTORICAL_EVIDENCE_REGISTER_2026-09-03.md';
for(const f of [matrix,report,pending,trace,historical,'scripts/verify-p13-final-source-closure.mjs']) check(`P13-FILE ${f}`,exists(f));

const mx=read(matrix); const rows=mx.split('\n').filter(l=>/^\| R-\d{3} \|/u.test(l));
check('P13-MATRIX current rebaselined version',mx.includes('**Version:** 3.0.0-source-rebaselined'));
check('P13-MATRIX current active status',mx.includes('**Status:** ACTIVE — SOURCE_REBASELINED / RUNTIME_EVIDENCE_PENDING'));
check('P13-MATRIX exactly 69 current relationship rows',rows.length===69,String(rows.length));
for(let i=1;i<=69;i++){const id=`R-${String(i).padStart(3,'0')}`; check(`P13-MATRIX current row ${id}`,rows.some(l=>l.startsWith(`| ${id} |`)));}
check('P13-MATRIX no Missing',!rows.some(l=>l.includes('| Missing |')));
check('P13-MATRIX no Partial',!rows.some(l=>l.includes('| Partial |')));
check('P13-MATRIX only source-closed/runtime-pending',rows.every(l=>l.includes('| Source Closed |')||l.includes('| Runtime Pending |')));
for(const id of ['R-024','R-025','R-026','R-027','R-028','R-033']){
 const row=rows.find(l=>l.startsWith(`| ${id} |`))||'';
 check(`P13-MATRIX ${id} final repaired`,row.includes('| Runtime Pending |')&&row.includes('P13 FINAL'));
}
const sourceClosedCount=rows.filter(l=>l.includes('| Source Closed |')).length; const runtimePendingCount=rows.filter(l=>l.includes('| Runtime Pending |')).length; check('P13-MATRIX current counts consistent',sourceClosedCount===2&&runtimePendingCount===67&&sourceClosedCount+runtimePendingCount===69,`sourceClosed=${sourceClosedCount},runtimePending=${runtimePendingCount}`); check('P13-REPORT retains historical P13 snapshot',has(report,'68 total; 1 Source Closed; 67 Runtime Pending; 0 Partial; 0 Missing'));

const studentDomain='packages/domain/src/students/index.ts';
const savedGate='packages/infrastructure/src/students/StudentSavedItemHydrationGateways.ts';
const dashGate='packages/infrastructure/src/students/StudentDashboardOwnerReadGateways.ts';
const dashService='packages/application/src/students/use-cases/StudentDashboardHydrationService.ts';
const progressRepo='packages/domain/src/courses/contracts/ICourseProgressRepository.ts';
const progressPrisma='packages/infrastructure/src/courses/PrismaCourseProgressRepository.ts';
const router='apps/api/src/presentation/api/router/StudentWorkspaceRouter.ts';
const di='apps/api/src/infrastructure/di/container.ts';
const webStudent='apps/web/src/features/students/StudentWorkspacePage.tsx';
const webAuth='apps/web/src/features/students/StudentAuthPage.tsx';
const webAuthenticate='apps/web/src/features/students/authenticateAccount.ts';
const publicApp='apps/web/src/features/public-template/PublicTemplateApp.tsx';
const apiClient='apps/web/src/api/client.ts';
for(const f of [studentDomain,savedGate,dashGate,dashService,progressRepo,progressPrisma,router,di,webStudent,webAuth,publicApp,apiClient]) check(`P13-SOURCE ${f}`,exists(f));
check('P13-STUDENT saved owner read contract',has(studentDomain,'HydratedStudentSavedItemDto')&&has(studentDomain,'IStudentSavedItemHydrationGateway'));
check('P13-STUDENT learning/certificate owner read contracts',has(studentDomain,'IStudentLearningReadGateway')&&has(studentDomain,'IStudentCertificateReadGateway'));
for(const c of ['MajorStudentSavedItemHydrationGateway','UniversityStudentSavedItemHydrationGateway','ScholarshipStudentSavedItemHydrationGateway']) check(`P13-HYDRATION ${c}`,has(savedGate,`export class ${c}`)&&has(di,c));
check('P13-LEARNING list-by-student repository',has(progressRepo,'listEnrollmentsByStudent')&&has(progressPrisma,'listEnrollmentsByStudent'));
check('P13-DASHBOARD P13 learning owner read',has(dashGate,'CourseStudentDashboardReadGateway')&&has(dashService,'IStudentLearningReadGateway'));
check('P13-DASHBOARD P14 certificate owner read',has(dashGate,'CertificateStudentDashboardReadGateway')&&has(dashGate,'CertificateReadModelService')&&has(dashService,'IStudentCertificateReadGateway'));
check('P13-DASHBOARD owner read DI',has(di,'studentDashboardHydrationService')&&has(di,'courseStudentDashboardReadGateway')&&has(di,'certificateStudentDashboardReadGateway'));
check('P13-DASHBOARD protected routes use hydration service',(read(router).match(/studentDashboardHydrationService\.getDashboard/g)||[]).length>=2);
check('P13-SAVED hydrated endpoint',has(router,"'/saved-items/hydrated'")&&has(router,'studentSavedItemHydrationService.listHydrated'));
check('P13-WEB hydrated saved items client/UI',has(apiClient,'listMyHydratedStudentSavedItems')&&has(webStudent,'hydratedSavedItems')&&has(webStudent,'owner?.displayName'));
check('P13-WEB real auth client',has(apiClient,'loginStudent')&&has(apiClient,'logoutStudent')&&has(apiClient,'getCurrentStudentIdentity'));
check('P13-WEB live student auth component',has(webAuth,'authenticateAccount')&&has(webAuthenticate,'client.login')&&has(webAuthenticate,'client.getCurrentSessionIdentity'));
check('P13-WEB live logout',has(webStudent,'ApiClient.logoutStudent')&&has(webStudent,"window.location.assign('/')"));
check('P13-WEB live account uses live workspace',has(publicApp,"publicDataMode === 'api'")&&has(publicApp,'<LiveStudentWorkspacePage />')&&has(publicApp,'<LiveStudentAuthPage'));
check('P13-WEB prototype workspace explicit only',has(publicApp,'PrototypeStudentWorkspacePage')&&has(publicApp,'PrototypeAuthPage'));
check('P13-WEB favorites/journey live use P15 API surface',has(publicApp,'<LiveStudentWorkspacePage initialTab="VAULT" />')&&has(publicApp,'<LiveStudentWorkspacePage initialTab="JOURNEY" />'));
check('P13-WEB local personal state initialized prototype-only',(read(publicApp).match(/publicDataMode !== 'prototype'/g)||[]).length>=5);
check('P13-WEB local push simulation prototype-only',has(publicApp,"if (publicDataMode !== 'prototype') return;"));

for(const f of ['docs/architecture/models/Enterprise-Dependency-Graph-v1.0.md','docs/architecture/models/Enterprise-Domain-Ownership-Matrix-v1.0.md','docs/architecture/models/Enterprise-Bounded-Context-Map-v1.0.md','docs/architecture/models/Enterprise-Event-Catalog-v1.0.md','docs/architecture/models/Enterprise-API-Registry-v1.0.md']){
 check(`P13-AUTHORITY ${f} roadmap v6`,has(f,'Roadmap-v6.0.md'));
 check(`P13-AUTHORITY ${f} final alignment`,has(f,'P13 Final Source Alignment'));
}
check('P13-HIST WP8 superseded',read('docs/remediation/wp8/WP8_INTEGRATION_MATRIX.md').startsWith('> **HISTORICAL / SUPERSEDED'));
check('P13-HIST P11 audit superseded',read('docs/remediation/wp10/PHASE_11_UNIVERSITY_RELATIONSHIP_CLOSURE_AUDIT_2026-08-14.md').startsWith('> **HISTORICAL / SUPERSEDED'));
check('P13-HIST Roadmap v5 superseded',read('docs/governance/roadmap/MANARATAK-2.0-Roadmap-v5.0.md').slice(0,500).includes('SUPERSEDED'));
check('P13-HIST Roadmap v4.1 superseded',read('docs/governance/roadmap/MANARATAK-2.0-Roadmap-v4.1.md').startsWith('> **HISTORICAL / SUPERSEDED'));

for(const m of ['FINAL SOURCE CLOSURE — RUNTIME PENDING','68 total; 1 Source Closed; 67 Runtime Pending; 0 Partial; 0 Missing','Runtime Pending Register','not declared fully runtime-certified']) check(`P13-REPORT ${m}`,has(report,m));
for(const m of ['Locked dependency CI execution','Database migration rehearsal','Authenticated browser E2E','P15 owner-read hydration runtime','External integrations']) check(`P13-PENDING ${m}`,has(pending,m));
check('P13-TRACE roadmap-to-tests',has(trace,'Roadmap / ownership')&&has(trace,'Source verification'));
check('P13-REPORT avoids Certified Fully',!read(report).includes('Certified Fully'));

// Production high-risk scan: explicit prototype components/tests/historical docs are intentionally excluded.
const productionRoots=['apps/api/src','apps/web/src','packages/application/src','packages/domain/src','packages/infrastructure/src'];
const files=[];
function walk(d){for(const e of fs.readdirSync(path.join(root,d),{withFileTypes:true})){const r=path.join(d,e.name); if(e.isDirectory()){if(['dist','node_modules'].includes(e.name)) continue; walk(r);} else if(/\.(?:ts|tsx|mjs|js)$/u.test(e.name)&&!/(?:\.spec\.|\.test\.)/u.test(e.name)) files.push(r);}}
for(const d of productionRoots) if(exists(d)) walk(d);
const todo=files.filter(f=>/\b(?:TODO|FIXME)\b/u.test(read(f)));
check('P13-AUDIT no production TODO/FIXME',todo.length===0,todo.join(','));
const publicLive=read(publicApp);
check('P13-AUDIT no live MOCK/GOLDEN imports',!/^import .*\b(?:MOCK_|GOLDEN_IMPORTED_COURSES)/mu.test(publicLive));
check('P13-AUDIT P15 live localStorage not authority',!read(webStudent).includes('localStorage')&&!read(webAuth).includes('localStorage'));

const pkg=JSON.parse(read('package.json')), scripts=pkg.scripts||{};
check('P13-PKG verifier script',scripts['phase13:plan:verify']==='node scripts/verify-p13-final-source-closure.mjs');
check('P13-PKG full CI includes P13',scripts['ci:source:full']?.includes('phase13:plan:verify'));
const ci=read('.github/workflows/ci.yml'); const closureManifest=JSON.parse(read('scripts/ci/source-closure-manifest.json')); const p7p13Gate=(closureManifest.gates??[]).find(g=>g.id==='p7-p13-plan'); check('P13-CI runs canonical closure manifest',ci.includes('npm run ci:closure:manifest')); check('P13-MANIFEST final source audit registered',p7p13Gate?.classification==='SOURCE'&&String(p7p13Gate.command).includes('phase13:plan:verify'));

function run(label,file){const r=spawnSync(process.execPath,[file],{cwd:root,encoding:'utf8'}); const out=`${r.stdout||''}${r.stderr||''}`; check(label,r.status===0,out.trim().slice(-1600)); return out;}
for(const [label,file,marker] of [
 ['P13-RUN P7','scripts/verify-p7-plan-closure.mjs','P7_PLAN_CLOSURE_VERIFIER = PASS'],
 ['P13-RUN P8','scripts/verify-p8-plan-closure.mjs','P8_PLAN_CLOSURE_VERIFIER = PASS'],
 ['P13-RUN P9','scripts/verify-p9-plan-closure.mjs','P9_PLAN_CLOSURE_VERIFIER = PASS'],
 ['P13-RUN P10','scripts/verify-p10-plan-closure.mjs','P10_SOURCE_CLOSED=YES'],
 ['P13-RUN P11','scripts/verify-p11-plan-closure.mjs','P11_SOURCE_CLOSED=YES'],
 ['P13-RUN P12','scripts/verify-p12-plan-closure.mjs','P12_SOURCE_CI_CONTRACT_CLOSED=YES'],
 ['P13-RUN architecture guard','scripts/architecture/verify-source-architecture-guards.mjs','SOURCE_ARCHITECTURE_GUARD=PASS'],
 ['P13-RUN source quality','scripts/quality/verify-source-quality.mjs','SOURCE_QUALITY_FILE_CYCLES=0'],
]){const out=run(label,file); check(`${label} marker`,out.includes(marker));}

let failed=0; for(const c of checks){if(c.ok) console.log(`PASS ${c.name}`); else{failed++; console.error(`FAIL ${c.name}${c.detail?` :: ${c.detail}`:''}`);}}
console.log(`P13_FINAL_SOURCE_CLOSURE=${checks.length-failed}/${checks.length}`);
console.log(`P13_SOURCE_CLOSED=${failed?'NO':'YES'}`);
console.log('P13_RUNTIME_STATUS=RUNTIME_PENDING');
process.exitCode=failed?1:0;

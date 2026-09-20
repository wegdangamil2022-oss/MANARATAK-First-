import { spawnSync } from 'node:child_process';
const gates=[
 'scripts/verify-w5-student-tools-optional-auth.mjs',
 'scripts/verify-w5-course-learner-web.mjs',
 'scripts/verify-w5-certificate-rendering.mjs',
 'scripts/verify-w5-public-saved-items.mjs',
 'scripts/verify-w5-application-tracker.mjs',
 'scripts/verify-w5-service-request-handoff.mjs',
 'scripts/verify-w5-certificate-route.mjs',
];
let passed=0;
for(const gate of gates){ const result=spawnSync(process.execPath,[gate],{stdio:'inherit'}); const ok=result.status===0; console.log(`${ok?'PASS':'FAIL'} W5_GATE ${gate}`); if(ok) passed++; }
console.log(`W5_PLAN_CLOSURE=${passed===gates.length?'PASS':'FAIL'} ${passed}/${gates.length}`);
console.log('W5_RUNTIME_DB_BROWSER_PROVIDER_PROOF=PENDING_NON_BLOCKING');
process.exitCode=passed===gates.length?0:1;

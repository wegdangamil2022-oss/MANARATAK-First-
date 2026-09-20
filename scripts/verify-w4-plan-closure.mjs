import { spawnSync } from 'node:child_process';
const scripts=[
 'scripts/architecture/verify-api-idempotency-coverage.mjs',
 'scripts/verify-w4-student-support.mjs',
 'scripts/verify-w4-search-cms.mjs',
 'scripts/verify-w4-compare.mjs',
 'scripts/verify-w4-admin-action-parity.mjs',
 'scripts/verify-w4-public-facts.mjs',
 'scripts/verify-w4-seo-prerender.mjs',
 'scripts/verify-w4-rfc7807.mjs',
 'scripts/verify-w4-cursor-pagination.mjs',
 'scripts/verify-w4-public-pagination-search.mjs',
 'scripts/verify-w4-public-course-contract.mjs',
 'scripts/verify-w4-course-origin.mjs',
 'scripts/verify-w4-admin-permissions.mjs',
 'scripts/verify-w4-review-queue.mjs',
 'scripts/verify-w4-service-contract.mjs',
 'scripts/verify-w4-public-locale.mjs',
 'scripts/verify-arabic-semantic-copy.mjs',
];
let ok=true;
for(const script of scripts){
 const r=spawnSync(process.execPath,[script],{stdio:'inherit'});
 if(r.status!==0){ok=false; console.error(`W4_PLAN_GATE_FAIL ${script}`); break;}
}
console.log(`W4_PLAN_SOURCE_CLOSURE=${ok?'PASS':'FAIL'} gates=${ok?scripts.length:'partial'}`);
process.exitCode=ok?0:1;

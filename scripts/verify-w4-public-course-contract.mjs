import fs from 'node:fs';
const d=fs.readFileSync('packages/domain/src/courses/entities/PublicCourseDto.ts','utf8');
const w=fs.readFileSync('apps/web/src/api/client.ts','utf8');
const slice=(src)=>src.slice(src.indexOf('export interface PublicCourseDto'), src.indexOf('\n}',src.indexOf('export interface PublicCourseDto'))+2);
const ds=slice(d), ws=slice(w);
const required=['ownerId','publicId','slug','displayName','canonicalName','accessType','originType','directCourseUrl'];
const checks=[
 ['owner-id-required-domain', /\n\s*ownerId:\s*string;/.test(ds)],
 ['owner-id-required-web', /\n\s*ownerId:\s*string;/.test(ws) && !/ownerId\?:/.test(ws)],
 ['identity-contract-parity', required.every(k=>new RegExp(`\\n\\s*${k}:`).test(ds)&&new RegExp(`\\n\\s*${k}:`).test(ws))],
 ['origin-access-required-web', /\n\s*accessType:\s*string;/.test(ws) && /\n\s*originType:\s*string;/.test(ws)],
];
let pass=0; for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${n}`);if(ok)pass++;}
console.log(`W4_PUBLIC_COURSE_CONTRACT=${pass===checks.length?'PASS':'FAIL'} ${pass}/${checks.length}`);process.exitCode=pass===checks.length?0:1;

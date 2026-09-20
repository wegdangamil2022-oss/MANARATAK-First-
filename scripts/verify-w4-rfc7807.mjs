import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const read=(p)=>readFileSync(p,'utf8');
const problem=read('apps/api/src/presentation/http/ProblemDetails.ts');
const middleware=read('apps/api/src/presentation/middleware/CanonicalProblemDetailsMiddleware.ts');
const global=read('apps/api/src/presentation/middleware/GlobalExceptionHandler.ts');
const app=read('apps/api/src/app.ts');
const checks=[
 ['profile-fields', ['type: string','title: string','status: number','detail: string','instance: string','code: string','traceId: string'].every(s=>problem.includes(s))],
 ['media-type', middleware.includes("application/problem+json") && global.includes("application/problem+json")],
 ['legacy-normalization', middleware.includes('legacyErrorToProblem') && middleware.includes('res.statusCode >= 400')],
 ['zod-extension', problem.includes('issues?: unknown') && problem.includes('body.issues ?? body.errors')],
 ['global-boundary', global.includes('problemDetails({') && global.includes('traceId')],
 ['installed-before-v1-routes', app.indexOf('v1Router.use(canonicalProblemDetailsMiddleware)') < app.indexOf("app.use('/api', apiRouter.getRouter())")],
];
let pass=0; for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${n}`); if(ok) pass++;}
console.log(`W4_RFC7807=${pass===checks.length?'PASS':'FAIL'} ${pass}/${checks.length}`); process.exitCode=pass===checks.length?0:1;

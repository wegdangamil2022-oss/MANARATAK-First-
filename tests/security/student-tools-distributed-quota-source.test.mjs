import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
const read=(f)=>fs.readFileSync(new URL(`../../${f}`,import.meta.url),'utf8');
test('production Student Tools quota uses the registry-owned Redis limiter with a separate namespace',()=>{
  const di=read('apps/api/src/infrastructure/di/container.ts');
  assert.match(di,/studentToolRateLimiter: asFunction/);
  assert.match(di,/runtimeResources\.getRedisClient\(\)/);
  assert.match(di,/new RedisRateLimiter\(redisClient, `\$\{namespace\}student-tools:quota:`\)/);
  assert.match(di,/if \(!productionLike\) return new DefaultRateLimiter\(\)/);
});
test('quota-store failure is fail-closed and surfaced as 503',()=>{
  const gateway=read('packages/infrastructure/src/student-tools/StudentToolGateways.ts');
  const router=read('apps/api/src/presentation/api/router/StudentToolsPublicRouter.ts');
  const app=read('apps/api/src/app.ts');
  assert.match(gateway,/STUDENT_TOOL_QUOTA_STORE_UNAVAILABLE/);
  assert.match(router,/QUOTA_STORE_UNAVAILABLE[\s\S]*?503/);
  assert.match(app,/name: 'student-tools-quota'/);
  assert.match(app,/isOptional: !isProductionOrStaging/);
});

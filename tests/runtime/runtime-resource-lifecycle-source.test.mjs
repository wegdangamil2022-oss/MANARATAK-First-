import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');

test('one process-owned registry is the only API Prisma constructor and Redis factory owner', () => {
  const registry = read('apps/api/src/infrastructure/runtime/RuntimeResourceRegistry.ts');
  const app = read('apps/api/src/app.ts');
  const container = read('apps/api/src/infrastructure/di/container.ts');
  const infrastructureIndex = read('packages/infrastructure/src/index.ts');
  assert.match(registry, /new PrismaClient/);
  assert.match(registry, /RedisClientFactory\.createClient/);
  assert.doesNotMatch(app, /PrismaConnection|RedisClientFactory\.createClient/);
  assert.doesNotMatch(container, /new PrismaClient|RedisClientFactory\.createClient/);
  assert.doesNotMatch(infrastructureIndex, /new PrismaClient|await import\('@prisma\/client'\)/);
  assert.match(container, /runtimeResourceRegistry: asValue\(runtimeResources\)/);
  assert.match(container, /redisClient: asFunction\(\(\) => runtimeResources\.getRedisClient\(\)\)/);
});

test('repositories, health and feature caches share registry-owned clients', () => {
  const app = read('apps/api/src/app.ts');
  const container = read('apps/api/src/infrastructure/di/container.ts');
  assert.match(app, /registerDependencies\(currentEnv, config, runtimeResources\)/);
  assert.match(app, /container\.resolve<any>\('prisma'\)/);
  assert.match(app, /container\.resolve<any>\('redisClient'\)/);
  assert.match(container, /new RedisStudentWorkspaceDeliveryCache\(redisClient\)/);
  assert.match(container, /new RedisCmsDeliveryCache\(redisClient\)/);
});

test('SIGTERM/SIGINT drain HTTP and close resources exactly through idempotent lifecycle', () => {
  const server = read('apps/api/src/server.ts');
  const registry = read('apps/api/src/infrastructure/runtime/RuntimeResourceRegistry.ts');
  const app = read('apps/api/src/app.ts');
  assert.match(server, /process\.once\('SIGTERM'/);
  assert.match(server, /process\.once\('SIGINT'/);
  assert.match(server, /runtimeResources\?\.beginShutdown\(\)/);
  assert.match(server, /server\.closeIdleConnections\?\.\(\)/);
  assert.match(server, /server\.close\(/);
  assert.match(server, /certificateWorkerTask \?\? Promise\.resolve\(\)/);
  assert.match(server, /Promise\.race\(\[/);
  assert.match(server, /SHUTDOWN_TIMEOUT_MS/);
  assert.match(server, /server\.closeAllConnections\?\.\(\)/);
  assert.match(server, /runtimeResources\?\.closeAll\(\)/);
  assert.match(registry, /if \(this\.closePromise\) return this\.closePromise/);
  assert.match(registry, /await redis\.quit\(\)/);
  assert.match(registry, /await prisma\.\$disconnect\(\)/);
  assert.match(app, /name: 'runtime-lifecycle'/);
  assert.match(app, /RUNTIME_SHUTTING_DOWN/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = fs.readFileSync(new URL('../../apps/api/src/infrastructure/runtime/RuntimeResourceRegistry.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;

let prismaConstructed = 0;
let prismaDisconnected = 0;
let redisConstructed = 0;
let redisQuit = 0;
class PrismaClient {
  constructor(options) { this.options = options; prismaConstructed += 1; }
  async $disconnect() { prismaDisconnected += 1; }
}
const redisClient = {
  isOpen: true,
  async quit() { redisQuit += 1; this.isOpen = false; },
  disconnect() { this.isOpen = false; },
};
const sandbox = {
  module: { exports: {} }, exports: {}, console,
  require(specifier) {
    if (specifier === '@prisma/client') return { PrismaClient };
    if (specifier === '@manaratak/infrastructure') {
      return { RedisClientFactory: { createClient() { redisConstructed += 1; return redisClient; } } };
    }
    throw new Error(`unexpected require: ${specifier}`);
  },
};
sandbox.exports = sandbox.module.exports;
vm.runInNewContext(compiled, sandbox, { filename: 'RuntimeResourceRegistry.js' });
const { RuntimeResourceRegistry } = sandbox.module.exports;

test('runtime registry owns one Prisma and Redis client and closes each exactly once', async () => {
  const registry = new RuntimeResourceRegistry({
    DATABASE_URL: 'postgresql://user:pass@localhost/db',
    REDIS_URL: 'redis://localhost:6379',
  });
  assert.equal(registry.getPrismaClient(), registry.getPrismaClient());
  assert.equal(registry.getRedisClient(), registry.getRedisClient());
  assert.equal(prismaConstructed, 1);
  assert.equal(redisConstructed, 1);
  registry.beginShutdown();
  assert.equal(registry.isShuttingDown(), true);
  await Promise.all([registry.closeAll(), registry.closeAll(), registry.closeAll()]);
  assert.equal(prismaDisconnected, 1);
  assert.equal(redisQuit, 1);
  assert.equal(registry.snapshot().closed, true);
  assert.throws(() => registry.getPrismaClient(), /RUNTIME_RESOURCES_ALREADY_CLOSED/);
});

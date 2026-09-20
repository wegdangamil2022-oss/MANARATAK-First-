import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const root = path.resolve(import.meta.dirname, '../..');
const sourcePath = path.join(root, 'packages/infrastructure/src/security/RedisRateLimiter.ts');
const source = fs.readFileSync(sourcePath, 'utf8');
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
  fileName: sourcePath,
}).outputText;

const hostRequire = require;
const module = { exports: {} };
vm.runInNewContext(`(function(require,module,exports){${transpiled}\n})`, {
  Buffer,
  console,
  process,
  setTimeout,
  clearTimeout,
}, { filename: sourcePath })(
  (specifier) => specifier === '@manaratak/core' ? {} : hostRequire(specifier),
  module,
  module.exports,
);
const { RedisRateLimiter } = module.exports;

class SharedRedisFake {
  constructor(now) {
    this.now = now;
    this.entries = new Map();
  }

  async eval(_script, options) {
    const key = options.keys[0];
    const windowMs = Number(options.arguments[0]);
    const currentTime = this.now();
    const existing = this.entries.get(key);
    const live = existing && existing.expiresAt > currentTime
      ? existing
      : { count: 0, expiresAt: currentTime + windowMs };
    live.count += 1;
    if (live.count === 1) live.expiresAt = currentTime + windowMs;
    this.entries.set(key, live);
    return [live.count, Math.max(1, live.expiresAt - currentTime)];
  }
}

test('two Student Tools limiter instances share one Redis quota window and N+1 is rejected', async () => {
  let now = 1_000_000;
  const sharedRedis = new SharedRedisFake(() => now);
  const a = new RedisRateLimiter(sharedRedis, 'manaratak:student-tools:quota:', () => now);
  const b = new RedisRateLimiter(sharedRedis, 'manaratak:student-tools:quota:', () => now);

  assert.equal((await a.consume('tool:gpa:user:42', 3, 60_000)).allowed, true);
  assert.equal((await b.consume('tool:gpa:user:42', 3, 60_000)).allowed, true);
  assert.equal((await a.consume('tool:gpa:user:42', 3, 60_000)).allowed, true);
  assert.equal((await b.consume('tool:gpa:user:42', 3, 60_000)).allowed, false);

  const restartedProcessLimiter = new RedisRateLimiter(sharedRedis, 'manaratak:student-tools:quota:', () => now);
  assert.equal((await restartedProcessLimiter.consume('tool:gpa:user:42', 3, 60_000)).allowed, false);

  now += 60_001;
  assert.equal((await restartedProcessLimiter.consume('tool:gpa:user:42', 3, 60_000)).allowed, true);
});

test('Redis failures propagate so Student Tools can fail closed instead of granting quota', async () => {
  const failingRedis = {
    async eval() {
      throw new Error('REDIS_DOWN');
    },
  };
  const limiter = new RedisRateLimiter(failingRedis, 'manaratak:student-tools:quota:');
  await assert.rejects(() => limiter.consume('tool:ai:user:42', 2, 60_000), /REDIS_DOWN/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
// Evaluate the actual entry point with inert Prisma/process/spawn dependencies: never opens a socket or process.
const source = readFileSync('scripts/certificates/verify-isolated-runtime.mjs', 'utf8').replace(
  /^import .*;\r?\n/gm,
  '',
);
const execute = new (Object.getPrototypeOf(async function () {}).constructor)(
  'process',
  'PrismaClient',
  'spawnSync',
  source,
);
const local = 'postgresql://fixture:fixture@localhost/absheer_certificate_verification';
async function run(overrides = {}, tables = []) {
  let clients = 0,
    spawns = 0;
  const environment = {
    DATABASE_URL: local,
    DIRECT_URL: local,
    CERTIFICATE_RUNTIME_ISOLATED: '1',
    ...overrides,
  };
  class InertPrisma {
    constructor() {
      clients++;
    }
    async $queryRaw() {
      return tables;
    }
    async $disconnect() {}
  }
  try {
    await execute(
      {
        env: environment,
        execPath: 'inert-node',
        exit() {
          throw new Error('EXIT');
        },
      },
      InertPrisma,
      () => {
        spawns++;
        return { status: 0 };
      },
    );
    return { clients, spawns };
  } catch (error) {
    return { clients, spawns, error: error.message };
  }
}
test('certificate rehearsal rejects foreign/wrong/mismatched targets before Prisma construction', async () => {
  for (const env of [
    {
      DATABASE_URL:
        'postgresql://fixture:fixture@invalid.example/absheer_certificate_verification',
    },
    { DATABASE_URL: local.replace('verification', 'production') },
    { CERTIFICATE_RUNTIME_ISOLATED: '0' },
    { DIRECT_URL: local + '-other' },
  ]) {
    assert.deepEqual(await run(env), {
      clients: 0,
      spawns: 0,
      error: 'CERTIFICATE_DISPOSABLE_DATABASE_REQUIRED',
    });
  }
});
test('certificate rehearsal refuses nonempty local databases before migration or tests', async () => {
  assert.deepEqual(await run({}, [{ table_name: 'existing' }]), {
    clients: 1,
    spawns: 0,
    error: 'CERTIFICATE_DATABASE_MUST_BE_EMPTY_NO_EXISTING_DATABASE_CHANGES',
  });
});
test('empty approved fixture reaches only the two inert subprocess calls', async () => {
  assert.deepEqual(await run(), { clients: 1, spawns: 2 });
});

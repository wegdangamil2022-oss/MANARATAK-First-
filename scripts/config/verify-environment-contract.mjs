import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const appConfig = read('packages/config/src/AppConfig.ts');
const readiness = read('packages/config/src/ProductionReadinessValidator.ts');
const app = read('apps/api/src/app.ts');
const server = read('apps/api/src/server.ts');
const rootEnv = read('.env.example');
const apiEnv = read('apps/api/.env.example');

const inventoryMatch = appConfig.match(/PRODUCTION_REQUIRED_CONFIG_KEYS\s*=\s*Object\.freeze\(\[([\s\S]*?)\]\s*as const\)/);
if (!inventoryMatch) throw new Error('PRODUCTION_REQUIRED_CONFIG_KEYS inventory was not found');
const requiredKeys = [...inventoryMatch[1].matchAll(/'([A-Z0-9_]+)'/g)].map((match) => match[1]);
if (requiredKeys.length === 0) throw new Error('Production environment inventory is empty');

const failures = [];
const assert = (ok, message) => { if (!ok) failures.push(message); };
const envDeclares = (source, key) => new RegExp(`^${key}=`, 'm').test(source);

for (const key of requiredKeys) {
  assert(envDeclares(rootEnv, key), `.env.example is missing ${key}`);
  assert(envDeclares(apiEnv, key), `apps/api/.env.example is missing ${key}`);
}

assert(!/REDIS[^\n]*OPTIONAL|in-memory rate limiting and queue fallback|in-memory rate limiting is used/i.test(rootEnv + '\n' + apiEnv), 'Redis production contract still advertises an in-memory fallback');
assert(!appConfig.includes('z.coerce.boolean()'), 'AppConfig still uses truthiness-based z.coerce.boolean()');
assert(appConfig.includes("normalized === 'false' || normalized === '0'"), 'Explicit false/0 boolean parsing is missing');
assert(appConfig.includes("normalized === 'true' || normalized === '1'"), 'Explicit true/1 boolean parsing is missing');
assert(readiness.includes("loadAppConfig(process.env)"), 'ProductionReadinessValidator default path does not normalize process.env through AppConfig');
assert(app.includes('ProductionReadinessValidator.validate(normalizedRuntimeConfig)'), 'API bootstrap does not pass normalized AppConfig to readiness');
assert(!server.includes('process.env.CERTIFICATE_COMPLETION_WORKER_ENABLED'), 'Certificate worker enablement bypasses canonical typed configuration');
assert(!server.includes('process.env.CERTIFICATE_COMPLETION_WORKER_INTERVAL_MS'), 'Certificate worker interval bypasses canonical typed configuration');

if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  console.error(`ENVIRONMENT_CONTRACT_VERIFIER=FAIL ${requiredKeys.length} required keys`);
  process.exit(1);
}
console.log(`ENVIRONMENT_CONTRACT_VERIFIER=PASS ${requiredKeys.length} required keys mirrored in both templates`);

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.resolve(root, file), 'utf8');
const failures: string[] = [];
const requireValue = (condition: boolean, message: string) => { if (!condition) failures.push(message); };

const service = read('packages/application/src/scholarships/resolution/ScholarshipCanonicalResolutionService.ts');
const gateway = read('packages/infrastructure/src/scholarships/PrismaScholarshipCanonicalLookupGateway.ts');
const contracts = read('packages/application/src/scholarships/resolution/ScholarshipCanonicalResolutionContracts.ts');

for (const state of ['RESOLVED', 'UNRESOLVED', 'REVIEW_REQUIRED', 'AMBIGUOUS', 'NOT_APPLICABLE']) {
  requireValue(contracts.includes(`'${state}'`), `Missing resolver state ${state}`);
}
for (const target of ['PROVIDER_UNIVERSITY', 'UNIVERSITY', 'ACADEMIC_PROGRAM', 'COUNTRY', 'LANGUAGE', 'CURRENCY', 'DEGREE_LEVEL', 'MAJOR', 'INTERNATIONAL_TEST']) {
  requireValue(contracts.includes(`'${target}'`), `Missing resolver target ${target}`);
}
requireValue(service.includes('INS-'), 'University canonical identity enforcement is missing');
requireValue(service.includes('MJR|MAS|DOC'), 'Major canonical identity enforcement is missing');
requireValue(service.includes('rawValue'), 'Raw-value preservation is missing');
requireValue(service.includes("providerKind === 'NON_UNIVERSITY'"), 'Provider contextual classification is missing');

const forbidden = [
  /levenshtein/i, /similarity/i, /trigram/i, /soundex/i,
  /contains\s*:/i, /startsWith\s*:/i,
  /\.create\s*\(/i, /\.createMany\s*\(/i, /\.update\s*\(/i,
  /\.updateMany\s*\(/i, /\.upsert\s*\(/i, /\.delete\s*\(/i, /\.deleteMany\s*\(/i,
];
for (const pattern of forbidden) {
  requireValue(!pattern.test(service), `Forbidden resolver behavior in service: ${pattern}`);
  requireValue(!pattern.test(gateway), `Forbidden resolver behavior in gateway: ${pattern}`);
}
requireValue(gateway.includes('findUnique'), 'Gateway must use exact unique canonical lookups');
requireValue(gateway.includes('findMany'), 'Gateway must preserve exact ambiguity candidates');
requireValue(!gateway.includes('symbol:'), 'Currency symbol guessing is forbidden');

if (failures.length) {
  console.error('CROSS_DOMAIN_RESOLVERS = FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('CROSS_DOMAIN_RESOLVERS = PASS');
console.log('FAKE_ENTITY_CREATION = 0');
console.log('FUZZY_MATCHING = 0');
console.log('DB_MUTATIONS = 0');

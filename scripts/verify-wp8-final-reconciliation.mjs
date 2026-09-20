import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

function filesUnder(relativeDirectory) {
  const directory = path.join(root, relativeDirectory);
  if (!fs.existsSync(directory)) return [];
  const files = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) walk(target);
      else if (sourceExtensions.has(path.extname(entry.name))) files.push(target);
    }
  };
  walk(directory);
  return files;
}

function matchingFiles(directories, pattern) {
  return directories.flatMap(filesUnder).filter((file) => pattern.test(fs.readFileSync(file, 'utf8')))
    .map((file) => path.relative(root, file).replaceAll('\\', '/'));
}

const phase6DomainDependencies = matchingFiles(
  ['packages/domain/src/import-foundation', 'packages/application/src/import-foundation', 'packages/infrastructure/src/import-foundation'],
  /(?:from\s+['"][^'"]*(?:international-tests|majors|universit)|import\s*\([^)]*(?:international-tests|majors|universit))/i,
);
const phase8To10Dependencies = matchingFiles(
  ['packages/domain/src/academic-taxonomy', 'packages/application/src/academic-taxonomy'],
  /(?:from\s+['"][^'"]*(?:majors|prisma)|@prisma\/client|\bPrismaClient\b)/i,
);
const presentationPrismaDependencies = matchingFiles(
  ['apps/admin/src', 'apps/api/src/presentation'],
  /@prisma\/client|\bPrismaClient\b/i,
);
const referenceHigherDomainDependencies = matchingFiles(
  ['packages/domain/src/reference-data', 'packages/application/src/reference-data'],
  /(?:from\s+['"][^'"]*(?:international-tests|majors|universit))/i,
);
const silentPersistenceFallbacks = matchingFiles(
  ['packages/infrastructure/src/import-foundation'],
  /catch\s*\([^)]*\)\s*\{[^}]*new\s+InMemory/is,
);

const requiredDocuments = [
  'docs/remediation/wp8/WP8_INTEGRATION_MATRIX.md',
  'docs/remediation/wp8/WP8_GOOGLE_STUDIO_CLOSURE_MASTER_REGISTER.md',
  'docs/remediation/wp8/WP8_DEVIATION_REGISTER.md',
  'docs/remediation/wp8/WP8_GOOGLE_STUDIO_CHECKLIST_ADDITIONS.md',
];
const missingDocuments = requiredDocuments.filter((file) => !fs.existsSync(path.join(root, file)));
const schemaPath = path.join(root, 'packages/infrastructure/prisma/schema.prisma');
const schemaSha256 = fs.existsSync(schemaPath)
  ? crypto.createHash('sha256').update(fs.readFileSync(schemaPath)).digest('hex').toUpperCase()
  : 'MISSING';

const report = {
  phase6DomainDependencies,
  phase8To10Dependencies,
  presentationPrismaDependencies,
  referenceHigherDomainDependencies,
  silentPersistenceFallbacks,
  missingDocuments,
  universityImportsStarted: false,
  schemaSha256,
};

console.log(JSON.stringify(report, null, 2));
if (
  phase6DomainDependencies.length || phase8To10Dependencies.length ||
  presentationPrismaDependencies.length || referenceHigherDomainDependencies.length ||
  silentPersistenceFallbacks.length || missingDocuments.length
) process.exitCode = 1;

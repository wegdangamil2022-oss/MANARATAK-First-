import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, 'docs/architecture/persistence/persistence-ownership.manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const schemaPath = path.join(root, 'packages/infrastructure/prisma/schema.prisma');
const schema = fs.readFileSync(schemaPath, 'utf8');
const models = [...schema.matchAll(/^model\s+(\w+)\s*\{/gm)].map(match => match[1]);
const errors = [];
const note = message => errors.push(message);

if (manifest.decision !== 'ADR-028') note('manifest decision must be ADR-028');
if (manifest.strategy !== 'SHARED_POSTGRESQL_SINGLE_SCHEMA_WITH_ENFORCED_DOMAIN_OWNERSHIP') note('unexpected persistence strategy');
const declared = Object.keys(manifest.models).sort();
const actual = [...models].sort();
if (JSON.stringify(declared) !== JSON.stringify(actual)) {
  note(`model ownership manifest mismatch: schema=${actual.length} manifest=${declared.length}`);
}
for (const [model, owner] of Object.entries(manifest.models)) {
  if (!owner || owner === 'UNKNOWN') note(`model ${model} has no valid owner`);
}

const delegateToModel = new Map(models.map(model => [model[0].toLowerCase() + model.slice(1), model]));
const mutationOps = new Set(['create','createMany','update','updateMany','upsert','delete','deleteMany']);
const readOps = new Set(['findUnique','findUniqueOrThrow','findFirst','findFirstOrThrow','findMany','count','aggregate','groupBy']);
const ownerForFile = relative => {
  const matches = Object.entries(manifest.adapterPathOwners)
    .filter(([prefix]) => relative.startsWith(prefix))
    .sort((a,b) => b[0].length - a[0].length);
  return matches[0]?.[1];
};
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
  const full = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(full) : [full];
});
const infraRoot = path.join(root, 'packages/infrastructure/src');
for (const file of walk(infraRoot).filter(file => file.endsWith('.ts'))) {
  const relative = path.relative(root, file).replaceAll(path.sep, '/');
  const source = fs.readFileSync(file, 'utf8');
  const fileOwner = ownerForFile(relative);
  for (const match of source.matchAll(/\b(?:this\.)?prisma\.(\w+)\.(\w+)\s*\(/g)) {
    const [, delegate, operation] = match;
    const model = delegateToModel.get(delegate);
    if (!model) continue;
    const modelOwner = manifest.models[model];
    if (!fileOwner || fileOwner === modelOwner) continue;
    if (mutationOps.has(operation)) {
      note(`forbidden cross-context mutation: ${relative} (${fileOwner}) -> ${model}.${operation} (${modelOwner})`);
      continue;
    }
    if (readOps.has(operation)) {
      const allowedOwners = manifest.approvedCrossContextReadModels[relative] ?? [];
      if (!allowedOwners.includes(modelOwner)) {
        note(`unapproved cross-context read: ${relative} (${fileOwner}) -> ${model}.${operation} (${modelOwner})`);
      }
    }
  }
}

const migrationsDir = path.join(root, 'packages/infrastructure/prisma/migrations');
const historical = new Set(manifest.historicalMigrationBaseline);
for (const entry of fs.readdirSync(migrationsDir, { withFileTypes: true }).filter(entry => entry.isDirectory())) {
  if (historical.has(entry.name)) continue;
  const sqlPath = path.join(migrationsDir, entry.name, 'migration.sql');
  if (!fs.existsSync(sqlPath)) { note(`new migration ${entry.name} has no migration.sql`); continue; }
  const sql = fs.readFileSync(sqlPath, 'utf8');
  if (!/-- MANARATAK_MIGRATION_OWNER: [^\n]+/.test(sql)) note(`new migration ${entry.name} missing MANARATAK_MIGRATION_OWNER`);
  if (!/-- MANARATAK_MIGRATION_SCOPE: (?:owner_only|cross_context_approved)/.test(sql)) note(`new migration ${entry.name} missing/invalid MANARATAK_MIGRATION_SCOPE`);
  if (!sql.includes('-- MANARATAK_ARCH_DECISION: ADR-028')) note(`new migration ${entry.name} missing ADR-028 decision marker`);
}

if (errors.length) {
  for (const error of errors) console.error(`FAIL ${error}`);
  console.error(`PERSISTENCE_BOUNDARY_VERIFIER = FAIL ${errors.length} violation(s)`);
  process.exit(1);
}
console.log(`PASS persistence model ownership complete (${models.length}/${models.length})`);
console.log('PASS direct cross-context ORM mutations = 0');
console.log(`PASS approved cross-context read-model paths = ${Object.keys(manifest.approvedCrossContextReadModels).length}`);
console.log(`PASS historical migration baseline = ${historical.size}; new migrations require ADR-028 ownership metadata`);
console.log('PERSISTENCE_BOUNDARY_VERIFIER = PASS');

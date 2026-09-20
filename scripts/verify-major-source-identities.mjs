import fs from 'node:fs';
import path from 'node:path';

const catalogsDir = path.join(process.cwd(), 'workspace', 'phase-10-major-catalogs');
const sources = [
  ['MJR', 843, 'MANARATAK_Bachelor_Majors_By_Colleges_v1.0.md'],
  ['MAS', 1116, 'MANARATAK_Master_Specializations_By_Academic_Fields_v1.0.md'],
  ['DOC', 1114, 'MANARATAK_Doctoral_Specializations_By_Academic_Fields_v1.0.md'],
  ['FEL', 329, 'MANARATAK_Fellowships_By_Professional_Domains_v1.0.md'],
];

const identities = [];
const counts = {};
for (const [prefix, expected, fileName] of sources) {
  const content = fs.readFileSync(path.join(catalogsDir, fileName), 'utf8');
  const codes = content.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^\s*\|\s*((?:MJR|MAS|DOC|FEL)-\d{4})\s*\|/);
    return match ? [match[1]] : [];
  }).filter((code) => code.startsWith(`${prefix}-`));
  counts[prefix] = codes.length;
  if (codes.length !== expected) throw new Error(`${prefix}: expected ${expected}, found ${codes.length}`);
  identities.push(...codes);
}

const occurrences = new Map();
for (const identity of identities) occurrences.set(identity, (occurrences.get(identity) ?? 0) + 1);
const duplicateSourceIds = [...occurrences].filter(([, count]) => count > 1).map(([id]) => id);
const malformedIds = identities.filter((id) => !/^(MJR|MAS|DOC|FEL)-\d{4}$/.test(id));
const missingSequenceIds = sources.flatMap(([prefix, expected]) => {
  const actual = new Set(identities.filter((id) => id.startsWith(`${prefix}-`)));
  return Array.from({ length: expected }, (_, index) => `${prefix}-${String(index + 1).padStart(4, '0')}`)
    .filter((id) => !actual.has(id));
});

const index = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'workspace', 'catalog-index', 'phase10CatalogIndex.json'), 'utf8'));
const indexCodes = index.map((item) => item.code);
const sourceSet = new Set(identities);
const indexSet = new Set(indexCodes);
const report = {
  counts,
  totalIdentities: identities.length,
  duplicateSourceIds,
  malformedIds,
  missingSequenceIds,
  indexCount: index.length,
  sourceIdsMissingFromIndex: identities.filter((id) => !indexSet.has(id)),
  indexIdsMissingFromSource: indexCodes.filter((id) => !sourceSet.has(id)),
};

console.log(JSON.stringify(report, null, 2));
if (
  report.totalIdentities !== 3402 || duplicateSourceIds.length || malformedIds.length ||
  missingSequenceIds.length || report.sourceIdsMissingFromIndex.length || report.indexIdsMissingFromSource.length
) process.exitCode = 1;

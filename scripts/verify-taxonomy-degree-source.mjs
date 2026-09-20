import fs from 'node:fs';
import path from 'node:path';

const read = (relativePath) => fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
const unique = (values) => new Set(values).size === values.length;
const between = (source, start, end) => {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  if (startIndex < 0 || endIndex < 0) throw new Error(`Could not locate source section: ${start}`);
  return source.slice(startIndex, endIndex);
};

const degreeSource = read('packages/application/src/degree-level/DegreeLevelSeedService.ts');
const degreeCodes = [...degreeSource.matchAll(/canonicalCode:\s*'([^']+)'/g)].map((match) => match[1]);
const degreeRanks = [...degreeSource.matchAll(/displayRank:\s*(\d+)/g)].map((match) => Number(match[1]));
const expectedDegreeCodes = ['DIPLOMA', 'ASSOCIATE', 'BACHELOR', 'MASTER', 'FELLOWSHIP', 'DOCTORATE', 'CERTIFICATE'];

const taxonomySource = read('packages/domain/src/academic-taxonomy/isced-f-baseline.ts');
const nodesSource = between(taxonomySource, 'export const iscedFBaselineNodes', 'export const iscedFBaselineEdges');
const edgesSource = between(taxonomySource, 'export const iscedFBaselineEdges', 'export interface ISCEDAliasSeedInput');
const aliasesSource = between(taxonomySource, 'export const iscedFBaselineAliases', 'export interface ISCEDMappingSeedInput');
const mappingsSource = taxonomySource.slice(taxonomySource.indexOf('export const iscedFBaselineMappings'));

const nodeRecords = [...nodesSource.matchAll(/nodeType:\s*AcademicTaxonomyNodeType\.([A-Z_]+),\s*\r?\n\s*canonicalCode:\s*'([^']+)'/g)]
  .map((match) => ({ type: match[1], code: match[2], key: `ISCED:${match[1]}:${match[2]}` }));
const edgeRecords = [...edgesSource.matchAll(/\{ parent:\s*'([^']+)',\s*child:\s*'([^']+)' \}/g)]
  .map((match) => ({ parent: match[1], child: match[2] }));
const aliasRecords = [...aliasesSource.matchAll(/\{ nodeKey:\s*'([^']+)',\s*locale:\s*'([^']+)',\s*alias:\s*'([^']+)' \}/g)]
  .map((match) => ({ nodeKey: match[1], locale: match[2], alias: match[3] }));
const mappingRecords = [...mappingsSource.matchAll(/\{ sourceKey:\s*'([^']+)',\s*targetStandard:\s*'([^']+)',\s*targetCode:\s*'([^']+)',\s*strength:\s*'([^']+)' \}/g)]
  .map((match) => ({ sourceKey: match[1], targetStandard: match[2], targetCode: match[3], strength: match[4] }));

const nodeKeys = nodeRecords.map((node) => node.key);
const nodeKeySet = new Set(nodeKeys);
const missingEdgeNodes = edgeRecords.flatMap(({ parent, child }) => [parent, child]).filter((key) => !nodeKeySet.has(key));
const missingAliasNodes = aliasRecords.map(({ nodeKey }) => nodeKey).filter((key) => !nodeKeySet.has(key));
const missingMappingNodes = mappingRecords.map(({ sourceKey }) => sourceKey).filter((key) => !nodeKeySet.has(key));

const report = {
  degreeLevels: {
    count: degreeCodes.length,
    codes: degreeCodes,
    ranks: degreeRanks,
    canonicalSetMatches: JSON.stringify(degreeCodes) === JSON.stringify(expectedDegreeCodes),
    uniqueCodes: unique(degreeCodes),
    uniqueRanks: unique(degreeRanks),
  },
  taxonomy: {
    nodes: nodeRecords.length,
    edges: edgeRecords.length,
    aliases: aliasRecords.length,
    mappings: mappingRecords.length,
    duplicateNodeKeys: nodeKeys.filter((key, index) => nodeKeys.indexOf(key) !== index),
    duplicateEdges: edgeRecords.map(({ parent, child }) => `${parent}->${child}`).filter((key, index, all) => all.indexOf(key) !== index),
    missingEdgeNodes: [...new Set(missingEdgeNodes)],
    missingAliasNodes: [...new Set(missingAliasNodes)],
    missingMappingNodes: [...new Set(missingMappingNodes)],
  },
  databaseWrites: 0,
};

const passed =
  report.degreeLevels.count === 7 && report.degreeLevels.canonicalSetMatches &&
  report.degreeLevels.uniqueCodes && report.degreeLevels.uniqueRanks &&
  nodeRecords.length > 0 && edgeRecords.length > 0 &&
  report.taxonomy.duplicateNodeKeys.length === 0 && report.taxonomy.duplicateEdges.length === 0 &&
  report.taxonomy.missingEdgeNodes.length === 0 && report.taxonomy.missingAliasNodes.length === 0 &&
  report.taxonomy.missingMappingNodes.length === 0;

console.log(JSON.stringify({ status: passed ? 'PASS' : 'FAIL', ...report }, null, 2));
if (!passed) process.exitCode = 1;

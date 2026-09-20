import fs from 'fs';
import path from 'path';
import { AcademicTaxonomyResolver } from '../packages/application/src/majors/services/AcademicTaxonomyResolver.ts';
import { iscedFBaselineNodes, iscedFBaselineEdges } from '../packages/domain/src/academic-taxonomy/isced-f-baseline.ts';

const resolver = new AcademicTaxonomyResolver();
const catalogIndexPath = path.join(process.cwd(), 'workspace/catalog-index/phase10CatalogIndex.json');
const catalogItems = JSON.parse(fs.readFileSync(catalogIndexPath, 'utf-8'));

const matrix: Record<string, any> = {};
const summary = {
  EXACT_MATCH: 0,
  RESOLVER_GAP: 0,
  AMBIGUOUS: 0,
  REVIEW_REQUIRED: 0,
  TRUE_TAXONOMY_GAP: 0,
  ALREADY_MAPPED: 0,
};

const degreeBreakdown = {
  MJR: { EXACT_MATCH: 0, AMBIGUOUS: 0, REVIEW_REQUIRED: 0, TRUE_TAXONOMY_GAP: 0, ALREADY_MAPPED: 0, total: 0 },
  MAS: { EXACT_MATCH: 0, AMBIGUOUS: 0, REVIEW_REQUIRED: 0, TRUE_TAXONOMY_GAP: 0, ALREADY_MAPPED: 0, total: 0 },
  DOC: { EXACT_MATCH: 0, AMBIGUOUS: 0, REVIEW_REQUIRED: 0, TRUE_TAXONOMY_GAP: 0, ALREADY_MAPPED: 0, total: 0 },
  FEL: { EXACT_MATCH: 0, AMBIGUOUS: 0, REVIEW_REQUIRED: 0, TRUE_TAXONOMY_GAP: 0, ALREADY_MAPPED: 0, total: 0 },
};

const examples: Record<string, string[]> = {
  EXACT_MATCH: [],
  AMBIGUOUS: [],
  REVIEW_REQUIRED: [],
  TRUE_TAXONOMY_GAP: [],
};

catalogItems.forEach((item: any) => {
  const name = item.displayName || item.nameAr || item.nameEn || '';
  const fieldOrDisc = item.academicFieldOrDiscipline || item.collegeOrField || '';
  const college = item.collegeOrFaculty || '';
  const code = item.classificationCode || item.code || '';
  const id = item.id || '';
  const type = code.substring(0, 3);

  const res = resolver.resolve({
    canonicalMajorName: name,
    academicFieldOrDiscipline: fieldOrDisc,
    collegeOrFaculty: college,
    classificationCode: code,
  });

  const outcome = res.outcome;
  summary[outcome] = (summary[outcome] || 0) + 1;
  
  if (degreeBreakdown[type] && outcome in degreeBreakdown[type]) {
    degreeBreakdown[type][outcome]++;
    degreeBreakdown[type].total++;
  }

  if (examples[outcome] && examples[outcome].length < 10) {
    examples[outcome].push(`${name} | ${fieldOrDisc} | ${college}`);
  }
});

let broadCount = 0;
let narrowCount = 0;
let detailedCount = 0;
iscedFBaselineNodes.forEach(n => {
  if (n.nodeType === 'ACADEMIC_FIELD') broadCount++;
  if (n.nodeType === 'DISCIPLINE') narrowCount++;
  if (n.nodeType === 'PROGRAM_AREA') detailedCount++;
});

console.log('=== ISCED-F BASELINE VERIFICATION ===');
console.log(`Total Nodes: ${iscedFBaselineNodes.length}`);
console.log(`Broad Fields (2-digit): ${broadCount}`);
console.log(`Narrow Fields (3-digit): ${narrowCount}`);
console.log(`Detailed Fields (4-digit): ${detailedCount}`);

console.log('\n=== FINAL FULL-CATALOG RESOLUTION RESULTS ===');
console.log(`Total Catalog Items: ${catalogItems.length}`);
console.log(JSON.stringify(summary, null, 2));

console.log('\n=== DEGREE LEVEL BREAKDOWN ===');
console.log(JSON.stringify(degreeBreakdown, null, 2));

console.log('\n=== EXAMPLES OF UNRESOLVED (TRUE_TAXONOMY_GAP) ===');
examples.TRUE_TAXONOMY_GAP.forEach(s => console.log(s));

console.log('\n=== EXAMPLES OF AMBIGUOUS ===');
examples.AMBIGUOUS.forEach(s => console.log(s));


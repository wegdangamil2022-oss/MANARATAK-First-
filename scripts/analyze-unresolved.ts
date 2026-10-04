import fs from 'fs';
import path from 'path';
import { AcademicTaxonomyResolver } from '../packages/application/src/majors/services/AcademicTaxonomyResolver.ts';
import { iscedFBaselineNodes, iscedFBaselineEdges } from '../packages/domain/src/academic-taxonomy/isced-f-baseline.ts';

const resolver = new AcademicTaxonomyResolver();
const catalogIndexPath = path.join(process.cwd(), 'workspace/catalog-index/phase10CatalogIndex.json');
const catalogItems = JSON.parse(fs.readFileSync(catalogIndexPath, 'utf-8'));

let unmappedCount = 0;
const unmappedSamples: string[] = [];

catalogItems.forEach((item: any) => {
  const name = item.displayName || item.nameAr || item.nameEn || '';
  const fieldOrDisc = item.academicFieldOrDiscipline || item.collegeOrField || '';
  const college = item.collegeOrFaculty || '';
  const code = item.classificationCode || item.code || '';

  const res = resolver.resolve({
    canonicalMajorName: name,
    academicFieldOrDiscipline: fieldOrDisc,
    collegeOrFaculty: college,
    classificationCode: code,
  });

  if (res.outcome === 'TRUE_TAXONOMY_GAP' || res.outcome === 'NEEDS_TAXONOMY_EXPANSION') {
    unmappedCount++;
    if (unmappedSamples.length < 50) {
      unmappedSamples.push(`${name} | ${fieldOrDisc} | ${college}`);
    }
  }
});

console.log(`Unmapped: ${unmappedCount}`);
console.log('Samples:');
unmappedSamples.forEach(s => console.log(s));

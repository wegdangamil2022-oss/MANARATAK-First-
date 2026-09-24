import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { CourseMasterArtifactParser } from '../../packages/application/src/courses/parsers/CourseMasterArtifactParser';
import { readUniversityStage34Markdown } from './UniversityStage34MarkdownReader';
import { readScholarshipMasterGuide } from './ScholarshipMasterGuideReader';

type Dataset = {
  datasetId: string;
  entityType: 'COURSE' | 'UNIVERSITY' | 'SCHOLARSHIP';
  phase?: '3_AND_4';
  sourcePath: string;
  format: 'XLSX' | 'MARKDOWN';
  version: string;
  recordCount: number;
  status: string;
  importOrder: number;
  sha256: string;
};

const root = process.cwd();
const manifestPath = path.join(root, 'workspace/import-sources/dataset-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as { datasets: Dataset[] };
const seenIds = new Set<string>();
const seenOrders = new Set<number>();
let failures = 0;

for (const dataset of manifest.datasets) {
  const absolutePath = path.resolve(root, dataset.sourcePath);
  if (!absolutePath.startsWith(path.join(root, 'workspace', 'import-sources') + path.sep)) {
    throw new Error(`Dataset path leaves import-sources: ${dataset.sourcePath}`);
  }
  if (seenIds.has(dataset.datasetId) || seenOrders.has(dataset.importOrder)) {
    throw new Error(`Duplicate dataset id or import order: ${dataset.datasetId}`);
  }
  seenIds.add(dataset.datasetId);
  seenOrders.add(dataset.importOrder);
  if (!fs.existsSync(absolutePath)) throw new Error(`Missing dataset: ${dataset.sourcePath}`);
  const bytes = fs.readFileSync(absolutePath);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (sha256 !== dataset.sha256) throw new Error(`Checksum mismatch: ${dataset.datasetId}`);

  let observedCount = 0;
  let structuralErrors = 0;
  let explicitlyImported: number | undefined;
  if (dataset.entityType === 'COURSE') {
    const parsed = await CourseMasterArtifactParser.parse({
      bytes,
      originalFilename: path.basename(absolutePath),
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      declaredByteSize: bytes.byteLength,
    });
    observedCount = parsed.rows.length;
    structuralErrors = parsed.issues.filter(issue => issue.severity === 'ERROR').length;
  } else if (dataset.entityType === 'UNIVERSITY') {
    if (dataset.phase !== '3_AND_4') throw new Error('UNIVERSITY_DATASET_PHASE_REQUIRED');
    observedCount = readUniversityStage34Markdown(bytes.toString('utf8')).length;
  } else {
    const records = readScholarshipMasterGuide(bytes.toString('utf8'));
    observedCount = records.length;
    explicitlyImported = records.filter(record => record.explicitlyImported).length;
  }
  if (observedCount !== dataset.recordCount || structuralErrors > 0) failures += 1;
  console.log(JSON.stringify({ datasetId: dataset.datasetId, sourcePath: dataset.sourcePath,
    recordCount: observedCount, expectedCount: dataset.recordCount, structuralErrors,
    explicitlyImported, checksum: 'MATCH', status: dataset.status }));
}
if (failures > 0) throw new Error(`Dataset source verification failed for ${failures} dataset(s)`);
console.log(`Dataset source verification passed: ${manifest.datasets.length} artifacts`);

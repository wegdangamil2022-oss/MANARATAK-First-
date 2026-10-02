import fs from 'node:fs';
import path from 'node:path';
import { CourseMasterArtifactParser } from '../../packages/application/src/courses/parsers/CourseMasterArtifactParser';
import { IMPORTED_COURSE_MASTER_COLUMNS } from '@manaratak/domain';
import { createHash } from 'node:crypto';
import { projectReviewedCourseSources, type CourseSourceRow } from './CourseSourceQuality';

type CourseSource = { datasetId: string; entityType: string; sourcePath: string; importOrder: number };
const root = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'workspace/import-sources/dataset-manifest.json'), 'utf8')) as { datasets: CourseSource[] };
const sources = manifest.datasets.filter(item => item.entityType === 'COURSE').sort((a, b) => a.importOrder - b.importOrder);
const input: CourseSourceRow[] = [];

for (const source of sources) {
  const absolutePath = path.resolve(root, source.sourcePath);
  const bytes = fs.readFileSync(absolutePath);
  const parsed = await CourseMasterArtifactParser.parse({
    bytes, originalFilename: path.basename(absolutePath),
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', declaredByteSize: bytes.byteLength,
  });
  if (parsed.issues.some(issue => issue.severity === 'ERROR')) throw new Error(`COURSE_SOURCE_STRUCTURE_INVALID:${source.datasetId}`);
  const artifactHash = createHash('sha256').update(bytes).digest('hex');
  input.push(...parsed.rows.map(item => ({ datasetId: source.datasetId, artifactHash, sourceRowNumber: item.sourceRowNumber, row: item.row })));
}
const result = projectReviewedCourseSources(input);
const projected = result.projected.map(item => item.row);

const outputIndex = process.argv.indexOf('--output');
if (outputIndex >= 0) {
  const outputPath = process.argv[outputIndex + 1];
  if (!outputPath || path.extname(outputPath).toLowerCase() !== '.csv') throw new Error('COURSE_SOURCE_OUTPUT_CSV_REQUIRED');
  const cell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const csv = [IMPORTED_COURSE_MASTER_COLUMNS.join(','), ...projected.map(row => [
    row.sourceOrder, row.providerLabel, row.courseName, row.directCourseUrl, row.studyFreeRaw,
    row.freeCertificateRaw, row.certificateTypeRaw, row.languageRaw, row.studyLevelRaw,
    row.courseDurationRaw, row.shortCourseTopicsRaw,
  ].map(cell).join(','))].join('\n') + '\n';
  const csvBytes = new TextEncoder().encode(csv);
  const parsedOutput = await CourseMasterArtifactParser.parse({
    bytes: csvBytes, originalFilename: 'prepared-courses.csv', mimeType: 'text/csv', declaredByteSize: csvBytes.byteLength,
  });
  if (parsedOutput.rows.length !== projected.length || parsedOutput.issues.some(issue => issue.severity === 'ERROR')) {
    throw new Error('COURSE_SOURCE_OUTPUT_CONTRACT_INVALID');
  }
  fs.writeFileSync(path.resolve(outputPath), csvBytes);
}
console.log(JSON.stringify({ mode: outputIndex >= 0 ? 'SOURCE_CSV_WRITTEN' : 'SOURCE_CHECK',
  inputRows: result.inputRows, projectedRows: projected.length, distinctUrls: result.distinctUrls,
  decisions: result.decisions, missingHistory: result.missingHistory, databaseWrites: 0 }, null, 2));

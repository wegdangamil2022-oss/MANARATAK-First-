import fs from 'node:fs';
import path from 'node:path';
import { CourseMasterArtifactParser } from '../../packages/application/src/courses/parsers/CourseMasterArtifactParser';
import { IMPORTED_COURSE_MASTER_COLUMNS } from '@manaratak/domain';

type CourseRow = Awaited<ReturnType<typeof CourseMasterArtifactParser.parse>>['rows'][number]['row'];
type CourseSource = { datasetId: string; entityType: string; sourcePath: string; importOrder: number };
const root = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'workspace/import-sources/dataset-manifest.json'), 'utf8')) as { datasets: CourseSource[] };
const sources = manifest.datasets.filter(item => item.entityType === 'COURSE').sort((a, b) => a.importOrder - b.importOrder);
const byUrl = new Map<string, string>();
const byName = new Map<string, string>();
const projected: CourseRow[] = [];
const decisions: Array<{ source: string; row: number; action: string; matches?: string }> = [];
const key = (value: string) => value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
const urlKey = (value: string) => {
  const url = new URL(value.trim());
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error(`COURSE_DIRECT_URL_INVALID:${value}`);
  url.hash = '';
  return `${url.protocol}//${url.host.toLowerCase()}${url.pathname.replace(/\/$/, '')}${url.search}`;
};

for (const source of sources) {
  const absolutePath = path.resolve(root, source.sourcePath);
  const bytes = fs.readFileSync(absolutePath);
  const parsed = await CourseMasterArtifactParser.parse({
    bytes, originalFilename: path.basename(absolutePath),
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', declaredByteSize: bytes.byteLength,
  });
  if (parsed.issues.some(issue => issue.severity === 'ERROR')) throw new Error(`COURSE_SOURCE_STRUCTURE_INVALID:${source.datasetId}`);
  for (const item of parsed.rows) {
    const original = item.row;
    const sourceRef = `${source.datasetId}#${item.sourceRowNumber}`;
    const directUrl = urlKey(original.directCourseUrl);
    const previousUrl = byUrl.get(directUrl);
    if (previousUrl) {
      decisions.push({ source: source.datasetId, row: item.sourceRowNumber, action: 'SKIP_DUPLICATE_URL', matches: previousUrl });
      continue;
    }
    const row = { ...original };
    let name = `${key(row.providerLabel)}\u0000${key(row.courseName)}`;
    const previousName = byName.get(name);
    if (previousName) {
      // These two official POK URLs are distinct Italian and English editions of one titled course.
      const isEnglishEdition = source.datasetId === 'courses-master-2-2026-09-23'
        && item.sourceRowNumber === 2129
        && directUrl === 'https://www.pok.polimi.it/course/view.php?id=204'
        && key(row.languageRaw) === 'english';
      if (!isEnglishEdition) throw new Error(`COURSE_PLATFORM_NAME_COLLISION:${sourceRef}:${previousName}`);
      row.courseName = `${row.courseName} (English)`;
      name = `${key(row.providerLabel)}\u0000${key(row.courseName)}`;
      if (byName.has(name)) throw new Error(`COURSE_PLATFORM_NAME_COLLISION:${sourceRef}`);
      decisions.push({ source: source.datasetId, row: item.sourceRowNumber, action: 'DISTINGUISH_ENGLISH_EDITION', matches: previousName });
    }
    byUrl.set(directUrl, sourceRef);
    byName.set(name, sourceRef);
    projected.push(row);
  }
}

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
  inputRows: projected.length + decisions.filter(item => item.action === 'SKIP_DUPLICATE_URL').length,
  projectedRows: projected.length, distinctUrls: byUrl.size, distinctPlatformNames: byName.size,
  decisions, databaseWrites: 0 }, null, 2));

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parse } from 'csv-parse/sync';
import { readXlsxWorkbook, spreadsheetRowsToObjects } from '@absheer/shared';
import type { UniversalImportHandoff } from '@absheer/domain';
import { EXTERNAL_COURSE_PROVIDER_SEED } from '../../packages/infrastructure/src/courses/ExternalCourseProviderSeed';
import { iscedFBaselineNodes, iscedFBaselineAliases } from '../../packages/domain/src/academic-taxonomy/isced-f-baseline';
import { sourceReviewHash } from '../../packages/application/src/import-foundation/services/CanonicalSourceReview';
import { buildUniversityCitySourceQueue, type UniversityCitySourceRow, type UniversitySourceCity } from '../../packages/application/src/universities/use-cases/UniversityCitySourceQueue';
import { inspectUniversitySourceStage, reconcileUniversityQuarantine } from '../../packages/application/src/universities/use-cases/UniversitySourceQuality';
import { readUniversityStage34Markdown } from './UniversityStage34MarkdownReader';
import { universityStage3Payload, universityStage4Payload } from './UniversityStage34Payload';
import { reconcileScholarshipGuide } from './ScholarshipSourceQuality';
import { CourseMasterArtifactParser } from '../../packages/application/src/courses/parsers/CourseMasterArtifactParser';
import { buildCourseSourceRelationshipQueue, projectReviewedCourseSources, type CourseSourceRow } from './CourseSourceQuality';

const hash = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');
const json = (value: unknown) => JSON.stringify(value, null, 2) + '\n';
const jsonl = (rows: readonly unknown[]) => rows.map(row => JSON.stringify(row)).join('\n') + '\n';
const text = (value: unknown) => String(value ?? '').trim();
type Dataset = { datasetId: string; entityType: string; sourcePath: string; sha256: string; importOrder: number; recordCount: number };

/** Offline source derivation only. No HTTP, Prisma, mutation gateway or DB env. */
export async function prepareSourceQuality(rootInput: string) {
  const root = fs.realpathSync(rootInput);
  const artifacts = new Map<string, { path: string; sha256: string; bytes: number }>();
  const read = (relative: string, expectedHash?: string): Buffer => {
    const absolute = fs.realpathSync(path.resolve(root, relative));
    const contained = path.relative(root, absolute);
    if (contained.startsWith('..') || path.isAbsolute(contained)) throw new Error('SOURCE_QC_PATH_OUTSIDE_REPOSITORY');
    const bytes = fs.readFileSync(absolute); const sha256 = hash(bytes);
    if (expectedHash && sha256 !== expectedHash) throw new Error(`SOURCE_QC_ARTIFACT_HASH_CHANGED:${relative}`);
    artifacts.set(relative, { path: relative, sha256, bytes: bytes.length }); return bytes;
  };
  const files = (directory: string, extension: string): string[] => fs.readdirSync(path.resolve(root, directory), { withFileTypes: true }).flatMap(entry => {
    const relative = `${directory}/${entry.name}`;
    if (entry.isSymbolicLink()) throw new Error('SOURCE_QC_SYMLINK_NOT_ALLOWED');
    return entry.isDirectory() ? files(relative, extension) : entry.name.endsWith(extension) ? [relative] : [];
  }).sort();
  const manifest = JSON.parse(read('workspace/import-sources/dataset-manifest.json').toString('utf8')) as { datasets: Dataset[] };
  const dataset = (entity: string) => {
    const items = manifest.datasets.filter(item => item.entityType === entity);
    if (items.length !== 1) throw new Error('SOURCE_QC_DATASET_NOT_UNIQUE');
    return items[0];
  };

  const countryPath = 'workspace/reference-data/countries/ABSHEER_All_Continents_Country_Records_CLEAN_IMPORT_READY.xlsx';
  const countriesWorkbook = await readXlsxWorkbook(read(countryPath));
  const countrySheet = countriesWorkbook.sheets.get('Countries');
  if (!countrySheet) throw new Error('SOURCE_QC_COUNTRIES_SHEET_MISSING');
  const countries = spreadsheetRowsToObjects<Record<string, unknown>>(countrySheet, { defaultValue: null, raw: false });
  const cities: UniversitySourceCity[] = [];
  for (const relative of files('workspace/reference-data/cities', '.csv')) {
    const rows = parse(read(relative).toString('utf8'), { columns: true, skip_empty_lines: true, bom: true, relax_column_count: false }) as Record<string, string>[];
    for (const row of rows) {
      const aliases = row.cityAliases ? row.cityAliases.split('|').map(value => value.trim()) : [];
      if (aliases.some(value => !value || value.length > 300) || aliases.length > 50) throw new Error('SOURCE_QC_CITY_ALIASES_INVALID');
      cities.push({ sourceId: row.cityId, countryIso3: row.countryIso3, countryIso2: row.countryIso2, names: [row.cityNameEn, row.cityAscii, row.localName, ...aliases].filter(Boolean), regionCode: row.regionCode });
    }
  }
  // A known university region narrows source candidates, including names shared
  // by towns in several states. It never becomes a canonical FK assignment.
  const regionNames = new Map<string, Set<string>>();
  const regionParents = new Map<string, string>();
  const cityToken = (value: string) => value.normalize('NFKD').replace(/\p{M}/gu, '').trim().toLowerCase().replace(/\s+/gu, ' ');
  const regionToken = (value: string) => value.normalize('NFKD').replace(/\p{M}/gu, '').trim().toLowerCase().replace(/\s+(province|region|state|oblast|governorate|district|county)$/u, '');
  const addRegionName = (country: string, name: string, code: string) => {
    if (!name) return;
    const key = `${country}|${regionToken(name)}`; const values = regionNames.get(key) ?? new Set<string>(); values.add(code); regionNames.set(key, values);
  };
  for (const relative of files('workspace/reference-data/regions', '.csv')) {
    const rows = parse(read(relative).toString('utf8'), { columns: true, skip_empty_lines: true, bom: true, relax_column_count: false }) as Record<string, string>[];
    for (const row of rows) {
      addRegionName(row.countryIso3, row.nameEn, row.regionCode); addRegionName(row.countryIso3, row.localName, row.regionCode);
      if (row.parentRegionCode) regionParents.set(row.regionCode, row.parentRegionCode);
    }
  }
  const descendantCodes = (parent: string): string[] => {
    const codes = new Set([parent]);
    for (let changed = true; changed;) { changed = false; for (const [child, ancestor] of regionParents) if (codes.has(ancestor) && !codes.has(child)) { codes.add(child); changed = true; } }
    return [...codes].sort();
  };
  const hints = new Map<string, { country: string; city: string; code: string; evidence: { sourceKey: string; sourceHash: string } }>();
  for (const relative of files('workspace/import-sources/universities/stage-2-enrichment', '.xlsx')) {
    const workbook = await readXlsxWorkbook(read(relative)); const sheet = workbook.sheets.get(workbook.sheetNames[0]);
    if (!sheet) throw new Error('SOURCE_QC_ENRICHMENT_SHEET_MISSING');
    const index = sheet.textRows.findIndex(row => row.includes('University Reference ID'));
    if (index < 0) throw new Error('SOURCE_QC_ENRICHMENT_HEADER_MISSING');
    const headers = sheet.textRows[index];
    sheet.textRows.slice(index + 1).forEach((values, position) => {
      const row = Object.fromEntries(headers.map((header, column) => [header, values[column] ?? '']));
      const id = text(row['University Reference ID']), country = text(row['Country ISO3']), city = text(row['Verified City']);
      if (!id.startsWith('INS-') || !city || cityToken(city) !== cityToken(text(row.City)) || !text(row['Official Website Source']).startsWith('https://')) return;
      const codes = regionNames.get(`${country}|${regionToken(text(row['State / Region']))}`);
      if (codes?.size !== 1) return;
      if (hints.has(id)) throw new Error('SOURCE_QC_ENRICHMENT_DUPLICATE_ID');
      hints.set(id, { country, city, code: [...codes][0], evidence: { sourceKey: `${relative}#${index + position + 2}`, sourceHash: sourceReviewHash(row) } });
    });
  }
  const stage1: UniversityCitySourceRow[] = [];
  for (const relative of files('workspace/import-sources/universities/stage-1', '.xlsx')) {
    const workbook = await readXlsxWorkbook(read(relative));
    const selectedSheets = [workbook.sheetNames[0], ...workbook.sheetNames.filter(name => name === 'Geography Review')];
    for (const sheetName of selectedSheets) {
      const sheet = workbook.sheets.get(sheetName);
      if (!sheet) throw new Error('SOURCE_QC_UNIVERSITY_SHEET_MISSING');
      const headerIndex = sheet.textRows.findIndex(row => row.includes('Reference ID'));
      if (headerIndex < 0) throw new Error('SOURCE_QC_UNIVERSITY_HEADER_MISSING');
      const headers = sheet.textRows[headerIndex];
      sheet.textRows.slice(headerIndex + 1).forEach((values, index) => {
        const row = Object.fromEntries(headers.map((header, column) => [header, values[column] ?? '']));
        if (!text(row['Reference ID'])) return;
        const sourceKey = `${relative}${sheetName === 'Geography Review' ? '#Geography Review' : ''}#${headerIndex + index + 2}`;
        const sourceHash = sourceReviewHash(row);
        const hint = hints.get(text(row['Reference ID']));
        const scoped = hint && hint.country === text(row.ISO3) && cityToken(hint.city) === cityToken(text(row.City));
        const sourceId = text(row['City Source ID']), region = text(row['City Region Code']);
        const review = sheetName === 'Geography Review';
        if (headers.includes('Geography Status') && !review && (!sourceId || !region || text(row['Geography Status']) !== 'SOURCE_MATCHED')) throw new Error('SOURCE_QC_CITY_BINDING_INVALID');
        if (review && text(row['Geography Status']) !== 'REVIEW_REQUIRED') throw new Error('SOURCE_QC_QUARANTINE_STATUS_INVALID');
        if (sourceId && (!region || text(row['Geography Status']) !== 'SOURCE_MATCHED' || review)) throw new Error('SOURCE_QC_CITY_BINDING_INVALID');
        if (sourceId && !cities.some(city => city.sourceId === sourceId && city.countryIso3 === text(row.ISO3) && city.regionCode === region && city.names.some(name => cityToken(name) === cityToken(text(row.City))))) throw new Error('SOURCE_QC_CITY_BINDING_INVALID');
        stage1.push({ sourceKey, sourceHash, sourceReferenceId: text(row['Reference ID']), countryIso3: text(row.ISO3), cityName: text(row.City), officialName: text(row['Official English Name']), geographyReviewRequired: review,
          ...(sourceId ? { expectedSourceCityId: sourceId, allowedRegionCodes: [region], regionEvidence: { sourceKey, sourceHash } } : scoped ? { allowedRegionCodes: descendantCodes(hint.code), regionEvidence: hint.evidence } : {}) });
      });
    }
  }
  const geography = buildUniversityCitySourceQueue(stage1, cities, countries.map(row => text(row.iso_alpha3)));
  const universities = dataset('UNIVERSITY'); const universityBytes = read(universities.sourcePath, universities.sha256);
  const laterRows = readUniversityStage34Markdown(universityBytes.toString('utf8'));
  const handoffs = (stage: 'STAGE_3' | 'STAGE_4'): UniversalImportHandoff[] => laterRows.map(row => ({
    handoffId: `${stage}:${universities.sha256}:${row.sourceLineNumber}`, ownerDomain: 'PHASE_11_UNIVERSITY',
    artifact: { sourceId: universities.datasetId, artifactId: universities.sha256, rawArtifactReference: `${universities.sourcePath}#${row.sourceLineNumber}` },
    normalizedPayload: stage === 'STAGE_3' ? universityStage3Payload(row.fields) : universityStage4Payload(row.fields),
    provenance: { sourceSystem: universities.datasetId, acquiredAt: new Date('2026-09-24T00:00:00Z'), sourceRowNumber: row.sourceLineNumber, contentHash: sourceReviewHash(row.fields) },
    validation: { state: 'VALID', issues: [] }, execution: { executionId: `SOURCE_QC:${stage}`, dryRun: true, attempt: 1, idempotencyKey: `${stage}:${universities.sha256}:${row.sourceLineNumber}` },
  }));
  const quarantine = reconcileUniversityQuarantine(await inspectUniversitySourceStage('STAGE_3', handoffs('STAGE_3')), await inspectUniversitySourceStage('STAGE_4', handoffs('STAGE_4')));
  const laterById = new Map(laterRows.map(row => [row.sourceReferenceId, row]));

  const scholarshipDataset = dataset('SCHOLARSHIP');
  const scholarships = reconcileScholarshipGuide(read(scholarshipDataset.sourcePath, scholarshipDataset.sha256).toString('utf8'), scholarshipDataset.sha256, 359);
  const courseRows: CourseSourceRow[] = [];
  for (const source of manifest.datasets.filter(item => item.entityType === 'COURSE').sort((a, b) => a.importOrder - b.importOrder)) {
    const bytes = read(source.sourcePath, source.sha256);
    const parsed = await CourseMasterArtifactParser.parse({ bytes, originalFilename: path.basename(source.sourcePath), mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', declaredByteSize: bytes.length });
    if (parsed.issues.some(issue => issue.severity === 'ERROR') || parsed.rows.length !== source.recordCount) throw new Error('SOURCE_QC_COURSE_STRUCTURE_OR_COUNT_CHANGED');
    courseRows.push(...parsed.rows.map(item => ({ datasetId: source.datasetId, artifactHash: source.sha256, sourceRowNumber: item.sourceRowNumber, row: item.row })));
  }
  const courses = projectReviewedCourseSources(courseRows);
  read('packages/infrastructure/src/courses/ExternalCourseProviderSeed.ts');
  read('packages/domain/src/academic-taxonomy/isced-f-baseline.ts');
  const languageRows = parse(read('workspace/reference-data/languages/ABSHEER_Languages_CLEAN_IMPORT_READY.csv').toString('utf8'), { columns: true, skip_empty_lines: true, bom: true }) as Record<string, string>[];
  const relationships = buildCourseSourceRelationshipQueue(courses.projected,
    EXTERNAL_COURSE_PROVIDER_SEED.map(provider => ({ publicId: provider.publicId, labels: [provider.canonicalName, provider.displayName, ...(provider.aliases ?? []).map(alias => alias.alias)], allowedDomains: [...(provider.allowedDomains ?? [])] })),
    languageRows.filter(row => row.isActive === 'true').map(row => ({ publicId: row.isoCode, labels: [row.isoCode, row.name, row.nameAr, row.nativeName, ...row.aliases.split('|')] })),
    iscedFBaselineNodes.map(node => ({ publicId: `ISCED:${node.nodeType}:${node.canonicalCode}`, labels: [node.canonicalName, node.localizedNames.en, node.localizedNames.ar, ...iscedFBaselineAliases.filter(alias => alias.nodeKey === `ISCED:${node.nodeType}:${node.canonicalCode}`).map(alias => alias.alias)] })),
  );
  const { queue: geographyQueue, ...geographySummary } = geography;
  const { quarantine: quarantineRows, ...quarantineSummary } = quarantine;
  const { decisions: scholarshipDecisions, ...scholarshipSummary } = scholarships;
  const { queue: courseQueue, ...courseRelationshipSummary } = relationships;
  const output: Record<string, string> = {
    'universities-geography.jsonl': jsonl(geographyQueue),
    'universities-stage34-quarantine.jsonl': jsonl(quarantineRows.map(row => ({ ...row, sourceHash: sourceReviewHash(laterById.get(row.sourceReferenceId)!.fields), artifactHash: universities.sha256, sourceLineNumber: laterById.get(row.sourceReferenceId)!.sourceLineNumber }))),
    'scholarships-sections.jsonl': jsonl(scholarshipDecisions),
    'courses-url-decisions.json': json(courses.decisions),
    'courses-relationships.jsonl': jsonl([{ kind: 'COURSE_SOURCE_REVIEW_QUEUE', policy: courseRelationshipSummary.policy, evidencePolicy: 'DATASET_AND_PHYSICAL_ROW_BOUND_TO_ARTIFACT_HASH_IN_MANIFEST; REEXTRACT_RAW_ROW_FOR_APPROVAL', targetPolicies: Object.fromEntries(courseQueue.map(row => [row.target, row.policy])) }, ...courseQueue.map(({ evidence, policy: _policy, ...row }) => {
      const sourceRows: Record<string, number[]> = {};
      for (const item of evidence) {
        const separator = item.sourceKey.lastIndexOf('#'); const datasetId = item.sourceKey.slice(0, separator);
        (sourceRows[datasetId] ??= []).push(Number(item.sourceKey.slice(separator + 1)));
      }
      return { ...row, sourceRows };
    })]),
    'summary.json': json({ kind: 'M10_12_13_14_SOURCE_QUALITY', universities: { geography: geographySummary, stage34: quarantineSummary }, scholarships: scholarshipSummary, courses: { inputRows: courses.inputRows, projectedRows: courses.projected.length, distinctUrls: courses.distinctUrls, decisions: courses.decisions.length, decisionHash: courses.decisionHash, missingHistory: courses.missingHistory, relationships: courseRelationshipSummary }, databaseWrites: 0, runtime: 'RUNTIME_UNTESTED', publicationPolicy: 'NO_UNREVIEWED_RELATIONSHIP_PROMOTION; SOURCE_CANDIDATES_ARE_NOT_CANONICAL_DATABASE_ASSIGNMENTS' }),
  };
  output['manifest.json'] = json({ kind: 'M10_SOURCE_QC_MANIFEST', version: 1, artifacts: [...artifacts.values()].sort((a, b) => a.path.localeCompare(b.path)), outputs: Object.entries(output).map(([file, content]) => ({ file, sha256: hash(content), bytes: Buffer.byteLength(content) })), databaseWrites: 0 });
  return output;
}

export function verifyOrWriteSourceQuality(root: string, output: Record<string, string>, mode: 'check' | 'prepare'): void {
  if (mode !== 'prepare' && mode !== 'check') throw new Error('SOURCE_QC_MODE_INVALID');
  const directory = path.resolve(root, 'workspace/import-sources/reconciliation/m10-12-14');
  const realRoot = fs.realpathSync(root);
  // Validate the existing ancestor before mkdir follows any redirected directory.
  const sourceDirectory = fs.realpathSync(path.resolve(root, 'workspace/import-sources'));
  const sourceRelative = path.relative(realRoot, sourceDirectory);
  if (sourceRelative.startsWith('..') || path.isAbsolute(sourceRelative)) throw new Error('SOURCE_QC_OUTPUT_OUTSIDE_REPOSITORY');
  const reconciliation = path.dirname(directory);
  if (fs.existsSync(reconciliation) && fs.lstatSync(reconciliation).isSymbolicLink()) throw new Error('SOURCE_QC_OUTPUT_SYMLINK_NOT_ALLOWED');
  if (fs.existsSync(directory) && fs.lstatSync(directory).isSymbolicLink()) throw new Error('SOURCE_QC_OUTPUT_SYMLINK_NOT_ALLOWED');
  if (mode === 'prepare') fs.mkdirSync(directory, { recursive: true });
  const realDirectory = fs.realpathSync(directory);
  const relative = path.relative(realRoot, realDirectory);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('SOURCE_QC_OUTPUT_OUTSIDE_REPOSITORY');
  for (const [file, content] of Object.entries(output)) {
    if (path.basename(file) !== file) throw new Error('SOURCE_QC_OUTPUT_NAME_INVALID');
    const target = path.join(realDirectory, file);
    if (fs.existsSync(target) && fs.lstatSync(target).isSymbolicLink()) throw new Error('SOURCE_QC_OUTPUT_SYMLINK_NOT_ALLOWED');
    if (mode === 'prepare') fs.writeFileSync(target, content);
    else if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== content) throw new Error(`SOURCE_QC_OUTPUT_STALE:${file}`);
  }
}

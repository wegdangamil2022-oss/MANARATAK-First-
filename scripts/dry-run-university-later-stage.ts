import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { readXlsxWorkbook, spreadsheetRowsToObjects } from '@manaratak/shared';
import { UniversityLaterStagesDryRunUseCase, type UniversityLaterStage } from '../packages/application/src/universities/use-cases/UniversityLaterStagesDryRunUseCase';
import type { UniversalImportHandoff } from '@manaratak/domain';

const stage = String(process.argv[2] ?? '').toUpperCase() as UniversityLaterStage;
const sourcePaths = process.argv.slice(3).map(item => path.resolve(item));
if (!['STAGE_3', 'STAGE_4', 'GLOBAL_RANKINGS'].includes(stage) || sourcePaths.length === 0) {
  throw new Error('Usage: tsx scripts/dry-run-university-later-stage.ts STAGE_3|STAGE_4|GLOBAL_RANKINGS <xlsx> [xlsx...]');
}

const handoffs: UniversalImportHandoff[] = [];
const artifacts: Array<{ fileName: string; sha256: string; records: number; columns: number }> = [];
for (const sourcePath of sourcePaths) {
  const bytes = fs.readFileSync(sourcePath);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const workbook = await readXlsxWorkbook(bytes);
  const sheetName = stage === 'STAGE_3' ? 'Stage 3' : stage === 'STAGE_4' ? 'Stage 4' : 'Rankings';
  const sheet = workbook.sheets.get(sheetName);
  if (!sheet) throw new Error(`${sheetName} sheet not found: ${sourcePath}`);
  const rows = spreadsheetRowsToObjects<Record<string, unknown>>(sheet, { defaultValue: null, raw: false });
  const columns = sheet.rawRows[0]?.length ?? 0;
  const expectedColumns = stage === 'STAGE_3' ? 18 : stage === 'STAGE_4' ? 17 : 19;
  if (columns !== expectedColumns) throw new Error(`Expected ${expectedColumns} columns, found ${columns}: ${sourcePath}`);
  rows.filter(row => text(row['University Reference ID'])).forEach((row, index) => {
    const sourceRowNumber = index + 2;
    handoffs.push({
      handoffId: `${sha256}:${sourceRowNumber}`,
      ownerDomain: 'PHASE_11_UNIVERSITY',
      artifact: { sourceId: `UNIVERSITY_${stage}_XLSX`, artifactId: sha256, rawArtifactReference: `${path.basename(sourcePath)}#${sourceRowNumber}` },
      normalizedPayload: stage === 'STAGE_3' ? stage3(row) : stage === 'STAGE_4' ? stage4(row) : rankings(row),
      provenance: { sourceSystem: `UNIVERSITY_${stage}_XLSX`, acquiredAt: new Date(), sourceRowNumber, contentHash: createHash('sha256').update(JSON.stringify(row)).digest('hex') },
      validation: { state: 'VALID', issues: [] },
      execution: { executionId: `${stage}:${sha256}`, dryRun: true, attempt: 1, idempotencyKey: `${sha256}:${sourceRowNumber}` },
    });
  });
  artifacts.push({ fileName: path.basename(sourcePath), sha256, records: rows.length, columns });
}

const summary = await new UniversityLaterStagesDryRunUseCase().execute(stage, handoffs);
const readiness = summary.results.reduce<Record<string, number>>((counts, result) => ({ ...counts, [result.readiness]: (counts[result.readiness] ?? 0) + 1 }), {});
const validationIssueCounts = summary.results.flatMap(result => result.validationIssues).reduce<Record<string, number>>((counts, issue) => ({ ...counts, [issue.code]: (counts[issue.code] ?? 0) + 1 }), {});
console.log(JSON.stringify({ mode: 'DRY_RUN', stage, artifacts, total: summary.total, readiness, validationIssueCounts, databaseWrites: 0, databaseIdentityCheck: 'PENDING_GOOGLE_STUDIO' }, null, 2));

function stage3(row: Record<string, unknown>) { return {
  sourceReferenceId: text(row['University Reference ID']), availableDegrees: list(row['Available Degrees']), faculties: list(row.Faculties), languagesOfInstruction: list(row['Languages of Instruction']), studyModes: list(row['Study Modes']), officialProgramCatalogUrl: text(row['Official Program Catalog URL']), keyMajors: list(row['Key Majors']), acceptsInternationalStudents: bool(row['Accepts International Students?']), undergraduateAdmissionUrl: text(row['Undergraduate Admission URL']), graduateAdmissionUrl: text(row['Graduate Admission URL']), internationalStudentAdmissionUrl: text(row['International Student Admission URL']), officialApplicationPortalUrl: text(row['Official Application Portal URL']), hasLanguageRequirements: bool(row['Are There Language Requirements?']), requiredLanguages: list(row['Required Languages']), acceptedLanguageTests: list(row['Accepted Language Tests']), officialLanguageRequirementsUrl: text(row['Official Language Requirements URL']), hasInternationalScholarships: bool(row['Are Scholarships Available for International Students?']), internationalScholarships: pairs(row['Key International Scholarships'], 'name', 'officialUrl'),
}; }
function stage4(row: Record<string, unknown>) { return {
  sourceReferenceId: text(row['University Reference ID']), annualTuitionFee: number(row['Annual Tuition Fee']), undergraduateMedicineFee: number(row['Undergraduate Medicine Fee, if applicable']), engineeringUndergraduateFees: pairs(row['Engineering Undergraduate Fees by Faculty'], 'faculty', 'amount').map(item => ({ faculty: item.faculty, amount: Number(item.amount) })), graduateTuitionFee: number(row['Graduate Tuition Fee']), tuitionCurrency: text(row.Currency), officialTuitionFeeUrl: text(row['Official Tuition Fee URL']), accommodationAvailable: bool(row['Is University Accommodation Available?']), internationalStudentsEligibleForAccommodation: bool(row['Are International Students Eligible for Accommodation?']), typicalAccommodationCost: number(row['Typical Accommodation Cost']), accommodationCurrency: text(row['Accommodation Cost Currency']), averageMonthlyLivingCost: number(row['Average Monthly Living Cost']), livingCostCurrency: text(row['Living Cost Currency']), costVariationNote: text(row['Cost Variation Note']), generalRequiredDocuments: list(row['General Required Documents']), additionalGraduateRequirements: list(row['Additional Graduate Requirements']), officialRequiredDocumentsUrl: text(row['Official Required Documents URL']),
}; }
function rankings(row: Record<string, unknown>) {
  const entries = [['QS','QS'],['THE','THE'],['ARWU','ARWU']].flatMap(([provider, prefix]) => {
    const rank = text(row[`${prefix} Rank`]); if (!rank) return [];
    const rawScope = text(row[`${prefix} Ranking Type`]) ?? 'Global';
    return [{ provider, rank, scope: scope(rawScope), scopeLabel: scope(rawScope) === 'OTHER_REGIONAL' ? rawScope : undefined, note: text(row[`${prefix} Note`]), officialSourceUrl: text(row[`${prefix} Official Source URL`]), verifiedAt: date(row[`${prefix} Verified At`]) }];
  });
  return { universityName: text(row['University Name']), sourceReferenceId: text(row['University Reference ID']), rankings: entries };
}
function scope(value: string) { const key = value.trim().toLowerCase(); return key === 'global' ? 'GLOBAL' : key === 'arab region' ? 'ARAB_REGION' : key === 'southern asia' ? 'SOUTHERN_ASIA' : key === 'asia' ? 'ASIA' : key === 'africa' ? 'AFRICA' : key === 'europe' ? 'EUROPE' : key === 'latin america' ? 'LATIN_AMERICA' : 'OTHER_REGIONAL'; }
function text(value: unknown): string | undefined { const result = String(value ?? '').trim(); return result || undefined; }
function list(value: unknown) { return (text(value) ?? '').split('|').map(item => item.trim()).filter(Boolean); }
function bool(value: unknown): boolean | undefined { const key = (text(value) ?? '').toLowerCase(); if (['yes','نعم'].includes(key)) return true; if (['no','لا'].includes(key)) return false; return undefined; }
function number(value: unknown): number | undefined { const parsed = Number(text(value)); return Number.isFinite(parsed) ? parsed : undefined; }
function pairs(value: unknown, first: string, second: string): Array<Record<string, string>> { return list(value).map(item => { const [a, b] = item.split('::').map(part => part.trim()); return { [first]: a ?? '', [second]: b ?? '' }; }); }
function date(value: unknown): string | undefined { const raw = text(value); if (!raw) return undefined; const parsed = new Date(raw); return Number.isNaN(parsed.valueOf()) ? raw : parsed.toISOString().slice(0, 10); }

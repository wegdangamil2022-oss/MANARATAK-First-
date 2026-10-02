import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import type { UniversalImportHandoff, ImportedCourseMasterRowContract } from '@manaratak/domain';
import { CanonicalSourceReview, sourceReviewHash } from '../../packages/application/src/import-foundation/services/CanonicalSourceReview';
import { buildUniversityCitySourceQueue } from '../../packages/application/src/universities/use-cases/UniversityCitySourceQueue';
import { inspectUniversitySourceStage, reconcileUniversityQuarantine } from '../../packages/application/src/universities/use-cases/UniversitySourceQuality';
import { UniversityLaterStagesDryRunUseCase } from '../../packages/application/src/universities/use-cases/UniversityLaterStagesDryRunUseCase';
import { UniversityImportChangePlanner, UniversityImportChangeExecutor } from '../../packages/application/src/universities/use-cases/UniversityImportChangePlan';
import { readScholarshipMasterGuide } from '../../scripts/import/ScholarshipMasterGuideReader';
import { reconcileScholarshipGuide } from '../../scripts/import/ScholarshipSourceQuality';
import { projectReviewedCourseSources, reviewedCourseArtifactHashes, buildCourseSourceRelationshipQueue, type CourseSourceRow } from '../../scripts/import/CourseSourceQuality';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const sourceHash = sourceReviewHash({ raw: 'City' });
describe('reviewed source mappings are explicit and scope bound', () => {
  const targets = [1, 2].map(n => ({ id: id(n), kind: 'CITY', name: 'City', aliases: [], active: true, countryIso2: 'YE' }));
  const row = { sourceKey: 'source#2', sourceHash, rawLabel: 'City', targetKind: 'CITY', countryIso2: 'YE' };
  const review = new CanonicalSourceReview([...targets, { ...targets[0], id: id(3), countryIso2: 'OM' }, { ...targets[0], id: id(4), active: false }]);
  const decision = { sourceKey: row.sourceKey, sourceHash, snapshotHash: review.snapshotHash, action: 'SELECT_EXISTING', targetId: id(1), actorId: id(10), reason: 'Verified region evidence', evidenceReference: 'official-country/region/city' };
  it('keeps exact multiple matches ambiguous and allows an evidence bound scoped choice', () => {
    expect(review.candidates(row)).toMatchObject({ state: 'AMBIGUOUS', databaseWrites: 0 });
    expect(review.decide(row, decision)).toMatchObject({ targetId: id(1), rawLabel: 'City', state: 'REVIEWED_SOURCE_MAPPING', databaseWrites: 0, runtime: 'RUNTIME_UNTESTED' });
  });
  it.each([id(3), id(4), id(999)])('rejects foreign, inactive or missing city %s', targetId => {
    expect(() => review.decide(row, { ...decision, targetId })).toThrow('SOURCE_REVIEW_TARGET_MISSING_INACTIVE_OR_FOREIGN');
  });
  it('rejects stale source or canonical snapshot evidence', () => {
    expect(() => review.decide({ ...row, sourceHash: 'f'.repeat(64) }, decision)).toThrow('SOURCE_REVIEW_STALE_DECISION');
    expect(() => review.decide(row, { ...decision, snapshotHash: 'f'.repeat(64) })).toThrow('SOURCE_REVIEW_STALE_DECISION');
  });
  it('requires country scope and review reason, and never searches fuzzily', () => {
    expect(review.candidates({ ...row, countryIso2: undefined }).targets).toHaveLength(0);
    expect(review.candidates({ ...row, rawLabel: 'Ctiy' }).state).toBe('UNRESOLVED');
    expect(() => review.decide(row, { ...decision, reason: ' ' })).toThrow();
    expect(() => review.decide(row, { ...decision, action: 'HOLD' })).toThrow('SOURCE_REVIEW_NON_LINK_DECISION_HAS_TARGET');
  });
  it('requires the same verified university owner for a program', () => {
    const programReview = new CanonicalSourceReview([{ id: id(8), kind: 'ACADEMIC_PROGRAM', name: 'Program', aliases: [], active: true, ownerId: id(20) }]);
    const programRow = { ...row, targetKind: 'ACADEMIC_PROGRAM', rawLabel: 'Program', countryIso2: undefined, ownerId: id(21) };
    expect(() => programReview.decide(programRow, { ...decision, snapshotHash: programReview.snapshotHash, targetId: id(8) })).toThrow('SOURCE_REVIEW_TARGET_MISSING_INACTIVE_OR_FOREIGN');
    expect(programReview.decide({ ...programRow, ownerId: id(20) }, { ...decision, snapshotHash: programReview.snapshotHash, targetId: id(8) }).targetOwnerId).toBe(id(20));
  });
  it('never turns a university name into an INS identity', () => {
    const universityReview = new CanonicalSourceReview([{ id: id(8), kind: 'UNIVERSITY', name: 'University', aliases: [], active: true, countryIso2: 'YE' }]);
    expect(() => universityReview.decide({ ...row, targetKind: 'UNIVERSITY' }, { ...decision, snapshotHash: universityReview.snapshotHash, targetId: id(8) })).toThrow('SOURCE_REVIEW_UNIVERSITY_PUBLIC_ID_REQUIRED');
  });
});

describe('university source quarantine', () => {
  const handoff = (payload: Record<string, unknown>): UniversalImportHandoff => ({ handoffId: 'artifact:2', ownerDomain: 'PHASE_11_UNIVERSITY', artifact: { sourceId: 'stage', artifactId: 'artifact', rawArtifactReference: 'sample#2' }, normalizedPayload: { sourceReferenceId: 'INS-YEM-0001', ...payload }, provenance: { sourceSystem: 'stage', acquiredAt: new Date(), sourceRowNumber: 2, contentHash: sourceHash }, validation: { state: 'VALID', issues: [] }, execution: { executionId: 'qc', dryRun: true, attempt: 1, idempotencyKey: 'artifact:2' } });
  it('counts overlapping failures once and rejects invalid commit before the gateway', async () => {
    const stage3 = await inspectUniversitySourceStage('STAGE_3', [handoff({ keyMajors: Array.from({ length: 9 }, (_, n) => `major${n}`) })]);
    const stage4 = await inspectUniversitySourceStage('STAGE_4', [handoff({ annualTuitionFee: -1 })]);
    expect(reconcileUniversityQuarantine(stage3, stage4)).toMatchObject({ stage3Invalid: 1, stage4Invalid: 1, invalidInBoth: 1, uniqueInvalidIds: 1 });
    const plan = await new UniversityImportChangePlanner({ findBySourceReferenceId: vi.fn().mockResolvedValue({ id: id(1), publicId: 'INS-YEM-0001' }) }).plan('STAGE_4', [handoff({ annualTuitionFee: -1 })]);
    const gateway = { apply: vi.fn(), rollback: vi.fn() };
    await expect(new UniversityImportChangeExecutor(gateway).commit(plan, { actorId: id(10), recoveryGateToken: 'reviewed', approval: 'APPROVE_COMMIT' })).rejects.toThrow('UNIVERSITY_IMPORT_PLAN_HAS_BLOCKING_ISSUES');
    expect(gateway.apply).not.toHaveBeenCalled();
  });
  it('quarantines non-finite amounts, wrong collection shapes and absent source stages', async () => {
    const invalid = await inspectUniversitySourceStage('STAGE_4', [handoff({ engineeringUndergraduateFees: [{ faculty: 'Engineering', amount: NaN }] })]);
    expect(invalid[0].readiness).toBe('SOURCE_INVALID');
    const malformed = await inspectUniversitySourceStage('STAGE_3', [handoff({ internationalScholarships: 'not an array' })]);
    expect(malformed[0].readiness).toBe('SOURCE_INVALID');
    expect(reconcileUniversityQuarantine(invalid, []).quarantine[0].issues).toEqual(expect.arrayContaining([{ stage: 'STAGE_4', code: 'STAGE_SOURCE_MISSING' }]));
    expect(() => reconcileUniversityQuarantine([...invalid, ...invalid], [])).toThrow('UNIVERSITY_QC_DUPLICATE_STAGE_ID');
  });
  it('also blocks non-finite money in the legacy dry-run entry point', async () => {
    const result = await new UniversityLaterStagesDryRunUseCase().execute('STAGE_4', [handoff({ annualTuitionFee: Infinity, engineeringUndergraduateFees: [{ faculty: 'Engineering', amount: NaN }] })]);
    expect(result.results[0].readiness).toBe('SOURCE_INVALID');
    expect(result.results[0].validationIssues.map(issue => issue.code)).toEqual(expect.arrayContaining(['NON_FINITE_AMOUNT', 'INVALID_ENGINEERING_FEE']));
  });
  it('holds ambiguous cities and unknown territory without assigning a parent or a guessed FK', () => {
    const rows = ['YEM', 'XKX'].map((countryIso3, n) => ({ sourceKey: `sample#${n}`, sourceHash, sourceReferenceId: `INS-${countryIso3}-0001`, countryIso3, cityName: 'City', officialName: 'University' }));
    const cities = [1, 2].map(n => ({ sourceId: `city-${n}`, countryIso3: 'YEM', countryIso2: 'YE', names: ['City'], regionCode: `region-${n}` }));
    const result = buildUniversityCitySourceQueue(rows, cities, ['YEM']);
    expect(result.queue.map(item => item.state)).toEqual(['AMBIGUOUS', 'TERRITORY_MISMATCH']);
    expect(result.queue.every(item => item.canonicalCityId === null)).toBe(true);
    expect(result.queue[1].policyAction).toBe('HOLD_COUNTRY_POLICY_NO_PARENT_INFERENCE');
    expect(result.queue[1].candidateSourceIds).toEqual([]);
  });
});

describe('scholarship source evidence', () => {
  const record = (n: number, marker: string) => `# SCH-OC-${String(n).padStart(4, '0')} — Example\r\n**حالة الاستيراد النهائية:** ${marker}\r\n## 1. اسم المنحة\r\nExample\r\n## 2. الجهة المانحة\r\nUniversity\r\n`;
  it('preserves original bytes, holds unmarked content and never invents the summary gap', () => {
    const raw = record(1, 'IMPORTED') + record(2, 'DUPLICATE — MERGED') + record(3, 'IMPORTEDNESS');
    const parsed = readScholarshipMasterGuide(raw);
    expect(parsed[0].rawContent).toBe(record(1, 'IMPORTED'));
    expect(parsed[0].sourceHash).toBe(createHash('sha256').update(parsed[0].rawContent).digest('hex'));
    const result = reconcileScholarshipGuide(raw, sourceHash, 11);
    expect(result).toMatchObject({ totalSections: 3, explicitImportedCandidates: 1, summaryDifference: 10, databaseWrites: 0 });
    expect(result.decisions[0].canonicalQueue.every(item => item.state === 'REVIEW_REQUIRED' && item.canonicalId === null)).toBe(true);
    expect(result.decisions[1].disposition).toBe('MERGED_DUPLICATE');
    expect(result.decisions[2].disposition).toBe('UNKNOWN_MARKER');
  });
  it('rejects duplicate source identities and conflicting final markers instead of overwriting', () => {
    expect(() => readScholarshipMasterGuide(record(1, 'IMPORTED') + record(1, 'REVIEW'))).toThrow('SCHOLARSHIP_GUIDE_DUPLICATE_ID');
    expect(() => readScholarshipMasterGuide(record(1, 'IMPORTED') + '**حالة الاستيراد النهائية:** REVIEW')).toThrow('SCHOLARSHIP_GUIDE_MULTIPLE_FINAL_MARKERS');
    expect(() => readScholarshipMasterGuide(record(1, 'IMPORTED') + '## 1. اسم المنحة\nChanged')).toThrow('SCHOLARSHIP_GUIDE_DUPLICATE_FIELD');
  });
});

describe('course source identity and relationship review', () => {
  const raw: ImportedCourseMasterRowContract = { sourceOrder: 1, providerLabel: 'Provider', courseName: 'Course', directCourseUrl: 'https://provider.example/course/1', studyFreeRaw: 'Yes', freeCertificateRaw: 'Yes', certificateTypeRaw: 'Certificate', languageRaw: 'English', studyLevelRaw: 'Beginner', courseDurationRaw: '1 hour', shortCourseTopicsRaw: 'Computing' };
  const item = (datasetId: string, sourceRowNumber: number, row = raw): CourseSourceRow => ({ datasetId, artifactHash: reviewedCourseArtifactHashes[datasetId as keyof typeof reviewedCourseArtifactHashes] ?? sourceHash, sourceRowNumber, row });
  it('removes only the evidence-bound known duplicate and preserves both raw rows', () => {
    const a = item('courses-master-1-2026-09-15', 10632); const b = item('courses-master-2-2026-09-23', 432, { ...raw, courseName: 'Other source title' });
    const result = projectReviewedCourseSources([a, b]);
    expect(result.projected).toHaveLength(1);
    expect(result.decisions[0]).toMatchObject({ kept: { raw: a.row }, excluded: { raw: b.row }, changedFields: ['courseName'], canonicalCourseId: null });
    expect(() => projectReviewedCourseSources([a, { ...b, artifactHash: 'f'.repeat(64) }])).toThrow('COURSE_SOURCE_UNREVIEWED_URL_COLLISION');
    expect(() => projectReviewedCourseSources([a, { ...b, sourceRowNumber: 999 }])).toThrow('COURSE_SOURCE_UNREVIEWED_URL_COLLISION');
  });
  it('keeps distinct language editions and rejects unreviewed name collisions', () => {
    const a = item('courses-master-2-2026-09-23', 2112, { ...raw, directCourseUrl: 'https://www.pok.polimi.it/course/view.php?id=203', languageRaw: 'Italian' });
    const b = item('courses-master-2-2026-09-23', 2129, { ...raw, directCourseUrl: 'https://www.pok.polimi.it/course/view.php?id=204' });
    expect(projectReviewedCourseSources([a, b]).projected[1].row.courseName).toBe('Course (English)');
    expect(b.row.courseName).toBe('Course');
    expect(() => projectReviewedCourseSources([a, { ...b, sourceRowNumber: 2000 }])).toThrow('COURSE_SOURCE_UNREVIEWED_NAME_COLLISION');
  });
  it('does not trust a provider label on a foreign host or turn exact terms into approved links', () => {
    const result = buildCourseSourceRelationshipQueue([item('sample', 2)], [{ publicId: 'provider', labels: ['Provider'], allowedDomains: ['different.example'] }], [{ publicId: 'en', labels: ['English'] }], [{ publicId: 'ISCED:061', labels: ['Computing'] }]);
    expect(result.queue.find(row => row.target === 'PROVIDER')?.state).toBe('UNRESOLVED');
    expect(result.queue.find(row => row.target === 'TAXONOMY')).toMatchObject({ state: 'PROPOSED_SOURCE_CANDIDATE', canonicalId: null });
    expect(result.linkHealth).toBe('RUNTIME_UNTESTED');
  });
  it('rejects embedded URL credentials and duplicate row identities', () => {
    expect(() => projectReviewedCourseSources([item('sample', 2, { ...raw, directCourseUrl: 'https://user:password@provider.example/course' })])).toThrow('COURSE_SOURCE_URL_INVALID');
    expect(() => projectReviewedCourseSources([item('sample', 2), item('sample', 2)])).toThrow('COURSE_SOURCE_DUPLICATE_ROW_ID');
  });
});

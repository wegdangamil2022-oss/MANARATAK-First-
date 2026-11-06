import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { scholarshipEligibilityView } from '@manaratak/domain';
import { prepareScholarshipPilot } from '../../scripts/import/ScholarshipPilotPreparation';

const sourcePath =
  'workspace/import-sources/scholarships/MANARATAK_Scholarships_Master_2027_Through_1138.md';
const input = {
  sourcePath,
  bytes: fs.readFileSync(sourcePath),
  expectedArtifactHash: '6b657da9e1f5a9159b1952afe914d8aacb97593ed178e3cb99c141d564d1cf13',
  sourceRecordIds: ['SCH-OC-0155', 'SCH-OC-0117', 'SCH-OC-0030'],
  existingSourceRecordIds: ['SCH-OC-0051'],
};

describe('bounded unified scholarship pilot preparation', () => {
  it('preserves three different real source formats without promoting or assigning references', () => {
    const plan = prepareScholarshipPilot(input);
    expect(plan).toMatchObject({
      totalSourceRecords: 1138,
      databaseWrites: 0,
      canonicalAssignments: 0,
      publication: false,
    });
    expect(plan.rows.map((row) => [row.displayNumber, row.counts])).toEqual([
      ['0145', { benefits: 6, criteria: 5, documents: 8, universities: 0 }],
      ['0406', { benefits: 6, criteria: 6, documents: 8, universities: 0 }],
      ['0081', { benefits: 5, criteria: 3, documents: 6, universities: 3 }],
    ]);
    for (const row of plan.rows) {
      expect(row.disposition).toBe('HOLD_OFFICIAL_SOURCE_AND_CANONICAL_REVIEW');
      expect(row.payload.metadata).toMatchObject({
        sourceArtifactSha256: input.expectedArtifactHash,
        sourceRecordSha256: row.sourceHash,
      });
      expect(
        scholarshipEligibilityView({
          ...row.payload.metadata,
          internationalTests: ['TOEFL iBT', 'IELTS'],
          inferredCriteria: ['Not a source condition'],
        }).items.map((item) => item.text),
      ).toEqual(scholarshipEligibilityView(row.payload.metadata).items.map((item) => item.text));
      expect(row.payload.applicationDeadline).toBeUndefined();
      expect(row.payload.targetUniversityReferences).toBeUndefined();
      expect(row.payload.targetAcademicProgramReferences).toBeUndefined();
    }
    expect(plan.rows[1].payload.metadata?.sourcePresentation).toMatchObject({
      applicationStatus: 'مغلقة',
      deadlineText: '15 يناير 2026',
    });
    expect(plan.rows[2].payload.targetUniversities).toEqual([
      'جامعة ويتواترسراند.',
      'جامعة كيب تاون.',
      'جامعة ستيلينبوش.',
    ]);
    expect(prepareScholarshipPilot(input)).toEqual(plan);
  });
  it('refuses changed source bytes before preparing any row', () => {
    expect(() =>
      prepareScholarshipPilot({ ...input, bytes: Buffer.concat([input.bytes, Buffer.from('\n')]) }),
    ).toThrow('SCHOLARSHIP_PILOT_SOURCE_CHANGED');
  });
  it.each([[], ['SCH-OC-0155', 'SCH-OC-0155'], ['1', '2', '3', '4', '5', '6']])(
    'refuses empty, duplicate or oversized selections: %j',
    (...ids) => {
      expect(() => prepareScholarshipPilot({ ...input, sourceRecordIds: ids })).toThrow(
        'SCHOLARSHIP_PILOT_REQUIRES_ONE_TO_FIVE_UNIQUE_RECORDS',
      );
    },
  );
  it('refuses missing and already imported identities rather than silently changing the selection', () => {
    expect(() => prepareScholarshipPilot({ ...input, sourceRecordIds: ['missing'] })).toThrow(
      'SCHOLARSHIP_PILOT_RECORD_NOT_FOUND',
    );
    expect(() => prepareScholarshipPilot({ ...input, sourceRecordIds: ['SCH-OC-0051'] })).toThrow(
      'SCHOLARSHIP_PILOT_ALREADY_IMPORTED',
    );
  });
});

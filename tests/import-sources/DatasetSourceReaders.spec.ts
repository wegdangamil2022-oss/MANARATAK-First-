import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { readUniversityStage34Markdown } from '../../scripts/import/UniversityStage34MarkdownReader';
import { readScholarshipMasterGuide } from '../../scripts/import/ScholarshipMasterGuideReader';

const source = (relativePath: string) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('staged Markdown dataset readers', () => {
  it('preserves all 1530 Europe university identities and source order', () => {
    const rows = readUniversityStage34Markdown(source('workspace/import-sources/universities/stage-3-4/MANARATAK_Europe_Universities_Stage_3_Stage_4_1530_REVIEWED_0001_1530_FINAL.md'));
    expect(rows).toHaveLength(1530);
    expect(new Set(rows.map(row => row.sourceReferenceId)).size).toBe(1530);
    expect(rows[0]?.sourceReferenceId).toBe('INS-ITA-0053');
    expect(rows[1529]?.sourceReferenceId).toBe('INS-GBR-0031');
  });

  it('rejects a university heading that disagrees with its source identity', () => {
    expect(() => readUniversityStage34Markdown('## 0001 — INS-ITA-0053\n- **University Reference ID:** INS-ITA-9999'))
      .toThrow('UNIVERSITY_STAGE34_ID_MISMATCH');
  });

  it('selects only explicitly imported scholarship records from the mixed guide', () => {
    const records = readScholarshipMasterGuide(source('workspace/import-sources/scholarships/MANARATAK_Scholarship_Import_Master_Guide_v3.21(1).md'));
    expect(records).toHaveLength(514);
    expect(new Set(records.map(record => record.sourceRecordId)).size).toBe(514);
    expect(records.filter(record => record.explicitlyImported)).toHaveLength(349);
    expect(records.filter(record => record.explicitlyImported).every(record =>
      Boolean(record.fields['1. اسم المنحة'] && record.fields['2. الجهة المانحة']))).toBe(true);
  });

  it('does not treat a reviewed scholarship as imported', () => {
    const record = readScholarshipMasterGuide('# SCH-OC-0001 — Example\n**حالة الاستيراد النهائية:** REVIEW\n## 1. اسم المنحة\nExample')[0];
    expect(record?.explicitlyImported).toBe(false);
  });
});

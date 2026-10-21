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

  it('preserves the 947 degree scholarship identities and source screening states', () => {
    const raw = source('workspace/import-sources/scholarships/MANARATAK_Degree_Scholarships_Master_v6_6_2027_Audit_001_010_947.md');
    const records = readScholarshipMasterGuide(raw);
    expect(records).toHaveLength(947);
    expect(new Set(records.map(record => record.sourceRecordId)).size).toBe(947);
    expect(records.filter(record => record.explicitlyImported)).toHaveLength(703);
    expect(records.filter(record => !record.explicitlyImported)).toHaveLength(244);
    expect(records.filter(record => Object.keys(record.fields).length === 12)).toHaveLength(900);
    expect(records.filter(record => Object.keys(record.fields).length === 13)).toHaveLength(47);
    expect(records[0]?.sourceRecordId).toBe('SCH-OC-0006');
    expect(records[946]?.sourceRecordId).toBe('SCH-CN-420-444-0947');
    expect(raw.slice(raw.indexOf('### منحة رقم 0001'))).toBe(records.map(record => record.rawContent).join(''));
    expect(records.filter(record => record.explicitlyImported).every(record =>
      Boolean(record.fields['1. اسم المنحة'] && record.fields['2. الجهة المانحة']))).toBe(true);
  });

  it('does not treat a reviewed scholarship as imported', () => {
    const record = readScholarshipMasterGuide('# SCH-OC-0001 — Example\n**حالة الاستيراد النهائية:** REVIEW\n## 1. اسم المنحة\nExample')[0];
    expect(record?.explicitlyImported).toBe(false);
  });
});

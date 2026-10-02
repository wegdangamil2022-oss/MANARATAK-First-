import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { prepareSourceQuality, verifyOrWriteSourceQuality } from '../../scripts/import/SourceQualityPreparation';

describe('M10 offline source quality preparation', () => {
  it('reproduces the actual governed queues without changing any source artifact', async () => {
    const root = process.cwd(); const output = await prepareSourceQuality(root);
    verifyOrWriteSourceQuality(root, output, 'check');
    const summary = JSON.parse(output['summary.json']);
    expect(summary.universities.geography).toMatchObject({ total: 10723, counts: { AMBIGUOUS: 63, TERRITORY_MISMATCH: 8 } });
    expect(summary.universities.stage34).toMatchObject({ uniqueSourceIds: 1530, stage3Invalid: 1320, stage4Invalid: 558, invalidInBoth: 487, uniqueInvalidIds: 1391, sourceValidBoth: 139 });
    expect(summary.universities.stage34.uniqueInvalidIds).toBe(summary.universities.stage34.stage3Invalid + summary.universities.stage34.stage4Invalid - summary.universities.stage34.invalidInBoth);
    expect(summary.scholarships).toMatchObject({ totalSections: 514, explicitImportedCandidates: 349, summaryDifference: 10, counts: { MERGED_DUPLICATE: 5, UNMARKED: 156 } });
    expect(summary.courses).toMatchObject({ inputRows: 21562, projectedRows: 21559, distinctUrls: 21559, decisions: 4 });
    expect(summary.databaseWrites).toBe(0);
    const manifest = JSON.parse(output['manifest.json']) as { artifacts: Array<{ path: string; sha256: string }> };
    for (const artifact of manifest.artifacts) expect(createHash('sha256').update(fs.readFileSync(path.join(root, artifact.path))).digest('hex')).toBe(artifact.sha256);
    const scholarshipRows = output['scholarships-sections.jsonl'].trim().split('\n').map(row => JSON.parse(row));
    expect(scholarshipRows.filter(row => row.decision === 'HOLD_CANONICAL_AND_OFFICIAL_SOURCE_REVIEW')).toHaveLength(349);
    expect(scholarshipRows.some(row => row.canonicalQueue.some((item: { canonicalId: string | null }) => item.canonicalId !== null))).toBe(false);
  }, 90_000);
  it('detects edited output and never rewrites it in check mode', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'manaratak-source-qc-'));
    try {
      fs.mkdirSync(path.join(root, 'workspace/import-sources'), { recursive: true });
      const output = { 'summary.json': '{"databaseWrites":0}\n' };
      verifyOrWriteSourceQuality(root, output, 'prepare');
      const target = path.join(root, 'workspace/import-sources/reconciliation/m10-12-14/summary.json');
      fs.writeFileSync(target, 'tampered');
      expect(() => verifyOrWriteSourceQuality(root, output, 'check')).toThrow('SOURCE_QC_OUTPUT_STALE:summary.json');
      expect(fs.readFileSync(target, 'utf8')).toBe('tampered');
      expect(() => verifyOrWriteSourceQuality(root, { '../unsafe.json': 'bad' }, 'prepare')).toThrow('SOURCE_QC_OUTPUT_NAME_INVALID');
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });
});

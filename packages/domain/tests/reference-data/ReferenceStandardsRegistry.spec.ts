
import { describe, it, expect } from 'vitest';
import { parseReferenceLocaleTag, referenceStandardsReadiness, validateStandardSnapshotEvidence } from '../../src';

describe('P7 standards provenance and locale separation', () => {
  it('does not mistake a locale tag for a language code', () => {
    expect(parseReferenceLocaleTag('zh-hans-cn')).toEqual({
      tag: 'zh-Hans-CN', languageCode: 'zh', scriptCode: 'Hans', regionCode: 'CN',
    });
    expect(parseReferenceLocaleTag('en-US').tag).toBe('en-US');
    expect(() => parseReferenceLocaleTag('bad_und')).toThrow('INVALID_BCP47_LOCALE_TAG');
  });
  it('reports unavailable reviewed standard snapshots honestly', () => {
    const status = referenceStandardsReadiness([]);
    expect(status).toHaveLength(6);
    expect(status.every(row => row.readiness === 'MISSING_REVIEWED_SNAPSHOT')).toBe(true);
  });
  it('rejects fake source hash or review timestamps', () => {
    const issues = validateStandardSnapshotEvidence({
      snapshotId: 'iso639-r1', standardFamily: 'ISO_639',
      sourceAuthority: 'ISO', sourceVersion: 'revision-1',
      sourceArtifactHash: 'not-sha256', sourceUrl: 'https://example.org',
      retrievedAt: '2026-10-10', reviewedAt: null, reviewedBy: null, status: 'REVIEWED',
    });
    expect(issues).toContain('STANDARD_SHA256_REQUIRED');
    expect(issues).toContain('STANDARD_REVIEW_EVIDENCE_REQUIRED');
  });
});

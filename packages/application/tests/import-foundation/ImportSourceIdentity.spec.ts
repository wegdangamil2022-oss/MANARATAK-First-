import { describe, expect, it } from 'vitest';
import { ImportSourceIdentity } from '../../src/import-foundation/services/ImportSourceIdentity';

describe('ImportSourceIdentity', () => {
  it('preserves an explicit source identity when row order changes', () => {
    const first = ImportSourceIdentity.create({
      sourceSystem: 'UNIVERSITY_FILE',
      ownerDomain: 'UNIVERSITIES',
      payload: { sourceReferenceId: 'INS-DZA-0001', name: 'University', _sourceRowNumber: 1 },
    });
    const replay = ImportSourceIdentity.create({
      sourceSystem: 'UNIVERSITY_FILE',
      ownerDomain: 'UNIVERSITIES',
      payload: { _sourceRowNumber: 900, name: 'University', sourceReferenceId: 'INS-DZA-0001' },
    });
    expect(replay.sourceDedupKey).toBe(first.sourceDedupKey);
    expect(replay.identityKind).toBe('EXTERNAL_ID');
  });

  it('uses a deterministic canonical payload fingerprint when no external identity exists', () => {
    const first = ImportSourceIdentity.create({
      sourceSystem: 'FILE',
      ownerDomain: 'GENERIC',
      payload: { nested: { b: 2, a: 1 }, values: ['x', 'y'], rowNumber: 2 },
    });
    const replay = ImportSourceIdentity.create({
      sourceSystem: 'FILE',
      ownerDomain: 'GENERIC',
      payload: { values: ['x', 'y'], nested: { a: 1, b: 2 }, rowNumber: 99 },
    });
    expect(replay.sourceDedupKey).toBe(first.sourceDedupKey);
    expect(replay.payloadFingerprint).toBe(first.payloadFingerprint);
    expect(replay.identityKind).toBe('PAYLOAD_FINGERPRINT');
  });

  it('accepts a changed version of the same external identity instead of hiding it as a replay', () => {
    const original = ImportSourceIdentity.create({
      sourceSystem: 'FILE',
      ownerDomain: 'UNIVERSITIES',
      payload: { sourceReferenceId: 'INS-DZA-0001', name: 'Old Name' },
    });
    const changed = ImportSourceIdentity.create({
      sourceSystem: 'FILE',
      ownerDomain: 'UNIVERSITIES',
      payload: { sourceReferenceId: 'INS-DZA-0001', name: 'Corrected Name' },
    });
    expect(changed.sourceDedupKey).not.toBe(original.sourceDedupKey);
  });
});

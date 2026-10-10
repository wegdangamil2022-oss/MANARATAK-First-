
import { describe, it, expect } from 'vitest';
import { referenceImportPayloadDigest, ReferenceDataScreeningHandoffConsumer } from '../../src/reference-data/services/ReferenceDataScreeningHandoffConsumer';
import type { UniversalImportHandoff } from '@manaratak/domain';

const handoff = (referenceMetadata: Record<string, string> | undefined, normalizedPayload: Record<string, unknown>): UniversalImportHandoff => ({
  handoffId: 'p7-screen-1',
  ownerDomain: 'REFERENCE_DATA',
  artifact: { sourceId: 'source-1', artifactId: 'artifact-1' },
  normalizedPayload,
  provenance: { sourceSystem: 'source-test', contentHash: 'a'.repeat(64) },
  validation: { state: 'VALID', issues: [] },
  execution: { executionId: 'run-1', dryRun: false, attempt: 1, idempotencyKey: 'p7-key-1' },
  referenceMetadata,
});

describe('P6 -> P7 screening consumer', () => {
  const owner = new ReferenceDataScreeningHandoffConsumer();
  it('hashes semantically identical mapped source payloads in stable key order', () => {
    const left = referenceImportPayloadDigest({ countryIso2Code: 'YE',
      name: 'Taiz', metadata: { x: 3, y: 1 } });
    const right = referenceImportPayloadDigest({ metadata: { y: 1, x: 3 },
      name: 'Taiz', countryIso2Code: 'YE' });
    expect(left).toBe(right);
    expect(left).toMatch(/^[a-f0-9]{64}$/);
    expect(referenceImportPayloadDigest({ name: 'Other', countryIso2Code: 'YE' })).not.toBe(left);
  });
  it('screens canonical city scope but never marks rows approved or applied', async () => {
    const result = await owner.accept(handoff({ referenceEntityType: 'CITY' }, {
      countryIso2Code: 'YE', name: 'صنعاء', region: 'أمانة العاصمة',
    }));
    expect(result.state).toBe('NEEDS_OWNER_REVIEW');
    expect(result.deterministicKey).toBe('YE|صنعاء|text:أمانة العاصمة');
    expect(result.canonicalWrites).toBe(0);
    expect(result.normalizedPayloadHash).toMatch(/^[a-f0-9]{64}$/);
    expect(owner.effectMode).toBe('SCREENING_ONLY');
  });
  it('fails closed without explicit canonical type', async () => {
    const result = await owner.accept(handoff(undefined, { isoCode: 'USD', name: 'Dollar' }));
    expect(result.state).toBe('NEEDS_OWNER_REVIEW');
    expect(result.issues[0].code).toBe('P7_EXPLICIT_REFERENCE_TYPE_REQUIRED');
  });
  it('does not allow review progression for a P6 handoff without immutable artifact hash', async () => {
    const input = handoff({ referenceEntityType: 'CITY' }, { countryIso2Code: 'YE', name: 'صنعاء' });
    const result = await owner.accept({
      ...input,
      provenance: { ...input.provenance, contentHash: 'unverified' },
    });
    expect(result.state).toBe('INVALID');
    expect(result.issues[0].code).toBe('P7_DURABLE_SOURCE_SHA256_AND_ARTIFACT_REQUIRED');
    expect(result.canonicalWrites).toBe(0);
  });

  it('retains review-required issues from P6 even when the P7 row structure is valid', async () => {
    const input = handoff({ referenceEntityType: 'COUNTRY' },
      { iso2Code: 'YE', iso3Code: 'YEM', name: 'Yemen' });
    const result = await owner.accept({
      ...input, validation: {
        state: 'NEEDS_REVIEW',
        issues: [{ code: 'P6_PROVIDER_DRIFT', message: 'Source layout changed',
          severity: 'WARNING' }],
      },
    });
    expect(result.state).toBe('NEEDS_OWNER_REVIEW');
    expect(result.issues.some(issue => issue.code === 'P6_PROVIDER_DRIFT')).toBe(true);
  });

  it('rejects punctuation-only city names without retry loops', async () => {
    const result = await owner.accept(handoff({ referenceEntityType: 'CITY' }, {
      countryIso2Code: 'YE', name: '!!!',
    }));
    expect(result.state).toBe('INVALID');
    expect(result.issues.some(i => i.code === 'INVALID_CITY_IDENTITY_TOKEN')).toBe(true);
    expect(result.canonicalWrites).toBe(0);
  });
  it('quarantines non-string or malformed P6 field shapes rather than retrying a TypeError', async () => {
    const result = await owner.accept(handoff({ referenceEntityType: 'CITY' }, {
      countryIso2Code: 123, name: ['unexpected', 'array'],
    }));
    expect(result.state).toBe('INVALID');
    expect(result.canonicalWrites).toBe(0);
    expect(result.issues[0].code).toBe('P7_IMPORT_SOURCE_SHAPE_INVALID');
  });
  it('quarantines forged canonical control flags and typed array-shaped codes', async () => {
    for (const data of [
      { countryIso2Code: ['YE'], name: 'صنعاء' },
      { countryIso2Code: 'YE', name: 'صنعاء', isActive: false },
      { countryIso2Code: 'YE', name: 'صنعاء', providerMappings: [{ providerId: 'a' }] },
      { countryIso2Code: 'YE', name: 'صنعاء', latitude: Infinity },
      { countryIso2Code: 'YE', name: 'صنعاء', injectedField: 'not from normalized mapping' },
      { countryIso2Code: 'YE', name: 'صنعاء', metadata: { leaked: () => 'secret' } },
    ]) {
      const result = await owner.accept(handoff({ referenceEntityType: 'CITY' }, data));
      expect(result.state).toBe('INVALID');
      expect(result.issues.some(i => i.code === 'P7_IMPORT_SOURCE_SHAPE_INVALID')).toBe(true);
      expect(result.canonicalWrites).toBe(0);
    }
  });

  it('reports invalid owner data without canonical writes', async () => {
    const result = await owner.accept(handoff({ referenceEntityType: 'CITY' }, {
      countryIso2Code: 'Y', name: 'broken',
    }));
    expect(result.state).toBe('INVALID');
    expect(result.canonicalWrites).toBe(0);
  });
});

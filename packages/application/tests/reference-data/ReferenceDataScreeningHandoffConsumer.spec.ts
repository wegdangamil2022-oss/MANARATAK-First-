
import { describe, it, expect } from 'vitest';
import { ReferenceDataScreeningHandoffConsumer } from '../../src/reference-data/services/ReferenceDataScreeningHandoffConsumer';
import type { UniversalImportHandoff } from '@manaratak/domain';

const handoff = (referenceMetadata: Record<string, string> | undefined, normalizedPayload: Record<string, unknown>): UniversalImportHandoff => ({
  handoffId: 'p7-screen-1',
  ownerDomain: 'REFERENCE_DATA',
  artifact: { sourceId: 'source-1', artifactId: 'artifact-1' },
  normalizedPayload,
  provenance: { sourceSystem: 'source-test', contentHash: 'abc123' },
  validation: { state: 'VALID', issues: [] },
  execution: { executionId: 'run-1', dryRun: false, attempt: 1, idempotencyKey: 'p7-key-1' },
  referenceMetadata,
});

describe('P6 -> P7 screening consumer', () => {
  const owner = new ReferenceDataScreeningHandoffConsumer();
  it('screens canonical city scope but never marks rows approved or applied', async () => {
    const result = await owner.accept(handoff({ referenceEntityType: 'CITY' }, {
      countryIso2Code: 'YE', name: 'صنعاء', region: 'أمانة العاصمة',
    }));
    expect(result.state).toBe('NEEDS_OWNER_REVIEW');
    expect(result.deterministicKey).toBe('YE|صنعاء|text:أمانة العاصمة');
    expect(result.canonicalWrites).toBe(0);
    expect(owner.effectMode).toBe('SCREENING_ONLY');
  });
  it('fails closed without explicit canonical type', async () => {
    const result = await owner.accept(handoff(undefined, { isoCode: 'USD', name: 'Dollar' }));
    expect(result.state).toBe('NEEDS_OWNER_REVIEW');
    expect(result.issues[0].code).toBe('P7_EXPLICIT_REFERENCE_TYPE_REQUIRED');
  });
  it('reports invalid owner data without canonical writes', async () => {
    const result = await owner.accept(handoff({ referenceEntityType: 'CITY' }, {
      countryIso2Code: 'Y', name: 'broken',
    }));
    expect(result.state).toBe('INVALID');
    expect(result.canonicalWrites).toBe(0);
  });
});
